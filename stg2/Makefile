buildroot := $(shell pwd)
distdir   := $(buildroot)


.PHONY : serve dist dist2

serve: 
	sws --port 4443 -d -P $(distdir)

dist:
	rm -rf ../eugenen.github.io/stg/*
	cp -R * ../eugenen.github.io/stg
	cd ../eugenen.github.io/stg && git add . && git commit -m "stg" && git push

dist2:
	mkdir -p ../eugenen.github.io/stg2 
	rm -rf ../eugenen.github.io/stg2/*
	cp -R * ../eugenen.github.io/stg2
	cd ../eugenen.github.io/stg2 && git add . && git commit -m "stg2" && git push

