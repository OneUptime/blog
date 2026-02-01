# How to Handle File Operations in Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, JavaScript, File Operations, Performance

Description: A comprehensive guide to handling file operations in Bun, covering reading, writing, streams, directory operations, file watching, and performance optimization.

---

Bun has emerged as a fast, all-in-one JavaScript runtime that aims to replace Node.js in many scenarios. One of its standout features is its highly optimized file system API, which offers both simplicity and exceptional performance. In this guide, we will explore everything you need to know about handling file operations in Bun, from basic reading and writing to advanced streaming and file watching capabilities.

## Understanding the Bun.file API

The `Bun.file()` function is the cornerstone of file operations in Bun. Unlike Node.js, which relies on callbacks or promises with the `fs` module, Bun provides a more intuitive and performant approach. The `Bun.file()` function returns a `BunFile` object, which is a lazy reference to the file. The actual file is not read until you explicitly request its contents.

Here is how to create a file reference:

```typescript
// Create a lazy reference to a file
const file = Bun.file("./data/config.json");

// The file is not read yet - this is just a reference
console.log(file.name); // "./data/config.json"
console.log(file.type); // MIME type like "application/json"
```

The `BunFile` object provides several useful properties and methods:

```typescript
const file = Bun.file("./example.txt");

// Get file metadata without reading content
console.log(file.size);     // File size in bytes
console.log(file.type);     // MIME type
console.log(file.name);     // File path
console.log(file.lastModified); // Last modification timestamp
```

## Reading Files

Bun offers multiple ways to read file contents, each optimized for different use cases. The most common methods are `text()`, `json()`, `arrayBuffer()`, and `bytes()`.

### Reading Text Files

For reading plain text files, use the `text()` method which returns a Promise:

```typescript
// Read a file as text
const file = Bun.file("./README.md");
const content = await file.text();

console.log(content);
```

### Reading JSON Files

Bun provides a dedicated method for parsing JSON files directly:

```typescript
// Read and parse JSON in one step
const configFile = Bun.file("./config.json");
const config = await configFile.json();

// Access parsed data directly
console.log(config.database.host);
console.log(config.api.port);
```

This is significantly faster than reading text and then parsing JSON separately, as Bun optimizes this operation internally.

### Reading Binary Files

For binary data like images or executables, use `arrayBuffer()` or `bytes()`:

```typescript
// Read file as ArrayBuffer
const imageFile = Bun.file("./photo.png");
const buffer = await imageFile.arrayBuffer();

// Read file as Uint8Array
const bytes = await imageFile.bytes();

// Work with binary data
console.log(`Image size: ${bytes.length} bytes`);
console.log(`First 4 bytes:`, bytes.slice(0, 4));
```

### Checking File Existence

Before reading a file, you might want to check if it exists:

```typescript
// Check if file exists
const file = Bun.file("./maybe-exists.txt");
const exists = await file.exists();

if (exists) {
    const content = await file.text();
    console.log("File content:", content);
} else {
    console.log("File does not exist");
}
```

## Writing Files

Bun provides `Bun.write()` as the primary method for writing files. It is incredibly versatile and accepts various input types.

### Writing Text Content

Writing a string to a file is straightforward:

```typescript
// Write a string to a file
await Bun.write("./output.txt", "Hello, Bun!");

// The file is created if it doesn't exist
// Existing content is overwritten
```

### Writing JSON Data

You can write JSON data by stringifying objects:

```typescript
// Write JSON data to a file
const data = {
    name: "OneUptime",
    version: "1.0.0",
    features: ["monitoring", "alerting", "observability"]
};

await Bun.write("./data.json", JSON.stringify(data, null, 2));
```

### Writing Binary Data

Writing binary data works with ArrayBuffer, Uint8Array, or Blob:

```typescript
// Write binary data
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
await Bun.write("./binary.dat", binaryData);

// Copy a file using Bun.file as source
const sourceFile = Bun.file("./source.png");
await Bun.write("./destination.png", sourceFile);
```

### Writing with Response or Blob Objects

Bun.write also accepts Response and Blob objects, making it easy to save fetched data:

```typescript
// Download and save a file from the internet
const response = await fetch("https://example.com/data.json");
await Bun.write("./downloaded.json", response);

// Write a Blob
const blob = new Blob(["Content from blob"], { type: "text/plain" });
await Bun.write("./from-blob.txt", blob);
```

## Working with Streams

Streams are essential for handling large files efficiently without loading everything into memory. Bun provides excellent streaming support.

### Reading with Streams

Use the `stream()` method to get a ReadableStream:

```typescript
// Create a readable stream from a file
const file = Bun.file("./large-file.log");
const stream = file.stream();

// Process the stream chunk by chunk
const reader = stream.getReader();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Process each chunk (Uint8Array)
    console.log(`Received ${value.length} bytes`);
}
```

### Processing Large Files Line by Line

For text files, you can process them line by line:

```typescript
// Read a large file line by line
const file = Bun.file("./access.log");
const text = await file.text();
const lines = text.split("\n");

for (const line of lines) {
    if (line.includes("ERROR")) {
        console.log("Found error:", line);
    }
}
```

### Writing with Streams

Bun supports writing from streams directly:

```typescript
// Create a readable stream and write it to a file
const readableStream = new ReadableStream({
    start(controller) {
        controller.enqueue(new TextEncoder().encode("Line 1\n"));
        controller.enqueue(new TextEncoder().encode("Line 2\n"));
        controller.enqueue(new TextEncoder().encode("Line 3\n"));
        controller.close();
    }
});

await Bun.write("./streamed-output.txt", readableStream);
```

## Directory Operations

While Bun.file handles individual files, you need different approaches for directory operations. Bun supports Node.js compatible APIs for these tasks.

### Listing Directory Contents

Use the synchronous or asynchronous readdir functions:

```typescript
import { readdir, readdirSync } from "node:fs/promises";
import { statSync } from "node:fs";

// List files in a directory
const files = await readdir("./posts");

for (const file of files) {
    const stats = statSync(`./posts/${file}`);
    const type = stats.isDirectory() ? "Directory" : "File";
    console.log(`${type}: ${file}`);
}
```

### Creating Directories

Create single or nested directories:

```typescript
import { mkdir } from "node:fs/promises";

// Create a single directory
await mkdir("./new-folder");

// Create nested directories with recursive option
await mkdir("./path/to/nested/folder", { recursive: true });
```

### Removing Directories and Files

Remove files and directories safely:

```typescript
import { rm, unlink } from "node:fs/promises";

// Remove a single file
await unlink("./temp-file.txt");

// Remove a directory and its contents
await rm("./old-folder", { recursive: true, force: true });
```

### Walking Directory Trees

Recursively traverse directories:

```typescript
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

// Recursive function to walk directory tree
async function walkDir(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir);
    
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
            const subFiles = await walkDir(fullPath);
            files.push(...subFiles);
        } else {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Get all files in the posts directory
const allFiles = await walkDir("./posts");
console.log(`Found ${allFiles.length} files`);
```

## File Watching

Bun includes built-in file watching capabilities, which is useful for development servers and live reload functionality.

### Basic File Watching

Use Bun's native file watcher:

```typescript
import { watch } from "node:fs";

// Watch a single file
const watcher = watch("./config.json", (eventType, filename) => {
    console.log(`Event: ${eventType} on ${filename}`);
    
    if (eventType === "change") {
        // Reload configuration
        const config = Bun.file("./config.json");
        config.json().then(data => {
            console.log("Config reloaded:", data);
        });
    }
});

// Stop watching when done
// watcher.close();
```

### Watching Directories

Watch entire directories for changes:

```typescript
import { watch } from "node:fs";

// Watch a directory recursively
const watcher = watch("./src", { recursive: true }, (eventType, filename) => {
    console.log(`${eventType}: ${filename}`);
    
    // Filter by file extension
    if (filename && filename.endsWith(".ts")) {
        console.log("TypeScript file changed, rebuilding...");
    }
});
```

### Debouncing File Watch Events

File systems often emit multiple events for a single change. Implement debouncing:

```typescript
import { watch } from "node:fs";

// Debounce function for file watching
function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
): T {
    let timeoutId: Timer | null = null;
    
    return ((...args: any[]) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
}

// Create debounced handler
const handleChange = debounce((eventType: string, filename: string) => {
    console.log(`Processing: ${eventType} on ${filename}`);
}, 100);

// Watch with debouncing
watch("./src", { recursive: true }, handleChange);
```

## File Metadata and Statistics

Understanding file metadata is crucial for many applications:

```typescript
import { stat } from "node:fs/promises";

// Get comprehensive file statistics
const stats = await stat("./important-file.txt");

console.log("File Statistics:");
console.log(`  Size: ${stats.size} bytes`);
console.log(`  Created: ${stats.birthtime}`);
console.log(`  Modified: ${stats.mtime}`);
console.log(`  Accessed: ${stats.atime}`);
console.log(`  Is File: ${stats.isFile()}`);
console.log(`  Is Directory: ${stats.isDirectory()}`);
console.log(`  Is Symbolic Link: ${stats.isSymbolicLink()}`);
console.log(`  Permissions: ${stats.mode.toString(8)}`);
```

### Checking File Permissions

Verify file access permissions:

```typescript
import { access, constants } from "node:fs/promises";

// Check if file is readable
async function isReadable(path: string): Promise<boolean> {
    try {
        await access(path, constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

// Check if file is writable
async function isWritable(path: string): Promise<boolean> {
    try {
        await access(path, constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

// Usage example
const readable = await isReadable("./config.json");
const writable = await isWritable("./output.log");

console.log(`Config is readable: ${readable}`);
console.log(`Output is writable: ${writable}`);
```

## Working with Paths

Bun fully supports Node.js path utilities:

```typescript
import { join, resolve, dirname, basename, extname, parse } from "node:path";

const filePath = "./posts/2026-01-31-bun-file-operations/README.md";

console.log("Path Operations:");
console.log(`  Resolved: ${resolve(filePath)}`);
console.log(`  Directory: ${dirname(filePath)}`);
console.log(`  Filename: ${basename(filePath)}`);
console.log(`  Extension: ${extname(filePath)}`);

// Parse path into components
const parsed = parse(filePath);
console.log("Parsed path:", parsed);
// { root: '', dir: './posts/2026-01-31-bun-file-operations', base: 'README.md', ext: '.md', name: 'README' }
```

## Performance Considerations

Bun's file operations are significantly faster than Node.js due to several optimizations:

### Benchmarking File Operations

Compare operation times:

```typescript
// Simple benchmark for file reading
async function benchmark(name: string, fn: () => Promise<void>, iterations: number = 100) {
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        await fn();
    }
    
    const elapsed = performance.now() - start;
    console.log(`${name}: ${elapsed.toFixed(2)}ms for ${iterations} iterations`);
    console.log(`  Average: ${(elapsed / iterations).toFixed(2)}ms per operation`);
}

// Benchmark reading a file
await benchmark("Bun.file().text()", async () => {
    const content = await Bun.file("./large-file.txt").text();
});
```

### Memory Efficient Large File Processing

For very large files, use streaming to minimize memory usage:

```typescript
// Process a large log file without loading it entirely into memory
async function processLargeLog(path: string) {
    const file = Bun.file(path);
    const stream = file.stream();
    const decoder = new TextDecoder();
    
    let buffer = "";
    let lineCount = 0;
    let errorCount = 0;
    
    const reader = stream.getReader();
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
            lineCount++;
            if (line.includes("ERROR")) {
                errorCount++;
            }
        }
    }
    
    // Process remaining buffer
    if (buffer) {
        lineCount++;
        if (buffer.includes("ERROR")) {
            errorCount++;
        }
    }
    
    return { lineCount, errorCount };
}
```

### Parallel File Operations

Process multiple files concurrently for better throughput:

```typescript
// Read multiple files in parallel
async function readMultipleFiles(paths: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Create all file read promises
    const promises = paths.map(async (path) => {
        const content = await Bun.file(path).text();
        return { path, content };
    });
    
    // Wait for all reads to complete
    const resolved = await Promise.all(promises);
    
    for (const { path, content } of resolved) {
        results.set(path, content);
    }
    
    return results;
}

// Usage
const files = ["./file1.txt", "./file2.txt", "./file3.txt"];
const contents = await readMultipleFiles(files);
```

## Practical Examples

### Configuration File Manager

A complete example of managing application configuration:

```typescript
// Configuration manager with file operations
class ConfigManager {
    private configPath: string;
    private config: Record<string, any> = {};
    
    constructor(configPath: string) {
        this.configPath = configPath;
    }
    
    async load(): Promise<void> {
        const file = Bun.file(this.configPath);
        
        if (await file.exists()) {
            this.config = await file.json();
        } else {
            this.config = {};
        }
    }
    
    async save(): Promise<void> {
        const content = JSON.stringify(this.config, null, 2);
        await Bun.write(this.configPath, content);
    }
    
    get<T>(key: string, defaultValue?: T): T {
        return this.config[key] ?? defaultValue;
    }
    
    set(key: string, value: any): void {
        this.config[key] = value;
    }
}

// Usage
const config = new ConfigManager("./app-config.json");
await config.load();
config.set("theme", "dark");
config.set("language", "en");
await config.save();
```

### Log File Rotator

Implement log file rotation:

```typescript
import { rename, unlink, stat } from "node:fs/promises";

// Log file rotation utility
class LogRotator {
    private basePath: string;
    private maxSize: number;
    private maxFiles: number;
    
    constructor(basePath: string, maxSizeMB: number = 10, maxFiles: number = 5) {
        this.basePath = basePath;
        this.maxSize = maxSizeMB * 1024 * 1024;
        this.maxFiles = maxFiles;
    }
    
    async shouldRotate(): Promise<boolean> {
        const file = Bun.file(this.basePath);
        if (!(await file.exists())) return false;
        
        const stats = await stat(this.basePath);
        return stats.size >= this.maxSize;
    }
    
    async rotate(): Promise<void> {
        // Remove oldest file
        const oldestPath = `${this.basePath}.${this.maxFiles}`;
        const oldestFile = Bun.file(oldestPath);
        if (await oldestFile.exists()) {
            await unlink(oldestPath);
        }
        
        // Shift existing rotated files
        for (let i = this.maxFiles - 1; i >= 1; i--) {
            const currentPath = `${this.basePath}.${i}`;
            const nextPath = `${this.basePath}.${i + 1}`;
            
            const currentFile = Bun.file(currentPath);
            if (await currentFile.exists()) {
                await rename(currentPath, nextPath);
            }
        }
        
        // Rotate current log
        const currentFile = Bun.file(this.basePath);
        if (await currentFile.exists()) {
            await rename(this.basePath, `${this.basePath}.1`);
        }
    }
    
    async write(message: string): Promise<void> {
        if (await this.shouldRotate()) {
            await this.rotate();
        }
        
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}\n`;
        
        // Append to log file
        const file = Bun.file(this.basePath);
        const existing = (await file.exists()) ? await file.text() : "";
        await Bun.write(this.basePath, existing + logLine);
    }
}
```

## Best Practices Summary

When working with file operations in Bun, keep these best practices in mind:

1. **Use Bun.file() for reading**: The lazy evaluation allows for efficient resource usage. Only the data you request is loaded.

2. **Prefer specific methods**: Use `.json()` for JSON files instead of `.text()` followed by `JSON.parse()`. Bun optimizes these internally.

3. **Stream large files**: Never load very large files entirely into memory. Use streams for files larger than 100MB.

4. **Check file existence**: Always verify a file exists before reading to avoid unhandled exceptions.

5. **Use absolute paths in production**: Relative paths can be fragile. Use `path.resolve()` to create absolute paths.

6. **Handle errors gracefully**: Wrap file operations in try-catch blocks and provide meaningful error messages.

7. **Debounce file watchers**: File system events can be noisy. Always debounce your handlers.

8. **Parallelize independent operations**: Use `Promise.all()` when reading or writing multiple independent files.

9. **Clean up resources**: Close file watchers and streams when they are no longer needed.

10. **Use appropriate MIME types**: When writing binary files, be aware of the content type for proper handling.

## Conclusion

Bun provides a modern, performant, and intuitive API for file operations that significantly improves upon the traditional Node.js approach. The `Bun.file()` API with its lazy evaluation, combined with the powerful `Bun.write()` function, makes file handling both simple and efficient.

The key advantages of Bun's file system API include its exceptional speed, memory efficiency through streaming support, and developer-friendly interface. Whether you are building a simple script that reads configuration files or a complex application that processes large datasets, Bun has the tools you need.

By following the patterns and best practices outlined in this guide, you can build robust file handling logic that takes full advantage of Bun's performance characteristics. As Bun continues to mature, its file system capabilities will only improve, making it an excellent choice for JavaScript and TypeScript projects that require efficient file operations.
