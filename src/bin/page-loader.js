#!/usr/bin/env node
import { Command } from 'commander';
import pageLoader from '..';

const program = new Command();

program
  .version('0.0.1')
  .description('Downoload files from web page')
  .option('--output <directory>', 'Output directory')
  .arguments('<pageUrl>')
  .action((pageUrl) => {
    pageLoader(pageUrl, program.output)
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  });

program.parse(process.argv);
