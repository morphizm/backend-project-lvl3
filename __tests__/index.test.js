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
    const href = 'http://ya.ru/search/?lr=213&text=hexlet#hash';
    const expectedFileName = 'ya-ru-search--lr-213-text-hexlet-hash.html';

    nock(/ya/)
      .log(console.log)
      .get(/search/)
      .reply(200);

    await pageLoader(href, dest);
    const destFilePaths = await fs.readdir(dest);

    expect(destFilePaths).toContain(expectedFileName);
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
    const jsFilePath = path.join(dirPath, jsFileName);
    const cssFilePath = path.join(dirPath, cssFileName);
    const imgFilePath = path.join(dirPath, imgFileName);

    nock(/hexlet/).log(console.log).get(/courses/).reply(200, testHtml);
    nock(/hexlet/).log(console.log).get(/.css/).reply(200, testCss);
    nock(/hexlet/).log(console.log).get(/.js/).reply(200, testJs);
    nock(/hexlet/).log(console.log).get(/.js/).reply(200, testJs);
    nock(/hexlet/).log(console.log).get(/.img/).reply(200, testImg);

    await pageLoader(hexletUrl, dest);
    const destFilePaths = await fs.readdir(dest);

    expect(destFilePaths).toContain(expectedFileName);
    expect(destFilePaths).toContain(expectedDirName);
    await expect(fs.readFile(jsFilePath, 'utf-8')).resolves.toEqual(testJs);
    await expect(fs.readFile(cssFilePath, 'utf-8')).resolves.toEqual(testCss);
    await expect(fs.readFile(imgFilePath, 'utf-8')).resolves.toEqual(testImg);
  });
});

describe('failure', () => {
  test('not create a html file', async () => {
    const expectedFileName = 'ru-hexlet-io-courses.html';
    nock(/hexlet/).log(console.log).get(/courses/).reply(404);

    await expect(pageLoader(hexletUrl, dest)).rejects.toThrow();
    const destFilePaths = await fs.readdir(dest);
    expect(destFilePaths).not.toContain(expectedFileName);
  });

  test('with errors resources', async () => {
    const testHtml = await fs.readFile(testSmallHtmlPath, 'utf-8');
    const expectedFileName = 'ru-hexlet-io-courses.html';
    const expectedDirName = 'ru-hexlet-io-courses_files';
    const dirPath = path.join(dest, expectedDirName);

    nock(/hexlet/).log(console.log).get(/courses/).reply(200, testHtml);
    nock(/hexlet/).log(console.log).get(/.css/).reply(404);

    await expect(pageLoader(hexletUrl, dest)).rejects.toThrow();
    const destFilePaths = await fs.readdir(dest);
    const pageFiles = await fs.readdir(dirPath);

    expect(destFilePaths).toContain(expectedFileName);
    expect(destFilePaths).toContain(expectedDirName);
    expect(pageFiles).toHaveLength(0);
  });

  test('bad dirpath', async () => {
    const testHtml = await fs.readFile(testSmallHtmlPath, 'utf-8');
    const nonExistantDirectory = path.join(dest, 'non');

    nock(/hexlet/).log(console.log).get(/courses/).reply(200, testHtml);
    nock(/hexlet/).log(console.log).get(/.css/).reply(200);

    await expect(pageLoader(hexletUrl, nonExistantDirectory)).rejects.toThrow();
    await expect(fs.readdir(nonExistantDirectory)).rejects.toThrow();
  });
});
