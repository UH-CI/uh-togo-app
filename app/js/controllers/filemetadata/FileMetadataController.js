angular.module('AgaveToGo').controller('FileMetadataController', function ($scope, $state, $stateParams, $translate, $timeout, $window, $localStorage,  $uibModal, MetaController, FilesController, FilesMetadataService, ActionsService, MessageService, MetadataService) {
    $scope._COLLECTION_NAME = 'filemetadata';
    $scope._RESOURCE_NAME = 'filemetadatum';

    $scope.profile = $localStorage.activeProfile;

    $scope.sortType = 'name';
    $scope.sortReverse  = true;

    //Don't display metadata of these types
    $scope.ignoreMetadataType = ['published','stagged','PublishedFile','rejected','File'];
    //Don't display metadata schema types as options
    $scope.ignoreSchemaType = ['PublishedFile'];

    //set admin
    $scope.edit_perm = MetadataService.getAdmins;

    $scope.query = ''//'{"associationIds":"' +  $stateParams.uuid + '"}';
    $scope.schemaQuery ='';//"{'owner':'seanbc'}";
    //$scope.query ="{'associationIds':'673572511630299622-242ac113-0001-002'}";
  //  $scope.query["associationIds"] = $stateParams.uuid;

    $scope.filemetadatumUuid = $stateParams.uuid;

    $scope.refresh = function() {
      $scope.requesting = true;
      MetaController.listMetadataSchema(
				$scope.schemaQuery
			).then(function(response){
				$scope.metadataschema = response.result;
				$scope.requesting = false;
			})
      //check if default filemetadata object exists
      MetaController.listMetadata("{$and:[{'name':'File'},{'associationIds':'"+$stateParams.uuid+"'}]}").then(

        function (response) {
          $scope.fileMetadataObject = response.result;

          if ($scope.fileMetadataObject == ""){
            //we have no object so create a new one
            $scope.createFileObject($stateParams.uuid);
          }
          else{
            //we have an object to modify our query for gettting metadata
            if ($scope.fileMetadataObject[0].value.filename != $scope.fileMetadataObject[0]._links.associationIds[0].href.split('system')[1])
            {
              //if filename or path is off change File metadata object
              $scope.updateFileObject($scope.fileMetadataObject[0]);
            }
            else{
              //filename & path are good fetch associated metadata
              $scope.filename = $scope.fileMetadataObject[0]._links.associationIds[0].href.split('system')[1];
              $scope.fetchMetadata("{'uuid':{$in: ['"+$scope.fileMetadataObject[0].associationIds.join("','")+"']}}")
            }
          }
        },
        function(response){
          MessageService.handle(response, $translate.instant('error_filemetadata_list'));
          $scope.requesting = false;
        }
      )

      MetaController.listMetadataSchema(
        $scope.schemaQuery
      ).then(function(response){$scope.metadataschema = response.result;})

    };

    $scope.fetchMetadata = function(metadata_query){
      MetaController.listMetadata(metadata_query,100,0).then(
          function (response) {
            $scope.totalItems = response.result.length;
            $scope.pagesTotal = Math.ceil(response.result.length / $scope.limit);
            $scope[$scope._COLLECTION_NAME] = response.result;
            $scope.requesting = false;
          },
          function(response){
            MessageService.handle(response, $translate.instant('error_filemetadata_list'));
            $scope.requesting = false;
          }
      );
    };

    $scope.searchTools = function(query){
      $scope.query = query;
      $scope.refresh();
    }


    $scope.refresh();

    $scope.confirmAction = function(resourceType, resource, resourceAction, resourceList, resourceIndex){
      ActionsService.confirmAction(resourceType, resource, resourceAction, resourceList, resourceIndex);
    }

    $scope.unAssociateMetadata = function(metadatum){
      $scope.requesting = true;
      var unAssociate = $window.confirm('Are you sure you want to remove the metadata/file association?');
      //$scope.confirmAction(metadatum.name, metadatum, 'delete', $scope[$scope._COLLECTION_NAME])
    if (unAssociate) {
      FilesMetadataService.removeAssociation($scope.fileMetadataObject[0].uuid, metadatum.uuid).then(function(result){
        $scope.metadatum = null;
        //pause to let model update
        $timeout(function(){$scope.refresh()}, 300);
        $scope.requesting = false;
      });
    }else{
      $scope.requesting = false;
    }
    }

    $scope.createFileObject = function(fileUuid){
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
            $scope.requesting = false;
            $scope.refresh();
          },
          function(response){
            MessageService.handle(response, $translate.instant('error_metadata_add'));
            $scope.requesting = false;
          }
        );
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

        $scope.confirmAction = function(resourceType, resource, resourceAction, resourceList, resourceIndex){
          ActionsService.confirmAction(resourceType, resource, resourceAction, resourceList, resourceIndex);
        }

        $scope.confirmRemove = function(metadatum){
          $scope.confirmAction(metadatum.name, metadatum, 'delete', $scope[$scope._COLLECTION_NAME])
        }


        $scope.animationsEnabled = true;

/////////Modal Stuff/////////////////////
        $scope.fetchModalMetadata = function(query){
          MetaController.listMetadata(
            query
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
        
        $scope.addAssociation = function(metadatumUuid) {
          if (metadatumUuid){
        		$scope.requesting = true;
        	  MetaController.getMetadata($scope.fileMetadataObject[0].uuid)
              .then(function(response){
                $scope.metadatum = response.result;
                var body = {};
                body.associationIds = $scope.metadatum.associationIds;
                //check if fileUuid is already associated
                if (body.associationIds.indexOf(metadatumUuid) < 0) {
                  body.associationIds.push(metadatumUuid);
                  body.name = $scope.metadatum.name;
                  body.value = $scope.metadatum.value;
                  body.schemaId = $scope.metadatum.schemaId;
                  MetaController.updateMetadata(body,$scope.fileMetadataObject[0].uuid)
                  .then(
                    function(response){
                      // decided not to show the metadata name in the error message as it would require that to be passed in, or another call
                      App.alert({message: $translate.instant('success_metadata_update_assocation') });
                      $scope.requesting = false;
                      $scope.refresh();
                      //$state.go('metadata',{id: $scope.metadataUuid});
                    },
                    function(response){
                      MessageService.handle(response, $translate.instant('error_metadata_update_assocation'));
                      $scope.requesting = false;
                    }
                  )
                }
                else {
                  App.alert({type: 'danger',message: $translate.instant('error_metadata_update_assocation_exists') });
                  return
                }
              })
             }
          else{
               MessageService.handle(schema_response, $translate.instant('error_metadataschemas_get'));
             }
             $scope.requesting = false;
          }

          $scope.addClone = function(metadatumUuid) {
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
                        App.alert({message: $translate.instant('success_metadata_add') + ' ' + body.name });
                        $scope.addAssociation($scope.new_metadataUuid)
                        $scope.requesting = false;
                        $state.go('metadata-edit',{uuid: $scope.new_metadataUuid});
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
            }
        $scope.open = function (size) {

            var modalInstance = $uibModal.open({
              animation: $scope.animationsEnabled,
              templateUrl: 'views/modals/ModalAssociateMetadata.html',
              controller: 'ModalAssociateMetadatCtrl',
              scope: $scope,
              size: size,
              resolve: {

              }
            }
          );
          $scope.fetchModalMetadata();
        };

}).controller('ModalAssociateMetadatCtrl', function ($scope, $modalInstance, MetaController) {
      ///$scope.uuid = filemetadatumUuid;
      $scope.cancel = function () {
        $modalInstance.close();
      };

      $scope.fetchModalMetadata = function(query){
        MetaController.listMetadata(
          query
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
