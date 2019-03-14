buildroot := $(shell pwd)
servedir  := $(buildroot)
deploydir := "../eugenen.github.io/stg"


.PHONY : serve deploy bundle

serve: bundle
	sws --port 4443 -d -P $(servedir)

bundle:
	rm -f out.js
	for i in \
		src/vendor/three.min.js \
		src/vendor/topojson.min.js \
		src/vendor/d3.v5.min.js \
		src/vendor/d3-geo.v1.min.js \
		src/vendor/TrackballControls.min.js \
		src/vendor/Projector.min.js \
		src/vendor/WebGLDeferredRenderer.min.js \
		src/vendor/Tween.min.js \
		src/utils.js \
		src/geolib.js \
		src/mapTexture.js \
		src/cookielib.js \
		src/main.js ; do cat $$i >> out.js ; done

deploy: bundle
	rm -rf $(deploydir)/*
	cp -R * $(deploydir)
	cd $(deploydir) && git add . && git commit -m "stg" && git push

