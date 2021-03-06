angular.module('AgaveToGo').controller("FileMetadataResourceMultipleAddController", function($scope, $state, $q, $stateParams, $translate, $window, $uibModal, $rootScope, $timeout, $localStorage, WizardHandler, MetaController, FilesController, MetadataService, ActionsService, MessageService, FilesMetadataService) {
	    $scope._COLLECTION_NAME = 'metadata',
    $scope._RESOURCE_NAME = 'metadatum';
	$scope.model = {};
	$scope.searchCheckBox={'checked':true}
	$scope.limit = 500;
	$scope.offset = 0;
	$scope.profile = $localStorage.activeProfile;
	$scope.get_editors = function(){
    $scope.editors = MetadataService.getAdmins();
      $scope.edit_perm = $scope.editors.indexOf($scope.profile.username) > -1;
    }
    $scope.get_editors();
   
		$scope.fileUuids = $stateParams['fileUuids'];
		$scope.filePaths = $stateParams['filePaths'];
		$scope.profile = $localStorage.activeProfile;

		$scope.query = "{'name':'DataDescriptor'}"
		$scope.get_editors = function(){
			$scope.editors = MetadataService.getAdmins();
			$scope.edit_perm = $scope.editors.indexOf($scope.profile.username) > -1;
		}
		$scope.get_editors();
		//$scope.filename = $stateParams['filename'];
		//$scope.schemauuid = $stateParams.schemauuid;
		/*$scope.fileObjs = JSON.parse($stateParams.fileObjs);

		$scope.populateFileIds = function(){
			angular.forEach($scope.fileObjs, function(value, key) {
				$scope.fileUuids.push(key);
				$scope.filePaths.push(value)
			});
		}
		$scope.populateFileIds();*/
		//alert($scope.fileObjs)
    	//$scope.query="{'uuid': //'"+$scope.schemauuid+"'}"//"{'uuid':'316750742996381210-242ac1110-0001-013'}";
    	$scope.schemaQuery ="{'schema.title':'DataDescriptor'}";//"{'owner':'seanbc'}";
		$scope.approvedSchema = ['DataDescriptor'];
		$scope.selectedSchema = ['DataDescriptor'];

		$scope.fetchMetadataSchema = function(schemauuid) {
			$scope.requesting = true;
			if (schemauuid) {
			MetaController.getMetadataSchema(schemauuid)
				.then(
					function(response){
						$scope.selectedmetadataschema = response.result;
						var formschema = {};
						formschema["type"]="object";
						formschema["properties"] = $scope.selectedmetadataschema.schema.properties;
						$scope.schema = formschema;
						$scope.form = [
							"*",
							{
								type: "submit",
								title: "Save"
							}
						];
						$scope.schema_selected = true;
						$scope.requesting = false;
					}
			);
		  }
		  else{
				$scope.requesting = false;
			}
		}

		$scope.populateAssociatedMetadata = function(){
			$scope.allAssociationIds = []
			angular.forEach($scope.fileMetadataObjects, function(value, key) {
				$scope.allAssociationIds.push(value.associationIds)
			})
			if ($scope.allAssociationIds.length > 0){
				$scope.matchingAssociationIds = $scope.allAssociationIds.shift().filter(function(v) {
					return $scope.allAssociationIds.every(function(a) {
							return a.indexOf(v) !== -1;
					});
				});
			}
			//alert(angular.toJson($scope.matchingAssociationIds))
			$scope.matchingMetadata =[];
			if ($scope.matchingAssociationIds){
				MetaController.listMetadata("{'uuid':{$in :['"+$scope.matchingAssociationIds.join("','")+"']}}").then(function(response){
					$scope.matchingMetadata = response.result;
				})
		  }
		}
		
		$scope.fetchDataDescriptors = function(){
			//find DataDescriptors that are associated with all fileUuids
			$scope.DataDescriptorIds=[];
			MetaController.listMetadata("{'name':'DataDescriptor','associationIds':{$all :['"+$scope.fileUuids.join("','")+"']}}").then(
				function (response) {
					$scope.matchingDataDescriptors = response.result;
					angular.forEach($scope.matchingDataDescriptors, function(value, key) {
							$scope.DataDescriptorIds.push(value.uuid)
					})
				}
			)
		}

		$scope.fetchDataDescriptors();
		
		$scope.fetchFileMetadataObjects = function(){
			MetaController.listMetadata("{$and:[{'name':'File'},{'associationIds':{$in :['"+$scope.fileUuids.join("','")+"']}}]}").then(

				function (response) {
					$scope.fileMetadataObjects = response.result;
					//alert($scope.fileMetadataObjects.length +" : "+$scope.fileUuids+" : " + $scope.fileUuids.length)
					if ($scope.fileMetadataObjects.length < $scope.fileUuids.length){
						//we have object mistmatch so figure our which are missing
					   FilesMetadataService.createFileMetadataObjects($scope.fileUuids).then(
							MetaController.listMetadata("{$and:[{'name':'File'},{'associationIds':{$in :['"+$scope.fileUuids.join("','")+"']}}]}").then(
								function(resp){
									$scope.fileMetadataObjects = resp.result;
									$scope.populateAssociatedMetadata();
								}
							)
						)
					}
					else{
						//do nothing
						$scope.populateAssociatedMetadata();
					}
				}
			)
		}

		$scope.loadedOnce = false;



		$scope.searchTools = function(query){
			$scope.query = query;
			$scope.fetchModalMetadata();
			//$scope.refresh();
		}

		$scope.fetchFileObjects = function(){
			//fetch File metadata objects
			if ($scope.loadedOnce == false){
				$scope.loadedOnce == true;
				$scope.fetchFileMetadataObjects();
			}
		}

		$scope.fetchFileObjects();

		$rootScope.$on("associationsUpdated", function(){
			//console.log("JEN FMRMAC: associationsUpdated broadcast received");
			$scope.handleBroadcast();
		});

		$rootScope.$on("associationRemoved", function(){
			//console.log("JEN FMRMAC: associationRemoved broadcast received");
			$scope.handleBroadcast();
		});

		$rootScope.$on("metadataUpdated", function(){
			//console.log("JEN FMRMAC: metadataUpdated broadcast received");
			$scope.handleBroadcast();
		});

		$scope.handleBroadcast = function() {
			$scope.fetchModalMetadata();
			$scope.fetchFileMetadataObjects();
			$scope.populateAssociatedMetadata();
			$scope.fetchDataDescriptors();
			$scope.requesting = false;
		}

		//$scope.submit = function(){
		$scope.onSubmit = function(form) {
			$scope.requesting = true;
			$scope.$broadcast('schemaFormValidate');

    // Then we check if the form is valid
	    if (form.$valid) {
				var body = {};
				//body.associationIds = $scope.fileUuids;//$scope.model.associatedUuid;
				body.name = $scope.selectedmetadataschema.schema.title;
				body.value = $scope.model;
				body.schemaId = $scope.selectedmetadataschema.uuid;
				MetaController.addMetadata(body)
					.then(
						function(response){
							$scope.metadataUuid = response.result.uuid;
							//add the default permissions for the system in addition to the owners
							MetadataService.addDefaultPermissions($scope.metadataUuid);
							angular.forEach($scope.fileMetadataObjects, function(value,key){
								MetadataService.addAssociation(value.uuid,$scope.metadataUuid);
							});
							$scope.requesting = false;
							//$state.go('filemetadata',{id: $scope.fileUuids[0]});
							//$window.history.back();
							App.alert({message: $translate.instant('success_metadata_add') + $scope.metadataUuid });
						},
						function(response){
							MessageService.handle(response, $translate.instant('error_metadata_add'));
							$scope.requesting = false;
						}
					);
				}
		};
		$scope.animationsEnabled = true;


		$scope.createFileObject = function(fileUuid){
			MetaController.listMetadata("{$and:[{'name':'File'},{'associationIds':'"+$stateParams.uuid+"'}]}").then(
				function(resp){
					//if still empty createFileObject
				if (resp.result == ""){
					var body={};
					//associate system file with this metadata File object
					body.associationIds = [fileUuid];
					body.name = 'File';
					body.value = {};
					//File Schema uuid
					body.schemaId = '3557207775540866585-242ac1110-0001-013';
					MetaController.addMetadata(body)
						.then(
							function(response){
								$scope.metadataUuid = response.result.uuid;
								//App.alert({message: $translate.instant('File is ready for adding metadata') });
								//add the default permissions for the system in addition to the owners
								MetadataService.addDefaultPermissions($scope.metadataUuid);
								$scope.updateFileObject(response.result)
								$scope.requesting = false;
								$scope.refresh();
							},
							function(response){
								MessageService.handle(response, $translate.instant('error_metadata_add'));
								$scope.requesting = false;
							}
						);
					}
				})
			}

			$scope.updateFileObject = function(fileobject){
				var body={};
				//associate system file with this metadata File object
				body.associationIds = fileobject.associationIds;
				body.name = 'File';
				body.value= {};
				body.value['filename'] = fileobject._links.associationIds[0].href.split('system')[1];
				body.value['path'] = fileobject._links.associationIds[0].href.split('system')[1];
				//File Schema uuid
				body.schemaId = '3557207775540866585-242ac1110-0001-013';
				MetaController.updateMetadata(body,fileobject.uuid)
					.then(
						function(response){
							$scope.metadataUuid = response.result.uuid;
							//App.alert({message: $translate.instant('File is ready for adding metadata') });
							//add the default permissions for the system in addition to the owners
							MetadataService.addDefaultPermissions($scope.metadataUuid);
							$scope.requesting = false;
							$scope.refresh();
						},
						function(response){
							MessageService.handle(response, $translate.instant('error_metadata_add'));
							$scope.requesting = false;
						}
					);
				}

				//if file metadata objects are missing create them
				$scope.checkFileMetadata = function(){
					if ($scope.fileMetadataObjects.length < $scope.fileUuids.length){
						FilesMetadataService.createFileMetadataObjects($scope.fileUuids).then(
						 MetaController.listMetadata("{$and:[{'name':'File'},{'associationIds':{$in :['"+$scope.fileUuids.join("','")+"']}}]}").then(
							 function(resp){
								 $scope.fileMetadataObjects = resp.result;
								 $scope.populateAssociatedMetadata();
								 $scope.fetchModalMetadata();
							 }
						 )
					  )
					 }
				}
/////////Modal Stuff/////////////////////
			$scope.fetchModalMetadata = function(){
				MetaController.listMetadata(
					$scope.query, $scope.limit
				)
					.then(
						function (response) {
							if (response.result.length == $scope.limit) {
				              $scope.can_fetch_more = true;
				            } else {
				              $scope.can_fetch_more = false;
				            }
							$scope.metadata= response.result;
							$scope.requesting = false;
						},
						function(response){
							MessageService.handle(response, $translate.instant('error_metadata_list'));
							$scope.requesting = false;
						}
				);
			}
			//$scope.fetchModalMetadata();
			
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

		$scope.addAssociation = function(metadatumUuid) {
			var promise = []
			promise.push(FilesMetadataService.addMultipleAssociationIds(metadatumUuid, $stateParams.fileUuids)// $scope.fileMetadataObjects, metadatumUuid)
				/*.then(function(response) {
					//$scope.matchingAssociationIds.push(metadatumUuid)
					/*$rootScope.$broadcast('associationsUpdated')
					$scope.fetchModalMetadata();
					$scope.fetchFileMetadataObjects();
					$scope.populateAssociatedMetadata();*/
				//});
			)
			$q.all(promise).then(
	          function(data) {
				  $scope.fetchModalMetadata();
					$scope.fetchFileMetadataObjects();
					$scope.populateAssociatedMetadata();
					$scope.fetchDataDescriptors();
					//console.log("JEN FMRMAC: associationsUpdated broadcast being sent");
	            $rootScope.$broadcast('associationsUpdated')
	          },
	          function(data) {
	            
	        });
		}

		$scope.unAssociateMetadata = function(metadatumUuid){
			var promise = []
			var unAssociate = $window.confirm('Are you sure you want to remove the metadata/file association?');
      //$scope.confirmAction(metadatum.name, metadatum, 'delete', $scope[$scope._COLLECTION_NAME])
    	if (unAssociate) {
			
			promise.push(FilesMetadataService.removeMultipleAssociationIds(metadatumUuid,$stateParams.fileUuids))
				/*.then(function(response) {
					//remove uuid of unassociated metadata object
					//var index = $scope.matchingAssociationIds.indexOf(metadatumUuid);
					//$scope.matchingAssociationIds.splice(index, 1);
					$rootScope.$broadcast('associationRemoved')
				});*/
			}
			$q.all(promise).then(
	          function(data) {
				  $scope.fetchModalMetadata();
					$scope.fetchFileMetadataObjects();
					$scope.populateAssociatedMetadata();
					//console.log("JEN FMRMAC: associationRemoved broadcast being sent");
	            $rootScope.$broadcast('associationRemoved')
	          },
	          function(data) {
	            
	        });
		}

	/*		$scope.addClone = function(metadatumUuid) {
				$scope.checkFileMetadata()
				if (metadatumUuid){
					$scope.requesting = true;
					MetaController.getMetadata(metadatumUuid)
						.then(function(response){
							$scope.metadatum = response.result;
							var body = {};
							body.name = $scope.metadatum.name;
							body.value = $scope.metadatum.value;
							body.schemaId = $scope.metadatum.schemaId;
							MetaController.addMetadata(body)
								.then(
									function(response){
										$scope.new_metadataUuid = response.result.uuid;
										MetadataService.addDefaultPermissions($scope.new_metadataUuid);
										App.alert({message: $translate.instant('success_metadata_add') + ' ' + $scope.new_metadataUuid });
										FilesMetadataService.addAssociations($scope.fileMetadataObjects, $scope.new_metadataUuid)
											.then(function(response) {
												//$scope.matchingAssociationIds.push(metadatumUuid)
												//$rootScope.$broadcast('associationsUpdated')

											//	need to send to modal instead
												$scope.requesting = false;
												$scope.openEditMetadata($scope.new_metadataUuid, 'lg')
											//	$state.go('metadata-edit',{uuid: $scope.new_metadataUuid});
											});

									},
									function(response){
										MessageService.handle(response, $translate.instant('error_metadata_add'));
										$scope.requesting = false;
									}
								)
						})
					 }
				else{
						 MessageService.handle(schema_response, $translate.instant('error_metadataschemas_get'));
					 }
					 $scope.requesting = false;
				}*/

		$scope.open = function (size) {
				$scope.fetchModalMetadata();
				var modalInstance = $uibModal.open({
					animation: $scope.animationsEnabled,
					templateUrl: 'views/modals/ModalAssociateMetadata.html',
					controller: 'ModalAssociateMetadataMultiFileCtrl',
					scope: $scope,
					size: size,
					resolve: {

					}
				});
		};
		
		/////////Modal Stuff/////////////////////
		  $scope.open = function (size, types, title) {
		    //Set the
		    $scope.modalSchemas = types.slice(0);
		    $scope.selectedSchema = types.slice(0);
		    $scope.modalTitle = title;
		    var modalInstance = $uibModal.open({
		      animation: $scope.animationsEnabled,
		      templateUrl: 'views/modals/ModalAssociateDataDescriptor.html',
		      controller: 'ModalAssociateMetadataMultiFileCtrl',
		      scope: $scope,
		      size: size,
			  backdrop: 'static',
        	  keyboard : false,
		      resolve: {
		
		      }
		    });
		    //$scope.fetchModalMetadata();
		    $scope.searchAll();
		  };

		$scope.openEditMetadata = function (metadatumuuid, size) {
			$scope.metadataUuid = metadatumuuid;
				var modalInstance = $uibModal.open({
					animation: $scope.animationsEnabled,
					templateUrl: 'views/modals/ModalEditMetadata.html',
					controller: 'ModalMetadataResourceEditController',
					scope: $scope,
					size: size,
					backdrop: 'static',
      				keyboard : false,
					metadataUuid: metadatumuuid,
					resolve: {

					}
				}
			);
		};

		$scope.openViewMetadata = function (metadatumuuid, size) {
			$scope.metadataUuid = metadatumuuid;
				var modalInstance = $uibModal.open({
					animation: $scope.animationsEnabled,
					templateUrl: 'views/modals/ModalViewMetadata.html',
					controller: 'ModalMetadataResourceDetailsController',
					scope: $scope,
					size: size,
					backdrop: 'static',
      				keyboard : false,
					metadataUuid: metadatumuuid,
					profile: $scope.profile,
					resolve: {

					}
				}
			);
		};

		$scope.openViewDataDescriptor = function (dataDescriptorUuid, size) {
			$scope.uuid = dataDescriptorUuid;
			$scope.action = "view";
			var modalInstance = $uibModal.open({
				animation: $scope.animationsEnabled,
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
		};





		$scope.openEditDataDescriptor= function (dataDescriptorUuid, size) {
			console.log("Jen FMRMAC: openEditDataDescriptor: " + dataDescriptorUuid);
			$scope.uuid = dataDescriptorUuid;
			$scope.action = "edit";
			var modalInstance = $uibModal.open({
				animation: $scope.animationsEnabled,
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
		};


		$scope.openCreate = function (dataDescriptorUuid, size) {
			$scope.uuid = dataDescriptorUuid;
			$scope.action = "create";
      var modalInstance = $uibModal.open({
        animation: $scope.animationsEnabled,
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
		};
		
		$scope.openClone = function (dataDescriptorUuid, size) {
			console.log("JEN FMRMAC: openClone: " + dataDescriptorUuid);
			$scope.uuid = dataDescriptorUuid;
			//$state.go("datadescriptor",{'uuid': $scope.dataDescriptorUuid, 'action': 'clone'});
			
			$scope.action = "clone";
		      var modalInstance = $uibModal.open({
		        animation: $scope.animationsEnabled,
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
					console.log("JEN FMRMAC: trying to close Clone: " + dataDescriptorUuid);
					//modalInstance.close();
		}


		// metadatumUuid is really dataDescriptorUuid, but since I'm modifying
		// an old method and don't want a bunch of arbitrary changes to show 
		// during a comparison, I just do an assignment on the first line.
		$scope.addClone = function (dataDescriptorUuid) {
		    //console.log("JEN FMRMAC: addClone from dd: " + dataDescriptorUuid);
		    metadatumUuid = dataDescriptorUuid;
		    if (metadatumUuid) {
		      $scope.requesting = true;
		      MetaController.getMetadata(metadatumUuid)
		        .then(function (response) {
		          $scope.metadatum = response.result;
		          var body = {};
		          body.name = $scope.metadatum.name;
		          body.value = $scope.metadatum.value;
				  body.value.title = body.value.title + "_Clone"
				  body.value.published = "False"
		          body.schemaId = $scope.metadatum.schemaId;
				  //make  associationIds - current files
		          if($stateParams.fileUuids){
 		            body.associationIds = $stateParams.fileUuids
 		          }
				  //copy metadata associations
				  angular.forEach($scope.metadatum._links.associationIds, function(associationId, key) {
					  console.log(associationId.title)
					  if(associationId.title == 'metadata'){
					    body.associationIds.push(associationId.rel)
					  }
				  });
		          MetaController.addMetadata(body)
		            .then(
		              function (response) {
		                //$modalInstance.close();
		                $scope.new_metadataUuid = response.result.uuid;
		                $scope.ddUuid = $scope.new_metadataUuid;
		                MetadataService.addDefaultPermissions($scope.new_metadataUuid);
		                App.alert({
		                  message: $translate.instant('success_metadata_add') + ' ' + body.name,
		                  closeInSeconds: 5
		                });
		
		                $scope.requesting = false;
		                //$scope.openEditMetadata($scope.new_metadataUuid,'lg')
		                console.log("clone made, new dd: " + $scope.new_metadataUuid);
		
		                $scope.openEditDataDescriptor($scope.new_metadataUuid, 'lg') 
						$scope.refresh();
		                //$state.go('datadescriptor', {
		                //  uuid: $scope.new_metadataUuid,
		                //  "action": "edit"
		                //});
		    
		                //$scope.openEditDataDescriptor($scope.new_metadataUuid,'lg');
		                
		              },
		              function (response) {
		                MessageService.handle(response, $translate.instant('error_metadata_add'));
		                $scope.requesting = false;
		              }
		            )
		        })
		    } else {
		      App.alert({
		        type: 'danger',
		        message: $translate.instant('Error access existing Data Descritpor!'),
		        closeInSeconds: 5
		      });
		    }
		    //$scope.close();
		    $scope.requesting = false;
		}
		
		/*$scope.openCreate = function (schemauuid, size) {
			//check if file ojects all exist - wait to open modal until they do
				$scope.selectedSchemaUuid = schemauuid;
				$scope.modalSize = size;
				$scope.fetchModalMetadata();
				 var modalInstance = $uibModal.open({
					 animation: $scope.animationsEnabled,
					 templateUrl: 'views/modals/ModalCreateMetadata.html',
					 controller: 'ModalMetadataResourceCreateController',
					 scope: $scope,
					 size: $scope.modalSize ,
					 schemaUuid: $scope.selectedSchemaUuid,
					 fileMetadataObjects: $scope.fileMetadataObjects,
					 resolve: {

					 }
				 }
			 );
		};*/
		///////Assoc modal search////////
		$scope.schemaBox = {val1:true,val2:true,val5:true};
		$scope.wellbox = true;
		$scope.searchField = {value:''}
		query_array = []
		$scope.searchAll = function(){
		  //alert($scope.filter)
		  $scope.requesting = true;
//		  query_array = [{'name':'DataDescriptor'},{$text:{$search:'"+$scope.searchField.value+"'}}]
//		  if($scope.owner_filter) {
//			 query_array.push({'owner':'"+$localStorage.activeProfile.username+"'})
//		  }
//          $scope.and_query = JSON.stringify(fileandquery).replace(/"/g, "'");
//		  $scope.query = JSON.stringify(and_query).replace(/"/g, "'");//"{$and: [{'name':'DataDescriptor'},{'owner':'"+$localStorage.activeProfile.username+"'},{$text:{$search:'"+$scope.searchField.value+"'}}]}";//JSON.stringify(andquery);
//		  
			var orquery = {}
	        var andquery = {}
	        var queryarray = []
	        var andarray = []
	        var innerquery = {}
	        var typearray = []
			$scope.offset = 0;
			var vquery = {}
			console.log('SEARCHBOX: '+ angular.toJson($scope.searchCheckBox))
			if ($scope.searchCheckBox.checked){
				console.log('checked')
	            vquery['owner'] = {$regex: $localStorage.activeProfile.username, '$options':'i'}
				andarray.push(vquery);
			}
	        if ($scope.searchField.value != ''){
	            console.log('searching')
	            console.log(angular.toJson($scope.metadataschema))
	          //angular.forEach($scope.metadataschema, function(value, key){
	            //alert(angular.toJson(value))

	           // console.log(value.schema.title)
	            //if($scope.approvedSchema.indexOf(value.schema.title) > -1){
	            //    console.log(value.schema.title)
	              angular.forEach($scope.metadataschema.schema.properties, function(val, key){
	                  console.log(val)
	                var valquery = {}
	                valquery['value.'+key] = {$regex: $scope.searchField.value, '$options':'i'}
	                queryarray.push(valquery)
	              })
	            //}
	        //  })
	          orquery['$or'] = queryarray;
	       }
	        var typequery = {}
			var ownerquery = {}
	        typearray.push('DataDescriptor')
	        typequery['name'] = {'$in': typearray}
			/*if (!$scope.searchCheckBox.val1){
			  ownerquery['owner'] = $localStorage.activeProfile.username
			  andarray.push(ownerquery)
			}*/
	        andarray.push(typequery)
	        andarray.push(orquery)
	        andquery['$and'] = andarray;
	        $scope.query = JSON.stringify(andquery);
		  
		  $scope.fetchModalMetadata();
		}

        
		
	$scope.refresh = function() {
      $scope.requesting = true;
	  MetadataService.fetchSystemMetadataSchemaUuid('DataDescriptor')
      .then(function(){
		uuid = $localStorage["schema_DataDescriptor"]
        //console.log(angular.toJson(uuid))
	      MetaController.getMetadataSchema(uuid,1,0
		  ).then(function(response){
	        $scope.metadataschema = response.result;
	        $scope.requesting = false;
	      })
		  if ($stateParams.schemauuid != null) {
			$scope.fetchMetadataSchema($stateParams.schemauuid);
	      }
		  $scope.searchAll();
	  })
    };

    $scope.refresh();
	
}).controller('ModalAssociateMetadataMultiFileCtrl', function ($scope, $modalInstance, MetaController) {
	///$scope.uuid = filemetadatumUuid;
	$scope.cancel = function () {
		$modalInstance.close();
	};

	$scope.fetchModalMetadata = function(){
		MetaController.listMetadata(
			$scope.query
		)
			.then(
				function (response) {
					$scope.metadata= response.result;
					$scope.requesting = false;
				},
				function(response){
					MessageService.handle(response, $translate.instant('error_metadata_list'));
					$scope.requesting = false;
				}
		);

	}
});
