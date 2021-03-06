function StG() {
    this.spinStops            = 10;
    this.spinDur              = 1000;
    this.restDur              = 500;
    this.rotationDeltaSpin    = 0.25;
    this.rotationDeltaDefault = 0.005;
    this.rotationDelta        = this.rotationDeltaDefault;

    this.winner               = $("winner");
    this.playButton           = $("play");
    this.rulesButton          = $("rules-trigger");
    this.manageButton         = $("change-selected-countries");
    this.container            = $("container");
    this.winnerCountry        = null;
    
    this.textureCache;
    this.group;
    this.scene;
    this.camera;
    this.overlay;
    this.renderer;
    this.controls;
}

StG.prototype.getBaseRadius = function () {
    if (window.innerWidth < 900) { return 100 }
    else { return 170; }
}

StG.prototype.init = function () {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    this.camera.position.z = 500;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.add(new THREE.AmbientLight(0x333333));

    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5000,3000,5000);
    this.scene.add(light);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    var earth = new THREE.Mesh(
        new THREE.SphereBufferGeometry(this.getBaseRadius(), 32, 32 ), 
        new THREE.MeshPhongMaterial({
            map:         new THREE.TextureLoader().load('textures/2_no_clouds_4k.jpg'),
            bumpMap:     new THREE.TextureLoader().load('textures/elev_bump_4k.jpg'),
            bumpScale:   0.005,
            specularMap: new THREE.TextureLoader().load('textures/water_4k.png'),
            specular:    new THREE.Color('grey'),
            shininess:   7
        })
    );
    this.group.add(earth);

    var clouds = new THREE.Mesh(
        new THREE.SphereGeometry(this.getBaseRadius()+1, 32, 32),
        new THREE.MeshPhongMaterial({
            map:         new THREE.TextureLoader().load('textures/fair_clouds_4k.png'),
            transparent: true
        })
    );
    this.group.add(clouds);

    this.setBG();

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new THREE.TrackballControls(this.camera, {
        domElement : this.container,
        noRotate   : true,
        noPan      : true,
        minDistance: 200,
        maxDistance: 500
    });

    this.container.appendChild(this.renderer.domElement);
    var self = this;
    window.addEventListener('resize', function(ev) { self.onWindowResize() }, false);
}

StG.prototype.setBG = function () {
    // var bg = window.innerWidth >= 1100 ? 'textures/gradientbg.png' : 'textures/bgfull.png'
    var bg = 'textures/bgfull.png';
    this.scene.background = new THREE.TextureLoader().load(bg);
}

StG.prototype.onWindowResize = function () {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.controls.handleResize();
    this.setBG();
}

StG.prototype.togglePause = function (event) {
    if (this.rotationDelta == 0) { 
        this.rotationDelta = this.rotationDeltaDefault;
    } else {
        this.rotationDelta = 0;
    }
}

StG.prototype.highlightCountry = function (country, dur, after) {
    var map = this.textureCache(country.id, '#ff0000', 'rgba(255,0,0,0.2)');
    var self = this;
    
    setTimeout(function() {
        var material = new THREE.MeshPhongMaterial({map: map, transparent: true});
        if (!self.overlay) {
            self.overlay = new THREE.Mesh(
                new THREE.SphereGeometry(self.getBaseRadius()+2, 40, 40), 
                material);
            self.overlay.name = country.id;
            self.group.add(self.overlay);
        } else {
            self.overlay.material = material;
        }
        after();
    }, dur);

    this.flyTo(country, dur);
}

StG.prototype.flyTo = function (country, duration) {
    var latlng     = findGeomCenter(country);
    var targetRot1 = deg2rad(latlng);
    var pos        = this.group.rotation;
    var pi2        = 2 * Math.PI;

    targetRot1 = 
        { y: targetRot1.y + 4 * pi2
        , x: targetRot1.x
        , z: 0 };
    if (targetRot1.y < pos.y) {
        var n = Math.floor(pos.y / pi2);
        targetRot1.y = n * pi2 + targetRot1.y;
    }

    var self = this;
    var tween1 = new TWEEN.Tween(pos).to(targetRot1, duration);
    tween1.onUpdate(function(){ self.group.rotation.setFromVector3(pos) });
    tween1.easing(TWEEN.Easing.Cubic.Out);
    tween1.start();
}

StG.prototype.resetPos = function(){
    this.controls.reset();
    var pos = this.group.rotation;
    var target = {x:0,y:0,z:0};
    
    var tween = new TWEEN.Tween(pos).to(target, 250);
    var self = this;
    tween.onUpdate(function(){ self.group.rotation.setFromVector3(pos) });
    tween.easing(TWEEN.Easing.Cubic.Out);
    tween.start();
}
StG.prototype.showWinnerTitle = function(country) {
    this.winner.innerHTML = country.id;
    this.winner.style.display = "block";
}
StG.prototype.hideWinnerTitle = function(country) {
    this.winner.innerHTML = "";
}
StG.prototype.chooseWinner = function (cl, n) {
    this.hideWinnerTitle();
    
    if (n > 1) {
        var country = cl.getRandomCountry();
        this.showWinnerTitle(country);
        var self = this;
        setTimeout(function() { self.chooseWinner(cl, n-1) }, this.restDur);
    } else {
        var winnerCountry = cl.getRandomCountry();
        this.winnerCountry = winnerCountry;
        
        this.showWinnerTitle(winnerCountry)
        this.highlightCountry(winnerCountry, this.spinDur, function(){});

        this.rotationDelta = 0;
        this.disableControls(false);
    }
}
StG.prototype.disableControls = function (x) {
    this.playButton.disabled = x;
    this.rulesButton.disabled = x;
    this.manageButton.disabled = x;
}
StG.prototype.spinTheGlobe = function (cl) {
    this.hideWinnerTitle();
    this.disableControls(true);
    this.resetPos();
    this.rotationDelta = this.rotationDeltaSpin;
    this.chooseWinner(cl, 10);
}

StG.prototype.animate = function (time) {
    var self = this;
    requestAnimationFrame(function(){ self.animate() });
    TWEEN.update(time);
    this.render();
}

StG.prototype.render = function () {
    this.controls.update();
    this.camera.lookAt(this.scene.position);
    this.group.rotation.y += this.rotationDelta;
    this.renderer.render(this.scene, this.camera);
}

//--------------

var stg, cl;
var blurElId = "blur";

function hidePopup(pid) { 
    $(pid).style.display      = "none"; 
    $(blurElId).style.display = "none"; 
}

function main() {
    $("change-selected-countries").onclick = function () { 
        $("countries-list-wrapper").style.display = "block"; 
        $(blurElId).style.display = "block"; 
    }
    $("rules-trigger").onclick  = function () { 
        $("rules-wrapper").style.display = "block"; 
        $(blurElId).style.display = "block"; 
    }
    $("close-cl").onclick       = function () { hidePopup('countries-list-wrapper') }
    $("close-rw").onclick       = function () { hidePopup('rules-wrapper') }
    $("countries-list").onclick = function (e) { cl.toggle(e.target.dataset.countryid); }
    $("cl-reset").onclick       = function () { cl.reset(); }
    $("winner").onclick         = function () { cl.toggle(stg.winnerCountry.id); }
    $("play").onclick           = function () { stg.spinTheGlobe(cl); }

    stg = new StG();


    Promise.all([
        d3.json('data/eligible.json'),  
        d3.json('data/world255-2.json')  
    ]).then(function(xs){
        var eligible = xs[0];
        var data     = xs[1];

        var countriesTopo = topojson.feature(data, data.objects.countries);
        cl = new CountriesList(countriesTopo.features, eligible, "countries-list",
                                         "total-count", "remaining-count", "play");
    
        stg.textureCache = memoize("country", function (cntryID, fgcolor, bgcolor) {
            var country = cl.getById(cntryID);
            return mapTexture(country, fgcolor, bgcolor);
        });
    
        stg.init();
        stg.animate();
    });

    
}

// main();


