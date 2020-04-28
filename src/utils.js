import path from 'path';
import _ from 'lodash';

export const getEncoding = (format) => {
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

export const getResponseType = (format) => {
  const json = 'json';
  const arraybuffer = 'arraybuffer';
  switch (format) {
    case 'css':
      return json;
    case 'js':
      return json;
    default:
      return arraybuffer;
  }
};

export const dashPath = (pathname) => _.replace(pathname, /[^A-Za-z\d]/g, '-');

export const makeUrl = (base, pathname) => new URL(pathname, base).href;

export const getOutputFilePath = (dirpath, url) => {
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
