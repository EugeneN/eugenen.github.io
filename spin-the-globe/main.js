var topojsonFeature = topojson.feature;
var segments = 155;

var countriesTopo;
var geo;
var overlay;

var textureCache;

var container, stats;
var camera, scene, renderer, controls;
var group;
var mouseX = 0, mouseY = 0;
var rotationDeltaSpin = 0.5;
var rotationDeltaDefault = 0.005;
var rotationDelta = rotationDeltaDefault;
var winner = document.getElementById("winner");
var spinner = document.getElementById("spinner");

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

d3.json('data/world.json').then(function(data){
    countriesTopo = topojsonFeature(data, data.objects.countries);
    geo = geodecoder(countriesTopo.features);

    window.__geo__ = geo;

    textureCache = memoize(function (cntryID, fgcolor, bgcolor) {
        var country = geo.find(cntryID);
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

    scene.add(new THREE.AmbientLight(0x333333));

    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5000,3000,5000);
    scene.add(light);

    group = new THREE.Group();
    scene.add( group );



    var earth = new THREE.Mesh(
        new THREE.SphereBufferGeometry( 200, 32, 32 ), 
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
        new THREE.SphereGeometry(201, 32, 32),
        new THREE.MeshPhongMaterial({
            map: THREE.ImageUtils.loadTexture('textures/fair_clouds_4k.png'),
            transparent: true
        })
    );
    group.add(clouds);

    var thestars = new THREE.Mesh(
        new THREE.SphereGeometry(1500, 64, 64), 
        new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture('textures/galaxy_starfield.png'), 
            side: THREE.BackSide
        })
    );
    group.add(thestars);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );


    controls = new THREE.TrackballControls(camera);

    container.appendChild( renderer.domElement );

    stats = new Stats();
    container.appendChild( stats.dom );

    window.addEventListener( 'resize', onWindowResize, false );

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
        overlay = new THREE.Mesh(new THREE.SphereGeometry(202, 40, 40), material);
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

function spinTheGlobe() {
    winner.innerHTML = "";
    winner.style.display = "none";
    spinner.disabled = true;
    group.rotation.setFromVector3({x:0,y:0,z:0})

    rotationDelta = rotationDeltaSpin;
    setTimeout(function(){ 
        var country = geo.getRandomCountry();
        console.log(country)

        highlightCountry(country);

        rotationDelta = 0;
        winner.innerHTML = country.id;
        winner.style.display = "block";
        spinner.disabled = false;
    }, 500);
}

function onDocumentMouseMove( event ) {
    mouseX = ( event.clientX - windowHalfX );
    mouseY = ( event.clientY - windowHalfY );
}

function animate() {
    requestAnimationFrame( animate );
    render();
    stats.update();

}

function render() {
    controls.update();
    camera.lookAt(scene.position);
    group.rotation.y += rotationDelta;
    renderer.render(scene, camera);
}