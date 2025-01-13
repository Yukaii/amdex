# amdex

A command-line tool to extract and restore AMD-style JavaScript modules from bundled files.

## Installation

```bash
npm install -g amdex
# or
pnpm add -g amdex
# or
yarn global add amdex
```

## Usage

### Restore AMD Modules

Extract and restore individual AMD modules from a bundled file:

```bash
amdex restore -i bundle.js -o ./output
```

Options:
- `-i, --input <path>`: Input bundle file path (required)
- `-o, --output <path>`: Output directory for extracted modules (default: "./restored")
- `--include <pattern>`: Include only modules matching this pattern (regex)
- `--exclude <pattern>`: Exclude modules matching this pattern (regex)

### List Modules

List all AMD modules found in a bundle:

```bash
amdex list -i bundle.js
```

Options:
- `-i, --input <path>`: Input bundle file path (required)

## Example

Given a bundled file with AMD modules:

```javascript
define('module/a', ['jquery', 'underscore'], function($, _) {
    // module code
});

define('module/b', ['module/a'], function(moduleA) {
    // module code
});
```

Running:
```bash
amdex restore -i bundle.js -o ./src --include "module/.*"
```

Will create:
```
src/
  module/
    a.js
    b.js
```

Each file will contain its original AMD module definition with dependencies and implementation code.

## Features

- Extracts AMD modules while preserving:
  - Module IDs
  - Dependencies
  - Implementation code
  - Original formatting (mostly)
- Supports filtering modules by include/exclude patterns
- Maintains directory structure based on module IDs
- Handles reserved keywords in code
- TypeScript support

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/amdex.git

# Install dependencies
cd amdex
npm install

# Build
npm run build

# Run locally
./dist/cli.js
```

## License

MIT
