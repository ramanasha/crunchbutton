
/********************************************************************************************
* This function will return a callble phone link in case the user is using a mobile device. *
*********************************************************************************************/
App.callPhone = function( phone ){
	if( App.isMobile() ){
		return '<a href="tel:' + App.phone.format( phone ).replace( /\-/g, '' ) + '">' + phone + '</a>'; 
	} else {
		return phone;
	}
}


/**************************************************
* Functions to identify the user's browser/device *
**************************************************/

App.isMobile = function(){
	return $.browser.mobile;
}

App.isNarrowScreen = function(){
	return $( window ).width() <= 769;
}

App.iOS = function(){
	return /ipad|iphone|ipod/i.test( navigator.userAgent.toLowerCase() );
}

App.isAndroid = function(){
	return /android/i.test( navigator.userAgent.toLowerCase() );
}

App.isChrome = function(){
	// As the user agent can be changed, let make sure if the browser is chrome or not.
	return /chrom(e|ium)/.test( navigator.userAgent.toLowerCase() ) || /crios/.test( navigator.userAgent.toLowerCase() ) || ( typeof window.chrome === 'object' );
}

App.isChromeForIOS = function(){
	return App.isMobile() && App.iOS() && App.isChrome();
}


var sort_by;
(function() {
	// utility functions
	var default_cmp = function(a, b) {
		if (a == b) return 0;
		return a < b ? -1 : 1;
	},
		getCmpFunc = function(primer, reverse) {
			var cmp = default_cmp;
			if (primer) {
				cmp = function(a, b) {
					return default_cmp(primer(a), primer(b));
				};
			}
			if (reverse) {
				return function(a, b) {
					return -1 * cmp(a, b);
				};
			}
			return cmp;
		};

	// actual implementation
	sort_by = function() {
		var fields = [],
			n_fields = arguments.length,
			field, name, reverse, cmp;

		// preprocess sorting options
		for (var i = 0; i < n_fields; i++) {
			field = arguments[i];
			if (typeof field === 'string') {
				name = field;
				cmp = default_cmp;
			}
			else {
				name = field.name;
				cmp = getCmpFunc(field.primer, field.reverse);
			}
			fields.push({
				name: name,
				cmp: cmp
			});
		}

		return function(A, B) {
			var a, b, name, cmp, result;
			for (var i = 0, l = n_fields; i < l; i++) {
				result = 0;
				field = fields[i];
				name = field.name;
				cmp = field.cmp;

				result = cmp(A[name], B[name]);
				if (result !== 0) break;
			}
			return result;
		}
	}
}());


App.nl2br = function( string ){
	return string.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br/>$2');
}

var touchclick = App.isMobile() ? 'touchend' : 'click';
var touchup = App.isMobile() ? 'touchend' : 'mouseup';
var touchHandle = function (event) {
	var handleObj = event.handleObj,
		targetData = jQuery.data(event.target),
		ret;

	if (!App.isMobile() || (Math.abs(endCoords.pageX-startCoords.pageX) <= cordsThresh && Math.abs(endCoords.pageY-startCoords.pageY) <= cordsThresh)) {
		event.type = handleObj.origType;
		ret = handleObj.handler.apply(this, arguments);
		event.type = handleObj.type;
		event.preventDefault();
		return ret;
	}
};

jQuery.event.special.touchclick = {
	bindType: touchclick,
	delegateType: touchclick,
	handle: touchHandle
};
jQuery.event.special.touchup = {
	bindType: touchup,
	delegateType: touchup,
	handle: touchHandle
};

var startCoords = {}, endCoords = {}, cordsThresh = 3;

if (window.jQuery) {
	(function($){
		$.fn.checkToggle = function(params) {
			var checks = $(this).filter('input[type="checkbox"]');
			$(this).filter('input[type="checkbox"]').each(function() {		
				$(this).prop('checked', !$(this).is(':checked'));
			});
			return this;
		};
	})(jQuery);

	$(document).on('touchstart', function(event) {
		endCoords = event.originalEvent.targetTouches[0];
		startCoords.pageX = event.originalEvent.targetTouches[0].pageX;
		startCoords.pageY = event.originalEvent.targetTouches[0].pageY;
	});
	
	$(document).on('touchmove', function(event) {
		endCoords = event.originalEvent.targetTouches[0];
	});
	
	$(document).on('touchend', function(event) {
		endCoords.pageX = startCoords.pageX = 0;
		endCoords.pageY = startCoords.pageY = 0;
	});
	
	$.fn.tap = function(func) {
		$(document).on('touchclick', $(this).selector, func );
	};
}
