define(['jquery', 'query', 'utils', 'mds_util'], function($, Query, Util, Mds_util) {
function Control() {
	this.zoom = 6;
	this.whichName = 'common';
	this.list0Shown = false;
	this.list1Shown = false;
	this.list2Shown = false;
	this.showPredicted = true;
	this.showObserved = false;
	this.blendingActive = false;
	this.mdsShow = true;
	this.compareDistOneActive = false;
	this.compareDistTwoActive = false;


	this.searchControl = {
		_latinFuser: undefined,
		_commonFuser: undefined,
		_nameMappings: undefined,
		_commonToLatin: undefined,
		_similarDistributions: undefined,
		_simThreshold: 200,
		_simDistLength: undefined,
		_aucValues: undefined,
		_selectedSpecies: [],
		_lastPredictionState: true,
		_lastObservationState: false
	};
}

Control.prototype = {
	initialize: function() {
		var vars = Query.getURLVariables();
		var self = this;

		Object.keys(vars).forEach(function(key) {
			if (self.hasOwnProperty(key)) {
				self[key] = vars[key];
			}
		});

		/* Put this here for now */
		if (vars.mdsShow !== 'false' && ($(window).height() > 500 &&
			$(window).width()  > 500)) {

			if (vars.mdsTop)
				$('#mds-border').css('top', vars.mdsTop + '%');
			if (vars.mdsLeft)
				$('#mds-border').css('left', vars.mdsLeft + '%');
			if (vars.mdsWidth)
				$('#mds-border').css('width', vars.mdsWidth + '%');
			if (vars.mdsHeight)
				$('#mds-border').css('height', vars.mdsHeight + '%');

			$('#mds-border').css('display', 'block');
			Mds_util.run_mds();
		}

		if (vars.species) {
			var common_name = this.getCommonName(vars.species);
			var latin_name = vars.species;
			var id  = this.getId(vars.species);

			Util.selectInitialSpecies(this, {
				_id: id,
				_latin: latin_name ,
				_common: common_name
			});

			if (vars.lex) {
				$('#lexical-radio').trigger('click');

				console.debug('first is here');
				if (vars.first) {
					try {
						Util.selectSecondSpecies({
							_id: this.getId(vars.first),
							_latin:  vars.first,
							_common: this.getCommonName(vars.first)
						}, this);
					} catch(e) { debugger;}
				}
				if (vars.second) {
					try {
						Util.selectThirdSpecies({
							_id: this.getId(vars.second),
							_latin: vars.second,
							_common: this.getCommonName(vars.second)
						}, this);
					} catch(e) {
						debugger;
					}
				}
			}

			else if (vars.dist) {
				$('#dist-radio').trigger('click');
				if (vars.first) {
				}
				if (vars.second) {
				}
			}
		}


	},


	createURL: function() {
		var options = {};

		if ($('#mds-border').css('display') === 'none') {
			options.mdsShow = false;
		} else {
			/* Get as percent of screen to try to reduce issue of different screen
			   size.
			*/
			var position = $('#mds-border').position();
			var left = parseFloat((position.left / $(window).width() * 100).toFixed(2));
			var top = parseFloat((position.top / $(window).height() * 100).toFixed(2));
			var height = parseFloat($('#mds-border').height() / $(window).height() * 100)
				.toFixed(2);
			var width = parseFloat($('#mds-border').width() / $(window).width() * 100)
				.toFixed(2);

			options = {
				'mdsTop': top,
				'mdsLeft': left,
				'mdsWidth': width,
				'mdsHeight': height
			};
		}

		if (this.searchControl._selectedSpecies.length) {
			options.species = this.searchControl._selectedSpecies[0]._latin;
		}

		if (this.searchControl._selectedSpecies[1] != undefined) {
			options.lex = true;
			options.first = this.searchControl._selectedSpecies[1]._latin;
		}

		if (this.searchControl._selectedSpecies[2] != undefined) {
			options.second = this.searchControl._selectedSpecies[2]._latin;
		}

		return Query.createURL(options);
	},

	drawData: function() {
		var order = [2, 1, 0];
		var idx, color;
		for (var i = 0; i < order.length; i++) {
			idx = order[i];
			switch(idx) {
				case 0:
					color = '_pink';
					break;
				case 1:
					color = '_orange';
					break;
				case 2:
					color = '_blue';
					break;
				default:
					return;
			}

			if (this.searchControl._selectedSpecies[idx] !== undefined) {
				if (this.showPredicted && this.searchControl._selectedSpecies[idx].visible) {
					try {
						NPMap.config.L
							.removeLayer(this.searchControl._selectedSpecies[idx].predicted);
					} catch(e) {}
					
				}

				this.searchControl._selectedSpecies[idx]
					.predicted = L.npmap.layer.mapbox({
						name: this.searchControl._selectedSpecies[idx]._latin,
						opacity: this.blendingActive ? 0.5 : 1,

						id: 'nps.GRSM_' + this.searchControl._selectedSpecies[idx]._id + color
				});

				if(this.showPredicted && this.searchControl._selectedSpecies[idx].visible) {
					this.searchControl._selectedSpecies[idx].predicted.addTo(NPMap.config.L);
				}
			}
		}
	},

	getCommonName: function(latin_name) {
		try {
			return this.searchControl._nameMappings[latin_name].common;
		} catch (e) {
			return undefined;
		}
	},

	getId: function(latin_name) {
		try {
			return this.searchControl._nameMappings[latin_name].id;
		} catch(e) {
			return undefined;
		}
	}
};

return Control;

});
