#!/usr/bin/env node
import { Command } from 'commander';
import pageLoader from '..';

const program = new Command();

program
  .version('0.0.12')
  .description('Downoload files from web page')
  .option('--output <directory>', 'Output directory', process.cwd())
  .arguments('<pageUrl>')
  .action((pageUrl) => {
    pageLoader(pageUrl, program.output)
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  });

program.parse(process.argv);
