function buildtree(teams) {
  var round = 7;
  var gid = 127;

  var root = {
    gid: gid--,
    region: "south-east-west-midwest",
    round: round--,
    children: [],
  };

  var roundgames = {7: [root]};

  // 1-16: south; 17-32: east; 33-48: west; 49-64: midwest
  // 65-72: south; 73-80: east; 81-88: west; 89-96; midwest
  // 97-100: south; 101-104: east; 105-108: west; 109-112: midwest
  // 113-114: s; 115-116: e; 117-118: w; 119-120: mw
  // 121: s; 122: e; 123: w; 124: mw
  // 125: s-e; 126: w-mw
  // 127: s-e-w-mw
  function region(gid) {
    if ((gid >= 1 && gid <= 16) || (gid >= 65 && gid <= 72) ||
        (gid >= 97 && gid <= 100) ||
        (gid == 113 || gid == 114 || gid == 121)) { return "south"; }
    if ((gid >= 17 && gid <= 32) || (gid >= 73 && gid <= 80) ||
        (gid >= 101 && gid <= 104) ||
        (gid == 115 || gid == 116 || gid == 122)) { return "east"; }
    if ((gid >= 33 && gid <= 48) || (gid >= 81 && gid <= 88) ||
        (gid >= 105 && gid <= 108) ||
        (gid == 117 || gid == 118 || gid == 123)) { return "west"; }
    if ((gid >= 49 && gid <= 64) || (gid >= 89 && gid <= 96) ||
        (gid >= 109 && gid <= 112) ||
        (gid == 119 || gid == 120 || gid == 124)) { return "midwest"; }
    if (gid == 125) { return "south-east"; }
    if (gid == 126) { return "west-midwest"; }
    if (gid == 127) { return "south-east-west-midwest"; }

    // raise an error if we fall through
    throw new Error("undefined region for gid " + gid);
  }

  while (round > 0) {
    roundgames[round] = [];
    for (var i=0; i < roundgames[round+1].length; i++) {
      var left = {
        gid: gid,
        region: region(gid),
        round: round,
        team: undefined,
        children: [],
      }
      gid--;

      var right = {
        gid: gid,
        region: region(gid),
        round: round,
        children: [],
      }
      gid--;

      roundgames[round+1][i].children.push(left);
      roundgames[round+1][i].children.push(right);
      roundgames[round].push(left);
      roundgames[round].push(right);
    }
    round--;
  }

  var order = ['1', '16', '8', '9', '5', '12', '4', '13',
           '6', '11', '3', '14', '7', '10', '2', '15'];
  var regions = ["south", "east", "west", "midwest"];

  function findgame(gid) {
    var found = undefined;

    $.each(roundgames[1], function(i, game) {
      if (game.gid == gid) {
        found = game;
        return false;
      }
    });

    if (!found) throw new Error("Unable to find gid " + gid);

    return found;
  }

  var gid = 1;
  $.each(regions, function(i, region) {
    $.each(order, function(j, seed) {
      var game = findgame(gid);
      game.team = teams[region][seed];
      gid++;
    });
  });

  //TODO just save this out to json so that we don't build the tree every time
  return root;
}

function main(teams) {
  var radius = 400,
      numRounds = 7,
      segmentWidth = radius / (numRounds + 1),
      root = buildtree(teams);

  var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, radius]) // x maps to angle, y to radius
    .value(function(d) { return 1; }); //Important!

  var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return d.y; })
    .outerRadius(function(d) { return d.y + d.dy; });

  function trans(x, y) {
    return 'translate('+x+','+y+')';
  }

  function rotate(a, x, y) {
    a = a * 180 / Math.PI;
    return 'rotate('+a+')';
  }

  var xCenter = radius, yCenter = radius;
  var svg = d3.select('#bracket')
              .append('svg')
              .attr('width', radius*2+25)
              .attr('height', radius*2+25)
              .append('g')
              .attr('transform', trans(xCenter,yCenter));

  var chart = svg.append('g').attr("id", "chart");
  chart.datum(root).selectAll('.arc')
    .data(partition.nodes)
    .enter()
    .append('g')
      .attr("class", "arc")
      .attr("id", function(d) { return "game" + d.gid; });

  var arcs = d3.selectAll('.arc');

  var spots = {
    121: [-104, -104],
    122: [-104, 104],
    123: [92, 92],
    124: [88, -88],
    125: [-90,0],
    126: [70,0],
    127: [-12,0],
  }

  function hover(team) {
    if (!team.team) { return; }

    //TODO can't assume this
    var round = 2;
    var par = team.parent;
    while (round < 8) {
      // sr is "silver round", and is round-1
      var sr = round-1;
      var game = d3.select("#game" + par.gid);

      // color the main path
      game.select("path").style("fill", "rgba(252, 0, 7, .5)");

      if (spots.hasOwnProperty(par.gid)) {
        var x = spots[par.gid][0];
        var y = spots[par.gid][1];
      } else {
        var bb = game.node().getBBox();
        var x = bb.x + bb.width/4;
        var y = bb.y + bb.height/2;
      }
      console.log(game, team.team["round" + sr]);
      game.append("text")
          .text((team.team["round" + sr] * 100).toFixed(0).toString() + "%")
          .attr("class", "pcttext")
          .attr("x", x)
          .attr("y", y);
      var par = par.parent;
      round++;
    }
  }

  function clear(team) {
    d3.selectAll(".arc path").style("fill", "#fff");
    d3.selectAll(".pcttext").remove()
  }

  arcs.on('mouseover', function(d) { hover(d); })
    .on('mouseleave', function(d) { clear(d); })
    .append('path')
      .attr('d', arc)
      .attr("id", function(d) { return "path-game" + d.gid; });

  function logo(d) {
    var bbox = d3.select("#game"+d.gid+" path").node().getBBox();
    var x = bbox.x + 15 * Math.pow(Math.abs(Math.sin(d.x)), .5);
    var y = bbox.y + 20 * Math.pow(Math.abs(Math.cos(d.x)), .5);
    if (d.region == "midwest") {
      x += 6 * Math.pow(Math.abs(Math.sin(d.x)), .5);
    }

    return trans(x, y);
  }

  arcs.append("clipPath")
    .attr("id", function(d) { return "text-clip-game" + d.gid; })
  .append("use")
    .attr("xlink:href", function(d) { return "#path-game" + d.gid; });

  logos = arcs.append('g')
    .attr("class", "logo")
    .attr("clip-path", function(d) { return "url(#text-clip-game"+d.gid+")"; })
    .attr("id", function(d) { return "logo" + d.gid; });

  logos.filter(function(d) { return d.team; })
    .append("image")
    .attr("xlink:href", function(d) { return "logos/"+d.team.name+".png"; })
    .attr("transform", logo)
    .attr("width", "30")
    .attr("height", "30");
}

queue()
  .defer(d3.json, 'teams.json')
  .await(function(err, teams) { main(teams); })
