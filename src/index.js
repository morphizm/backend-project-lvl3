import { promises as fs } from 'fs';
import path from 'path';
import 'axios-debug-log';
import axios from 'axios';
import debug from 'debug';
import _ from 'lodash';
import cheerio from 'cheerio';

const pageLoaderDebug = debug('page-loader:');

const makeUrls = (base, ...pathnames) => pathnames.map((pathname) => new URL(pathname, base).href);

let c = console.log;
c = _.noop;
c(_.noop);

const downoloadFilesContent = (urls) => {
  const contents = urls.map((url) => {
    pageLoaderDebug(`GET ${url}`);
    return axios.get(url, { responseType: 'blob' }).then(({ data }) => ({ data, url }));
  });
  return Promise.all(contents);
};

const getEncoding = (format) => {
  const utf8 = 'utf-8';
  const base64 = 'base64';
  switch (format) {
    case 'css':
      return utf8;
    case 'js':
      return utf8;
    default:
      return base64;
  }
};

const dashPath = (pathname) => _.replace(pathname, /[^A-Za-z\d]/g, '-');

const makeFiles = (dirpath, items) => {
  const result = items.map((item) => {
    const { data, url } = item;
    const { pathname } = new URL(url);
    const itemExtname = path.extname(pathname);
    const itemPathWithoutFirstSlash = pathname.slice(1);
    const itemPathWithoutExtname = _.replace(itemPathWithoutFirstSlash, new RegExp(`${itemExtname}$`), '');

    const dashedPath = dashPath(itemPathWithoutExtname);
    const itemName = `${dashedPath}${itemExtname}`;

    const itemPath = path.join(dirpath, itemName);

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
      const linksElementsRefs = $('link').map((i, el) => $(el).attr('href')).get();
      const scriptElementsRefs = $('script').map((i, el) => $(el).attr('src')).get();
      const imgElementsRefs = $('img').map((i, el) => $(el).attr('src')).get();

      const urls = makeUrls(pageUrl,
        ...linksElementsRefs,
        ...scriptElementsRefs,
        ...imgElementsRefs);

      pageLoaderDebug(`Creating file ${outputHtmlPath}`);
      return fs.appendFile(outputHtmlPath, data, 'utf-8')
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
