angular.module('AgaveAuth').controller('TenantSelectionController', function ($injector, $timeout, $rootScope, $scope, $state, $location, $window, settings, $localStorage, TenantsController, Commons, Alerts) {

    settings.layout.tenantPage = false;
    settings.layout.loginPage = true;
    
    $scope.tenant = {selected: "ikewai", code: "ikewai", name: "UH Agave Platform"};
    $scope.tenants = ["ikewai"];
    $scope.displayTenant ={
		"id": "0001411570998814-b0b0b0bb0b-0001-018",
		"name": "IkeWai Tenant",
		"baseUrl": "https://ikeauth.its.hawaii.edu/",
		"code": "ikewai",
		"contact": [{
			"name": "Sean Cleveland",
			"email": "seanbc@uhawaii.edu",
			"url": "",
			"type": "admin",
			"primary": true
		}],
		"_links": {
			"self": {
				"href": "https://docker.example.com/tenants/v2/ikewai"
			},
			"publickey": {
				"href": "https://ikeauth.its.hawaii.edu/apim/v2/publickey"
			}
		}
	};
    //TenantsController.listTenants().then(
    //    function (response) {
    //        console.log(response);
    //        var tenants = [];
    //        angular.forEach(response, function (tenant, key) {
    //            if (settings.debug
    //                || !(Commons.contains(tenant.name.toLowerCase(), 'staging')
    //                || Commons.contains(tenant.name.toLowerCase(), 'dev')))
    //            {
    //                tenants.push(tenant);
    //            }
    //        });
    //        $timeout(function() {
    //            $scope.tenants = tenants;
    //            console.log($scope.tenants);
    //        }, 50);
    //
    //        //$timeout(function () {
    //        //
    //        //}, 50);
    //    },
    //    function (message) {
    //        console.log("error: " + message);
    //        Alerts.danger({message: "Failed to retrieve tenant information."});
    //    }
    //);

    //$scope.$watch('$rootScope.settings.tenants', function(value){
    //    $timeout(function() {
    //        $scope.tenants = value;
    //    }, 500);
    //}, true);
    //TenantsController.listTenants().then(
    //    function (response) {
    //        $timeout(function () {
    //            console.log(response);
    //            $scope.tenants = response;
    //        }, 50);
    //    },
    //    function (message) {
    //        console.log("error: " + message);
    //        Alerts.danger({message: "Failed to retrieve tenant list."});
    //    }
    //);

    $scope.updateTenant = function(item, model) {
        $timeout(function() {
            $scope.displayTenant = item;
        }, 0);
    }

    $scope.loadTenant = function() {
      //alert(angular.toJson($scope.displayTenant);
        if ($scope.displayTenant && $scope.displayTenant.code) {
            $localStorage.tenant = $scope.displayTenant;
            $location.path('login/' + $scope.displayTenant.code);
            $location.replace();
        } else {
            Alerts.danger({container: ".lock-body .message", message: "Select an organization to login."});
        }
    };

    $timeout(function() {
       $localStorage.tenant = $scope.displayTenant;
       $location.path('login/' + $scope.displayTenant.code);
       $location.replace();
     });

});
