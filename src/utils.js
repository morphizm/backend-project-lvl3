import path from 'path';
import _ from 'lodash';

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
