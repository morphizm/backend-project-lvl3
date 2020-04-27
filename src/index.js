import { promises as fs } from 'fs';
import path from 'path';
import 'axios-debug-log';
import axios from 'axios';
import debug from 'debug';
import _ from 'lodash';
import cheerio from 'cheerio';
import { getEncoding, getResponseType } from './utils';

const pageLoaderDebug = debug('page-loader:');

const makeUrl = (base, pathname) => new URL(pathname, base).href;

let c = console.log;
c = _.noop;
c(_.noop);

const downoloadFilesContent = (urls) => {
  const contents = urls.map((url) => {
    pageLoaderDebug(`GET ${url}`);
    const format = path.extname(url).slice(1);
    const responseType = getResponseType(format);

    return axios.get(url, { responseType }).then(({ data }) => ({ data, url }));
  });
  return Promise.all(contents);
};


const dashPath = (pathname) => _.replace(pathname, /[^A-Za-z\d]/g, '-');

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

const makeFiles = (dirpath, items) => {
  const result = items.map((item) => {
    const { data, url } = item;
    const { pathname } = new URL(url);
    const itemExtname = path.extname(pathname);
    const itemPath = getOutputFilePath(dirpath, url);

    pageLoaderDebug(`Creating file ${itemPath}`);
    return fs.appendFile(itemPath, data, getEncoding(itemExtname.slice(1)));
  });
  return Promise.all(result);
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
    .then((data) => {
      const $ = cheerio.load(data);
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

      pageLoaderDebug(`Creating file ${outputHtmlPath}`);
      return fs.appendFile(outputHtmlPath, $.html(), 'utf-8')
        .then(() => {
          pageLoaderDebug(`Creating directory ${contentsDirPath}`);
          return fs.mkdir(contentsDirPath);
        })
        .then(() => downoloadFilesContent(urls));
    })
    .then((values) => makeFiles(contentsDirPath, values));
  return result;
};

export default pageLoader;
