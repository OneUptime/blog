# How to Use the Path Module in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Path, FileSystem, JavaScript, CrossPlatform

Description: Learn how to use the Node.js path module for cross-platform file path manipulation including joining paths, resolving absolute paths, and extracting file information.

---

The path module is essential for working with file and directory paths in Node.js. It handles the differences between operating systems (Windows uses `\`, Unix uses `/`) automatically, making your code portable.

## Importing the Module

```javascript
const path = require('path');

// ES modules
import path from 'path';

// Import specific functions
import { join, resolve, basename } from 'path';
```

## Common Path Operations

### path.join() - Combine Path Segments

```javascript
const path = require('path');

// Join path segments
const filePath = path.join('users', 'john', 'documents', 'file.txt');
// Unix: users/john/documents/file.txt
// Windows: users\john\documents\file.txt

// With __dirname (current file's directory)
const configPath = path.join(__dirname, 'config', 'settings.json');
// /home/app/src/config/settings.json

// Handles .. and .
const normalized = path.join('users', 'john', '..', 'jane', 'file.txt');
// users/jane/file.txt

// Handles extra slashes
const clean = path.join('users/', '/john/', '/file.txt');
// users/john/file.txt
```

### path.resolve() - Get Absolute Path

```javascript
const path = require('path');

// Resolve to absolute path
const absolute = path.resolve('file.txt');
// /home/user/project/file.txt (current directory + file)

// With multiple segments
const fullPath = path.resolve('src', 'config', 'settings.json');
// /home/user/project/src/config/settings.json

// Absolute paths stop resolution
const overridden = path.resolve('/users', 'john', '/home', 'file.txt');
// /home/file.txt (last absolute path wins)

// Common pattern: resolve relative to project root
const projectRoot = path.resolve(__dirname, '..');
const configPath = path.resolve(projectRoot, 'config', 'app.json');
```

### Difference: join vs resolve

```javascript
const path = require('path');

// join: Simply concatenates
path.join('a', 'b', 'c');
// a/b/c

// resolve: Creates absolute path from right to left
path.resolve('a', 'b', 'c');
// /current/working/directory/a/b/c

// With absolute segment
path.join('/a', '/b', 'c');
// /a/b/c (joins literally)

path.resolve('/a', '/b', 'c');
// /b/c (last absolute path wins)
```

## Extracting Path Information

### path.basename() - Get Filename

```javascript
const path = require('path');

// Get filename
path.basename('/home/user/documents/report.pdf');
// report.pdf

// Remove extension
path.basename('/home/user/documents/report.pdf', '.pdf');
// report

// Works with URLs too (but use URL for URLs)
path.basename('/api/users/123');
// 123
```

### path.dirname() - Get Directory

```javascript
const path = require('path');

// Get directory path
path.dirname('/home/user/documents/report.pdf');
// /home/user/documents

// Parent directory
path.dirname('/home/user/documents');
// /home/user

// Chain for grandparent
path.dirname(path.dirname('/home/user/documents/report.pdf'));
// /home/user
```

### path.extname() - Get Extension

```javascript
const path = require('path');

// Get extension
path.extname('report.pdf');
// .pdf

path.extname('archive.tar.gz');
// .gz

path.extname('.gitignore');
// '' (no extension, starts with dot)

path.extname('filename');
// '' (no extension)
```

### path.parse() - Parse into Components

```javascript
const path = require('path');

const parsed = path.parse('/home/user/documents/report.pdf');
console.log(parsed);
// {
//   root: '/',
//   dir: '/home/user/documents',
//   base: 'report.pdf',
//   ext: '.pdf',
//   name: 'report'
// }

// Access individual parts
console.log(parsed.name);  // report
console.log(parsed.ext);   // .pdf
console.log(parsed.dir);   // /home/user/documents
```

### path.format() - Build from Components

```javascript
const path = require('path');

// Create path from object
const filePath = path.format({
  dir: '/home/user/documents',
  name: 'report',
  ext: '.pdf'
});
// /home/user/documents/report.pdf

// base overrides name + ext
const filePath2 = path.format({
  dir: '/home/user',
  base: 'file.txt',
  name: 'ignored',
  ext: '.ignored'
});
// /home/user/file.txt
```

## Path Normalization

### path.normalize() - Clean Up Path

```javascript
const path = require('path');

// Remove redundant segments
path.normalize('/users/john/../jane/./docs//file.txt');
// /users/jane/docs/file.txt

// Fix slashes
path.normalize('users\\john\\docs');
// users/john/docs (on Unix)
// users\john\docs (on Windows)
```

### path.relative() - Get Relative Path

```javascript
const path = require('path');

// Get relative path between two paths
path.relative('/home/user/project', '/home/user/project/src/index.js');
// src/index.js

path.relative('/home/user/project/src', '/home/user/project/config');
// ../config

// Same path
path.relative('/home/user', '/home/user');
// '' (empty string)
```

### path.isAbsolute() - Check If Absolute

```javascript
const path = require('path');

// Unix
path.isAbsolute('/home/user');     // true
path.isAbsolute('./relative');      // false
path.isAbsolute('../parent');       // false

// Windows
path.isAbsolute('C:\\Users');       // true (Windows)
path.isAbsolute('\\server\\share'); // true (Windows UNC)
```

## Platform-Specific Paths

### path.sep - Path Separator

```javascript
const path = require('path');

console.log(path.sep);
// '/' on Unix
// '\\' on Windows

// Split path into segments
const segments = '/home/user/file.txt'.split(path.sep);
// ['', 'home', 'user', 'file.txt']
```

### path.delimiter - Environment Variable Delimiter

```javascript
const path = require('path');

console.log(path.delimiter);
// ':' on Unix (PATH=/usr/bin:/bin)
// ';' on Windows (PATH=C:\Windows;C:\)

// Split PATH variable
const paths = process.env.PATH.split(path.delimiter);
```

### path.posix and path.win32

Force specific platform behavior:

```javascript
const path = require('path');

// Always use Unix paths (for URLs, etc.)
path.posix.join('a', 'b', 'c');
// a/b/c (always forward slashes)

// Always use Windows paths
path.win32.join('a', 'b', 'c');
// a\b\c (always backslashes)
```

## Common Patterns

### Get Project Root

```javascript
const path = require('path');

// Relative to current file
const projectRoot = path.resolve(__dirname, '..');

// Or use a marker file
const findRoot = (startDir) => {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (require('fs').existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error('Project root not found');
};
```

### Safe Path Construction

```javascript
const path = require('path');

// Prevent directory traversal attacks
function safePath(baseDir, userInput) {
  const resolved = path.resolve(baseDir, userInput);
  
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Invalid path: attempted directory traversal');
  }
  
  return resolved;
}

// Usage
const uploadDir = '/app/uploads';
safePath(uploadDir, 'file.txt');        // OK: /app/uploads/file.txt
safePath(uploadDir, '../../../etc/passwd');  // Throws error
```

### File URL Conversion

```javascript
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');

// Convert file URL to path
const filePath = fileURLToPath('file:///home/user/file.txt');
// /home/user/file.txt

// Convert path to file URL
const fileUrl = pathToFileURL('/home/user/file.txt');
// file:///home/user/file.txt

// ES modules: Get __dirname equivalent
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Build Output Paths

```javascript
const path = require('path');

const config = {
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist'),
  public: path.resolve(__dirname, 'public'),
};

// webpack.config.js example
module.exports = {
  entry: path.join(config.src, 'index.js'),
  output: {
    path: config.dist,
    filename: 'bundle.js',
  },
};
```

### Handle Multiple Extensions

```javascript
const path = require('path');

function getFullExtension(filename) {
  const basename = path.basename(filename);
  const firstDot = basename.indexOf('.');
  
  if (firstDot === -1) return '';
  return basename.slice(firstDot);
}

getFullExtension('archive.tar.gz');
// .tar.gz

function removeAllExtensions(filename) {
  const basename = path.basename(filename);
  const firstDot = basename.indexOf('.');
  
  if (firstDot === -1) return basename;
  return basename.slice(0, firstDot);
}

removeAllExtensions('archive.tar.gz');
// archive
```

## ES Modules and __dirname

```javascript
// CommonJS (works)
const path = require('path');
console.log(__dirname);
console.log(__filename);

// ES Modules (need workaround)
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Or create a utility
export function getDirname(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}
```

## Summary

| Method | Purpose | Example Output |
|--------|---------|----------------|
| `join()` | Combine segments | `a/b/c` |
| `resolve()` | Absolute path | `/home/user/a/b` |
| `basename()` | Get filename | `file.txt` |
| `dirname()` | Get directory | `/home/user` |
| `extname()` | Get extension | `.txt` |
| `parse()` | Parse to object | `{dir, base, ext, name}` |
| `format()` | Object to path | `/home/file.txt` |
| `normalize()` | Clean up path | Remove `..` and `.` |
| `relative()` | Relative path | `../other/file` |
| `isAbsolute()` | Check absolute | `true/false` |

Key tips:
- Use `path.join()` for combining path segments
- Use `path.resolve()` when you need absolute paths
- Always use path module instead of string concatenation
- Use `path.posix` for URLs or cross-platform consistency
- Validate user input paths to prevent directory traversal
