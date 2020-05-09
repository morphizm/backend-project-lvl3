import { promises as fs } from 'fs';
import path from 'path';
import 'axios-debug-log';
import axios from 'axios';
import debug from 'debug';
import _ from 'lodash';
import cheerio from 'cheerio';
import Listr from 'listr';
import url from 'url';
import {
  getEncoding, getResponseType, dashPath, makeUrl, getOutputFilePath,
} from './utils';

const pageLoaderDebug = debug('page-loader:');

const listr = new Listr([], { exitOnError: false });

const wrapAxiosError = (axiosError) => {
  const message = `${axiosError.message}, RESOURCE -- ${axiosError.config.url}`;
  throw new Error(message);
};

const loadResource = (uri) => {
  pageLoaderDebug(`GET ${uri}`);

  const format = path.extname(uri).slice(1);
  const responseType = getResponseType(format);
  return axios.get(uri, { responseType });
};

const createResource = (dirpath, resource) => {
  const { data } = resource;
  const itemExtname = path.extname(resource.url.pathname);
  const itemPath = getOutputFilePath(dirpath, resource.url);

  pageLoaderDebug(`Creating file ${itemPath}`);

  return fs.writeFile(itemPath, data, { encoding: getEncoding(itemExtname.slice(1)) });
};

const pageLoader = (pageUrl, outputDirectory = process.cwd()) => {
  const parsedUrl = url.parse(pageUrl);
  const newUrl = url.format({
    ...parsedUrl,
    protocol: '',
    slashes: false,
  });

  const dashedName = dashPath(newUrl);
  const outputHtmlPath = path.format({
    name: dashedName,
    dir: outputDirectory,
    ext: '.html',
  });

  const resourcesDirName = `${dashedName}_files`;
  const resourcesDirPath = path.join(outputDirectory, resourcesDirName);

  pageLoaderDebug(`GET ${pageUrl}`);
  const loadedPage = axios.get(pageUrl);
  listr.add({ title: `Load ${pageUrl}`, task: () => loadedPage });

  let urls;

  return loadedPage
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
          const newRef = getOutputFilePath(resourcesDirPath, refUrl);
          $(el).attr(tagAttr, newRef);
        });
      });

      urls = elementsRefs.map((ref) => makeUrl(pageUrl, ref));

      pageLoaderDebug(`Creating file ${outputHtmlPath}`);
      const createdHtmlFile = fs.writeFile(outputHtmlPath, $.html());
      listr.add({ title: `Create ${outputHtmlPath}`, task: () => createdHtmlFile });
      return createdHtmlFile;
    })
    .then(() => {
      pageLoaderDebug(`Creating directory ${resourcesDirPath}`);
      const createdDir = fs.mkdir(resourcesDirPath);
      listr.add({ title: `Create ${resourcesDirPath}`, task: () => createdDir });
      return createdDir;
    })
    .then(() => {
      const resources = urls.map((uri) => {
        const task = loadResource(uri);
        listr.add({ title: `Load ${uri}`, task: () => task });
        return task.then(({ data }) => ({ data, url: new URL(uri) })).catch(wrapAxiosError);
      });
      return Promise.all(resources);
    })
    .then((values) => {
      const result = values.map((value) => {
        const createdResource = createResource(resourcesDirPath, value);
        listr.add({ title: `Create resource ${getOutputFilePath(resourcesDirPath, value.url)}`, task: () => createdResource });
        return createdResource;
      });

      return Promise.all(result);
    })
    .then(() => listr.run().catch(_.noop()))
    .catch((err) => {
      listr.run().catch(() => {});
      throw err;
    })
    .then(() => outputDirectory);
};

export default pageLoader;
