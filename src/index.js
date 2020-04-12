import fs from 'fs';

const pageLoader = (pageUrl, outputDirectory = process.cwd()) => {
  console.log(pageUrl, outputDirectory);
  console.log(`cure ${process.cwd()}`);
  fs.appendFileSync(`${outputDirectory}/tt.html`, '<aLALLA</a>', 'utf-8')
};

export default pageLoader;
