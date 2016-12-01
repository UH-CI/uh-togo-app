angular.module('AgaveToGo').controller('SearchController', function ($scope, $state, $translate, MetaController, FilesController, FilesMetadataService, ActionsService, MessageService) {
    $scope._COLLECTION_NAME = 'metadata';
    $scope._RESOURCE_NAME = 'metadatum';


    $scope.queryLimit = 99999;

    $scope.offset = 0;
    $scope.limit = 100;

    $scope.sortType = 'name';
    $scope.sortReverse  = true;
    $scope.status = 'active';
    $scope.available = true;
    $scope.query = '';

    $scope.refresh = function() {
      $scope.requesting = true;

      MetaController.listMetadata(
        $scope.query
      )
        .then(
          function (response) {
            $scope.totalItems = response.result.length;
            $scope.pagesTotal = Math.ceil(response.result.length / $scope.limit);
            $scope[$scope._COLLECTION_NAME] = response.result;
            $scope.requesting = false;
          },
          function(response){
            MessageService.handle(response, $translate.instant('error_metadata_list'));
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

    //looking for an array of JSON association_Id objects
    $scope.download = function(associationIds_array){
      var file_urls =[];
      angular.forEach(associationIds_array, function(value, key){
        file_urls.push(value.href);
      })
      $scope.requesting = true;
      //pass array of file hrefs
      FilesMetadataService.downloadSelected(file_urls).then(function(result){
        $scope.requesting = false;
      });
    }

});