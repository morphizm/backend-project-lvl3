import 'regenerator-runtime/runtime';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import _ from 'lodash';
import pageLoader from '../src';


// const getFixturePath = (name) => path.join(__dirname, '..', '__fixtures__', name);

let dest;

beforeEach(async () => {
  dest = path.join(os.tmpdir());
  await fs.unlink(dest).catch(_.noop);
});
beforeAll(async () => {
  dest = path.join(os.tmpdir());
  await fs.unlink(dest).catch(_.noop);
});

describe('directory contains fileName', () => {
  test('simple url', async () => {
    const { href, pathname } = new URL('https://ru.hexlet.io/courses');
    // const html = getFixturePath('hexlet-courses');

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

    // expect(destFiles).toContain(expectedFileName);
  });
});

const c = console.log;
const myfn = () => 'qwe';

const parse = (func) => {
  const lines = func.toString().split('\n');
  const expectedResult = lines[lines.length - 2];
  return expectedResult.trim().replace('return', 'satisfy-tag').trim();
};

expect.extend({
  toSatisfy(func) {
    const pass = func();
    if (!pass) {
      return {
        message: () => parse(func),
        pass: false,
      };
    }
    return {
      message: () => 'Ok',
      pass: true,
    };
  },
});

test('test satisfy', () => {
  // expect(() => myfn(3, "lala") === "jopa").toSatisfy();
});

test('test satisfy222', () => {
  // expect(() => myfn(33, "3333lala") === "3333jopa").toSatisfy();
});

describe('ML', () => {
  test('', () => {

    // expect(() => myfn(33, "3333lala") === "3333jopa").toSatisfy();
  })
})