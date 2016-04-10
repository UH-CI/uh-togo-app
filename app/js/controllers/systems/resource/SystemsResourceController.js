angular.module('AgaveToGo').controller("SystemsResourceController", function($scope, $state) {

		$scope.go = function(route){
			$state.go(route);
		};

		$scope.active = function(route){
			// default to details tab
			if ($state.current.name === "systems"){
				$state.go("systems.details")
			}
			return $state.is(route);
		};

		$scope.tabs = [
			{ heading: "Details", route:"systems.details", active:false },
			{ heading: "Applications", route:"systems.apps", active:false },
			{ heading: "Stats", route:"systems.stats", active:false },
		];

		$scope.$on("$stateChangeSuccess", function() {
			$scope.tabs.forEach(function(tab) {
				tab.active = $scope.active(tab.route);
			});
		});
	});
