install:
  npm install

build:
	rm -rf dist
	npm run build

test:
	npm test -s

test-coverage:
	npm test -- --coverage

lint:
	npx eslint .

publish:
	npm publish

.PHONY: test