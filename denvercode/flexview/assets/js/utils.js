define(['jquery', 'fuse'], function($, Fuse) {
return {
	prepareSearchTool: function(control) {
		var self = this;

		this.loadResource(
			'https://nationalparkservice.github.io/npmap-species/atbirecords/lexical_index.json', function(data) {
			var index = data.items,

			latinOptions = {
				keys: ['latin_name_ref'],
				threshold: 0.3
			},

			commonOptions = {
				keys: ['common_name'],
				threshold: 0.3
			};

			control.searchControl._latinFuser = new Fuse(index, latinOptions);
			control.searchControl._commonFuser = new Fuse(index, commonOptions);
		});

		self.loadResource('https://nationalparkservice.github.io/npmap-species/atbirecords/irma_mapping.json', function(data) {
			control.searchControl._nameMappings = data;
			delete control.searchControl._nameMappings[''];

			self.populateResults(control);
		});

		self.loadResource('https://nationalparkservice.github.io/npmap-species/atbirecords/most_similar_distribution.json', function(data) {
			control.searchControl._similarDistributions = data;

			/* If a species is selected before loading this, then populate
			   the distribution lists and allow comparison by distributions
			*/
			if (control.searchControl._selectedSpecies[0] !== undefined) {
				self.populateDistributionLists(control);
				//$('#dist-radio').prop('disabled', false);
			}
		});

		self.loadResource('https://nationalparkservice.github.io/npmap-species/atbirecords/species_auc.json', function(data) {
			control.searchControl._aucValues = data;
		});
	},

	loadResource: function(url, callback) {
		this.loadResourceWithTries(url, callback, 1);
	},

	loadResourceWithTries: function(url, callback, tries) {
		var loadResourceWithTries = this.loadResourceWithTries.bind(this);

		jQuery.ajax({
			type: 'GET',
			url: url,
			dataType: 'json',
			success: callback,
			error: function() {
				if(tries < 5)
					loadResourceWithTries(url, callback, tries+1);
			}
		});
	},

	establishEventListeners: function(control) {
		var self = this;

		$('#dropdown-initial-input').on('input', function() {
			self.fuseSearch(0, this.value, control);
		});

		$('#search-initial-dropdown > div.dropdown-button').on('keypress click', function() {
			self.toggleSearchList(control, 0);
		});

		$('#search-initial-switch-button').on('keypress click', function() {
			self.toggleName(control);
		});

		$('#lexical-radio').on('keypress click', function() {
			self.lexFocus(control);
		});

		$('#dropdown-one-input').on('input', function() {
			self.fuseSearch(1, this.value, control);
		});

		$('#search-compare-one-dropdown > div.dropdown-button').on('click keypress', function() {
				self.toggleSearchList(control, 1);
		});

		$('#dropdown-two-input').on('input', function() {
			self.fuseSearch(2, this.value, control);
		});

		$('#search-compare-two-dropdown > div.dropdown-button')
			.on('keypress click', function() {
				self.toggleSearchList(control, 2);
		});

		$('#dist-radio').on('keypress click', function() {
			self.distFocus(control);
		});

		$('#compare-dist-one').on('keypress click', function() {
			self.toggleCompareDistOne(control);
		});

		$('#compare-dist-two').on('keypress click', function() {
			self.toggleCompareDistTwo(control);
		});

		$('#link-gen-button').on('click', function() {
			var url = control.createURL();
			window.prompt('Copy to clipboard: Ctrl+C, Enter', url);
			$('#url_config').val(url);
		});

		$('select', '.metric-pick').change(function() {
			$('svg').remove();

			var type = $(this).val();
			control.run_mds(type, control);
		});


	},

	toggleSearchList: function(control, idx, callback) {
		if (idx === 0) {
			if(!control.list0Shown) {
				$('#search-initial-dropdown')
					.css({'border-radius':'4px 4px 0px 0px'});
				$('#search-initial-dropdown-lex').stop();
				$('#search-initial-dropdown-lex').animate({height: '0px'});
				$('#search-initial-dropdown-select').stop();
				$('#search-initial-dropdown-select')
					.animate({height: '400px'}, callback);
			} else {
				$('#search-initial-dropdown').css({'border-radius':'4px'});
				$('#search-initial-dropdown-select').stop();
				$('#search-initial-dropdown-select')
					.animate({height: '0px'}, callback);
			}
			control.list0Shown = !control.list0Shown;
		} else if (idx == 1) {
			$('#search-compare-two-dropdown').css(
				{'border-radius':'4px 4px 4px 4px'
			});
			$('#search-compare-two-dropdown-lex').stop();
			$('#search-compare-two-dropdown-lex').animate({
				height: '0px'
			});
			$('#search-compare-two-dropdown-select').stop();
			$('#search-compare-two-dropdown-select').animate({
				height: '0px'
			});

			if(!control.list1Shown) {
				$('#search-compare-one-dropdown').css({
					'border-radius':'4px 4px 0px 0px'
				});
				$('#search-compare-one-dropdown-lex').stop();
				$('#search-compare-one-dropdown-lex').animate({
					height: '0px'
				});
				$('#search-compare-one-dropdown-select').stop();
				$('#search-compare-one-dropdown-select').animate({
					height: '400px'
				}, callback);
			} else {
				$('#search-compare-one-dropdown').css({
					'border-radius':'4px'
				});
				$('#search-compare-one-dropdown-select').stop();
				$('#search-compare-one-dropdown-select').animate({
					height: '0px'
				}, callback);
			}

			control.list1Shown = !control.list1Shown;
		} else if (idx == 2) {
			if(!control.list2Shown) {
				$('#search-compare-two-dropdown').css({
					'border-radius':'4px 4px 0px 0px'
				});
				$('#search-compare-two-dropdown-lex').stop();
				$('#search-compare-two-dropdown-lex').animate({
					height: '0px'
				});
				$('#search-compare-two-dropdown-select').stop();
				$('#search-compare-two-dropdown-select').animate({
					height: '400px'
				}, callback);
			} else {
				$('#search-compare-two-dropdown').css({'border-radius':'4px'});
				$('#search-compare-two-dropdown-select').stop();
				$('#search-compare-two-dropdown-select').animate({
					height: '0px'
				}, callback);
			}
			control.list2Shown = !control.list2Shown;
		} else {
			return;
		}
	},

	fuseSearch: function(idx, value, control, expand) {
		var commonResults = control.searchControl._commonFuser.search(value),
		latinResults = control.searchControl._latinFuser.search(value),
		results = (control.whichName === 'common') ? commonResults.slice(0, 15)
			: latinResults.slice(0, 15);

		var i, li;
		var self = this;

		/* replace unspecified names */
		if (control.whichName === 'common') {
			var j = 15;
			for(i = 0; i < results.length; i++) {
				if(results[i].common_name === 'Unspecified') {
					while(commonResults[j].common_name === 'Unspecified') {
						j++;
					}
					results[i] = commonResults[j];
					j++;
				}
			}
		}

		/* for species comparison searches, remove species already selected from search results */
		if(idx === 1 || idx === 2) {
			for(var i = 0; i < results.length; i++) {
				for(var j = 0; j < control.searchControl._selectedSpecies.length; j++) {
					if(control.searchControl._selectedSpecies[j] !== undefined) {
						if(results[i].latin_name ===
							control.searchControl._selectedSpecies[j]._latin)
						{
							results.splice(i--, 1);
						}
					}
				}
			}
		}

		switch(idx) {
			case 0:
				$('#search-initial-dropdown-select').stop();
				$('#search-initial-dropdown-select').animate({height: '0px'});
				elString = '#search-initial-dropdown-lex';
				break;

			case 1:
				$('#search-compare-one-dropdown-select').stop();
				$('#search-compare-one-dropdown-select').animate({
					height: '0px'
				});
				elString = '#search-compare-one-dropdown-lex';
				break;
			case 2:
				$('#search-compare-two-dropdown-select').stop();
				$('#search-compare-two-dropdown-select').animate({
					height: '0px'
				});
				elString = '#search-compare-two-dropdown-lex';
				break;
			default:
				return;
		}

		$(elString).stop();

		if(expand === undefined || expand) {
			$(elString).animate({
				height: (results.length*21) + 'px'
			});
			$(elString).parent().css({'border-radius': '4px 4px 0px 0px'});
		} else {
			$(elString).animate({
				height: '0px'
			});
			$(elString).parent().css({'border-radius': '4px 4px 4px 4px'});
		}

		if(results.length === 0) {
			$(elString).parent().css({'border-radius': '4px 4px 4px 4px'});
			return;
		}


		document.getElementById(elString.substring(1)).innerHTML = '';
		for(i = 0; i < results.length; i++) {
			li = document.createElement('li');
			li._latin = results[i].latin_name;
			li._id = results[i].irma_id;
			li._common = results[i].common_name;
			li._idx = idx;

			if(control.whichName === 'common') {
				li.innerHTML = li._common.replace(/_/g, ' ');
				li.title = li._latin.replace(/_/g, ' ');
			} else {
				li.innerHTML = li._latin.replace(/_/g, ' ');
				li.title = li._common.replace(/_/g, ' ');
			}

			li.onclick = li.onkeypress = function() {
				switch(this._idx) {
					case 0:
						self.fuseSearch(0, '', control, false);
						self.selectInitialSpecies(control, this);
						break;
					case 1:
						self.selectSecondSpecies(this, control);
						break;
					case 2:
						self.selectThirdSpecies(this, control);
						break;
					default:
						break;
				}
			};
			document.getElementById(elString.substring(1)).appendChild(li);
		}

	},

	selectInitialSpecies: function(control, li) {
		this.clearComparisons(control);

		document.getElementById('search-initial-dropdown').style
			.backgroundColor = 'rgb(202, 24, 146)';


		if(control.searchControl._selectedSpecies[0] !== undefined &&
			control.searchControl._selectedSpecies[0].visible) {

			if(control.showPredicted) {
				NPMap.config.L.removeLayer(control.searchControl
					._selectedSpecies[0].predicted);
			}

			if(control.showObserved) {
				NPMap.config.L.removeLayer(control.searchControl
					._selectedSpecies[0].observed);
			}

			control.removeSpeciesImageHighlight(control.searchControl
				._selectedSpecies[0]._latin);
		}

		control.highlightSpeciesImage(li._latin, 'rgb(202, 24, 146)');
		control.searchControl._selectedSpecies[0] = {};
		control.searchControl._selectedSpecies[0]._id = li._id;
		control.searchControl._selectedSpecies[0]._latin = li._latin;
		control.searchControl._selectedSpecies[0]._common = li._common;
		control.searchControl._selectedSpecies[0].visible = true;

		//control.searchControl._selectedSpecies[0].observed = createPopup(li);

		if(control.whichName === 'latin') {
			$('#search-initial-altname')
				.html(control.searchControl._selectedSpecies[0]._common
					.replace(/_/g, ' '));
			$('.dropdown-input', '#search-initial-dropdown')
				.val(control.searchControl._selectedSpecies[0]._latin
					.replace(/_/g, ' '));
		} else {
			$('#search-initial-altname')
				.html(control.searchControl._selectedSpecies[0]._latin
					.replace(/_/g, ' '));
			$('.dropdown-input', '#search-initial-dropdown')
				.val(control.searchControl._selectedSpecies[0]._common
					.replace(/_/g, ' '));
		}

		$('.dropdown-input', '#search-initial-dropdown')
			.css({'background-color': '#c91892'});

		control.drawData();

		if(control.showObserved) {
			control.searchControl._selectedSpecies[0].observed
				.addTo(NPMap.config.L);
		}

		//findAUC(0, li._latin);


		$('.subhead').css({
			color:'#f5faf2'
		});
		$('.subhead2').css({
			color:'#f5faf2',
		});

		$('#search-initial-image').css({'opacity':1.0});

		/* Allow lexical comparison by default, but wait till distributions are
		   loaded before allowing compare by distribution
		*/
		$('#lexical-radio').prop('disabled', false);

		/* If similar distributions are loaded then allow comparison */
		if (control.searchControl._similarDistributions !== undefined) {
			//this.populateDistributionLists(control);
			//$('#dist-radio').prop('disabled', false);
		}
		control.mdsPan(li._latin);

	},

	populateResults: function(control) {
		var keys = [];
		var commonKeys = [];
		var key, latin, common, id;
		var self = this;

		for(key in control.searchControl._nameMappings) {
			keys.push(key);
			commonKeys.push([control.searchControl._nameMappings[key].common, key]);
		}

		keys.sort();
		commonKeys.sort(function(a, b) {
			return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
		});

		document.getElementById('search-initial-dropdown-select')
			.innerHTML = '';
		document.getElementById('search-compare-one-dropdown-select')
			.innerHTML = '';
		document.getElementById('search-compare-two-dropdown-select')
			.innerHTML = '';
		var li = document.createElement('li');
		li.innerHTML = 'Clear selection';
		var li1 = document.createElement('li1');
		li1.innerHTML = 'Clear selection';
		var li2 = document.createElement('li2');
		li2.innerHTML = 'Clear selection';

		li.onclick = li.onkeypress = function() {
			self.toggleSearchList(control, 0);
			self.clearSearch(control);
		};

		li1.onclick = li1.onkeypress = function() {
			self.toggleSearchList(control, 1);
			self.clearCompareOne(control);
		};

		li2.onclick = li2.onkeypress = function() {
			self.toggleSearchList(control, 2);
			self.clearCompareTwo(control);
		};

		document.getElementById('search-initial-dropdown-select')
			.appendChild(li);

		document.getElementById('search-compare-one-dropdown-select')
			.appendChild(li1);

		document.getElementById('search-compare-two-dropdown-select')
			.appendChild(li2);

		if(control.whichName === 'latin') {
			for(var i = 0; i < keys.length; i++) {
				latin = keys[i];
				common = control.searchControl._nameMappings[keys[i]].common;
				id = control.searchControl._nameMappings[keys[i]].id;

				li = document.createElement('li');
				li._latin = latin;
				li._id = id;
				li._common = common;
				li1 = document.createElement('li');
				li1._latin = latin;
				li1._id = id;
				li1._common = common;
				li2 = document.createElement('li');
				li2._latin = latin;
				li2._id = id;
				li2._common = common;

				if(control.whichName === 'latin') {
					li.innerHTML = li._latin.replace(/_/g, ' ');
					li.title = li._common.replace(/_/g, ' ');
					li1.innerHTML = li1._latin.replace(/_/g, ' ');
					li1.title = li1._common.replace(/_/g, ' ');
					li2.innerHTML = li2._latin.replace(/_/g, ' ');
					li2.title = li2._common.replace(/_/g, ' ');
				} else {
					li.innerHTML = li._common.replace(/_/g, ' ');
					li.title = li._latin.replace(/_/g, ' ');
					li1.innerHTML = li1._common.replace(/_/g, ' ');
					li1.title = li1._latin.replace(/_/g, ' ');
					li2.innerHTML = li2._common.replace(/_/g, ' ');
					li2.title = li2._latin.replace(/_/g, ' ');
				}

			li.onclick = li.onkeypress = function() {
				self.toggleSearchList(control, 0);
				self.selectInitialSpecies(control, this);
			};

			li1.onclick = li1.onkeypress = function() {
				self.toggleSearchList(control, 1);
				self.selectSecondSpecies(this, control);
			};

			li2.onclick = li2.onkeypress = function() {
				self.toggleSearchList(control, 2);
				self.selectThirdSpecies(this, control);
			};

			document.getElementById('search-initial-dropdown-select')
				.appendChild(li);
			document.getElementById('search-compare-one-dropdown-select')
				.appendChild(li1);
			document.getElementById('search-compare-two-dropdown-select')
				.appendChild(li2);
			}
		} else {
			for(var i = 0; i < commonKeys.length; i++) {
				latin = commonKeys[i][1];
				common = commonKeys[i][0];
				id = control.searchControl._nameMappings[latin].id;

				li = document.createElement('li');
				li._latin = latin;
				li._id = id;
				li._common = common;
				li1 = document.createElement('li');
				li1._latin = latin;
				li1._id = id;
				li1._common = common;
				li2 = document.createElement('li');
				li2._latin = latin;
				li2._id = id;
				li2._common = common;

				if(control.whichName === 'latin') {
					li.innerHTML = li._latin.replace(/_/g, ' ');
					li.title = li._common.replace(/_/g, ' ');
					li1.innerHTML = li._latin.replace(/_/g, ' ');
					li1.title = li._common.replace(/_/g, ' ');
					li2.innerHTML = li2._latin.replace(/_/g, ' ');
					li2.title = li2._common.replace(/_/g, ' ');
				} else {
					li.innerHTML = li._common.replace(/_/g, ' ');
					li.title = li._latin.replace(/_/g, ' ');
					li1.innerHTML = li._common.replace(/_/g, ' ');
					li1.title = li._latin.replace(/_/g, ' ');
					li2.innerHTML = li2._common.replace(/_/g, ' ');
					li2.title = li2._latin.replace(/_/g, ' ');
				}

				li.onclick = li.onkeypress = function() {
					self.toggleSearchList(control, 0);
					self.selectInitialSpecies(control, this);
				};

				li1.onclick = li.onkeypress = function() {
					self.toggleSearchList(control, 1);
					self.selectSecondSpecies(this, control);
				};

				li2.onclick = li2.onkeypress = function() {
					self.toggleSearchList(control, 2);
					self.selectThirdSpecies(this, control);
				};

				document.getElementById('search-initial-dropdown-select')
					.appendChild(li);
				document.getElementById('search-compare-one-dropdown-select')
					.appendChild(li1);
				document.getElementById('search-compare-two-dropdown-select')
					.appendChild(li2);
			}
		}
	},

	clearSearch: function(control) {
		// remove all selected species
		document.getElementById('search-initial-dropdown').children[0]
			.innerHTML = '';
		document.getElementById('search-initial-dropdown').children[0]
			.title = '';
		document.getElementById('search-initial-dropdown').style
			.backgroundColor = '#40403d';

		$('.dropdown-input', '#search-initial-dropdown')
			.css({'background-color': '#40403d'});
		$('.dropdown-input', '#search-initial-dropdown').val('');

		for(var i = 0; i < control.searchControl._selectedSpecies.length; i++)
		{
			if(control.searchControl._selectedSpecies[i] !== undefined) {
				if(control.showPredicted) {
					NPMap.config.L.removeLayer(control.searchControl._selectedSpecies[i].predicted);
				}

				if(control.showObserved && i === 0) {
					NPMap.config.L.removeLayer(control.searchControl._selectedSpecies[i].observed);
				}
			}
		}

		control.searchControl._selectedSpecies = [];


		$('#search-initial-altname').html('');

		$('#search-compare-lexical').stop();
		$('#search-compare-lexical').animate({'width': '240px'});
		$('#search-compare-one-box').css({display:'none'});
		$('#search-compare-two-box').css({display:'none'});
		$('#search-compare-one-dropdown').css({display: 'none'});
		$('#search-compare-two-dropdown').css({display: 'none'});
		$('.subhead', '#search-compare-lexical').css({
			display:'block',
			color:'rgb(144, 144, 144)'
		});
		$('.subhead2', '#search-compare-lexical').css({
			top:'5px',
			fontSize:'14pt',
			color:'rgb(144, 144, 144)',
			width:'200px'
		});

		$('.subhead2', '#search-compare-lexical')
			.html('ANOTHER SPECIES IN THE PARK');

		$('#search-compare-distribution').stop();
		$('#search-compare-distribution').animate({'width': '240px'});
		$('#compare-dist-one').css({display:'none'});
		$('#compare-dist-two').css({display:'none'});
		$('.subhead', '#search-compare-distribution').css({
			display:'block',
			color:'rgb(144, 144, 144)'
		});

		$('.subhead2', '#search-compare-distribution').css({
			top:'5px',
			fontSize:'14pt',
			color:'rgb(144, 144, 144)',
			width:'200px'
		});
		$('.subhead2', '#search-compare-distribution')
			.html('SPECIES WITH SIMILAR DISTRIBUTION');

		$('input:radio[name=comparator]').prop('checked', false);
		$('input:radio[name=comparator]').prop('disabled', true);

		$('#search-initial-image').css({'opacity':0.0});

		$('#color-legend').animate({height: '0px'});
	},

	toggleName: function(control) {
		if(control.whichName === 'common') {
			$('#search-initial-switch-button').children().stop();
			$('#search-initial-switch-button').children()
				.animate({left:'0px'});
			control.whichName = 'latin';
		} else {
			$('#search-initial-switch-button').children().stop();
			$('#search-initial-switch-button').children()
				.animate({left:'75px'});
			control.whichName = 'common';
		}

		this.populateResults(control);

		var tmp = $('.dropdown-input', '#search-initial-dropdown').val();
		$('.dropdown-input', '#search-initial-dropdown')
			.val($('#search-initial-altname').html());
		$('#search-initial-altname').html(tmp);

		var swapNeeded = $('#search-initial-dropdown')
			.css('backgroundColor') === 'rgb(202, 24, 146)';
	},

	lexFocus: function(control) {
		this.clearComparisons(control);

		$('#search-compare-lexical').animate({width:'481px'});
		$('.subhead', '#search-compare-lexical').css({display:'block'});
		$('.subhead2', '#search-compare-lexical').css({
			top:'5px',
			fontSize:'14pt',
			color:'#f5faf2',
			width:'200px'
		});
		$('.subhead2', '#search-compare-lexical').html('ANOTHER SPECIES IN THE PARK');
		$('#search-compare-one-box').css({display:'block'});
		$('#search-compare-two-box').css({display:'block'});

		$('#search-compare-distribution').animate({width:'120px'});
		$('.subhead', '#search-compare-distribution').css({display:'none'});
		$('.subhead2', '#search-compare-distribution').css({
			top:'25px',
			fontSize:'9pt',
			color:'#909090',
			width:'80px'
		});
		$('.subhead2', '#search-compare-distribution').html('COMPARE DISTRIBUTION');
		$('#compare-dist-one').css({display:'none'});
		$('#compare-dist-two').css({display:'none'});
		$('#search-compare-one-dropdown').css({'display':'block'});
		$('#search-compare-two-dropdown').css({'display':'block'});
		$('.dropdown-input', '#search-compare-one-dropdown').focus();
	},

	clearComparisons: function(control) {
		this.clearCompareOne(control);
		this.clearCompareTwo(control);
		$('#color-legend').stop();
		$('#color-legend').animate({height:'100px'});
		/*
		if(control.searchControl._similarDistribution !== undefined)
			this.populateDistributionLists(control);
		*/
	},

	clearCompareOne: function(control) {
		document.getElementById('search-compare-one-dropdown').style.backgroundColor = '#40403d';
		$('.dropdown-input', '#search-compare-one-dropdown').css({'background-color': '#40403d'});
		$('.dropdown-input', '#search-compare-one-dropdown').val('');

		$('#legend-species-orange').stop();
		$('#legend-species-orange').animate({
			height: '0px',
			marginBottom: '0px'
		});

		if(control.searchControl._selectedSpecies[1] !== undefined) {
			$('#color-legend').stop();
			$('#color-legend').animate({
				height: $('#color-legend').height()-50
			});

			control.removeSpeciesImageHighlight(control
				.searchControl._selectedSpecies[1]._latin);
		}

		$('#search-compare-one-box-input').val('');
		$('#search-compare-one-box-input').trigger('input');
		$('#search-compare-one-box-name').css({display:'none'});
		$('#search-compare-one-box-clear').css({display:'none'});
		$('#compare-dist-one-name').html('Select a second species');
		$('#compare-dist-one-name').prop('title', '');
		$('#compare-dist-one-name').css({backgroundColor:'#40403d'});

		if(control.searchControl._selectedSpecies[1] !== undefined) {
			if(control.showPredicted) {
				window.NPMap.config.L.removeLayer(
					control.searchControl._selectedSpecies[1].predicted);
			}
		}

		control.searchControl._selectedSpecies[1] = undefined;

		if(control.searchControl._selectedSpecies[2] === undefined) {
			/*
			document.getElementById('options-predicted-checkbox').disabled = false;
			document.getElementById('options-observed-checkbox').disabled = false;
			*/
			if(control.searchControl._lastPredictionState === false) {
				control.searchControl._lastPredictionState = true;
			//	$('#options-predicted-checkbox').trigger('click');
			}

			if(control.searchControl._lastObservationState === true) {
				control.searchControl._lastObservationState = false;
			//	$('#options-observed-checkbox').trigger('click');
			}
		}

		/*
		if(control.searchControl._similarDistribution !== undefined)
			this.populateDistributionLists(control);
		*/
	},

	populateDistributionLists: function(control) {
		return;
		var self = this;
		document.getElementById('compare-dist-one').children[2].innerHTML = '';
		document.getElementById('compare-dist-two').children[2].innerHTML = '';

		if(control.searchControl._selectedSpecies[0] === undefined) {
			return;
		};

		var sp = control.searchControl._selectedSpecies[0]._latin,
		results = control.searchControl._similarDistributions[sp],
		found = [
			sp.replace(/_/g, ' '),
			$('#compare-dist-one-name').html(),
			$('#compare-dist-one-name').prop('title'),
			$('#compare-dist-two-name').html(),
			$('#compare-dist-two-name').prop('title')
		];

		var li = document.createElement('li');
		li.innerHTML = 'Clear selection';
		li.onclick = li.onkeypress = function() {
			self.clearCompareOne(control);
		};

		document.getElementById('compare-dist-one').children[2].appendChild(li);
		li = document.createElement('li');
		li.innerHTML = 'Clear selection';
		li.onclick = li.onkeypress = function() {
			self.clearCompareTwo(control);
		};

		document.getElementById('compare-dist-two').children[2].appendChild(li);

		for(var i = 0; i < 15; i++) {
			var max = -1,
			maxItem = '';
			for(var key in results) {
				if(found.indexOf(key.replace(/_/g, ' ')) === -1) {
					if(results[key] > max && results[key] >control.searchControl._simThreshold &&
						(control.whichName === 'latin' ||
						control.searchControl._nameMappings[key].common !== 'Unspecified')) {
							max = results[key];
							maxItem = key;
					}
				}
			}

			if(results[maxItem] > control.searchControl._simThreshold) {
				found.push(maxItem.replace(/_/g, ' '));

				var latin = maxItem,
				common = control.searchControl._nameMappings[latin].common,
				id = control.searchControl._nameMappings[latin].id;

				li = document.createElement('li');
				li._latin = latin;
				li._common = common;
				li._id = id;
				if(control.whichName === 'common') {
				li.innerHTML = li._common;
				li.title = li._latin.replace(/_/g, ' ');
			} else {
				li.innerHTML = li._latin.replace(/_/g, ' ');
				li.title = li._common;
			}

			li.onclick = li.onkeypress = function() {
				self.selectSecondSpecies(this, control);
			};
			document.getElementById('compare-dist-one').children[2].appendChild(li);

			li = document.createElement('li');
			li._latin = latin;
			li._common = common;
			li._id = id;

			if(control.whichName === 'common') {
				li.innerHTML = li._common;
				li.title = li._latin.replace(/_/g, ' ');
			} else {
				li.innerHTML = li._latin.replace(/_/g, ' ');
				li.title = li._common;
			}

			li.onclick = li.onkeypress = function() {
				self.selectThirdSpecies(this, control);
			};
			document.getElementById('compare-dist-two').children[2].appendChild(li);
			}
		}

		control.searchControl._simDistLength = found.length;
		$('#compare-dist-one').stop();
		if(control.compareDistOneActive) {
			$('#compare-dist-one').animate(
				{height:((control.searchControl._simDistLength-5)*21+41) + 'px'}
			);
			$('ul', '#compare-dist-one').css({display:'block'});
		}

		$('#compare-dist-two').stop();
		if(control.compareDistTwoActive) {
			$('#compare-dist-two').animate({height:((control.searchControl._simDistLength-5)*21+41) + 'px'});
			$('ul', '#compare-dist-two').css({display:'block'});
		}
	},

	clearCompareTwo: function(control) {
		var self = this;
		document.getElementById('search-compare-two-dropdown').style.backgroundColor = '#40403d';
		$('.dropdown-input', '#search-compare-two-dropdown').css({'background-color': '#40403d'});
		$('.dropdown-input', '#search-compare-two-dropdown').val('');

		$('#legend-species-blue').stop();
		$('#legend-species-blue').animate({
			height: '0px',
			marginBottom: '0px'
		});

		if(control.searchControl._selectedSpecies[2] !== undefined) {
			$('#color-legend').stop();
			$('#color-legend').animate({
				height: $('#color-legend').height()-50
			});
			control.removeSpeciesImageHighlight(control
				.searchControl._selectedSpecies[2]._latin);
		}

		$('#search-compare-two-box-input').val('');
		$('#search-compare-two-box-input').trigger('input');
		$('#search-compare-two-box-name').css({display:'none'});
		$('#search-compare-two-box-clear').css({display:'none'});
		$('#compare-dist-two-name').html('Select a third species');
		$('#compare-dist-two-name').prop('title', '');
		$('#compare-dist-two-name').css({backgroundColor:'#40403d'});

		if(control.searchControl._selectedSpecies[2] !== undefined) {
			if(control.showPredicted) {
				window.NPMap.config.L.removeLayer(control.searchControl._selectedSpecies[2].predicted);
			}
		}

		control.searchControl._selectedSpecies[2] = undefined;

		if(control.searchControl._selectedSpecies[1] === undefined) {
			/*
			document.getElementById('options-predicted-checkbox').disabled = false;
			document.getElementById('options-observed-checkbox').disabled = false;
			*/

			if(control.searchControl._lastPredictionState === false) {
				control.searchControl._lastPredictionState = true;
				//$('#options-predicted-checkbox').trigger('click');
			}

			if(control.searchControl._lastObservationState === true) {
				control.searchControl._lastObservationState = false;
				//$('#options-observed-checkbox').trigger('click');
			}
		}

		/*
		if(control.searchControl._similarDistribution !== undefined)
			this.populateDistributionLists(control);
		*/
	},

	distFocus: function(control) {
		this.clearComparisons(control);

		$('#search-compare-lexical').animate({width:'121px'});
		$('.subhead', '#search-compare-lexical').css({display:'none'});
		$('.subhead2', '#search-compare-lexical').css({
			top:'25px',
			fontSize:'9pt',
			color:'#909090',
			width:'80px'
		});

		$('.subhead2', '#search-compare-lexical').html('COMPARE SPECIES');
		$('#search-compare-one-box').css({display:'none'});
		$('#search-compare-two-box').css({display:'none'});

		$('#search-compare-distribution').animate({width:'480px'});
		$('.subhead', '#search-compare-distribution').css({display:'block'});
		$('.subhead2', '#search-compare-distribution').css({
			top:'5px',
			fontSize:'14pt',
			color:'#f5faf2',
			width:'200px'
		});

		$('.subhead2', '#search-compare-distribution').html('SPECIES WITH SIMILAR DISTRIBUTION');
		$('#compare-dist-one').css({display:'block'});
		$('#compare-dist-two').css({display:'block'});
		$('#search-compare-one-dropdown').css({'display':'none'});
		$('#search-compare-two-dropdown').css({'display':'none'});
	},

	toggleCompareDistOne: function(control) {
		if(control.compareDistTwoActive) {
			this.toggleCompareDistTwo(control);
		}

		control.compareDistOneActive = !control.compareDistOneActive;

		$('#compare-dist-one').stop();
		if(control.compareDistOneActive) {
			$('#compare-dist-one').animate({
				height:((control.searchControl._simDistLength-5)*21+41) + 'px'
			});
			$('ul', '#compare-dist-one').css({display:'block'});
		} else {
			$('#compare-dist-one').animate({height:'20px'});
			$('ul', '#compare-dist-one').css({display:'none'});
		}
	},

	toggleCompareDistTwo: function(control) {
		control.compareDistTwoActive = !control.compareDistTwoActive;

		$('#compare-dist-two').stop();
		if(control.compareDistTwoActive) {
			$('#compare-dist-two').animate({
				height:((control.searchControl._simDistLength-5)*21+41) + 'px'
			});
			$('ul', '#compare-dist-two').css({display:'block'});
		} else {
			$('#compare-dist-two').animate({height:'20px'});
			$('ul', '#compare-dist-two').css({display:'none'});
		}
	},

	selectSecondSpecies: function(li, control) {
		$('#legend-species-orange').stop();
		$('#legend-species-orange').animate({
			height: '49px',
			marginBottom: '1px'
		});

		if(control.searchControl._selectedSpecies[1] === undefined) {
			$('#color-legend').stop();
			$('#color-legend').animate({
				height: $('#color-legend').height()+50
			});
		} else {
			control.removeSpeciesImageHighlight(control.searchControl
				._selectedSpecies[1]._latin);
		}

		control.highlightSpeciesImage(li._latin, control.speciesColor[1]);
		/*
		document.getElementById('legend-orange-contents-name').innerHTML = li.innerHTML;
		document.getElementById('legend-orange-contents-name').title = li.title;
		*/
		if(control.whichName === 'common') {
			$('.dropdown-input', '#search-compare-one-dropdown').val(li._common.replace(/_/g, ' '));
			$('.dropdown-input', '#search-compare-one-dropdown').prop('title', li._latin.replace(/_/g, ' '));
			$('#compare-dist-one-name').html(li._common);
			$('#compare-dist-one-name').prop('title', li._latin.replace(/_/g, ' '));
		} else {
			$('.dropdown-input', '#search-compare-one-dropdown').val(li._latin.replace(/_/g, ' '));
			$('.dropdown-input', '#search-compare-one-dropdown').prop('title', li._common.replace(/_/g, ' '));
			$('#compare-dist-one-name').html(li._latin);
			$('#compare-dist-one-name').prop('title', li._common.replace(/_/g, ' '));
		}

		$('#search-compare-one-dropdown').css({backgroundColor:'rgb(242, 142, 67)'});
		$('.dropdown-input', '#search-compare-one-dropdown').css({backgroundColor:'rgb(242, 142, 67)'});

		this.fuseSearch(1, '', control);

		$('#search-compare-one-box-name').css({display:'block'});
		$('#search-compare-one-box-clear').css({display:'block'});
		$('#compare-dist-one-name').css({backgroundColor:'rgb(242, 142, 67)'});

		if(control.searchControl._selectedSpecies[1] !== undefined &&
			control.searchControl._selectedSpecies[1].visible) {
				if(control.showPredicted) {
					window.NPMap.config.L.removeLayer(
						control.searchControl._selectedSpecies[1].predicted);
				}
		}

		control.searchControl._selectedSpecies[1] = {};
		control.searchControl._selectedSpecies[1]._id = li._id;
		control.searchControl._selectedSpecies[1]._latin = li._latin;
		control.searchControl._selectedSpecies[1]._common = li._common;
		control.searchControl._selectedSpecies[1].visible = true;

		if(!control.showPredicted) {
			control.searchControl._lastPredictionState = false;
	//		$('#options-predicted-checkbox').trigger('click');
		}
		if(control.showObserved) {
			control.searchControl._lastObservationState = true;
	//		$('#options-observed-checkbox').trigger('click');
		}

		/*
		document.getElementById('options-predicted-checkbox').disabled = true;
		document.getElementById('options-observed-checkbox').disabled = true;
		*/
		control.drawData();

		//findAUC(1, li._latin);

		$('input', '#legend-orange-control.searchControls').prop('checked', true);

		if (false) {
			this.populateDistributionLists(control);
		}
	},

	selectThirdSpecies: function(li, control) {
		$('#legend-species-blue').stop();
		$('#legend-species-blue').animate({
			height: '49px',
			marginBottom: '1px'
		});

		if(control.searchControl._selectedSpecies[2] === undefined) {
			$('#color-legend').stop();
			$('#color-legend').animate({
				height: $('#color-legend').height()+50
			});
		} else {
			control.removeSpeciesImageHighlight(control.searchControl
				._selectedSpecies[2]._latin);
		}

		control.highlightSpeciesImage(li._latin, control.speciesColor[2]);
		/*
		document.getElementById('legend-blue-contents-name').innerHTML = li.innerHTML;
		document.getElementById('legend-blue-contents-name').title = li.title;
		*/

		$('#search-compare-two-box-input').val('');
		$('#search-compare-two-box-input').trigger('input');

		if(control.whichName === 'common') {
			$('#search-compare-two-box-name').html(li._common);
			$('#search-compare-two-box-name').prop('title', li._latin.replace(/_/g, ' '));
			$('#compare-dist-two-name').html(li._common);
			$('#compare-dist-two-name').prop('title', li._latin.replace(/_/g, ' '));
		} else {
			$('#search-compare-two-box-name').html(li._latin.replace(/_/g, ' '));
			$('#search-compare-two-box-name').prop('title', li._common);
			$('#compare-dist-two-name').html(li._latin.replace(/_/g, ' '));
			$('#compare-dist-two-name').prop('title', li._common);
		}
		$('#search-compare-two-box-name').css({display:'block'});
		$('#search-compare-two-box-clear').css({display:'block'});
		$('#compare-dist-two-name').css({backgroundColor:'rgb(29, 144, 156)'});

		if(control.searchControl._selectedSpecies[2] !== undefined &&
			control.searchControl._selectedSpecies[2].visible) {
			if(control.showPredicted) {
				window.NPMap.config.L.removeLayer(
					control.searchControl._selectedSpecies[2].predicted);
			}
		}

		control.searchControl._selectedSpecies[2] = {};
		control.searchControl._selectedSpecies[2]._id = li._id;
		control.searchControl._selectedSpecies[2]._latin = li._latin;
		control.searchControl._selectedSpecies[2]._common = li._common;
		control.searchControl._selectedSpecies[2].visible = true;

		if(!control.showPredicted) {
			control.searchControl._lastPredictionState = false;
		//	$('#options-predicted-checkbox').trigger('click');
		}
		if(control.showObserved) {
			control.searchControl._lastObservationState = true;
		//	$('#options-observed-checkbox').trigger('click');
		}
		/*
		document.getElementById('options-predicted-checkbox').disabled = true;
		document.getElementById('options-observed-checkbox').disabled = true;
		*/
		if(control.whichName === 'common') {
			$('.dropdown-input', '#search-compare-two-dropdown').val(li._common.replace(/_/g, ' '));
			$('.dropdown-input', '#search-compare-two-dropdown').prop('title', li._latin.replace(/_/g, ' '));
			} else {
			$('.dropdown-input', '#search-compare-two-dropdown').val(li._latin.replace(/_/g, ' '));
			$('.dropdown-input', '#search-compare-two-dropdown').prop('title', li._common.replace(/_/g, ' '));
		}

		$('#search-compare-two-dropdown').css({backgroundColor:'rgb(29, 144, 156)'});
		$('.dropdown-input', '#search-compare-two-dropdown').css({backgroundColor:'rgb(29, 144, 156)'});
		this.fuseSearch(2, '', control);

		control.drawData();

		//findAUC(2, li._latin);

		$('input', '#legend-blue-controls').prop('checked', true);

		if(control.searchControl._similarDistribution !== undefined)
			this.populateDistributionLists(control);
	},
};
});
