import cheerio from 'cheerio';
import _ from 'lodash';
import { makeUrl, getOutputFilePath } from './utils';

export default (htmlData, pageUrl, outputDirPath) => {
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
      const newRef = getOutputFilePath(outputDirPath, refUrl);
      $(el).attr(tagAttr, newRef);
    });
  });

  return {
    refs: elementsRefs,
    html: $.html(),
  };
};
