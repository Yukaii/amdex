#!/usr/bin/env node
import { Command } from 'commander';
import process from 'node:process';
import { restoreModules, listModules } from '.';

const program = new Command()
  .name('amdex')
  .description('CLI tool to restore AMD-style bundles')
  .version('1.0.0');

program
  .command('restore')
  .description('Restore AMD modules from a bundled file')
  .requiredOption('-i, --input <path>', 'Input file path')
  .option('--include <pattern>', 'Include module pattern (glob or regex)')
  .option('--exclude <pattern>', 'Exclude module pattern')
  .option('-o, --output <path>', 'Output folder path', './restored')
  .action(async (options) => {
    try {
      await restoreModules(options);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all possible module paths')
  .requiredOption('-i, --input <path>', 'Input file path')
  .action(async (options) => {
    try {
      await listModules(options);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
