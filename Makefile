www:
	@python2 -m SimpleHTTPServer 3003

prd:
	@git reset --hard HEAD^
	@git pull

.PHONY: www prd