import { promises as fs } from 'fs';
import path from 'path';
import 'axios-debug-log';
import axios from 'axios';
import debug from 'debug';
import _ from 'lodash';
import cheerio from 'cheerio';
import Listr from 'listr';
import {
  getEncoding, getResponseType, dashPath, makeUrl, getOutputFilePath,
} from './utils';

const pageLoaderDebug = debug('page-loader:');

const runTask = (title, task) => new Listr([
  { title, task: () => task, exitOnError: false },
], { exitOnError: false }).run().catch(() => {});

const wrapAxiosError = (axiosError) => {
  const message = `${axiosError.message} -- RESOURCE ${axiosError.config.url}`;
  console.error(message);
  throw axiosError;
};

const downloadResource = (url) => {
  pageLoaderDebug(`GET ${url}`);
  const format = path.extname(url).slice(1);
  const responseType = getResponseType(format);

  return axios.get(url, { responseType });
};

const createResource = (dirpath, item) => {
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
  const downloadedPage = axios.get(pageUrl);
  runTask(`Download ${pageUrl}`, downloadedPage);

  const result = downloadedPage
    .then(({ data }) => data)
    .catch(wrapAxiosError)
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

      const resources = urls.map((url) => {
        const task = downloadResource(url);
        runTask(`Download ${url}`, task);
        return task.then(({ data }) => ({ data, url }))
          .catch(wrapAxiosError);
      });

      return Promise.all(resources)
        .then((values) => {
          pageLoaderDebug(`Creating file ${outputHtmlPath}`);
          const createdHtmlFile = fs.appendFile(outputHtmlPath, $.html(), 'utf-8');
          runTask(`Create ${outputHtmlPath}`, createdHtmlFile);
          return createdHtmlFile
            .then(() => {
              pageLoaderDebug(`Creating directory ${contentsDirPath}`);
              const createdDir = fs.mkdir(contentsDirPath);
              runTask(`Create ${contentsDirPath}`, createdDir);
              return createdDir;
            })
            .catch((err) => {
              console.error(err.message);
              throw err;
            })
            .then(() => values);
        });
    })
    .then((values) => {
      const total = values.map((value) => {
        const createdResource = createResource(contentsDirPath, value);
        runTask(`Create resource ${getOutputFilePath(contentsDirPath, value.url)}`, createdResource);
        return createdResource;
      });

      return Promise.all(total);
    });

  return result;
};

export default pageLoader;
