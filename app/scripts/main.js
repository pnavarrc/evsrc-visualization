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

	var links = [],
		nodes = [];

	var rows = _.map(data, parseRow);

	var filesA = _.pluck(rows, 'fileA'),
			filesB = _.pluck(rows, 'fileB'),
			fileNames = _.union(filesA, filesB);

	var nodeMap = {};

	// Variables for clustering and coloring
	var clusters = [],
    // TODO consistent colorscheme
        colors = [
            '#f08080','#a0f0a0','#a0a0f0','#a0f0f0','#f0a0f0','#f0f0a0','#60f020',
            '#a040a0','#f0a080','#80f0a0','#20f0f0','#f0f020','#b0b040','#40b0f0'
        ];

	// Nodes
	_.each(fileNames, function(name, index) {
		nodes.push({name: name, index: index });
		nodeMap[name] = index;
	});

	// Generate the links
	_.each(rows, function(row) {

		var source = nodeMap[row.fileA],
			target = nodeMap[row.fileB];

		var n1, n2, c1, c2;

		if (row.corr > correlationThreshold) {
			links.push({source: source, target: target});

            n1 = nodes[source];
            n2 = nodes[target];
            c1 = n1.cluster;
            c2 = n2.cluster;

            if (typeof c1 === 'undefined' && typeof c2 === 'undefined') {
                // Create new cluster
                n1.cluster = [n1,n2];
                n2.cluster = n1.cluster;
                clusters.push(n1.cluster);
            } else if (typeof c1 === 'undefined') {
                // Add lone node to other one's cluster
                c2.push(n1);
                n1.cluster = c2;
            } else if (typeof c2 === 'undefined') {
                c1.push(n2);
                n2.cluster = c1;
            } else if (c1 !== c2) {
                // Merge clusters and update its reference among its elements
                var newCluster = c1.concat(c2);
                _.each(newCluster, function(n) {
                    n.cluster = newCluster;
                });
                clusters[ clusters.indexOf(c1) ] = newCluster;
                clusters[ clusters.indexOf(c2) ] = undefined;
            }
		}
	});

    _.each(clusters, function(c,i) {
        if (typeof c === 'undefined') {
            return;
        }

		var group = {
			tooltip: [],
			name: 'cluster'+ i
		};

        _.each(c, function(n, i) {
            // Assign distinct color
            n.color = colors[i];
            n.group = group;
            // Build tooltip common for all group
			group.tooltip.push('<span style="color:'+ n.color +'">'+ n.name +'</span>');

            // This reference is no longer needed
            delete n.cluster;
		});
		group.tooltip = group.tooltip.join('<br>');
    });

	return {
		nodes: nodes,
		links: links,
	};
}

// Initialize the tooltip
var tip = d3.tip()
	.attr('class', 'd3-tip')
	.offset([-20, 0])
	.html(function(d) { return d; });


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

    // Mark all circles with their cluster
	svg.selectAll('.node').each(function(d) {
		d3.select(this).classed(d.group.name, true);
	});

	nodes
		.on('mouseover', function(d) {
            // Color all nodes of this cluster
			svg.selectAll('.' + d.group.name).each(function(n) {
				d3.select(this)
					.transition()
					.style('fill', n.color);
			});

			tip.show(d.group.tooltip);
		})
		.on('mouseout', function(d) {
            // Back to grey
			svg.selectAll('.' + d.group.name)
				.transition()
				.style('fill', '#bcbcbc');

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
