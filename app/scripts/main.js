/* global d3, _*/
'use strict';

function parseRow(item) {
	return {
		fileA: item.FileA,
		fileB: item.FileB,
		corr:  parseFloat(item.pcorValues)
	};
}

function computeNetwork(data, correlationThreshold) {

	var network = {
		nodes: [],
		links: []
	};

	var rows = _.map(data, parseRow);

	var filesA = _.pluck(rows, 'fileA'),
			filesB = _.pluck(rows, 'fileB'),
			fileNames = _.union(filesA, filesB);

	var nodeMap = {};

	// Nodes
	_.each(fileNames, function(name, index) {
		network.nodes.push({name: name, index: index});
		nodeMap[name] = index;
	});


	// Generate the links
	_.each(rows, function(row) {
	
		var source = nodeMap[row.fileA],
				target = nodeMap[row.fileB];
	
		if (row.corr > correlationThreshold) {
			network.links.push({source: source, target: target});			
		}

	});

	return network;
}

// Initialize the tooltip
var tip = d3.tip()
	.attr('class', 'd3-tip')
	.offset([-20, 0])
	.html(function(d) { return d.name; });


d3.tsv('data/partialCorrelations_0.1.sif', function(error, data) {

	if (error) {
		throw error;
	}

	var graph = computeNetwork(data, 0);

	var div = d3.select('#visualization-container'),
			svg = div.selectAll('svg').data([graph]);

	var width = Math.min(parseInt(div.style('width'), 10), 750),
			height = width;

	var force = d3.layout.force()
		.nodes(graph.nodes)
		.links(graph.links)
		.gravity(0.15)
		.size([width, height])
		.start();

	svg.enter().append('svg')
		.classed('network-chart', true)
		.call(tip);

	svg
		.attr('width', width)
		.attr('height', height);

	var links = svg.selectAll('.link').data(graph.links);

	links.enter().append('line')
		.classed('link', true);

	var nodes = svg.selectAll('.node').data(graph.nodes);

	nodes.enter().append('circle')
		.classed('node', true)
		.attr('r', 5)
		.call(force.drag);

	nodes
		.on('mouseover', function(d) {
			
			d3.select(this).transition()
				.attr('r', 8);

			tip.show(d);
		})
		.on('mouseout', function(d) {

			d3.select(this).transition()
				.attr('r', 5);

			tip.hide(d);
		});

	force.on('tick', function() {

		links
			.attr('x1', function(d) { return d.source.x; })
			.attr('y1', function(d) { return d.source.y; })
			.attr('x2', function(d) { return d.target.x; })
			.attr('y2', function(d) { return d.target.y; });

		nodes
			.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; });

	});

	nodes.exit().remove();

	links.exit().remove();

	svg.exit().remove();


});