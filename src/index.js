import { promises as fs } from 'fs';
import path from 'path';
import 'axios-debug-log';
import axios from 'axios';
import debug from 'debug';
import _ from 'lodash';
import cheerio from 'cheerio';
import {
  getEncoding, getResponseType, dashPath, makeUrl,
} from './utils';

const pageLoaderDebug = debug('page-loader:');

const c = console.log;
// c = _.noop;
c(_.noop);

const downoloadFile = (url) => {
  pageLoaderDebug(`GET ${url}`);
  const format = path.extname(url).slice(1);
  const responseType = getResponseType(format);

  return axios.get(url, { responseType });
};

const getOutputFilePath = (dirpath, url) => {
  const { pathname } = new URL(url);
  const pathExtname = path.extname(pathname);
  const pathWithoutFirstSlash = pathname.slice(1);
  const pathWithoutExtname = _.replace(pathWithoutFirstSlash, new RegExp(`${pathExtname}$`), '');

  const dashedPath = dashPath(pathWithoutExtname);
  const resultPath = path.format({
    name: dashedPath,
    ext: pathExtname,
    dir: dirpath,
  });
  return resultPath;
};

const makeFile = (dirpath, item) => {
  if (!item) {
    return Promise.resolve();
  }
  const { data, url } = item;
  const { pathname } = new URL(url);
  const itemExtname = path.extname(pathname);
  const itemPath = getOutputFilePath(dirpath, url);

  pageLoaderDebug(`Creating file ${itemPath}`);
  return fs.appendFile(itemPath, data, getEncoding(itemExtname.slice(1)));
};

const pageLoader = (pageUrl, outputDirectory = process.cwd()) => {
  const urlWithoutProtocol = _.replace(pageUrl, /http:\/\/|https:\/\//, '');
  const dashedName = dashPath(urlWithoutProtocol);

  const htmlFileName = `${dashedName}.html`;
  const contentsDirName = `${dashedName}_files`;

  const outputHtmlPath = path.join(outputDirectory, htmlFileName);
  const contentsDirPath = path.join(outputDirectory, contentsDirName);

  pageLoaderDebug(`GET ${pageUrl}`);
  const result = axios.get(pageUrl)
    .then(({ data }) => data)
    .catch((err) => {
      const message = `${err.message} -- RESOURCE ${err.config.url}`;
      console.error(message);
      throw err;
    })
    .then((htmlData) => {
      const $ = cheerio.load(htmlData);
      const mapping = {
        link: 'href',
        script: 'src',
        img: 'src',
      };
      const tags = ['link', 'script', 'img'];

      const elementsRefs = _.flatten(tags.map((tag) => {
        const tagRefs = $(tag).map((i, el) => $(el).attr(mapping[tag])).get();
        return tagRefs;
      }));

      tags.forEach((tag) => {
        const tagAttr = mapping[tag];
        $(tag).each((i, el) => {
          const oldRef = $(el).attr(tagAttr);
          if (!oldRef) {
            return;
          }
          const refUrl = makeUrl(pageUrl, oldRef);
          const newRef = getOutputFilePath(contentsDirPath, refUrl);
          $(el).attr(tagAttr, newRef);
        });
      });

      const urls = elementsRefs
        .map((ref) => makeUrl(pageUrl, ref));

      const resources = urls.map((url) => downoloadFile(url)
        .then(({ data }) => ({ data, url }))
        .catch((err) => {
          const message = `${err.message} -- RESOURCE ${err.config.url}`;
          console.error(message);
          throw err;
        }));

      return Promise.all(resources)
        .then((values) => {
          pageLoaderDebug(`Creating file ${outputHtmlPath}`);
          return fs.appendFile(outputHtmlPath, $.html(), 'utf-8')
            .then(() => {
              pageLoaderDebug(`Creating directory ${contentsDirPath}`);
              return fs.mkdir(contentsDirPath);
            })
            .catch((err) => {
              console.error(err.message);
              throw err;
            })
            .then(() => values);
        });
    })
    .then((values) => {
      const total = values.map((value) => makeFile(contentsDirPath, value));
      return Promise.all(total);
    });
  return result;
};

export default pageLoader;
