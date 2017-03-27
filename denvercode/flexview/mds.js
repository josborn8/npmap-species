const fs = require('fs');
require('./assets/js/vendor/mds/mds2');
require('./assets/js/vendor/numeric/lib/numeric-1.2.6');


function handle_data(data, save) {
	var sp_count = Object.keys(data).length;
	var distances = new Array(sp_count);

	var i = 0;
	for (var sp1 in data) {
		distances[i] = new Array(sp_count);

		var j = 0;
		for (var sp2 in data[sp1]) {
			distances[i][j] = (1-data[sp1][sp2]) * 1000;
			j++;
		}

		i++;
	}

	var names = [];
	for (var sp in data) {
		names.push(sp);
	}

	var coordinates = mds.classic(distances, 2);

	if (save) {
		fs.writeFile('./assets/data/sim_coords.json', JSON.stringify({
			'coords': coordinates,
			'names': names
		}));
	} else {
		console.log(JSON.stringify({
			'coords': coordinates,
			'names': names
		}));
	}
}

function main(save) {
	fs.readFile('./assets/data/sim_matrix.json', 'utf-8', function(err, data) {
		if (err) {
			throw err;
		} else {
			handle_data(JSON.parse(data), save);
		}
	});
}

main(process.argv[2]);
