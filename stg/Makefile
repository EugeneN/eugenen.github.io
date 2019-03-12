buildroot := $(shell pwd)
distdir   := $(buildroot)


.PHONY : serve deploy bundle

serve: 
	sws --port 4443 -d -P $(distdir)

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
		src/geolib.js \
		src/mapTexture.js \
		src/utils.js \
		src/cookielib.js \
		src/main.js ; do cat $$i >> out.js ; done

deploy: bundle
	rm -rf ../eugenen.github.io/stg/*
	cp -R * ../eugenen.github.io/stg
	cd ../eugenen.github.io/stg && git add . && git commit -m "stg" && git push

