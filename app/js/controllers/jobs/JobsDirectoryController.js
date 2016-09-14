angular.module('AgaveToGo').controller('JobsDirectoryController', function ($scope, $state, $translate, JobsController, ActionsService, MessageService) {    $scope._COLLECTION_NAME = 'jobs';    $scope._RESOURCE_NAME = 'job';    $scope.sortType = 'startTime';    $scope.sortReverse  = true;    $scope.query = '';    $scope.refresh = function() {      $scope.requesting = true;      JobsController.searchJobs(        $scope.query      )        .then(          function (response) {            $scope.totalItems = response.result.length;            $scope.pagesTotal = Math.ceil(response.result.length / $scope.limit);            $scope[$scope._COLLECTION_NAME] = response.result;            $scope.requesting = false;          },          function(response){            MessageService.handle(response, $translate.instant('error_jobs_list'));            $scope.requesting = false;          }      );    };    $scope.searchTools = function(query){      $scope.query = query;      $scope.refresh();    }    $scope.browse = function(id){      JobsController.getJobDetails(id)        .then(          function(response){            $state.go('data-explorer', {'systemId': response.result.archiveSystem, path: response.result.archivePath});          },          function(response){            MessageService.handle(response, $translate.instant('error_jobs_list'));            $scope.requesting = false;          }        );    }    $scope.refresh();    $scope.confirmAction = function(resourceType, resource, resourceAction, resourceList, resourceIndex){      ActionsService.confirmAction(resourceType, resource, resourceAction, resourceList, resourceIndex);    }});