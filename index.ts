import { Command } from 'commander';
import { Parser, type Node, type CallExpression } from 'acorn';
import path from 'path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import glob from 'fast-glob';
import process from 'node:process';

interface RestoreOptions {
  input: string;
  include?: string;
  exclude?: string;
  output: string;
}

interface ListOptions {
  input: string;
}

interface AMDModule {
  id: string;
  dependencies: string[];
  node: CallExpression;
  functionBody?: string;
}

// Configure the CLI program
const program = new Command()
  .name('amdex')
  .description('CLI tool to restore AMD-style bundles')
  .version('1.0.0');

// Define the restore command
program
  .command('restore')
  .description('Restore AMD modules from a bundled file')
  .requiredOption('-i, --input <path>', 'Input file path')
  .option('--include <pattern>', 'Include module pattern (glob or regex)')
  .option('--exclude <pattern>', 'Exclude module pattern')
  .option('-o, --output <path>', 'Output folder path', './restored')
  .action(async (options: RestoreOptions) => {
    try {
      await restoreModules(options);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// Define the list command
program
  .command('list')
  .description('List all possible module paths')
  .requiredOption('-i, --input <path>', 'Input file path')
  .action(async (options: ListOptions) => {
    try {
      await listModules(options);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

async function parseAMDModules(content: string): Promise<AMDModule[]> {
  const parser = Parser.extend();
  const ast = parser.parse(content, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowReserved: true,
    locations: true,
    ranges: true,  // Enable ranges for code extraction
  });

  const modules: AMDModule[] = [];

  function walk(node: Node): void {
    if (
      node.type === 'CallExpression' &&
      (node as any).callee.type === 'Identifier' &&
      (node as any).callee.name === 'define'
    ) {
      const args = (node as any).arguments;
      if (args.length >= 3) {  // Make sure we have a factory function
        const moduleId = args[0].type === 'Literal' ? String(args[0].value) : null;
        const dependencies = args[1].type === 'ArrayExpression'
          ? args[1].elements.map((el: any) =>
              el.type === 'Literal' ? String(el.value) : ''
            ).filter(Boolean)
          : [];

        // Extract the factory function body
        const factory = args[2];
        let functionBody: string | undefined;

        if (factory.type === 'FunctionExpression') {
          // Get the raw source between the function body brackets
          const bodyStart = (factory as any).body.start + 1; // +1 to skip the opening brace
          const bodyEnd = (factory as any).body.end - 1; // -1 to skip the closing brace
          functionBody = content.slice(bodyStart, bodyEnd).trim();
        }

        if (moduleId) {
          modules.push({
            id: moduleId,
            dependencies,
            node: node as CallExpression,
            functionBody
          });
        }
      }
    }

    for (const key in node) {
      const child = (node as any)[key];
      if (child && typeof child === 'object') {
        walk(child);
      }
    }
  }

  try {
    walk(ast);
    return modules;
  } catch (error) {
    console.warn('Warning: Parser encountered an error but continuing:', error);
    return modules;
  }
}

async function restoreModules({ input, include, exclude, output }: RestoreOptions): Promise<void> {
  const content = await readFile(input, { encoding: 'utf-8' });
  const modules = await parseAMDModules(content);

  // Filter modules based on include/exclude patterns
  const filteredModules = modules.filter(module => {
    if (include && !new RegExp(include).test(module.id)) {
      return false;
    }
    if (exclude && new RegExp(exclude).test(module.id)) {
      return false;
    }
    return true;
  });

  // Create output directory if it doesn't exist
  await ensureDir(output);

  // Restore each module
  for (const module of filteredModules) {
    const modulePath = path.join(output, `${module.id}.js`);
    const moduleDir = path.dirname(modulePath);

    await ensureDir(moduleDir);

    // Create AMD module content with the extracted function body
    const moduleContent = `define('${module.id}', ${JSON.stringify(module.dependencies)}, function(${
      module.dependencies.map(dep => dep.split('/').pop()).join(', ')
    }) {
${module.functionBody ? module.functionBody.split('\n').map(line => '  ' + line).join('\n') : '  // No function body found'}
});`;

    await writeFile(modulePath, moduleContent, { encoding: 'utf-8' });
    console.log(`Restored module: ${module.id}`);
  }
}

async function listModules({ input }: ListOptions): Promise<void> {
  const content = await readFile(input, { encoding: 'utf-8' });
  const modules = await parseAMDModules(content);

  modules.forEach(module => {
    console.log(`Module ID: ${module.id}`);
    console.log('Dependencies:', module.dependencies);
    console.log('---');
  });
}

// Export the program for external use
export { program, parseAMDModules, restoreModules, listModules };
