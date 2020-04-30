angular.module('AgaveToGo').controller('StagedDataDescriptorsController', function ($scope, $http, $filter, $state, $stateParams, $translate, $uibModal, $q, $rootScope, $localStorage, MetaController, FilesController, ActionsService, MessageService, MetadataService) {
    $scope._COLLECTION_NAME = 'metadata',
    $scope._RESOURCE_NAME = 'metadatum';
    $scope.showModal = false;

    $scope.profile = $localStorage.activeProfile;
    $scope.get_editors = function(){
      $scope.editors = MetadataService.getAdmins();
      $scope.edit_perm = $scope.editors.indexOf($scope.profile.username) > -1;
    }
    $scope.get_editors();

    //Don't display metadata of these types
    $scope.ignoreMetadataType = ['published','stagged','staged','PublishedFile','rejected'];
    //Don't display metadata schema types as options
    $scope.ignoreSchemaType = ['PublishedFile'];
    $scope.approvedSchema = ['DataDescriptor']
    $scope.queryLimit = 99999;

    $scope.offset = 0;
    $scope.limit = 500;
    $scope.hasFiles = false;

    $scope.sortType = 'name';
    $scope.sortReverse  = true;
    $scope.status = 'active';
    $scope.available = true;
    $scope.query = "{'name':{'$in': ['" + $scope.approvedSchema.join("','") +"'] }}";
    $scope.schemaQuery = "{'schema.title':'DataDescriptor'}"

    $scope.schemaBox = {val1:true,val2:true,val5:true};
    $scope.wellbox = true;
    $scope.searchField = {value:''}

    $scope.locations = {};
    $scope.files = {};
    $scope.variables = {};
    
    /*
    $scope.getFiles = function (dataDescriptor) {
      $scope.files[dataDescriptor.uuid] = [];
      console.log("StagedDataDescriptorsController.getFiles: " + dataDescriptor.uuid);
      var query = "{$and:[{'name':{'$in':['PublishedFile','File']}},{'associationIds':'" + dataDescriptor.uuid + "'}]}";
      console.log("getFiles query: " + query);
      var limit = 100;
      var deferred = $q.defer();
      deferred.resolve(MetaController.listMetadata(query, limit, 0).then(
        function (response) {
          console.log("getFiles:" + dataDescriptor.uuid + ": " + response);
          $scope.filemetadata = response.result;

          angular.forEach($scope.filemetadata, function (associatedData) {
            console.log("fetchMetadata:" + associatedData);
            if (associatedData.name === 'File') {
              console.log('File: ' + associatedData.value);
              $scope.files[dataDescriptor.uuid].push(associatedData);
            }
          });
          $scope.requesting = false;
        },
        function (response) {
          MessageService.handle(response, $translate.instant('error_filemetadata_list'));
          $scope.requesting = false;
        }
      ));
      return deferred.promise;
    };
    */

    // get all location data which is location in the data descriptor associations
    $scope.getAssociations = function (dataDescriptor) {
      $scope.locations[dataDescriptor.uuid] = [];
      $scope.variables[dataDescriptor.uuid] = [];
      console.log("StagedDataDescriptorsController.getAssociations: " + dataDescriptor.uuid);
      if (dataDescriptor._links.associationIds){
        var query = "{'uuid':{'$in':['"+ dataDescriptor.associationIds.join("','") + "']}}";
        console.log("getAssociations query: " + query);
        var limit = 100;
        var deferred = $q.defer();
        deferred.resolve(MetaController.listMetadata(query, limit, 0).then(
          function (response) {
            console.log("getAssociations:" + dataDescriptor.uuid + ": " + response);
            $scope.filemetadata = response.result;

            angular.forEach($scope.filemetadata, function (associatedData) {
              console.log("fetchMetadata:" + associatedData);
              if (associatedData.name === 'Well' || 
                  associatedData.name === 'Site' || 
                  associatedData.name === 'Water_Quality_Site' || 
                  associatedData.name === 'RainfallStation') {
                console.log('Location: ' + associatedData);
                $scope.locations[dataDescriptor.uuid].push(associatedData);
              }
              /*
              if (associatedData.name === 'File') {
                console.log('File: ' + associatedData.value);
              }
              */
              else if (associatedData.name === 'Variable') {
                console.log('Variable: ' + associatedData.value);
                $scope.variables[dataDescriptor.uuid].push(associatedData);
              }
            });
            $scope.requesting = false;
          },
          function (response) {
            MessageService.handle(response, $translate.instant('error_filemetadata_list'));
            $scope.requesting = false;
          }
        ));
        return deferred.promise;
      }
    };
  

    // get all DataDescriptors that are marked as stagedToIkewai or stagedToHydroshare
    $scope.searchAll = function(){
      $scope.requesting = true;
        var orquery = {}
        var andquery = {}
        var queryarray = []
        var andarray = []
        var innerquery = {}
        var typearray = []
        if ($scope.searchField.value != ''){
            console.log('searching')
            var vquery = {}
            vquery['owner'] = {$regex: $scope.searchField.value, '$options':'i'}
            queryarray.push(vquery)
              angular.forEach($scope.metadataschema.schema.properties, function(val, key){
                var valquery = {}
                valquery['value.'+key] = {$regex: $scope.searchField.value, '$options':'i'}
                queryarray.push(valquery)
              })
         
          orquery['$or'] = queryarray;
       }
        var typequery = {}
        var textquery = {'$text':{'$search':$scope.searchField.value}}
        if ($scope.schemaBox.val1){
          typearray.push('DataDescriptor')
        }
        typequery['name'] = {'$in': typearray}
        andarray.push(typequery)

        // limit results to DDs that are stagedToIkewai or stagedToHydroshare
        var stagedVals = {'$or':[{'value.stagedToIkewai':true},{'value.stagedToHydroshare':true}]};
        andarray.push(stagedVals);
        andarray.push(orquery)

        andquery['$and'] = andarray;
        $scope.query = JSON.stringify(andquery);
        console.log("JG Query: " + $scope.query);
        MetaController.listMetadata($scope.query,$scope.limit,$scope.offset).then(
          function (response) {
            if (response.result.length == $scope.limit) {
              $scope.can_fetch_more = true;
            } else {
              $scope.can_fetch_more = false;
            }
            $scope.totalItems = response.result.length;
            $scope.pagesTotal = Math.ceil(response.result.length / $scope.limit);
            $scope[$scope._COLLECTION_NAME] = response.result;
            angular.forEach($scope[$scope._COLLECTION_NAME], function (value, key) {
              // get all location and file info now, could get later, but then
              // there are delays waiting for the info, getting it here works better.
              $scope.getAssociations(value);
              //$scope.getFiles(value);
            });

            $scope.requesting = false;
          },
          function(response){
            MessageService.handle(response, $translate.instant('error_metadata_list'));
            $scope.requesting = false;
          }
      );
    }

    // trying to figure out how to get all our user info into HS for authorship, currently only handling name and emails
    // curl -X GET "https://www.hydroshare.org/hsapi/user/" -H "accept: application/json" -H "X-CSRFToken: CkpfWN0dmDKsZ3wYUlhjdIT7hyu0FCGh4XxUQlyvI537JCi1Yx9wzcmclKHJSdGz"
    /* {
        "username": "jgeis@hawaii.edu",
        "email": "jgeis@hawaii.edu",
        "first_name": "Jennifer",
        "id": 1501,
        "last_name": "Geis",
        "title": "Software Engineer",
        "organization": "University of Hawaii"
      }
    */
    $scope.getCreators = function (dataDescriptor) {
      console.log("StagedDataDescriptorsController.getCreators");
      // need to produce something like this for each creator:
      // {"creator":{"name":"Sean Cleveland", "email":"seanbc@hawaii.edu","description":"/user/1337/"}}
      var result = '';
      var creators = dataDescriptor.value.creators;
      var spacer = " ";
      angular.forEach(creators, function (creator) {
        var creatorString = '';
        if (creator) {
          // if either first or last is not set, don't need a space
          if (creator.first_name == undefined || creator.last_name == undefined) {
            spacer = "";
          }
          var firstName = creator.first_name;
          var lastName = creator.last_name;
          if (!creator.first_name) {
            firstName = "";
          }
          if (!creator.last_name) {
            lastName = "";
          }

          // TODO: verify HS will take a single value for the name
          var nameString = `"name":"` + firstName + spacer + lastName + `"`;

          var emailString = "";
          if (creator.email != undefined) {
            emailString = `,"email": "${creator.email}"`;
          }
          var orgString = "";
          if (creator.organization != undefined) {
            orgString = `,"organization": "${creator.organization}"`;
          }

          // make sure there's at least a first name or a last name
          if (creator.first_name != "" && creator.last_name != "") {
            creatorString += `{` + nameString + emailString + orgString + `}`;
          } 
          if (creatorString.length > 0) {
            result += `,{"creator":` + creatorString + `}`;
          }
        }
      });
      //console.log("Creators: " + result);
      return result;
    }

    $scope.getContributors = function (dataDescriptor) {
      console.log("StagedDataDescriptorsController.getContributors");
      // need to produce something like this for each contributor:
      // {"contributor": {"name": "Diamond Tachera", "email": "diamondt@hawaii.edu","organization": "University of Hawaii"}},
      var result = '';
      // our "contributor" is HS's "author"
      var contributors = dataDescriptor.value.contributors;
      var spacer = " ";
      angular.forEach(contributors, function (contributor) {
        var contributorString = '';
        if (contributor) {

          // if either first or last is not set, don't need a space
          if (contributor.first_name == undefined || contributor.last_name == undefined) {
            spacer = "";
          }
          var firstName = contributor.first_name;
          var lastName = contributor.last_name;
          if (!contributor.first_name) {
            firstName = "";
          }
          if (!contributor.last_name) {
            lastName = "";
          }

          // TODO: verify HS will take a single value for the name
          var nameString = `"name":"` + firstName + spacer + lastName + `"`;

          var emailString = "";
          if (contributor.email != undefined) {
            emailString = `,"email": "${contributor.email}"`;
          }
          var orgString = "";
          if (contributor.organization != undefined) {
            orgString = `,"organization": "${contributor.organization}"`;
          }

          // make sure there's at least a first name or a last name
          if (contributor.first_name != "" && contributor.last_name != "") {
            contributorString += `{` + nameString + emailString + orgString + `}`;
            //arr.push(`{"name":"${contributor.first_name}${spacer}${contributor.last_name}"${emailString}${orgString}`);
          } 
          if (contributorString.length > 0) {
            result += `,{"contributor":` + contributorString + `}`;
          }
        }
      });
      //console.log("Contributor string: " + result);
      return result;
    }

   /*
   * Returns something like: 
   * {"coverage": {
   *   "type":"box", 
   *   "value": {
   *     "units": 
   *     "Decimal degrees",
   *     "east": "-76.30288",
   *     "northlimit": "39.896164",
   *     "eastlimit": "-76.291824",
   *     "southlimit": "39.882217",
   *     "westlimit": "-76.31393"
   *   }
   *  }
   * },
   * OR (can't have both box and point at same time)
   * {"coverage":{"type":"point", "value": {"east": "56.45678", "north": "12.6789", "units": "decimal deg"}}}
   * 
   * Where to get point info in metadata object:
   * "value" : {
      "ikewai_type" : [ ],
      "name" : "Manana Trailhead_Rain_Collector",
      "id" : "Manana Trailhead",
      "latitude" : 21.4300833,
      "longitude" : -157.9380333,
      "loc" : {
        "type" : "Point",
        "coordinates" : [ -157.9380333, 21.4300833 ]
      }
    },
    longitude = east, latitude = north
   */
  $scope.getLocations = function(dataDescriptor) {
    console.log("StagedDataDescriptorsController.getLocations");
  
    var ddLocations = $scope.locations[dataDescriptor.uuid];
    var result = '';
    /*
    angular.forEach(ddLocations, function(datum) {
      console.log("Datum: " + datum);
      if (datum.name == "Site") {
        if (datum.value.loc != undefined && datum.value.name != undefined) {
          if (datum.value.loc.type == 'Point') {
            if (datum.value.latitude != undefined && datum.value.longitude != undefined) {
              // ex1: {"coverage":{"type":"point", "value": {"east": "56.45678", "north": "12.6789", "units": "decimal deg", "name": "12232"}}}
              // ex2: {"coverage":{"type":"point", "value":{"units": "Decimal degrees","east": "-84.0465","north": "49.6791","name": "12232","projection": "WGS 84 EPSG:4326"}}}
              result += ',{"coverage":{"type":"point", "value": {"east": "' + datum.value.longitude + 
              '", "north": "' + datum.value.latitude + 
              '", "units": "Decimal Degrees", "name": "' + datum.value.name + '"}}}';
            }
          }
          else {
            // polygons aren't handled by HS right now, only boxes and points
          }
        }
      }
      else if (datum.name == "Well") {
        if (datum.value.latitude != undefined && datum.value.longitude != undefined) {
          result += ',{"coverage":{"type":"point", "value": {"east": "' + datum.value.longitude + 
          '", "north": "' + datum.value.latitude + 
          '", "units": "Decimal Degrees", "name": "' + datum.value.well_name + '"}}}';
        }
      }
      else if (datum.name == "Water_Quality_Site") {
        if (datum.value.latitude != undefined && datum.value.longitude != undefined) {
          result += ',{"coverage":{"type":"point", "value": {"east": "' + datum.value.longitude + 
          '", "north": "' + datum.value.latitude + 
          '", "units": "Decimal Degrees", "name": "' + datum.value.name + '"}}}';
        }
      }
      else if (datum.name == "RainfallStation") {
        if(datum.value.latitude != undefined && datum.value.name != undefined) {
          result += ',{"coverage":{"type":"point", "value": {"east": "' + datum.value.longitude + 
          '", "north": "' + datum.value.latitude + 
          '", "units": "Decimal Degrees", "name": "' + datum.value.station_name + '"}}}';
        }
      }
    });
    */
    return result;
  }

   /*
   * Returns something like: {"coverage":{"type":"period", "value":{"start":"01/01/2000", "end":"12/12/2010"}}}
   */
   $scope.getDates = function(dataDescriptor) {
      console.log("StagedDataDescriptorsController.getDates");
      var result = "";
      var spacer = ","
      var start = dataDescriptor.value.start_datetime;
      var end = dataDescriptor.value.end_datetime;

      // if both are not defined, we're done
      if (start == undefined && end == undefined) {
        return "";
      }
      // HS does not allow only of start or end to be defined, so if only have one, make them match.
      else if (!start || !end) {
        // if not defined or not a value, set it to equal the one that is defined
        if (!start && end) {
          start = end;
        }
        else if (start && !end) {
          end = start;
        }
      }
      start = `"start": "` + start + `"`;
      end = `"end": "` + end + `"`;
      if (start || end) {
        result = `,{"coverage":{"type":"period", "value":{` + start + spacer + end + '}}}';
      }
      //console.log("Date string: " + result);
      return result;
    }

    /*
    * Returns something like: {"rights": {"statement":"Our own statement","url":"http://ikewai.org/licenses/by/4.0/"}}
    */
    $scope.getRightsStatement = function(dataDescriptor) {
      console.log("StagedDataDescriptorsController.getRightsStatement");
      var result = "";
      var spacer = ","
      var rights = dataDescriptor.value.license_rights;

      // these are the defaults, used if author didn't select anything.
      var rightsString = "This resource is shared under the Creative Commons Attribution CC BY."
      var urlString = "http://creativecommons.org/licenses/by/4.0/";
      if (rights) {
        // this is not needed as this is the default as shown directly above
        //if (rights === "Creative Commons Attribution CC BY") {
        //  rightsString = "This resource is shared under the Creative Commons Attribution CC BY."
        //  urlString = "http://creativecommons.org/licenses/by/4.0/";
        //}
        if (rights === "Creative Commons Attribution-ShareAlike CC BY-SA") {
          rightsString = "This resource is shared under the Creative Commons Attribution-ShareAlike CC BY-SA."
          urlString = "http://creativecommons.org/licenses/by-sa/4.0/";
        }
        else if (rights === "Creative Commons Attribution-NoDerivs CC BY-ND") {
          rightsString = "This resource is shared under the Creative Commons Attribution-NoDerivs CC BY-ND."
          urlString = "http://creativecommons.org/licenses/by-nd/4.0/";
        }
        else if (rights === "Creative Commons Attribution-NoCommercial-ShareAlike CC BY-NC-SA") {
          rightsString = "This resource is shared under the Creative Commons Attribution-NoCommercial-ShareAlike CC BY-NC-SA."
          urlString = "http://creativecommons.org/licenses/by-nc-sa/4.0/";
        }
        else if (rights === "Creative Commons Attribution-NoCommercial CC BY-NC") {
          rightsString = "This resource is shared under the Creative Commons Attribution-NoCommercial CC BY-NC."
          urlString = "http://creativecommons.org/licenses/by-nc/4.0/";
        }
        else if (rights === "Creative Commons Attribution-NoCommercial-NoDerivs CC BY-NC-ND") {
          rightsString = "This resource is shared under the Creative Commons Attribution-NoCommercial-NoDerivs CC BY-NC-ND."
          urlString = "http://creativecommons.org/licenses/by-nc-nd/4.0/";
        }
        else if (rights === "Other") {
          rightsString = "Other"
          urlString = "Make inquiry to author";
        }
      }
      result = `,{"rights":{"statement":"` + rightsString + `","url":"` + urlString + `"}}`;
      return result;
    }

    /*
      // should produce something like this, but all on one line
      "metadata": '[{
        "fundingagency":{"agency_name":"National Science Foundation","award_title":"‘Ike Wai: Securing Hawaii’s Water Future Award","award_number":"OIA-1557349","agency_url":"http://www.nsf.gov"}},
        {"contributor": {"name": "Diamond Tachera", "email": "diamondt@hawaii.edu","organization": "University of Hawaii"}},
        {"coverage":{"type":"box", "value":{"units": "Decimal degrees","east": "-76.30288","northlimit": "39.896164","eastlimit": "-76.291824","southlimit": "39.882217","westlimit": "-76.31393"}}},
        {"coverage":{"type":"period", "value":{"start":"01/01/2000", "end":"12/12/2010"}}},
        {"creator":{"name":"Jennifer Geis", "description":"/user/1501/","order":"2"}},
        {"creator":{"name":"Sean Cleveland", "description":"/user/1337/","order":"1"}
      }]',
    */
    $scope.getMetadata = function(dataDescriptor) {
      console.log("StagedDataDescriptorsController.getMetadata");
      var result = "";
      // funding agency will not change so can be hardcoded
      var d = 
        '{"fundingagency":{"agency_name":"National Science Foundation","award_title":"‘Ike Wai: Securing Hawaii’s Water Future Award","award_number":"OIA-1557349","agency_url":"http://www.nsf.gov"}}';
      d += $scope.getCreators(dataDescriptor);
      d += $scope.getContributors(dataDescriptor);
      d += $scope.getLocations(dataDescriptor);
      d += $scope.getDates(dataDescriptor);
      d += $scope.getRightsStatement(dataDescriptor);
      if (d) {
        // strip off newlines as it makes Hydroshare choke.
        result = '[' + d + ']';
      }
      //console.log("String: " + s);
      return result;
    }
    
    $scope.getAbstract = function(dataDescriptor) {
      //console.log("StagedDataDescriptorsController.getAbstract");
      var result = "";
      var d = dataDescriptor.value.description;
      //console.log("abstract: " + d);
      if (d) {
        // strip off newlines as it make Hydroshare choke.
        result = d.replace(/(\r\n|\n|\r)/gm, "");
      }
      //console.log("String: " + s);
      return result;
    }

    $scope.getKeywords = function(dataDescriptor) {
      /* format: "keywords": ["keyword1","keyword2"], */
      //console.log("StagedDataDescriptorsController.getKeywords");
      var result = "";
      var d = dataDescriptor.value.subjects;
      //console.log("subjects: " + JSON.stringify(d));
      if (d) {
        result = d;
      }
      //console.log("String: " + s);
      return result;
    }

    $scope.makeFilesPublic = function(dataDescriptor) {
      //FilesController.updateFileItemPermissionToPublicRead(path);
      var newUrls = [];
      angular.forEach(dataDescriptor._links.associationIds, function (file) {
        var systemId = 'ikewai-annotated-data//';
        if (file.title === 'file' && file.href.includes(systemId)) {
          var path = file.href.split(systemId)[1];
          // note:  this works, but I need to get the new public url and add it to the file and/or data descriptor
          FilesController.updateFileItemPermissionToPublicRead(path);
          // generate a url in this format:
          // https://ikeauth.its.hawaii.edu/files/v2/download/public/system/ikewai-annotated-data/new_data/DiamondWaterSampling.jpg
          // for notes on how the url gets generated, see: 
          // https://tacc-cloud.readthedocs.io/projects/agave/en/latest/agave/guides/files/files-publishing.html
          var urlStart = file.href.split("media/system")[0];
          var newUrl = urlStart + "download/public/system/ikewai-annotated-data/" + path; 
          newUrls.push(newUrl);
          $scope.makePublicFileMetadataObject(dataDescriptor, file, newUrl);
          //console.log("path: " + newurl);
        }
      });
      return newUrls;
    }

    $scope.makePublicFileMetadataObject = function(dataDescriptor, file, newUrl) {
      console.log("makePublicFileMetadataObject: " + dataDescriptor.uuid + ", " + file.rel + ", " + newUrl);
      $scope.requesting = true;
      MetadataService.fetchSystemMetadataSchemaUuid('PublicFile')
        .then(function (response) {
          // make sure the object doesn't already exist
          var schemaId = response;
          var query = `{'name':'PublicFile','value.data_descriptor_uuid':'${dataDescriptor.uuid}','value.file_uuid':'${file.rel}'}`;
          console.log("query: " + query);
          MetaController.listMetadata(query).then(function (response) {
            if (response.result.length > 0) {
              // do nothing, an object already exists, move on
              console.log("Public File metadata object already exists for this dd/file combination: " + dataDescriptor.uuid + ", " + file.rel);
            }
            else {
              // make a new object
              console.log("Making a new PublicFile object");

              var publicFile = {};
              publicFile.data_descriptor_uuid = dataDescriptor.uuid;
              publicFile.file_public_url = newUrl;
              publicFile.file_uuid = file.rel;
              publicFile.file_private_url = file.href;
              
              var body = {};
              body.schemaId = schemaId;
              body.name = "PublicFile";
              body.value = publicFile;

              MetaController.addMetadata(body).then(function (response) {
                console.log("Success in creating the public files metadata object")
                metadataUuid = response.result.uuid;
                //add the default permissions for the system in addition to the owners
                MetadataService.addDefaultPermissions(metadataUuid);
                MetadataService.resolveApprovedStatus(metadataUuid);//if not public make it so
              },
              function (response) {
                // really can't think of anything to do here
                console.log("Got an error: " + response);
              });
            }
         },
          function (response) {
            // really can't think of anything to do here
            console.log("Got an error: " + response);
          });
        $scope.requesting = false;
      });
    }

    /*
      Generate a file to attach to the new HS resource: containing the following info:  
      "articleAuthors" : [ ],
      "newspapers" : [ ],
      "translators" : [ ],
      data_state" : "Final",
      variables
      file links
      */
    $scope.addReadmeMDFile = function (dataDescriptor, resourceId, baseHSURL, accessToken) {
      console.log("StagedDataDescriptorsController.addReadmeMDFile: " + dataDescriptor.uuid);

      hsURL = baseHSURL + "/hsapi/resource/" + resourceId + "/files/?access_token=" + accessToken + "&DEBUG=true";
      //print("url: " + url)

      var fileContents = "#### `Ike Wai:" 
      + "\r\n \r\n"
      + "To save space on Hydroshare, all `Ike Wai project files are stored at the "
      + "University of Hawaii and linked here.  Please use the following link(s) "
      + "to see the files for this resource.";

      // get the public links to the files:
      var publicUrls = $scope.makeFilesPublic(dataDescriptor);
      angular.forEach(publicUrls, function (link) {
          fileContents += "\r\n \r\n - [" + link + "](" + link + ")";
      });
      fileContents += "\r\n \r\n";

      // data state:
      if (dataDescriptor.value.data_state) {
        fileContents += "#### Data state: \r\n" + dataDescriptor.value.data_state + "\r\n \r\n";
      }

      // Hawaiian language news article translations
      if (dataDescriptor.value.newspapers || dataDescriptor.value.articleAuthors || dataDescriptor.value.translators) {
        hwnString = "#### Hawaiian Newspaper Article Translation information:";
        if (dataDescriptor.value.newspapers) {
          hwnString += "\r\n \r\n Newspaper(s): ";
          angular.forEach(dataDescriptor.value.newspapers, function (item) {
            hwnString += "  \r\n - " + item.name; 
          });
        };
        if (dataDescriptor.value.articleAuthors) {
          hwnString += "  \r\n  \r\n Article Author(s): ";
          angular.forEach(dataDescriptor.value.articleAuthors, function (item) {
            var penName = item.pen_name
            if (!penName) {penName = "N/A"}
            hwnString += "  \r\n - name: " + item.name + ", pen name: " + penName; 
          });
        }
        if (dataDescriptor.value.translators) {
          hwnString +=  "  \r\n  \r\n Translators: ";
          angular.forEach(dataDescriptor.value.translators, function (item) {
            hwnString += "  \r\n - first name: " + item.first_name + ", last name: " + item.last_name + ", email: " + item.email + ", organization: " + item.organization; 
          });
        }
        fileContents += hwnString + "\r\n \r\n";
      }

      // Variables:
      if ($scope.variables[dataDescriptor.uuid].length > 0) {
        fileContents += "#### Variables";
        angular.forEach($scope.variables[dataDescriptor.uuid], function (variable) {
          //console.log("variable: " + variable);
          fileContents += "\r\n \r\n - " + variable.value.variable_name;
          var keys = Object.keys(variable.value);
          angular.forEach(keys, function (key) {
            if (key != "variable_name") {
              fileContents += "\r\n \r\n    " + variable.value[key];
            }
          });
        });
      }
      console.log("fileContents: " + fileContents);
    
      // submit the file to Hydroshare
      var fileName = "readme.md";
      var f = new File([fileContents], fileName, {type: "text/plain"});
      var formData = new FormData();
      formData.append('file', f, fileName);
      var request = new XMLHttpRequest();
      request.onload = function(e) {
        console.log(request.responseText);
      };
      request.onerror= function(e) {
        console.log("error: " + e);
      };
      request.open('POST', hsURL);
      response = request.send(formData);
      //console.log("response: " + response.responseText);
    }

    // called when user goes to publish a DataDescriptor to Hydroshare
    // need to still get the location info for that DD
    $scope.publishStagedDDToHydroshare = function (dataDescriptor) {
      console.log("StagedDataDescriptorsController.publishStagedDDToHydroshare: " + dataDescriptor.uuid);
      console.log("dataDescriptor: " + JSON.stringify(dataDescriptor));

      // I made a group 'ikewai': https://www.hydroshare.org/group/153

      // Send the data off to Hydroshare.
      //var userInfoURL = `https://www.hydroshare.org/hsapi/userInfo/?access_token=${$scope.accessToken}&format=json`;
      baseHSURL = "https://www.hydroshare.org";
      accessToken = "e8MihA91acn7tcBmCJTckipjcDQDvn";

      var hsURL = `${baseHSURL}/hsapi/resource/?access_token=${accessToken}`;
      //var hsURL = `${baseHSURL}/hsapi/resource/?access_token=${$rootScope.hydroshareAccessToken}`;
      console.log("hsURL: " + hsURL);

      // "creator" in Hydroshare's API is called "owner" on their interface.  
      // This is the user against whose quota the resource is counted in managing storage,
      // so for us, creator is 'ikewai.'  Need to make a creator object there and store the
      // reference here.  While technically, there can be multiple owners, for our case, we
      // will be the only one.

      // put Hawaiian language stuff and comments in the readme.md file
      // if all variables are key-value pairs, put those in extra metadata, otherwise put in readme.md file

      var hsData = {};
      hsData['title'] = dataDescriptor.value.title;
      hsData['metadata'] = $scope.getMetadata(dataDescriptor);
      // abstract
      var abstract = $scope.getAbstract(dataDescriptor);
      if (abstract) {
        hsData['abstract'] = abstract;
      }
      // keywords
      var keywords = $scope.getKeywords(dataDescriptor);
      if (keywords) {
        hsData['keywords'] = keywords;
      }
      hsData['view_groups'] = "ikewai";
      hsData['availability'] = "public";
      hsData['resource_type'] = "CompositeResource";
      
      // doesn't work, had to do separately
      //hsData['files'] = {"file": ("readme.md","Test text of file","text/plain")};

      console.log(JSON.stringify(hsData));

      headers = {
        'accept': "application/json",
        'content-type': "application/json",
      }

      // strip out all the newlines as it makes HS choke
      //hsData = hsData.replace(/(\r\n|\n|\r)/gm, "");
      //hsData = JSON.parse(hsData);

      // temporarily commented out for testing
      // do the actual post to Hydroshare
      console.log("hsURL: " + hsURL);
      
      $http({
          method: 'POST',
          url: hsURL,
          headers: headers,
          data: hsData
      }).then(function successCallback(response) {
          // JG TODO: need to add error checking, check for error result from HS as well
          console.log("success");
          $scope.responseData = response.data;
          var resourceId = $scope.responseData.resource_id;
          //console.log("userInfo: " + $scope.userInfo);
          console.log("resource_id: " + resourceId);

          // put the hydroshare resourceId on the dataDescriptor
          dataDescriptor.value.hydroshareResourceId = resourceId;

          $scope.makeFilesPublic(dataDescriptor);

          // never managed to get the file to upload as part of creation, 
          // so doing it as a separate action
          $scope.addReadmeMDFile(dataDescriptor, resourceId, baseHSURL, accessToken);

      }, function errorCallback(response) {
          console.log("HydroshareOAuthController.submitToHydroshare Error:" + response.data.detail);
      });

      // just for testing so I don't keep making new resources while testing file addition.
      //$scope.addReadmeMDFile(dataDescriptor, 'efb597b44ff146f3af17e8dae7ca4dd0', baseHSURL, accessToken);
     
      
      //console.log("staged? " + dd.value.stagedToHydroshare);

      // temporarily commented out for testing
      // TODO!!! Uncomment before release!
      
      // mark the dd as being "pushedToHydroshare" and no longer staged.
      dataDescriptor.value.stagedToHydroshare = false;
      dataDescriptor.value.pushedToHydroshare = true;
      $scope.updateDataDescriptor(dataDescriptor);
      

    }

    $scope.publishStagedDDToIkewai = function (dataDescriptor) {
      // TODO!!! Uncomment before release!
      
      $scope.makeFilesPublic(dataDescriptor);
      //console.log("staged? " + dd.value.stagedToHydroshare);
      // mark the dd as being "pushedToIkewai" and no longer staged.
      dataDescriptor.value.stagedToIkewai = false;
      dataDescriptor.value.pushedToIkewai = true;
      $scope.updateDataDescriptor(dataDescriptor);
      
    }

    $scope.updateDataDescriptor = function (dataDescriptor) {
      console.log("JEN StagedDescriptorController: updateDataDescriptor");
      $scope.requesting = true;

      var body = {};
      body.name = dataDescriptor.name;
      body.value = dataDescriptor.value;
      body.schemaId = dataDescriptor.schemaId;
      body.associationIds = dataDescriptor.associationIds;

      MetaController.updateMetadata(body, dataDescriptor.uuid)
        .then(function (response) {
            //$scope.metadataUuid = response.result.uuid;
            App.alert({
              message: "Success",
              closeInSeconds: 5
            });
          },
          function (response) {
            MessageService.handle(response, $translate.instant('error_metadata_add'));
            $scope.requesting = false;
          }
        );

      $scope.requesting = false;
      console.log("JEN StagedDescriptorController: updateDataDescriptor done");
    }

    $scope.fetchMoreMetadata = function () {
        $scope.offset = $scope.offset + $scope.limit
        $scope.requesting = true
        MetaController.listMetadata($scope.query, $scope.limit, $scope.offset)
          .then(
            function (response) {
              if (response.result.length == $scope.limit) {
                $scope.can_fetch_more = true;
              } else {
                $scope.can_fetch_more = false;
              }
               $scope[$scope._COLLECTION_NAME]=  $scope[$scope._COLLECTION_NAME].concat(response.result)
               $scope.totalItems = $scope[$scope._COLLECTION_NAME].length;
              $scope.pagesTotal = Math.ceil($scope[$scope._COLLECTION_NAME].length / $scope.limit);
              $scope.requesting = false;
            },
            function (response) {
              MessageService.handle(response, $translate.instant('error_metadata_list'));
              $scope.requesting = false;
            }
          );
      }

    $scope.refresh = function() {
      $scope.requesting = true;
      console.log("StagedDataDescriptorsController.refresh query: " + $scope.schemaQuery)
      MetadataService.fetchSystemMetadataSchemaUuid('DataDescriptor')
      .then(function(){
          uuid = $localStorage["schema_DataDescriptor"]
          //console.log(angular.toJson(uuid))
          MetaController.getMetadataSchema(uuid,1,0
    				
    			).then(function(response){
            //console.log("METADATA SCHEMA: "+ angular.toJson(response))
    				$scope.metadataschema = response.result;
    				$scope.requesting = false;
    			})
          $scope.searchAll();
      })
    };

    $scope.searchTools = function(query){
      $scope.query = query;
      $scope.refresh();
    };


    $scope.refresh();

    $rootScope.$on("metadataUpdated", function(){
      $scope.refresh();
    });

/////////Modal Stuff/////////////////////



    $scope.openViewDataDescriptor = function (dataDescriptorUuid, size) {
      $scope.uuid = dataDescriptorUuid;
      $scope.action = "view";
      var modalInstance = $uibModal.open({
        animation: $scope.animationsEnabled,
        //templateUrl: 'views/modals/ModalViewDataDescriptor.html',
        templateUrl: 'views/datadescriptor/manager.html',
        controller: 'DataDescriptorController',
        scope: $scope,
        size: size,
        backdrop: 'static',
        keyboard : false,
        uuid: dataDescriptorUuid,
        profile: $scope.profile,
        resolve: {

        }
      });
      ga('create', 'UA-127746084-1', 'auto');
      ga('send', 'pageview', {
        page:'/app/views/datadescriptor/manager.html', 
        title:'`Ike Wai Gateway | Data Descriptor View' 
      });
    };
   
    // rejectType is either 'ikewai' or 'hydroshare'
    $scope.openRejectReasonModal = function (dataDescriptor, size, rejectType) {
      console.log("StagedDataDescriptorsController.openRejectReasonModal: " + dataDescriptor);
      $scope.rejectedDD = dataDescriptor; 
      $scope.rejectType = rejectType;
      var modalInstance = $uibModal.open({
        animation: $scope.animationsEnabled,
        templateUrl: 'views/modals/ModalRejectStagingRequestReason.html',
        controller: 'ModalRejectDataDescriptorStagingRequestController',
        scope: $scope,
        size: size,
        resolve: {

        }
      }
      );
    }

    $scope.$on("dd.staging.request.rejected", function (event, reason) {
      console.log("dd.staging.request.rejected: " + $scope.rejectedDD);
      $scope.requesting = true;
      var metadataType = ''
      if ($scope.rejectType === 'ikewai') {
        metadataType = 'stagedToIkewai'
        $scope.rejectedDD.value.rejectedFromIkewai = true;
        $scope.rejectedDD.value.stagedToIkewai = false;
      }
      else if ($scope.rejectType === 'hydroshare') {
        metadataType = 'stagedToHydroshare';
        $scope.rejectedDD.value.rejectedFromHydroshare = true;
        $scope.rejectedDD.value.stagedToHydroshare = false;
      }
      $scope.rejectedDD.value.rejectedReason = reason;
      console.log("metadataType: " + metadataType);
      console.log("reason: " + reason);
      $scope.updateDataDescriptor($scope.rejectedDD);
      
      /*
      var user_email = current_stagged.value.emails[$scope.rejectedUuid]
      var post_data = {}//to:"seanbc@hawaii.edu",from:"noReply-ikewai@hawaii.edu",subject:"Staged Updated",message:"User: "+ email+" has updated stagged files."};
      var url = $localStorage.tenant.baseUrl.slice(0, -1) + ':8080/email?to=' + user_email + '&from=noReply-ikewai@hawaii.edu&subject="Revise Staged File ' + href.split('system')[1] + '"&message="User: ' + user_email + ' your staged file ' + href.split('system')[1] + ' was flagged for review. \nPlease log into the Ike Wai Gateway and address the following: \n' + reason + '"';
      var options = {
        headers: { 'Authorization': 'Bearer ' + $localStorage.token.access_token }
      }
      $http.post(url, post_data, options)
        .success(function (data, status, headers, config) {
          console.log({ message: angular.toJson(data) })
          var url2 = $localStorage.tenant.baseUrl.slice(0, -1) + ':8080/email?to=uhitsci@gmail.com&from=noReply-ikewai@hawaii.edu&subject="Revise Staged File ' + href.split('system')[1] + '"&message="User: ' + user_email + ' your staged file ' + href.split('system')[1] + ' was flagged for review.\nPlease log into the Ike Wai Gateway and address the following: \n' + reason + '"';
          $http.post(url2, post_data, options)
            .success(function (data, status, headers, config) {
            })
            .error(function (data, status, header, config) {
              console.log({ error_message: angular.toJson(data) });
            });
        })
        .error(function (data, status, header, config) {
          console.log({ error_message: angular.toJson(data) });
        });
      $timeout(function () { $scope.getMetadatum() }, 400);
      $scope.getMetadatum();
      //$scope.requesting = false;
      */
    }); //end of '$scope.$on'

});