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

  return c;
}
CountriesList.prototype.setMode = function(m) { 
  this.mode = m; 
  this.render();
}
CountriesList.prototype.toggleMode = function() { 
  if (this.mode === VISITED) { this.mode = INELIGIBLE; }
  else { this.mode = VISITED; }
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
}
CountriesList.prototype.getSelectedCls = function(x) {
  if      (this.mode === VISITED &&  this.visited[x])    { return "c-visited"; } 
  else if (this.mode === VISITED && !this.visited[x])    { return "c-not-visited"; } 
  else if (this.mode !== VISITED &&  this.ineligible[x]) { return "c-ineligible"; } 
  else                                                   { return "c-not-ineligible"; } 
}
CountriesList.prototype.render = function() {
  var self = this;
  var xs = Object.keys(this.store).sort();
  var h = xs.map(function(x) { 
    var cls = self.getSelectedCls(x); 
    return "<div class='" + cls + "' data-countryid='" + x + "'>"+x+"</div>" 
  });
  var v  = Object.values(this.visited).filter(function(x) { return x}).length;
  var ie = Object.values(this.ineligible).filter(function(x) { return x}).length;
  var r  = Object.values(xs).length - (v + ie);

  if (this.mode === VISITED) {
    document.getElementById('cl-mode').classList.remove('mode-ineligible');
  } else {
    document.getElementById('cl-mode').classList.add('mode-ineligible');
  }
  
  this.el.innerHTML = h.join("");
  this.vel.innerHTML = v;
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




