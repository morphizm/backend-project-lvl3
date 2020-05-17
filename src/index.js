import { promises as fs } from 'fs';
import path from 'path';
import 'axios-debug-log';
import axios from 'axios';
import debug from 'debug';
import Listr from 'listr';
import {
  dashPath, makeUrl, getOutputFilePath,
} from './utils';
import parseHtml from './parseHtml';

require('axios-debug-log')({
  error(axiosDebug, error) {
    axiosDebug(`${error.message}, RESOURCE -- ${error.config.url}`);
  },
});

const pageLoaderDebug = debug('page-loader:');

const loadResource = (uri) => {
  pageLoaderDebug(`GET ${uri}`);

  return axios.get(uri, { responseType: 'arraybuffer' });
};

const createResource = (dirpath, resource) => {
  const { data } = resource;
  const itemPath = getOutputFilePath(dirpath, resource.url);

  pageLoaderDebug(`Creating file ${itemPath}`);

  return fs.writeFile(itemPath, data, { encoding: 'base64' });
};

const pageLoader = (pageUrl, outputDirectory = process.cwd()) => {
  const listr = new Listr([], { exitOnError: false });

  const parsedUrl = new URL(pageUrl);
  const newUrl = [parsedUrl.hostname, parsedUrl.pathname, parsedUrl.search, parsedUrl.hash].join('');

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
    .then((htmlData) => {
      const { refs, html } = parseHtml(htmlData, pageUrl, resourcesDirPath);

      urls = refs.map((ref) => makeUrl(pageUrl, ref));

      pageLoaderDebug(`Creating file ${outputHtmlPath}`);
      const createdHtmlFile = fs.writeFile(outputHtmlPath, html);
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
        return task.then(({ data }) => ({ data, url: new URL(uri) }));
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
    .then(() => listr.run())
    .catch((err) => {
      listr.run().catch(() => {});
      throw err;
    })
    .then(() => outputDirectory);
};

export default pageLoader;
