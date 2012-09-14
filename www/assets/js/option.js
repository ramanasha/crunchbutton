var Option = function(id) {
	this.type = 'Option';
	var self = this;
	
	self.optionPrice = function(options) {
		var price = parseFloat(self.price);

		for (var x in self.prices) {
			if (options.indexOf(self.prices[x].id_option_parent) !== -1) {
				price += parseFloat(self.prices[x].price);
			}
		}

		return price;
	}

	if (typeof(id) == 'object') {
		for (x in id) {
			self[x] = id[x];
		}
	} else {
		App.request(App.service + '/option/' + id, function(json) {
			for (x in json) {
				self[x] = json[x];
			}
		});
	}
}

App.cached.Option = {};