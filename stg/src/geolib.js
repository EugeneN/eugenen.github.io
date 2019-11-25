const selectedForSpinCookie = "sfs";

function CountriesList(features, eligibleCountries, el, totalCountEl, selectedCountEl, playEl) {
  this.store             = {};
  this.features          = features;
  this.eligibleCountries = eligibleCountries;
  this.el                = $(el);
  this.totalCountEl      = $(totalCountEl);
  this.selectedCountEl   = $(selectedCountEl);
  this.playEl            = $(playEl);
  this.selectedForSpin   = {};

  this.init();
  this.render();
}
CountriesList.prototype.init = function() {
  for (let i = 0; i < this.features.length; i++) {
    if (this.eligibleCountries.includes(this.features[i].id)) {
      this.store[this.features[i].id] = this.features[i];  
    } else {
      console.log("Ineligible country: ", this.features[i].id);
    }
  }
  this.restoreState();
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
CountriesList.prototype.getSelectedForSpinCountriesList = function() {
  var self = this;
  return Object.keys(this.store).filter(function(x) { return self.selectedForSpin[x] === true });
}
CountriesList.prototype.getRandomCountry = function() {
  var xs   = this.getSelectedForSpinCountriesList();
  var min  = 0, max = xs.length-1;
  var rndi = getRandomInt(min, max);
  var c    = this.getById(xs[rndi]); 

  return c;
}
CountriesList.prototype.toggle = function(x) {
  var v = this.selectedForSpin;

  if (v[x]) { v[x] = !v[x]; } 
  else { v[x] = true; }

  this.saveState();
  this.render();
}
CountriesList.prototype.reset = function(x) {
  this.selectedForSpin = {};

  this.saveState();
  this.render();
}
CountriesList.prototype.saveState = function() {
  setCookie(selectedForSpinCookie, JSON.stringify(this.getSelectedForSpinCountriesList()));
}
CountriesList.prototype.restoreState = function(id) {
  var z;
  try { z = JSON.parse(getCookie(selectedForSpinCookie)); } catch(e) { z = null; }
  if (Array.isArray(z)) { 
    this.selectedForSpin = {};
    for (var i=0; i<z.length; i++) {
      this.selectedForSpin[z[i]] = true;
    }
  }
}
CountriesList.prototype.getSelectedCls = function(x) {
  if (this.selectedForSpin[x]) { 
    return "c-not-ineligible"; 
  } else { 
    return "c-ineligible"; 
  } 
}
CountriesList.prototype.render = function() {
  var self = this;
  var xs = Object.keys(this.store).sort();
  var h = xs.map(function(x) { 
    var cls = self.getSelectedCls(x); 
    return '<div class="' + cls + '" data-countryid="' + x + '">'+x+'</div>' 
  });
  var sfs = Object.values(this.selectedForSpin).filter(function(x) { return x }).length;
  var total = xs.length;

  this.el.innerHTML = h.join("");
  this.selectedCountEl.innerHTML = sfs;
  this.totalCountEl.innerHTML    = total;
  this.playEl.disabled = sfs == 0;
}

//----------------

getRandomInt = function(min, max) { 
  var byteArray = new Uint8Array(1);
  window.crypto.getRandomValues(byteArray);

  var range = max - min + 1;
  var max_range = 256;
  if (byteArray[0] >= Math.floor(max_range / range) * range) {
    return getRandomInt(min, max);
  }

  return min + (byteArray[0] % range);
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




