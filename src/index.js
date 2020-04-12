import axios from 'axios';
import _ from 'lodash';
import { promises as fs } from 'fs';

const pageLoader = (pageUrl, outputDirectory = process.cwd()) => {
  const urlWithoutHttp = _.replace(pageUrl, /http:\/\/|https:\/\//, '');
  const dashedUrl = _.replace(urlWithoutHttp, /[^A-Za-z\d]/g, '-');

  return axios.get(pageUrl)
    .then(() => {
      fs.appendFile(`${outputDirectory}/${dashedUrl}.html`, '', 'utf-8');
    });
};

export default pageLoader;
