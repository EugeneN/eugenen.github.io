buildroot := $(shell pwd)
distdir   := $(buildroot)


.PHONY : serve copyres build all open dist servedist

serve: 
	sws --port 4443 -d -P $(distdir)

