import 'regenerator-runtime/runtime';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import _ from 'lodash';
import pageLoader from '../src';


const getFixturePath = (name) => path.join(__dirname, '__fixtures__', name);

let dest;

// const c = console.log;

beforeEach(async () => {
  dest = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader'));
  await fs.unlink(dest).catch(_.noop);
});


describe('directory contains fileName', () => {
  test('simple url', async () => {
    const { href, pathname } = new URL('https://ru.hexlet.io/courses');

    const expectedFileName = 'ru-hexlet-io-courses.html';

    nock(/hexlet/)
      .get(pathname)
      .reply(200);

    await pageLoader(href, dest);
    const destFiles = await fs.readdir(dest);

    expect(destFiles).toContain(expectedFileName);
  });

  test('url with search params', async () => {
    const { href } = new URL('http://yandex.ru/search/?lr=213&text=hexlet#hash');
    const expectedFileName = 'yandex-ru-search--lr-213-text-hexlet-hash.html';

    nock(/yandex/)
      .get(/search/)
      .reply(200);

    await pageLoader(href, dest);
    const destFiles = await fs.readdir(dest);

    expect(destFiles).toContain(expectedFileName);
  });
});

test('loading css, js, img', async () => {
  const testHtmlPath = getFixturePath('test.html.txt');
  const testHtml = await fs.readFile(testHtmlPath, 'utf-8');

  const testCssPath = getFixturePath('test.css.txt');
  const testCss = await fs.readFile(testCssPath, 'utf-8');

  const testJsPath = getFixturePath('test.js.txt');
  const testJs = await fs.readFile(testJsPath, 'utf-8');

  const testImgPath = getFixturePath('test.jpg');
  const testImg = await fs.readFile(testImgPath, 'base64');

  const { href, pathname } = new URL('https://ru.hexlet.io/courses');

  const expectedFileName = 'ru-hexlet-io-courses.html';
  const expectedDirName = 'ru-hexlet-io-courses_files';

  const [jsFileName, cssFileName, imgFileName] = ['assets-application.js', 'assets-css.css', 'assets-img.jpg'];

  const dirPath = path.join(dest, expectedDirName);
  nock(/hexlet/)
    .get(pathname)
    .reply(200, testHtml);

  nock(/hexlet/)
    .get(/.css/)
    .reply(200, testCss);

  nock(/hexlet/)
    .get(/.js/)
    .reply(200, testJs);

  nock(/hexlet/)
    .get(/.img/)
    .reply(200, testImg);

  await pageLoader(href, dest);
  const destFiles = await fs.readdir(dest);
  const pageFiles = await fs.readdir(dirPath);

  expect(destFiles).toContain(expectedFileName);
  expect(destFiles).toContain(expectedDirName);

  expect(pageFiles).toContain(jsFileName);
  expect(pageFiles).toContain(cssFileName);
  expect(pageFiles).toContain(imgFileName);
});
