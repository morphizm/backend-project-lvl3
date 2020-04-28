import 'regenerator-runtime/runtime';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import _ from 'lodash';
import pageLoader from '../src';

nock.disableNetConnect();

const getFixturePath = (name) => path.join(__dirname, '__fixtures__', name);

let dest;

// const c = console.log;

const testHtmlPath = getFixturePath('test.html.txt');
const testSmallHtmlPath = getFixturePath('test-small.html.txt');
const testCssPath = getFixturePath('test.css.txt');
const testJsPath = getFixturePath('test.js.txt');
const testImgPath = getFixturePath('test.jpg');
const hexletUrl = 'https://ru.hexlet.io/courses';

beforeEach(async () => {
  dest = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader'));
  await fs.unlink(dest).catch(_.noop);
});

describe('success', () => {
  test('create a file, long url', async () => {
    const { href } = new URL('http://yandex.ru/search/?lr=213&text=hexlet#hash');
    const expectedFileName = 'yandex-ru-search--lr-213-text-hexlet-hash.html';

    nock(/yandex/)
      .log(console.log)
      .get(/search/)
      .reply(200);

    await pageLoader(href, dest);
    const destFiles = await fs.readdir(dest);

    expect(destFiles).toContain(expectedFileName);
  });

  test('with resources', async () => {
    const testHtml = await fs.readFile(testHtmlPath, 'utf-8');
    const testCss = await fs.readFile(testCssPath, 'utf-8');
    const testJs = await fs.readFile(testJsPath, 'utf-8');
    const testImg = await fs.readFile(testImgPath, 'base64');

    const expectedFileName = 'ru-hexlet-io-courses.html';
    const expectedDirName = 'ru-hexlet-io-courses_files';

    const [jsFileName, cssFileName, imgFileName] = ['assets-application.js', 'assets-css.css', 'assets-img.jpg'];

    const dirPath = path.join(dest, expectedDirName);

    nock(/hexlet/).get(/courses/).reply(200, testHtml);
    nock(/hexlet/).get(/.css/).reply(200, testCss);
    nock(/hexlet/).get(/.js/).reply(200, testJs);
    nock(/hexlet/).get(/.js/).reply(200, testJs);
    nock(/hexlet/).get(/.img/).reply(200, testImg);

    await pageLoader(hexletUrl, dest);
    const destFiles = await fs.readdir(dest);
    const pageFiles = await fs.readdir(dirPath);

    expect(destFiles).toContain(expectedFileName);
    expect(destFiles).toContain(expectedDirName);
    expect(pageFiles).toContain(jsFileName);
    expect(pageFiles).toContain(cssFileName);
    expect(pageFiles).toContain(imgFileName);
  });
});

describe('failure', () => {
  test('not create a html file', async () => {
    const expectedFileName = 'ru-hexlet-io-courses.html';
    nock(/hexlet/).get(/courses/).reply(404);

    await expect(pageLoader(hexletUrl, dest)).rejects.toThrow();
    const destFiles = await fs.readdir(dest);
    expect(destFiles).not.toContain(expectedFileName);
  });

  test('with errors resources', async () => {
    const testHtml = await fs.readFile(testSmallHtmlPath, 'utf-8');
    const expectedFileName = 'ru-hexlet-io-courses.html';
    const expectedDirName = 'ru-hexlet-io-courses_files';

    nock(/hexlet/).get(/courses/).reply(200, testHtml);
    nock(/hexlet/).get(/.css/).reply(404);

    await expect(pageLoader(hexletUrl, dest)).rejects.toThrow();
    const destFiles = await fs.readdir(dest);

    expect(destFiles).not.toContain(expectedFileName);
    expect(destFiles).not.toContain(expectedDirName);
  });

  test('bad dirpath', async () => {
    const testHtml = await fs.readFile(testSmallHtmlPath, 'utf-8');
    const nonExistantDirectory = path.join(dest, 'non');

    nock(/hexlet/).get(/courses/).reply(200, testHtml);
    nock(/hexlet/).get(/.css/).reply(200);

    await expect(pageLoader(hexletUrl, nonExistantDirectory)).rejects.toThrow();
    await expect(fs.readdir(nonExistantDirectory)).rejects.toThrow();
  });
});
