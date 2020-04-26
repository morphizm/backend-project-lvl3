install:
	npm install

start:
	npx babel-node src/bin/page-loader.js

build:
	rm -rf dist
	npm run build

test:
	npm test -s

test-coverage:
	npm test -- --coverage

test-debug:
	DEBUG=page-loader:* npm test -s

lint:
	npx eslint .

publish:
	npm publish --dry-run

.PHONY: test
