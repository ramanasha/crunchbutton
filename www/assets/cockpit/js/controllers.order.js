NGApp.config(['$routeProvider', function($routeProvider) {
	$routeProvider
		.when('/orders', {
			action: 'orders',
			controller: 'OrdersCtrl',
			templateUrl: '/assets/view/orders.html',
			reloadOnSearch: false
		})
		.when('/campus-manager/orders', {
			action: 'orders',
			controller: 'OrdersCampusManagerCtrl',
			templateUrl: '/assets/view/orders.html',
			reloadOnSearch: false
		}).
		when('/order/:id', {
			action: 'order',
			controller: 'OrderCtrl',
			templateUrl: '/assets/view/orders-order.html'
		});
}]);

NGApp.controller('OrdersCampusManagerCtrl', function($scope, $controller) {
	angular.extend(this, $controller('OrdersCtrl', {$scope: $scope}));
	$scope.regularList = false;
	$scope.campusManagerList = true;
	$scope.showSearchByPlaces = false;
});

NGApp.controller('OrdersCtrl', function ($rootScope, $scope, $location, OrderService, ViewListService, SocketService, MapService, TicketService, RestaurantService, CommunityService, DriverService) {

	$scope.regularList = true;
	$scope.showSearchByPlaces = true;

	angular.extend($scope, ViewListService);

//	var query = $location.search();
//	$scope.query.view = 'list';

	SocketService.listen('orders', $scope)
		.on('update', function(d) {
			for (var x in $scope.orders) {
				if ($scope.orders[x].id_order == d.id_order) {
					$scope.orders[x] = d;
				}
			}

		}).on('create', function(d) {
			$scope.update();
		});

	var draw = function() {
		if (!$scope.map || !$scope.orders) {
			return;
		}

		MapService.trackOrders({
			map: $scope.map,
			orders: $scope.orders,
			id: 'orders-location',
			scope: $scope
		});
	};

	$scope.ticket = function(id_order) {
		OrderService.ticket(id_order, function(json) {
			if (json.id_support) {
				ticket(json.id_support);
			} else {
				App.alert('Fail retrieving support ticket!' );
			}
		});
	}

	var ticket = function( id_support ){
		var url = '/ticket/' + id_support;
		$scope.navigation.link( url );
	}

	$scope.$on('mapInitialized', function(event, map) {
		$scope.map = map;
		MapService.style(map);
		draw();
	});

	$scope.view({
		scope: $scope,
		watch: {
			search: '',
			restaurant: '',
			community: '',
			driver: '',
			date: '',
			view: 'list',
			datestart: '',
			dateend: '',
			user: '',
			phone: '',
			type: 'all',
			fullcount: false
		},
		update: function() {
			OrderService.list($scope.query, function(d) {
				$scope.orders = d.results;
				$scope.complete(d);
				draw();
				$rootScope.$broadcast('tab-loaded');
			});
			if( ( $scope.query.community || $scope.query.restaurant || $scope.query.driver ) && !$scope.show_more_options ){
				$scope.moreOptions();
			}
		}
	});

	$scope.show_more_options = false;

	$scope.exports = function(){
		var params = {};
		angular.copy( $scope.query, params );
		OrderService.exports( params, function(){
		} );
	}

	$scope.moreOptions = function(){
		$scope.show_more_options = !$scope.show_more_options;

		if( $scope.show_more_options) {

			if( !$scope.restaurants ){
				$scope.restaurants = [];
				RestaurantService.shortlist( function( json ){
					$scope.restaurants = json;
				} );
			}

			if( !$scope.communities ){
				CommunityService.listSimple( function( json ){
					$scope.communities = json;
				} );
			}

			if( !$scope.drivers ){
				DriverService.listSimple( function( json ){
					$scope.drivers = json;
				} );
			}
		}

		$rootScope.$broadcast('search-toggle');
	}

	var options = [];
	options.push( { value: 'all', label: 'All' } );
	options.push( { value: 'pre-orders', label: 'Pre orders' } );
	$scope.types = options;

	var options = [];
	options.push( { value: '20', label: '20' } );
	options.push( { value: '50', label: '50' } );
	options.push( { value: '100', label: '100' } );
	options.push( { value: '200', label: '200' } );
	options.push( { value: '300', label: '300 (exports only)' } );
	options.push( { value: '400', label: '400 (exports only)' } );
	options.push( { value: '500', label: '500 (exports only)' } );
	$scope.limits = options;

});

NGApp.controller('OrderRefundCtrl', function ($scope, $rootScope, OrderService ) {

	var id_order = null;
	var callback = null;
	$scope.refund = null;
	$scope.isRefunding = false;
	$scope.formRefundSubmitted = false;

	$rootScope.$on( 'openRefundOrderOptions', function(e, data) {

		id_order = data.id_order;
		callback = data.callback;

		// means that the restaurant should be warned
		if( !data.delivery_service || data.formal_relationship ){
			var text = "The restaurant has already received this order! To cancel this order, 1st call the restaurant to see if the food has already been prepared. If it hasn't, tell the restaurant we are cancelling it. If the food HAS been prepared, tell the customer that we cannot cancel the order.";
			App.confirm(
				text,
				'Action required',
				function(){ setTimeout( function(){ refundMessage(); }, 500 ); },
				function(){}, 'Ok,Cancel', true );
		} else {
			refundMessage();
		}

	});

	var refundMessage = function(){
		App.dialog.show('.refund-order-container');
		OrderService.refund_info( id_order, function(d) {
			$scope.order = d;
			$scope.refund_amount = parseFloat( d.charged ) > 0 ? true : false;
			$scope.refund = {cancel_order: true};
			$scope.refund.id_order = d.id_order;
			$scope.refund.amount = parseFloat( d.charged );
			$scope.amount_max = parseFloat( d.charged );
		});
	}

	var options = [];
	options.push( { value: 'Customer canceled', label: 'Customer canceled' } );
	options.push( { value: 'Food really late', label: 'Food really late' } );
	options.push( { value: 'Wrong food delivered', label: 'Wrong food delivered' } );
	options.push( { value: 'Canceled due to lack of drivers', label: 'Canceled due to lack of drivers' } );
	options.push( { value: 'Other', label: 'Other' } );
	$scope.reasons = options;

	$scope.refund_order = function(){

		if( $scope.formRefund.$invalid ){
			$scope.formRefundSubmitted = true;
			return;
		}

		$scope.isRefunding = true;
		OrderService.refund( $scope.refund, function( result ){
				$scope.isRefunding = false;
				if( result.success ){
					if( callback ){
						callback();
					}
					$rootScope.closePopup();
				} else {
					if( result.error ){
						App.alert( result.error );
					} else {
						console.log( result.responseText );
						var er = result.errors ? "<br>" + result.errors : 'See the console.log!';
						App.alert('Refunding fail! ' + er);
					}
				}
		} );
	}
});

NGApp.controller('OrderSendTextDriversCtrl', function ($scope, $rootScope, CallService ) {
	$scope.loading = true;
	$rootScope.$on('openSendTextDrivers', function(e, data) {
		$scope.drivers = data.drivers;
		$scope.message = data.message;
		$scope.loading = false;
		App.dialog.show('.send-text-drivers-container');
	});

	$scope.send_text = function(){
		var phones = new Array();
		for(x in $scope.drivers){
			if($scope.drivers[x].sent){
				phones.push($scope.drivers[x].phone);
			}
		}
		if(!phones.length){
			alert('Please, select at least one driver!');
			return;
		}
		if(!$scope.message){
			alert('Please, type enter a message!');
			return;
		}
		$scope.formSMSSending = true;
		var params = {phone: phones, message: $scope.message};
		CallService.send_sms_list(params, function( json ){
			$scope.formSMSSending = false;
			$rootScope.closePopup();
			if( json.success ){
				setTimeout(function() { App.alert( 'Text sent to drivers!<br>' ); }, 500);
			} else {
				setTimeout(function() { App.alert( 'Error sending text!' ); }, 500);
			}
		} );
	}
});

NGApp.controller('OrderCtrl', function ($scope, $rootScope, $routeParams, $interval, OrderService, MapService, SocketService) {

	SocketService.listen('order.' + $routeParams.id, $scope)
		.on('update', function(d) {
			$scope.order = d;
		});

	$scope.loading = true;

	var draw = function() {
		if (!$scope.map || !$scope.order) {
			return;
		}
		MapService.trackOrder({
			map: $scope.map,
			order: $scope.order,
			restaurant: $scope.order.restaurant,
			driver: $scope.order.driver,
			id: 'order-driver-location',
			scope: $scope
		});
	};

	var update = function() {
		var loading = true;
		OrderService.get($routeParams.id, function(d) {
			$rootScope.title = 'Order #' + d.id_order;
			$scope.order = d;
			$scope.loading = false;
			draw();
		});
	};

	$rootScope.$on( 'orderDeliveryStatusChanged', function(e, data) {
		update();
	});

	$scope.$on('mapInitialized', function(event, map) {
		$scope.map = map;
		MapService.style(map);
		draw();
	});

	var cleanup = $rootScope.$on('order-route-' + $routeParams.id, function(event, args) {
		$scope.$apply(function() {
			$scope.eta = args;
		});
		console.debug('Got route update: ', args);
	});

	$scope.updater = $interval(update, 30000); // update every 30 seconds
	$scope.$on('$destroy', function() {
		$interval.cancel($scope.updater);
		cleanup();
	});

	$scope.changeOrderStatus = function(){
		$rootScope.$broadcast( 'orderDeliveryStatusChange', { id_order: $routeParams.id, id_community: $scope.order.id_community }  );
	}

	$scope.refund = function(){
		OrderService.askRefund( $routeParams.id, $scope.order.delivery_service, $scope.order.restaurant.formal_relationship, function(){
			$rootScope.closePopup();
			setTimeout( function(){ App.alert( 'This order will be refunded soon!' ); }, 300 );
			$rootScope.reload();
		} );
	}

	$scope.do_not_pay_driver = function(){
		OrderService.do_not_pay_driver( $scope.order.id_order, function( result ){
			if( result.success ){
				App.alert( 'Saved!' );
			} else {
				App.alert( 'Error!' );
			}
		} );
	}

	$scope.campus_cash_retrieving = false;

	$scope.campus_cash = function (){
		if( $scope.campus_cash_retrieving ){
			return;
		}
		$scope.campus_cash_retrieving = true;
		var params = { id_order:$scope.order.id_order, sha1: $scope.order.campus_cash_sha1 }
		OrderService.campus_cash( params, function( result ){
			if( result.success ){
				App.alert( result.success, null, null, function(){}, true );
			} else {
				App.alert( 'Error!' );
			}
			$scope.campus_cash_retrieving = false;
		} );
	}

	$scope.mark_cash_card_charged = function(){
		var success = function(){
			OrderService.mark_cash_card_charged( $scope.order.id_order, function( result ){
				if( result.success ){
					$scope.order.campus_cash_charged = true;
				} else {
					App.alert( 'Error marking order as paid!' );
				}
			} );
		}
		$scope.order.campus_cash_charged = false;
		var fail = function(){};
		App.confirm('After you mark this order as charged you will not be able to see the Student ID Number anymore.', 'Confirm?', success, fail, 'Confirm,Cancel', true);
	}

	$scope.do_not_pay_restaurant = function(){
		OrderService.do_not_pay_restaurant( $scope.order.id_order, function( result ){
			if( result.success ){
				App.alert( 'Saved!' );
			} else {
				App.alert( 'Error!' );
			}
		} );
	}

	$scope.do_not_reimburse_driver = function(){
		OrderService.do_not_reimburse_driver( $scope.order.id_order, function( result ){
			if( result.success ){
				App.alert( 'Saved!' );
			} else {
				App.alert( 'Error!' );
			}
		} );
	}

	$scope.text_drivers = function(){
		OrderService.text_drivers($scope.order.id_order, function(data){
			data.id_order = $scope.order.id_order;
			$rootScope.$broadcast('openSendTextDrivers', data);
		} );
	}

	$scope.resend_notification_drivers = function(){
		$scope.isDriverNotifying = true;
		OrderService.resend_notification_drivers( $scope.order, function(result) {
			$scope.isDriverNotifying = false;
		});
	}

	$scope.resend_notification = function(){
		$scope.isRestaurantNotifying = true;
		OrderService.resend_notification( $scope.order, function(result) {
			$scope.isRestaurantNotifying = false;
		});
	}

	update();
});

NGApp.controller('OrderDeliveryStatusCtrl', function ( $scope, $rootScope, OrderService, DriverService ) {

	var id_order = null;
	var id_community = null;
	var id_driver = null;

	$rootScope.$on( 'orderDeliveryStatusChange', function(e, data) {
		$scope.status = null;
		$scope.notify_customer = false;
		$scope.isSaving = false;
		id_order = data.id_order;
		id_community = data.id_community;
		App.dialog.show('.change-status-dialog-container');
		load();
	} );

	$scope.driverChanged = function(){
		processOptions();
	}

	var processOptions = function(){
		$scope.notify_customer = ( $scope.status && $scope.status.driver && id_driver != $scope.status.driver.id_admin );
		$scope.statuses = [];
		angular.forEach( OrderService.statuses, function( value, key ) {
			var add = true;
			if( ( value.value == 'rejected' && $scope.status && $scope.status.driver && id_driver != $scope.status.driver.id_admin ) ){
				add = false;
			}
			if( value.value == 'canceled' ){
				add = true;
			}
			if( add ){
				$scope.statuses.push( value );
			}
		} );
	}

	var load = function(){

		$scope.text5MinAwaySending = false;

		OrderService.delivery_status( id_order, function( data ){
			$scope.status = data;
			if( data && data.driver && data.driver.id_admin ){
				id_driver = data.driver.id_admin;
				if( id_driver ){
					$scope.showText5MinAwayButton = true;
				}
			}
			processOptions();
		} );
		DriverService.byCommunity( id_community, function( data ){
			$scope.drivers = data;
		} );
	}

	$scope.text5MinAway = function(){

		if( $scope.text5MinAwaySending ){
			return;
		}

		if( confirm( 'Confirm send message to customer?' ) ){
			$scope.text5MinAwaySending = true;
			OrderService.text_5_min_away( id_order, function( json ){
				if( json.success ){
					App.alert( 'Message sent!');
					$rootScope.$broadcast( 'orderDeliveryStatusChanged', json );
				} else {
					App.alert( 'Error saving: ' + json.error );
				}
				$scope.text5MinAwaySending = false;
			} );
		}
	}

	$scope.formDeliveryStatusSave = function(){

		if( $scope.formDeliveryStatus.$invalid ){
			$scope.formDeliveryStatusSubmitted = true;
			return;
		}

		$scope.isSaving = true;

		var id_admin = null;

		if( $scope.status && $scope.status.driver && $scope.status.driver.id_admin ){
			id_admin = $scope.status.driver.id_admin;
		}

		var params = { 	id_order: id_order,
										notify_customer: $scope.notify_customer,
										status: $scope.status.status,
										id_admin: id_admin };

		OrderService.change_delivery_status( params, function( json ){
			$scope.isSaving = false;
			if( json.error ){
				App.alert( 'Error saving: ' + json.error );
			} else {
				$rootScope.closePopup();
				$rootScope.$broadcast( 'orderDeliveryStatusChanged', json );
			}
		} );
	}

} );
