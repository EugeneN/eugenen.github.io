
var projection = d3.geoEquirectangular()
  .translate([2048, 1024])
  .scale(650);

 function mapTexture(geojson, fgColor, bgColor) {
  var texture, context, canvas;

  canvas = d3.select("body").append("canvas")
    .style("display", "none")
    .attr("width", "4096px")
    .attr("height", "2048px");

  context = canvas.node().getContext("2d");

  var path = d3.geoPath()
    .projection(projection)
    .context(context);

  context.strokeStyle = fgColor; 
  context.lineWidth = 1;
  context.fillStyle = bgColor; 

  context.beginPath();
  path(geojson);
  if (bgColor) { context.fill(); }
  context.stroke();

  // DEBUGGING - Really expensive, disable when done.
  // console.log(canvas.node().toDataURL());

  texture = new THREE.Texture(canvas.node());
  texture.needsUpdate = true;

  canvas.remove();

  return texture;
}
