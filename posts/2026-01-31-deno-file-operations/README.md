# How to Handle File Operations in Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, TypeScript, File Operations, Backend

Description: A comprehensive guide to performing file operations in Deno including reading, writing, streaming, and watching files with practical examples.

---

Deno is a modern runtime for JavaScript and TypeScript that provides built-in support for file system operations without requiring external packages. Unlike Node.js, Deno takes a security-first approach, requiring explicit permissions for file access. This guide covers everything you need to know about handling file operations in Deno, from basic reading and writing to advanced streaming and file watching.

## Understanding Deno's Permission Model

Before diving into file operations, it is essential to understand Deno's security model. Deno runs in a sandbox by default and requires explicit permissions for file system access.

To grant read permission to specific directories or files:

```bash
deno run --allow-read=/path/to/dir script.ts
```

To grant write permission:

```bash
deno run --allow-read --allow-write script.ts
```

You can also grant access to specific paths:

```bash
deno run --allow-read=./data --allow-write=./output script.ts
```

For development purposes, you can grant all permissions (not recommended for production):

```bash
deno run -A script.ts
```

## Reading Files

Deno provides multiple ways to read files, each suited for different use cases.

### Reading Text Files

The simplest way to read a text file is using `Deno.readTextFile()`. This method reads the entire file into memory as a string.

```typescript
// Read a text file asynchronously
const content = await Deno.readTextFile("./config.txt");
console.log(content);
```

For synchronous reading, use `Deno.readTextFileSync()`. This blocks execution until the file is read, which can be useful in scripts or initialization code.

```typescript
// Read a text file synchronously
const content = Deno.readTextFileSync("./config.txt");
console.log(content);
```

### Reading Binary Files

For binary files like images or PDFs, use `Deno.readFile()` which returns a `Uint8Array`.

```typescript
// Read a binary file (e.g., image)
const imageData = await Deno.readFile("./image.png");
console.log(`File size: ${imageData.length} bytes`);

// Convert to base64 if needed
const base64 = btoa(String.fromCharCode(...imageData));
```

### Reading Files with Error Handling

Always wrap file operations in try-catch blocks to handle potential errors gracefully.

```typescript
// Robust file reading with error handling
async function readFileWithErrorHandling(path: string): Promise<string | null> {
  try {
    const content = await Deno.readTextFile(path);
    return content;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`File not found: ${path}`);
    } else if (error instanceof Deno.errors.PermissionDenied) {
      console.error(`Permission denied: ${path}`);
    } else {
      console.error(`Error reading file: ${error.message}`);
    }
    return null;
  }
}

// Usage
const data = await readFileWithErrorHandling("./myfile.txt");
```

## Writing Files

Deno offers straightforward methods for writing data to files.

### Writing Text Files

Use `Deno.writeTextFile()` to write string content to a file. This creates the file if it does not exist or overwrites it if it does.

```typescript
// Write a string to a file
await Deno.writeTextFile("./output.txt", "Hello, Deno!");

// Write with options - append mode
await Deno.writeTextFile("./log.txt", "New log entry\n", { append: true });
```

### Writing Binary Files

For binary data, use `Deno.writeFile()` with a `Uint8Array`.

```typescript
// Write binary data to a file
const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in bytes
await Deno.writeFile("./binary.dat", data);

// Create a file with specific permissions (Unix-style)
await Deno.writeFile("./secure.txt", data, { mode: 0o600 });
```

### Writing Files with Create Options

You can control file creation behavior using various options.

```typescript
// Write only if file does not exist (atomic creation)
await Deno.writeTextFile("./newfile.txt", "Initial content", {
  createNew: true, // Fails if file already exists
});

// Write with specific permissions
await Deno.writeTextFile("./config.json", JSON.stringify({ key: "value" }), {
  mode: 0o644, // rw-r--r--
});
```

## File Permissions and Metadata

Deno provides comprehensive APIs for working with file permissions and metadata.

### Getting File Information

Use `Deno.stat()` to retrieve detailed information about a file or directory.

```typescript
// Get file metadata
const fileInfo = await Deno.stat("./example.txt");

console.log(`Is file: ${fileInfo.isFile}`);
console.log(`Is directory: ${fileInfo.isDirectory}`);
console.log(`Is symlink: ${fileInfo.isSymlink}`);
console.log(`Size: ${fileInfo.size} bytes`);
console.log(`Modified: ${fileInfo.mtime}`);
console.log(`Accessed: ${fileInfo.atime}`);
console.log(`Created: ${fileInfo.birthtime}`);
```

### Checking File Existence

Deno does not have a dedicated existence check method. Instead, use `stat()` with error handling.

```typescript
// Check if a file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

// Usage
if (await fileExists("./config.json")) {
  console.log("Config file found!");
}
```

### Changing File Permissions

Modify file permissions using `Deno.chmod()` (Unix-like systems only).

```typescript
// Change file permissions to read-write for owner only
await Deno.chmod("./sensitive.txt", 0o600);

// Make a script executable
await Deno.chmod("./script.sh", 0o755);
```

### Changing File Ownership

Change file ownership using `Deno.chown()` (requires appropriate privileges).

```typescript
// Change file ownership (requires elevated permissions)
await Deno.chown("./file.txt", 1000, 1000); // uid, gid
```

## Streaming Large Files

For large files, loading everything into memory is inefficient. Deno supports streaming for better memory management.

### Reading Files with Streams

Use `Deno.open()` to get a file handle and read in chunks.

```typescript
// Read a large file in chunks using streams
async function readLargeFile(path: string): Promise<void> {
  const file = await Deno.open(path, { read: true });
  
  // Create a buffer for reading chunks
  const buffer = new Uint8Array(1024); // 1KB chunks
  let bytesRead: number | null;
  let totalBytes = 0;
  
  while ((bytesRead = await file.read(buffer)) !== null) {
    totalBytes += bytesRead;
    // Process the chunk here
    const chunk = buffer.subarray(0, bytesRead);
    console.log(`Read ${bytesRead} bytes`);
  }
  
  file.close();
  console.log(`Total bytes read: ${totalBytes}`);
}
```

### Writing Files with Streams

Stream data to files for efficient memory usage when writing large amounts of data.

```typescript
// Write data in chunks using streams
async function writeLargeFile(path: string, data: string[]): Promise<void> {
  const file = await Deno.open(path, { write: true, create: true });
  const encoder = new TextEncoder();
  
  for (const line of data) {
    const encoded = encoder.encode(line + "\n");
    await file.write(encoded);
  }
  
  file.close();
}

// Usage
const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}`);
await writeLargeFile("./large-output.txt", lines);
```

### Using ReadableStream API

Deno supports the Web Streams API for modern stream handling.

```typescript
// Read file using Web Streams API
async function processFileStream(path: string): Promise<void> {
  const file = await Deno.open(path, { read: true });
  const readable = file.readable;
  
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value, { stream: true });
      console.log(text);
    }
  } finally {
    reader.releaseLock();
  }
}
```

### Copying Files with Streams

Efficiently copy files using streams without loading the entire file into memory.

```typescript
// Copy a file using streams
async function copyFile(source: string, destination: string): Promise<void> {
  const sourceFile = await Deno.open(source, { read: true });
  const destFile = await Deno.open(destination, { 
    write: true, 
    create: true, 
    truncate: true 
  });
  
  await sourceFile.readable.pipeTo(destFile.writable);
  
  console.log(`Copied ${source} to ${destination}`);
}

// Deno also provides a built-in copy method
await Deno.copyFile("./source.txt", "./destination.txt");
```

## Directory Operations

Deno provides methods for creating, reading, and managing directories.

### Creating Directories

Use `Deno.mkdir()` to create directories.

```typescript
// Create a single directory
await Deno.mkdir("./new-folder");

// Create nested directories (like mkdir -p)
await Deno.mkdir("./path/to/nested/folder", { recursive: true });
```

### Reading Directory Contents

Iterate over directory contents using `Deno.readDir()`.

```typescript
// List all files and directories in a folder
async function listDirectory(path: string): Promise<void> {
  for await (const entry of Deno.readDir(path)) {
    const type = entry.isFile ? "FILE" : entry.isDirectory ? "DIR" : "LINK";
    console.log(`[${type}] ${entry.name}`);
  }
}

await listDirectory("./");
```

### Recursive Directory Traversal

Walk through directories recursively to process all files.

```typescript
// Recursively walk through a directory tree
async function walkDirectory(path: string, indent = ""): Promise<void> {
  for await (const entry of Deno.readDir(path)) {
    console.log(`${indent}${entry.isDirectory ? "📁" : "📄"} ${entry.name}`);
    
    if (entry.isDirectory) {
      await walkDirectory(`${path}/${entry.name}`, indent + "  ");
    }
  }
}

await walkDirectory("./src");
```

### Removing Files and Directories

Delete files and directories using `Deno.remove()`.

```typescript
// Remove a file
await Deno.remove("./temp.txt");

// Remove an empty directory
await Deno.remove("./empty-folder");

// Remove a directory and all its contents recursively
await Deno.remove("./folder-with-contents", { recursive: true });
```

### Renaming and Moving Files

Use `Deno.rename()` to rename or move files and directories.

```typescript
// Rename a file
await Deno.rename("./old-name.txt", "./new-name.txt");

// Move a file to a different directory
await Deno.rename("./file.txt", "./archive/file.txt");
```

## Watching Files for Changes

Deno can monitor files and directories for changes using `Deno.watchFs()`.

### Basic File Watching

Watch a file or directory for modifications.

```typescript
// Watch for file changes
async function watchFiles(paths: string[]): Promise<void> {
  const watcher = Deno.watchFs(paths);
  
  console.log(`Watching for changes in: ${paths.join(", ")}`);
  
  for await (const event of watcher) {
    console.log(`Event: ${event.kind}`);
    console.log(`Paths: ${event.paths.join(", ")}`);
    
    // Event kinds: create, modify, remove, access, other
    switch (event.kind) {
      case "create":
        console.log("File created!");
        break;
      case "modify":
        console.log("File modified!");
        break;
      case "remove":
        console.log("File removed!");
        break;
    }
  }
}

// Watch the current directory
watchFiles(["./src"]);
```

### Debounced File Watcher

Implement debouncing to handle rapid file changes efficiently.

```typescript
// Debounced file watcher for build systems
async function debouncedWatch(
  paths: string[],
  callback: (event: Deno.FsEvent) => void,
  delay = 100
): Promise<void> {
  const watcher = Deno.watchFs(paths);
  let timeout: number | undefined;
  let pendingEvent: Deno.FsEvent | null = null;
  
  for await (const event of watcher) {
    pendingEvent = event;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      if (pendingEvent) {
        callback(pendingEvent);
        pendingEvent = null;
      }
    }, delay);
  }
}

// Usage
debouncedWatch(["./src"], (event) => {
  console.log(`Rebuilding due to: ${event.kind} on ${event.paths[0]}`);
});
```

## Working with JSON Files

JSON is ubiquitous in modern applications. Deno makes working with JSON files straightforward.

### Reading JSON Files

Parse JSON files directly with error handling.

```typescript
// Type-safe JSON file reading
interface Config {
  apiUrl: string;
  timeout: number;
  features: string[];
}

async function readJsonFile<T>(path: string): Promise<T> {
  const content = await Deno.readTextFile(path);
  return JSON.parse(content) as T;
}

// Usage
const config = await readJsonFile<Config>("./config.json");
console.log(`API URL: ${config.apiUrl}`);
```

### Writing JSON Files

Write objects to JSON files with proper formatting.

```typescript
// Write formatted JSON to a file
async function writeJsonFile<T>(path: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await Deno.writeTextFile(path, content);
}

// Usage
const settings = {
  theme: "dark",
  language: "en",
  notifications: true,
};

await writeJsonFile("./settings.json", settings);
```

## Working with CSV Files

CSV files are common for data exchange. Here is how to handle them in Deno.

### Parsing CSV Files

Parse CSV data with proper handling of quoted fields and escape characters.

```typescript
// Simple CSV parser
function parseCSV(content: string): string[][] {
  const lines = content.trim().split("\n");
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  });
}

// Read and parse a CSV file
async function readCSVFile(path: string): Promise<string[][]> {
  const content = await Deno.readTextFile(path);
  return parseCSV(content);
}

// Usage
const data = await readCSVFile("./data.csv");
const [headers, ...rows] = data;
console.log(`Columns: ${headers.join(", ")}`);
console.log(`Rows: ${rows.length}`);
```

### Writing CSV Files

Generate CSV content from structured data.

```typescript
// Convert data to CSV format
function toCSV(headers: string[], rows: string[][]): string {
  const escapeField = (field: string): string => {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };
  
  const headerLine = headers.map(escapeField).join(",");
  const dataLines = rows.map((row) => row.map(escapeField).join(","));
  
  return [headerLine, ...dataLines].join("\n");
}

// Write CSV data to a file
async function writeCSVFile(
  path: string,
  headers: string[],
  rows: string[][]
): Promise<void> {
  const content = toCSV(headers, rows);
  await Deno.writeTextFile(path, content);
}

// Usage
const headers = ["Name", "Email", "Role"];
const rows = [
  ["Alice", "alice@example.com", "Admin"],
  ["Bob", "bob@example.com", "User"],
];

await writeCSVFile("./users.csv", headers, rows);
```

## Working with Temporary Files

Create temporary files and directories for intermediate operations.

```typescript
// Create a temporary file
async function createTempFile(content: string): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const tempFile = `${tempDir}/temp-${Date.now()}.txt`;
  
  await Deno.writeTextFile(tempFile, content);
  return tempFile;
}

// Create and use a temporary directory
async function withTempDir<T>(
  callback: (dir: string) => Promise<T>
): Promise<T> {
  const tempDir = await Deno.makeTempDir();
  
  try {
    return await callback(tempDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

// Usage
await withTempDir(async (dir) => {
  await Deno.writeTextFile(`${dir}/data.txt`, "Temporary data");
  const content = await Deno.readTextFile(`${dir}/data.txt`);
  console.log(content);
});
```

## Best Practices Summary

Here are key recommendations for file operations in Deno:

1. **Always handle errors gracefully** - Wrap file operations in try-catch blocks and handle specific error types like `NotFound` and `PermissionDenied`.

2. **Use streams for large files** - Avoid loading entire large files into memory. Use streaming APIs for files over a few megabytes.

3. **Request minimal permissions** - Only request the specific file permissions you need. Avoid using `--allow-all` in production.

4. **Close file handles** - When using `Deno.open()`, always close the file handle when done or use streaming APIs that handle cleanup.

5. **Use async methods by default** - Prefer asynchronous file operations to avoid blocking the event loop. Use sync variants only when necessary.

6. **Validate file paths** - Sanitize user-provided file paths to prevent directory traversal attacks.

7. **Handle file encoding properly** - Use `TextEncoder` and `TextDecoder` for explicit encoding control when working with different character sets.

8. **Create directories recursively** - Use `{ recursive: true }` option with `mkdir` to handle nested directory creation safely.

9. **Use atomic operations when possible** - For critical files, write to a temporary file first, then rename for atomic updates.

10. **Debounce file watchers** - When watching files, implement debouncing to handle rapid successive changes efficiently.

## Conclusion

Deno provides a comprehensive and modern API for file operations that prioritizes security and developer experience. The built-in TypeScript support, explicit permission model, and Web-compatible APIs make file handling both safe and intuitive. From simple text file operations to complex streaming scenarios, Deno offers all the tools needed for robust file system interactions.

The key advantages of Deno's file system APIs include:

- **Security by default** with explicit permission grants
- **Promise-based async operations** for non-blocking I/O
- **Web Streams API support** for efficient large file handling
- **Built-in TypeScript support** for type-safe file operations
- **Comprehensive error types** for granular error handling

By following the patterns and best practices outlined in this guide, you can build reliable applications that handle files efficiently and securely. Whether you are building a CLI tool, a web server, or a data processing pipeline, Deno's file system APIs provide a solid foundation for all your file operation needs.
