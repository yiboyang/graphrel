// set up SVG for D3
// size affects iframe resizing in the main app page
var width = 500,
    height = 500,
    linkDistance = 100,
    xbound, // these bounds will be dynamically set by main page
    ybound,
    colors = d3.scale.category20();

var svg = d3.select('body')
    .append('svg')
    .attr('oncontextmenu', 'return false;')
    .attr('width', width)
    .attr('height', height)
    .attr('id', 'mainSvg');


// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
//  - $visited helps with graph traversal
// specify initial positions of nodes to avoid random (by default) behavior at beginning
var nodes = [
    { id: 0, reflexive: false, x: 50, y: 100, visited: false },
    { id: 1, reflexive: false, x: 100, y: 50, visited: false },
],
  lastNodeId = 1,
  links = [
    { source: nodes[0], target: nodes[1], left: false, right: true },
  ];

// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(linkDistance)
    .charge(-400)
    .on('tick', tick)

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

// line displayed when dragging new nodes
var drag_line = svg.append('svg:path')
  .attr('class', 'link dragline hidden')
  .attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');

// mouse event vars
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;
drag_node = null;

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick() {
    // draw directed edges with proper padding from node centers
    path.attr('d', function (d) {
        var deltaX = d.target.x - d.source.x,
            deltaY = d.target.y - d.source.y,
            dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            normX = deltaX / dist,
            normY = deltaY / dist,
            sourcePadding = d.left ? 17 : 12,
            targetPadding = d.right ? 17 : 12,
            sourceX = d.source.x + (sourcePadding * normX),
            sourceY = d.source.y + (sourcePadding * normY),
            targetX = d.target.x - (targetPadding * normX),
            targetY = d.target.y - (targetPadding * normY);
        return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });

    // move all the circles to current positions by updating the transform attributes in svg container
    circle.attr('transform', function (d) {
        // update position against border
        if (xbound && ybound) {
            var prevdx = d.x, prevdy = d.y;
            d.x = Math.max(15, Math.min(xbound - 25, d.x));
            d.y = Math.max(15, Math.min(ybound - 25, d.y));
            if (prevdx != d.x || prevdy != d.y) {
                d3.select(this).classed("fixed", d.fixed = false); // set fixed bit to false
                if (d === drag_node) { // if the node is being dragged outside border, release mouse early to prevent crazy rebounce
                    var event = document.createEvent("SVGEvents");
                    event.initEvent("mouseup", true, true);
                    this.dispatchEvent(event);
                }
            }
        }

        return 'translate(' + d.x + ',' + d.y + ')';
    });
}

// update graph (called when needed)
function restart() {
    // bind links to path group
    path = path.data(links);

    // update existing links based on their states (dynamically set classes for CSS animation: http://jaketrent.com/post/d3-class-operations/)
    path.classed('selected', function (d) { return d === selected_link; })
      .style('marker-start', function (d) { return d.left ? 'url(#start-arrow)' : ''; })
      .style('marker-end', function (d) { return d.right ? 'url(#end-arrow)' : ''; });

    // add new links
    path.enter().append('svg:path')
      .attr('class', 'link')
      .classed('selected', function (d) { return d === selected_link; })
      .style('marker-start', function (d) { return d.left ? 'url(#start-arrow)' : ''; })
      .style('marker-end', function (d) { return d.right ? 'url(#end-arrow)' : ''; })
      .on('mousedown', function (d) {
          if (d3.event.ctrlKey) return;

          // select link
          mousedown_link = d;
          if (mousedown_link === selected_link) selected_link = null;
          else selected_link = mousedown_link;
          selected_node = null;
          restart();
      });

    // remove old links
    path.exit().remove();

    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    circle = circle.data(nodes, function (d) { return d.id; });

    // update existing nodes (reflexive & selected visual states)
    circle.selectAll('circle')
      .style('fill', function (d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
      .classed('reflexive', function (d) { return d.reflexive; });

    // add new nodes
    var g = circle.enter().append('svg:g');

    g.append('svg:circle')
      .attr('class', 'node')
      .attr('r', 12)
      .style('fill', function (d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
      .style('stroke', function (d) { return d3.rgb(colors(d.id)).darker().toString(); })
      .classed('reflexive', function (d) { return d.reflexive; })
      .on('mouseover', function (d) {
          if (!mousedown_node || d === mousedown_node) return;
          // enlarge target node
          d3.select(this).attr('transform', 'scale(1.1)');
      })
      .on('mouseout', function (d) {
          if (!mousedown_node || d === mousedown_node) return;
          // unenlarge target node
          d3.select(this).attr('transform', '');
      })
      .on('mousedown', function (d) {
          if (d3.event.ctrlKey) { drag_node = d; return; }

          // select node
          mousedown_node = d;
          if (mousedown_node === selected_node) selected_node = null;
          else selected_node = mousedown_node;
          selected_link = null;

          // reposition drag line
          drag_line
            .style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

          restart();
      })
      .on('mouseup', function (d) {
          if (!mousedown_node) return;

          // needed by FF
          drag_line
            .classed('hidden', true)
            .style('marker-end', '');

          // check for drag-to-self
          mouseup_node = d;
          if (mouseup_node === mousedown_node) { resetMouseVars(); return; }

          // unenlarge target node
          d3.select(this).attr('transform', '');

          // add link to graph (update if exists)
          // NB: links are strictly source.id < target.id; arrows separately specified by booleans
          var source, target, direction;
          // 'right' is the conventional direction of source to target; 'left' is the reverse
          if (mousedown_node.id < mouseup_node.id) {
              source = mousedown_node;
              target = mouseup_node;
              direction = 'right';
          } else {
              source = mouseup_node;
              target = mousedown_node;
              direction = 'left';
          }

          // check and see if a link with specified source or target exists
          var link;
          link = links.filter(function (l) {
              return (l.source === source && l.target === target);
          })[0];

          // if a link already exists, update its left/right values with new direction; else create new link
          if (link) {
              link[direction] = true;
          } else {
              link = { source: source, target: target, left: false, right: false };
              link[direction] = true;
              links.push(link);
          }

          // select new link after creation for convenient editing
          selected_link = link;
          selected_node = null;
          updateAdjlistFrame();
          updatePropFrame();
          restart();
      })
    .on("dblclick", dblclick);

    // show node IDs
    g.append('svg:text')
        .attr('x', 0)
        .attr('y', 4)
        .attr('class', 'id')
        .text(function (d) { return d.id; });

    // remove old nodes
    circle.exit().remove();

    // set the graph in motion
    force.start();
}

function mousedown() {
    // prevent I-bar on drag
    //d3.event.preventDefault();

    // because :active only works in WebKit?
    svg.classed('active', true);

    if (d3.event.ctrlKey || mousedown_node || mousedown_link) return;

    // insert new node at point
    var point = d3.mouse(this),
        node = { id: ++lastNodeId, reflexive: false, visited: false };
    node.x = point[0];
    node.y = point[1];
    nodes.push(node);
    updateAdjlistFrame();
    updatePropFrame();
    restart();
}

function mousemove() {
    if (!mousedown_node) return;

    // update drag line
    drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

    restart();
}

function mouseup() {
    if (mousedown_node) {
        // hide drag line
        drag_line
          .classed('hidden', true)
          .style('marker-end', '');
    }

    // because :active only works in WebKit?
    svg.classed('active', false);

    // clear mouse event vars
    resetMouseVars();
}

// helper function to clean up links on node removal
// remove all the links that originate or end at the node
function spliceLinksForNode(node) {
    var toSplice = links.filter(function (l) {
        return (l.source === node || l.target === node);
    });
    toSplice.map(function (l) {
        links.splice(links.indexOf(l), 1);
    });
}

// only respond once per keydown
var lastKeyDown = -1;

function keydown() {
    d3.event.preventDefault();

    if (lastKeyDown !== -1) return;
    lastKeyDown = d3.event.keyCode;

    // ctrl, allow dragging
    if (d3.event.keyCode === 17) {
        circle.call(drag);
        svg.classed('ctrl', true);
    }

    if (!selected_node && !selected_link) return;

    switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
            if (selected_node) {
                nodes.splice(nodes.indexOf(selected_node), 1);
                spliceLinksForNode(selected_node);
            } else if (selected_link) {
                links.splice(links.indexOf(selected_link), 1);
            }
            selected_link = null;
            selected_node = null;
            updateAdjlistFrame();
            updatePropFrame();
            restart();
            break;
        case 66: // B
            if (selected_link) {
                // set link direction to both left and right
                selected_link.left = true;
                selected_link.right = true;
            }
            updateAdjlistFrame();
            updatePropFrame();
            restart();
            break;
        case 76: // L
            if (selected_link) {
                // set link direction to left only
                selected_link.left = true;
                selected_link.right = false;
            }
            updateAdjlistFrame();
            updatePropFrame();
            restart();
            break;
        case 82: // R
            if (selected_node) {
                // toggle node reflexivity
                selected_node.reflexive = !selected_node.reflexive;
            } else if (selected_link) {
                // set link direction to right only
                selected_link.left = false;
                selected_link.right = true;
            }
            updateAdjlistFrame();
            updatePropFrame();
            restart();
            break;
    }
}

function keyup() {
    lastKeyDown = -1;

    // ctrl
    if (d3.event.keyCode === 17) {
        circle
          .on('mousedown.drag', null)
          .on('touchstart.drag', null);
        svg.classed('ctrl', false);
    }
}

// specify fixed bit for sticky dragging effect
var drag = force.drag()
    .on("dragstart", dragstart);
function dblclick(d) {
    d3.select(this).classed("fixed", d.fixed = false);
}
function dragstart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
}

// return the adjacency list describing current graph relation, in the form of node0id:[node1ref, node2ref...]
// the $undirected switch is optional; if provided (conventionally set to 1), produce the adjacency list of 
//underlying undirected graph instead of default directed graph
function getAdjlist(undirected) {
    var alist = {};

    // add all nodes/links
    for (var i = 0; i < links.length; i++) {
        var lnk = links[i];
        var src = lnk.source, tgt = lnk.target;
        var srcId = lnk.source.id, tgtId = lnk.target.id;
        if (!alist.hasOwnProperty(srcId))
            alist[srcId] = [];
        if (!alist.hasOwnProperty(tgtId))
            alist[tgtId] = [];
        if (typeof undirected != "undefined") {
            alist[srcId].push(tgt);
            alist[tgtId].push(src);
        } else {
            if (alist[srcId].indexOf(tgt) == -1 && lnk.right) // if src doesn't already have tgt in its list and lnk points from src to tgt
                alist[srcId].push(tgt);
            if (alist[tgtId].indexOf(src) == -1 && lnk.left) // if lnk points from target to source (both ways allowed)
                alist[tgtId].push(src);
        }
    }

    // add all loops
    for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        var nid = nodes[j].id;
        if (!alist.hasOwnProperty(nid))
            alist[nid] = [];
        if (n.reflexive)
            alist[nid].push(n);
    }

    // sort the individual arrays
    for (var nd in alist) {
        if (alist.hasOwnProperty(nd))
            alist[nd].sort(function (a, b) { return a.id - b.id });
    }

    // convert the node references in arrays to conventional id representation
    alist.toNumList = function () {
        var numList = {}; // create a copy; no modification on original
        for (var nd in this)
            if (nd !== "toNumList" && this.hasOwnProperty(nd)) {
                numList[nd] = [];
                for (var x = 0; x < this[nd].length; x++)
                    numList[nd][x] = this[nd][x].id;
            }
        return numList;
    };
    return alist;
}

// handle for the adjacency list editor frame; set in main page once ajdlist frame is ready
var alBox;
// updates the adjacency list frame in the main app upon node/link (loop too) creation/deletion
function updateAdjlistFrame() {
    if (typeof (window.parent.rightPanel) != "undefined" && !window.parent.rightPanel.hidden) {
        var alist = getAdjlist();
        setTimeout(function () {
            alBox.value = JSON.stringify(alist.toNumList()).replace(/["'{}]/g, "");
            alBox.className = 'valid';
            alBox.style.height = 'auto';
            alBox.style.height = alBox.scrollHeight + 'px';
        }, 0);
        return alist;
    }
}

// creates/updates the graph from a given (valid) 'list' object
// called when the adjacency list changes
function createFromList(list) {
    // create shallow copy containers to hold nodes/links that need to be removed
    var nodesToGo = nodes.slice();
    var linksToGo = links.slice();
    var loopNodesToGo = []; // treat (self-directed) links separately

    for (var n = 0; n < nodes.length; n++)
        if (nodes[n].reflexive)
            loopNodesToGo.push(nodes[n])

    // add nodes if not present
    for (var src in list) {
        var newNode = true,
            srcId = parseInt(src, 10);
        for (var n = 0; n < nodesToGo.length; n++) {
            if ((srcId == nodesToGo[n].id)) {
                newNode = false;
                nodesToGo.splice(nodesToGo.indexOf(nodesToGo[n]), 1);
                break;
            }
        }
        if (newNode)
            nodes.push({ id: srcId, reflexive: false, visited: false });
    }

    // remove leftover nodes and their associated links
    nodesToGo.map(function (n) {
        nodes.splice(nodes.indexOf(n), 1);
        spliceLinksForNode(n);
    });

    // remove link directions; add them in when present
    for (var l = 0; l < links.length; l++)
        links[l].left = links[l].right = false;

    // now deal with edges/links and loops
    for (var src in list) {
        if (src > lastNodeId) lastNodeId = src; // update lastNodeId to the largest in list
        var srcId = parseInt(src, 10);
        var srcNode = nodes.filter(function (n) { return n.id == srcId })[0];
        for (var i = 0; i < list[src].length; i++) {
            var tgtId = parseInt(list[src][i], 10);
            // if it's a loop
            if (srcId == tgtId) {
                if (srcNode.reflexive) // if this link (loop) exists
                    loopNodesToGo.splice(loopNodesToGo.indexOf(srcNode), 1);
                else
                    srcNode.reflexive = true;
                continue;
            }
            // non-loops
            var direction, source, target, tgtNode = nodes.filter(function (n) { return n.id == tgtId })[0];
            if (srcId < tgtId) {
                source = srcNode;
                target = tgtNode;
                direction = 'right';
            } else {
                source = tgtNode;
                target = srcNode;
                direction = 'left';
            }
            var link = links.filter(function (l) {
                return (l.source === source && l.target === target);
            })[0];
            // if there's a link between the two
            if (link) {
                var idxTg = linksToGo.indexOf(link);
                if (idxTg != -1)
                    linksToGo.splice(idxTg, 1); // preserve this edge
            } else {
                link = { source: source, target: target, left: false, right: false };
                links.push(link);
            }
            link[direction] = true; // enable desired direction
        }
    }

    // remove leftover links not present in the new graph
    linksToGo.map(function (l) {
        var idx = links.indexOf(l);
        if (idx != -1) // only remove those that are actually in links
            links.splice(links.indexOf(l), 1);
    });

    // disable the loops that need removed
    loopNodesToGo.map(function (n) {
        n.reflexive = false;
    });

    restart();
}

var pw;
function updatePropFrame() {
    if (typeof (window.parent.leftPanel) != "undefined" && !window.parent.leftPanel.hidden) {
        vcount = nodes.length,
        ecount = 0,
        idx = {}, // the order in which the nodes appear in a row/column of adjacency matrix
        alist = getAdjlist(), // TODO: make this more efficient by caching the adjlist
        undalist = getAdjlist(1), // get adjacency list of underlying undirected graph
        //indegr = [],
        //outdegr = [],
        weakconcomps = [],
        comp = [],
        adjmatrix = [],
        reflexive = true,
        irreflexive = true,
        symmetric = true,
        antisymmetric = true,
        transitive = true;

        for (var n = 0; n < nodes.length; n++) {
            nodes[n].visited = false;
            idx[nodes[n].id] = n;
        }

        function dfs() {
            for (var v = 0; v < vcount; v++) {
                if (!nodes[v].visited) {
                    comp = [];
                    weakconcomps.push(comp);
                    dfsFromNode(nodes[v]);
                }
            }
        }

        function dfsFromNode(v) {
            v.visited = true;
            comp.push(v);
            for (var a = 0; a < undalist[v.id].length; a++) {
                if (!undalist[v.id][a].visited)
                    dfsFromNode(undalist[v.id][a]);
            }
        }

        dfs();
        // convert node refs in weakconcomps to ids
        for (var x = 0; x < weakconcomps.length; x++)
            weakconcomps[x] = weakconcomps[x].map(function (n) { return n.id });

        // initialize adjacency matrix
        for (var i = 0; i < vcount; i++)
            adjmatrix[i] = Array.apply(null, Array(vcount)).map(Number.prototype.valueOf, 0);
        for (var src in alist) {
            var len = alist[src].length;
            ecount += len;
            for (var j = 0; j < len; j++) {
                adjmatrix[idx[src]][idx[alist[src][j].id]] = 1;
            }
        }

        // check main diagonal for reflexivity
        for (var i = 0; i < vcount; i++) {
            if (adjmatrix[i][i])
                irreflexive = false;
            else
                reflexive = false;
        }

        // compare adjmatrix and its transpose for symmetry/antisymmetry
        for (var i = 0; i < vcount; i++) {
            for (var j = 0; j < vcount; j++) {
                var trans = adjmatrix[j][i];
                if (trans != adjmatrix[i][j])
                    symmetric = false;
                else if (trans && adjmatrix[i][j] && i != j)
                    antisymmetric = false;
            }
        }

        // comapre the square of adjmatrix to itself. if entry in square is not in adjmatrix, then not transitive
        (function () {
            for (var i = 0; i < vcount; i++) { // for every row
                for (var j = 0; j < vcount; j++) { // for every column
                    var sqr = 0;
                    for (var k = 0; k < vcount; k++) // for every element in a row/column
                        sqr += adjmatrix[i][k] * adjmatrix[k][j];
                    if (sqr && !adjmatrix[i][j]) {
                        transitive = false;
                        return;
                    }
                }
            }
        })();

        jQuery("#gProp #vcount").text("vertex count:\t");
        jQuery("#gProp #vcount").append("<a>" + vcount + "</a>");
        jQuery("#gProp #ecount").text("edge count:\t");
        jQuery("#gProp #ecount").append("<a>" + ecount + "</a>");
        jQuery("#gProp #weakcon").text("");
        jQuery("#gProp #weakcon").append("<a>" + (weakconcomps.length == 1 ? "weakly connected" : "") + "</a>");
        jQuery("#gProp #weakconcomps").text("weakly connected components: ");
        jQuery("#gProp #weakconcomps").append("<a>" + weakconcomps[0] + "</a>");
        for (var c = 1; c < weakconcomps.length; c++)
            jQuery("#gProp #weakconcomps").append(" | " + "<a>" + weakconcomps[c] + "</a>");

        // jQuery("#rProp").each(function(index, elem) {jQuery(elem).text("")}); // I need some jQuery-fu
        jQuery("#rProp #reflexive").text("");
        jQuery("#rProp #irreflexive").text("");
        jQuery("#rProp #symmetric").text("");
        jQuery("#rProp #antisymmetric").text("");
        jQuery("#rProp #transitive").text("");
        jQuery("#rProp #reflexive").append("<a href='https://en.wikipedia.org/wiki/Reflexive_relation' >" + (reflexive ? "reflexive" : "") + "</a>");
        jQuery("#rProp #irreflexive").append("<a href='https://en.wikipedia.org/wiki/Reflexive_relation#irreflexive' >" + (irreflexive ? "irreflexive" : "") + "</a>");
        jQuery("#rProp #symmetric").append("<a href='https://en.wikipedia.org/wiki/Symmetric_relation' >" + (symmetric ? "symmetric" : "") + "</a>");
        jQuery("#rProp #antisymmetric").append("<a href='https://en.wikipedia.org/wiki/Antisymmetric_relation' >" + (antisymmetric ? "antisymmetric" : "") + "</a>");
        jQuery("#rProp #transitive").append("<a href='https://en.wikipedia.org/wiki/Transitive_relation' >" + (transitive ? "transitive" : "") + "</a>");
    }
}

function clear() {
    createFromList([]);
    restart();
    updateAdjlistFrame();
    updatePropFrame();
    lastNodeId = -1;
}

// app starts here
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);
d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);
restart();
