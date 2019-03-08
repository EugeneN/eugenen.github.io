var topojsonFeature = topojson.feature;
var segments = 155;

var countriesTopo;
var overlay;

var textureCache;

var container, stats;
var camera, scene, renderer, controls;
var group;
var mouseX = 0, mouseY = 0;
var rotationDeltaSpin = 0.15;
var rotationDeltaDefault = 0.005;
var rotationDelta = rotationDeltaDefault;
var winner  = document.getElementById("winner");
var spinner = document.getElementById("play");
var vlist   = document.getElementById("countries-list-wrapper");
var rules   = document.getElementById("rules-wrapper");

var baseRadius    = 170;
var winnerCountry = null;

function getBaseRadius() {
    if (window.innerWidth < 900) { return 100 }
    else { return 170; }
}

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var cl;

d3.json('data/world.json').then(function(data){
    countriesTopo = topojsonFeature(data, data.objects.countries);
    cl = new CountriesList(countriesTopo.features, "countries-list", "visited-count", "remaining-count")

    textureCache = memoize(function (cntryID, fgcolor, bgcolor) {
        var country = cl.getById(cntryID);
        return mapTexture(country, fgcolor, bgcolor);
    });

    init();
    animate();
});


function init() {
    container = document.getElementById( 'container' );

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.z = 500;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    scene.add(new THREE.AmbientLight(0x333333));

    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5000,3000,5000);
    scene.add(light);

    group = new THREE.Group();
    scene.add( group );

    var earth = new THREE.Mesh(
        new THREE.SphereBufferGeometry( getBaseRadius(), 32, 32 ), 
        new THREE.MeshPhongMaterial({
            map: THREE.ImageUtils.loadTexture('textures/2_no_clouds_4k.jpg'),
            bumpMap: THREE.ImageUtils.loadTexture('textures/elev_bump_4k.jpg'),
            bumpScale:   0.005,
            specularMap: THREE.ImageUtils.loadTexture('textures/water_4k.png'),
            specular: new THREE.Color('grey'),
            shininess: 7
        })
    );
    group.add(earth);

    var clouds = new THREE.Mesh(
        new THREE.SphereGeometry(getBaseRadius()+1, 32, 32),
        new THREE.MeshPhongMaterial({
            map: THREE.ImageUtils.loadTexture('textures/fair_clouds_4k.png'),
            transparent: true
        })
    );
    group.add(clouds);

    var bgtexture = new THREE.TextureLoader().load('textures/gradientbg.png');
    scene.background = bgtexture;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild( renderer.domElement );
    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function togglePause(event) {
    if (rotationDelta == 0) { 
        rotationDelta = rotationDeltaDefault;
    } else {
        rotationDelta = 0;
    }
}

function highlightCountry(country) {
    var map = textureCache(country.id, '#ff0000', 'rgba(255,0,0,0.2)');
    
    material = new THREE.MeshPhongMaterial({map: map, transparent: true});
    if (!overlay) {
        overlay = new THREE.Mesh(new THREE.SphereGeometry(getBaseRadius()+2, 40, 40), material);
        overlay.name = country.id;
        group.add(overlay);
    } else {
        overlay.material = material;
    }
    flyTo(country);
}

function flyTo(country) {
    var latlng = findGeomCenter(country);
    var rot = deg2rad(latlng);

    group.rotation.setFromVector3(rot);
}

function showChangeVisited() { vlist.style.display = "block"; }
function hideChangeVisited() { vlist.style.display = "none"; }

function showRules() { rules.style.display = "block"; }
function hideRules() { rules.style.display = "none"; }

function setMode(m) { cl.setMode(m); }

function handleWinnerClick() { 
    if (window.getSelection) { window.getSelection().removeAllRanges(); }
    else if (document.selection) { document.selection.empty(); }
    cl.toggle(winnerCountry.id) 
}
var reset = function(){
    winner.innerHTML = "";
    spinner.disabled = true;
    group.rotation.setFromVector3({x:0,y:0,z:0})
}
var show = function(country) {
    winner.innerHTML = country.id;
    winner.style.display = "block";
}
function rotateToCountries(cs, cont) {
    var spinDur = 1000;
    var restDur = 500;
    if (cs.length > 1) {
        var c = cs.shift();
        reset();
        rotationDelta = rotationDeltaSpin;
        setTimeout(function(){ 
            rotationDelta = rotationDeltaDefault;
            show(c)
            // highlightCountry(c);
            setTimeout(function() { rotateToCountries(cs, cont) }, restDur);
        }, spinDur);
    } else {
        reset();
        rotationDelta = rotationDeltaSpin;
        setTimeout(function(){ cont(cs[0]) }, spinDur);
    }
}

function spinTheGlobe() {
    reset();
    var cs = [];
    for (var i=0; i<10; i++) { cs.push(cl.getRandomCountry()); }

    rotateToCountries(cs, function(country) {
        winnerCountry = country;
        console.log(country);

        highlightCountry(country);

        rotationDelta = 0;
        show(country);
        spinner.disabled = false;
    });
}

function onDocumentMouseMove( event ) {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    camera.lookAt(scene.position);
    group.rotation.y += rotationDelta;
    renderer.render(scene, camera);
}

function toggleCountry(x) { cl.toggle(x); }