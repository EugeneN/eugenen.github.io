buildroot := $(shell pwd)
distdir   := $(buildroot)


.PHONY : serve copyres build all open dist servedist

serve: 
	sws --port 4443 -d -P $(distdir)

dist:
	rm -rf ../eugenen.github.io/stg/*
	cp -R * ../eugenen.github.io/stg
	cd ../eugenen.github.io/stg && git add . && git commit -m "stg" && git push

