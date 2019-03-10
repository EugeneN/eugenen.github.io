const VISITED    = 1;
const INELIGIBLE = 2;

function CountriesList(features, el, vel, rel) {
  this.store      = {};
  this.features   = features;
  this.mode       = VISITED;
  this.el         = document.getElementById(el);
  this.vel        = document.getElementById(vel);
  this.rel        = document.getElementById(rel);
  this.visited    = {};
  this.ineligible = {};

  this.init();
  this.render();
}
CountriesList.prototype.init = function() {
  for (let i = 0; i < this.features.length; i++) {
    this.store[this.features[i].id] = this.features[i];
  }
  var z;
  try { z = JSON.parse(getCookie("vc")); } catch(e) { z = null; }
  if (Array.isArray(z)) { 
    for (var i=0; i<z.length; i++) {
      this.visited[z[i]] = true;
    }
  }
  try { z = JSON.parse(getCookie("ic")); } catch(e) { z = null; }
  if (Array.isArray(z)) { 
    for (var i=0; i<z.length; i++) {
      this.ineligible[z[i]] = true;
    }
  }
}
CountriesList.prototype.getById = function(id) {
  return this.store[id];
}
CountriesList.prototype.search = function(lat, lng) {
  let match = false;
  let country, coords;

  for (let i = 0; i < this.features.length; i++) {
    country = this.features[i];
    if(country.geometry.type === 'Polygon') {
      match = pointInPolygon(country.geometry.coordinates[0], [lng, lat]);
      if (match) {
        return {
          code: this.features[i].id,
          name: this.features[i].properties.name
        };
      }
    } else if (country.geometry.type === 'MultiPolygon') {
      coords = country.geometry.coordinates;
      for (let j = 0; j < coords.length; j++) {
        match = pointInPolygon(coords[j][0], [lng, lat]);
        if (match) {
          return {
            code: this.features[i].id,
            name: this.features[i].properties.name
          };
        }
      }
    }
  }
  return null;
}
CountriesList.prototype.getCountriesList = function() {
  return Object.keys(this.store);
}
CountriesList.prototype.getVisitedCountriesList = function() {
  var self = this;
  return Object.keys(this.visited).filter(function(x) { return self.visited[x] === true });
}
CountriesList.prototype.getIneligibleCountriesList = function() {
  var self = this;
  return Object.keys(this.ineligible).filter(function(x) { return self.ineligible[x] === true });
}
CountriesList.prototype.getUnvisitedCountriesList = function() {
  var self = this;
  return Object.keys(this.store).filter(function(x) { return self.visited[x] !== true && self.ineligible[x] !== true });
}
CountriesList.prototype.getRandomCountry = function() {
  var xs  = this.getUnvisitedCountriesList();
  var min = 0, max = xs.length;
  var i   = Math.round(Math.random() * (max - min) + min);
  var c   = this.getById(xs[i]); 

  console.log("random country is ", c)

  return c;
}
CountriesList.prototype.setMode = function(m) { 
  this.mode = m; 
  this.render();
}
CountriesList.prototype.markAsVisited = function(country) {
  this.visited[country.id] = true;

  setCookie("vc", JSON.stringify(this.getVisitedCountriesList()));
  setCookie("ic", JSON.stringify(this.getIneligibleCountriesList()));
  this.render();
}
CountriesList.prototype.toggle = function(x) {
  if (this.mode === VISITED) { var v = this.visited; } 
  else { var v = this.ineligible; }

  if (v[x]) { v[x] = !v[x]; } 
  else { v[x] = true; }

  setCookie("vc", JSON.stringify(this.getVisitedCountriesList()));
  setCookie("ic", JSON.stringify(this.getIneligibleCountriesList()));
  this.render();

  this.onEligibleCb();
}
CountriesList.prototype.onIneligibleChange = function(f) {
  this.onEligibleCb = f;
}
CountriesList.prototype.isSelected = function(x) {
  if(this.mode === VISITED) { return this.visited[x] === true; } 
  else { return this.ineligible[x] === true; }
}
CountriesList.prototype.render = function() {
  var self = this;
  var xs = Object.keys(this.store);
  var h = xs.map(function(x) { 
    var cls = self.isSelected(x) ? "c-visited" : "c-not-visited"; 
    return "<div class='" + cls + "' onclick='toggleCountry(\""+x+"\")'>"+x+"</div>" 
  });
  var v  = Object.values(this.visited).filter(function(x) { return x}).length;
  var ie = Object.values(this.ineligible).filter(function(x) { return x}).length;
  var r  = Object.values(xs).length - (v + ie);

  if (this.mode === VISITED) {
    document.getElementById('cl-visited').classList.add('mode-visited');
    document.getElementById('cl-ineligible').classList.remove('mode-visited');
  } else {
    document.getElementById('cl-visited').classList.remove('mode-visited');
    document.getElementById('cl-ineligible').classList.add('mode-visited');
  }
  
  this.el.innerHTML = h.join("");
  this.vel.innerHTML = v + " / " + ie;
  this.rel.innerHTML = r;
}

// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
function pointInPolygon(poly, point) {

  let x = point[0];
  let y = point[1];

  let inside = false, xi, xj, yi, yj, xk;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    xi = poly[i][0];
    yi = poly[i][1];
    xj = poly[j][0];
    yj = poly[j][1];

    xk = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (xk) {
       inside = !inside;
    }
  }

  return inside;
};

function findGeomCenter(country) {
  // WTF XXX coords in the data file are [lon, lat] XXX WTF //
  var findCenter = function(g) {
      var xs = g.map(function(x){ return x[0] });
      var ys = g.map(function(x){ return x[1] });
      var lon = (Math.min(...xs)+Math.max(...xs))/2;
      var lat = (Math.max(...ys)+Math.min(...ys))/2

      return [lat, lon]
  }

  var r;

  if (country.geometry.type == 'Polygon') {
      r = country.geometry.coordinates[0];
  } else if (country.geometry.type == 'MultiPolygon') {
      var gs = country.geometry.coordinates.map(function(x){ return x[0] });
      r = gs.reduce(function(acc, cur){ 
          if (cur.length > acc.length) {
              return cur;
          } else {
              return acc;
          }
      }, []);
  } else {
      throw("findGeomCenter: bad input: ", country.geometry);
  }
  return findCenter(r);
}

function getPoint(event) {
  // Get the vertices
  let a = this.geometry.vertices[event.face.a];
  let b = this.geometry.vertices[event.face.b];
  let c = this.geometry.vertices[event.face.c];

  // Average them together
  let point = {
    x: (a.x + b.x + c.x) / 3,
    y: (a.y + b.y + c.y) / 3,
    z: (a.z + b.z + c.z) / 3
  };

  return point;
}

function getEventCenter(event, radius) {
  radius = radius || 200;

  var point = getPoint.call(this, event);

  var latRads = Math.acos(point.y / radius);
  var lngRads = Math.atan2(point.z, point.x);
  var lat = (Math.PI / 2 - latRads) * (180 / Math.PI);
  var lng = (Math.PI - lngRads) * (180 / Math.PI);

  return [lat, lng - 180];
}

function convertToXYZ(point, radius) {
  var lambda = point[0] * Math.PI / 180,
      phi = point[1] * Math.PI / 180,
      cosPhi = Math.cos(phi);
  return new THREE.Vector3(
    radius * cosPhi * Math.cos(lambda),
    radius * Math.sin(phi),
  - radius * cosPhi * Math.sin(lambda)
  );
}
function rad2deg(point) {
   var latD = point[0] * 180 / Math.PI;
   var lonD = point[1] * 180 / Math.PI;

   return {x: latD, y: lonD, z: 0};
}

function deg2rad(point) {
  var latR = point[0] * Math.PI / 180,
      lonR = point[1] * Math.PI / 180;

  return {x: latR, y: -Math.PI/2 - lonR, z: 0};
}

function convertToXYZ_(point, radius) {

  var latRads = ( 90 - point[0]) * Math.PI / 180;
  var lngRads = (180 - point[1]) * Math.PI / 180;

  var x = radius * Math.sin(latRads) * Math.cos(lngRads);
  var y = radius * Math.cos(latRads);
  var z = radius * Math.sin(latRads) * Math.sin(lngRads);

  return {x: x, y: y, z: z};
}


