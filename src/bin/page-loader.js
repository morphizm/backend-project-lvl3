#!/usr/bin/env node
import { Command } from 'commander';
import pageLoader from '..';

const program = new Command();

program
  .version('0.0.1')
  .description('Downoload a ...')
  .option('--output <directory>', 'Output directory')
  .arguments('<pageUrl>')
  .action((pageUrl) => {
    console.log(pageLoader(pageUrl, program.output));
    process.exit(0);
  });

program.parse(process.argv);

if (program.format) {
  console.log('json, plain, text');
}
