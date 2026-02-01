# How to Handle Streams in Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Streams, JavaScript, Performance

Description: A comprehensive guide to working with ReadableStream, WritableStream, TransformStream, and Bun-specific stream APIs for efficient data processing.

---

Streams are one of the most powerful concepts in modern JavaScript runtimes. They allow you to process data piece by piece without loading everything into memory at once. Bun, the fast all-in-one JavaScript runtime, provides excellent support for the Web Streams API along with some Bun-specific optimizations that make stream handling even more efficient.

In this guide, we will explore how to work with streams in Bun, covering everything from basic concepts to advanced patterns for real-world applications.

## Understanding Web Streams in Bun

Bun implements the Web Streams API, which is a standard set of interfaces for creating and consuming streams of data. The three main types of streams are:

- **ReadableStream**: Represents a source of data that you can read from
- **WritableStream**: Represents a destination for data that you can write to
- **TransformStream**: Represents a duplex stream that transforms data as it passes through

Bun's implementation is designed to be compatible with web browsers and other JavaScript runtimes while also providing performance optimizations specific to server-side use cases.

## Working with ReadableStream

A ReadableStream is the foundation for reading data incrementally. You can create custom readable streams or work with streams returned by various Bun APIs.

### Creating a Basic ReadableStream

This example shows how to create a simple ReadableStream that emits a sequence of numbers with controlled timing.

```javascript
// Create a ReadableStream that emits numbers 1 through 5
const numberStream = new ReadableStream({
  start(controller) {
    // Called when the stream is created
    console.log("Stream started");
  },
  
  async pull(controller) {
    // Called when the consumer requests more data
    for (let i = 1; i <= 5; i++) {
      controller.enqueue(i);
      // Simulate async data generation
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Signal that no more data will be sent
    controller.close();
  },
  
  cancel(reason) {
    // Called when the consumer cancels the stream
    console.log("Stream cancelled:", reason);
  }
});

// Consume the stream
const reader = numberStream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log("Received:", value);
}
```

### Reading Streams with Async Iteration

Bun supports async iteration over ReadableStreams, which provides a cleaner syntax for consuming stream data.

The following example demonstrates how to use for-await-of loops to read from a stream.

```javascript
// Create a stream of text chunks
const textStream = new ReadableStream({
  async start(controller) {
    const chunks = ["Hello, ", "this is ", "a stream ", "of text!"];
    for (const chunk of chunks) {
      controller.enqueue(chunk);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    controller.close();
  }
});

// Use async iteration to consume the stream
// This is more readable than using getReader() directly
for await (const chunk of textStream) {
  console.log("Chunk:", chunk);
}
```

### Converting Between Formats

Bun provides convenient methods to convert streams to different formats like arrays, text, or blobs.

```javascript
// Create a stream of Uint8Array chunks
const binaryStream = new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array([72, 101, 108, 108, 111])); // "Hello"
    controller.enqueue(new Uint8Array([32, 87, 111, 114, 108, 100])); // " World"
    controller.close();
  }
});

// Bun provides helper methods on Response to convert streams
const response = new Response(binaryStream);

// Convert to text
const text = await response.text();
console.log(text); // "Hello World"

// For arrays, you can collect chunks manually
async function streamToArray(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}
```

## Working with WritableStream

WritableStreams are destinations for data. They are useful when you need to send data somewhere incrementally, such as writing to a file or sending data over a network connection.

### Creating a Custom WritableStream

This example creates a WritableStream that logs each chunk it receives and tracks the total bytes written.

```javascript
// Create a WritableStream that processes incoming data
const loggingStream = new WritableStream({
  start(controller) {
    // Initialize any state needed
    this.totalBytes = 0;
    console.log("Writer ready");
  },
  
  write(chunk, controller) {
    // Process each chunk as it arrives
    this.totalBytes += chunk.length;
    console.log(`Received chunk: ${chunk.length} bytes`);
    console.log(`Content: ${new TextDecoder().decode(chunk)}`);
  },
  
  close() {
    // Called when the stream is closed normally
    console.log(`Stream closed. Total bytes: ${this.totalBytes}`);
  },
  
  abort(reason) {
    // Called when the stream is aborted due to an error
    console.error("Stream aborted:", reason);
  }
});

// Write data to the stream
const writer = loggingStream.getWriter();
await writer.write(new TextEncoder().encode("First chunk"));
await writer.write(new TextEncoder().encode("Second chunk"));
await writer.close();
```

### Using WritableStreamDefaultWriter

The writer provides methods for controlled writing with backpressure support.

```javascript
// Create a buffered writer that respects backpressure
async function writeWithBackpressure(stream, data) {
  const writer = stream.getWriter();
  
  try {
    // Wait for the stream to be ready before writing
    await writer.ready;
    
    // Write the data
    await writer.write(data);
    
    // Always release the lock when done
  } finally {
    writer.releaseLock();
  }
}

// Example usage with a destination stream
const destination = new WritableStream({
  write(chunk) {
    // Simulate slow processing
    return new Promise(resolve => setTimeout(resolve, 100));
  }
});

const chunks = ["chunk1", "chunk2", "chunk3"];
for (const chunk of chunks) {
  await writeWithBackpressure(destination, new TextEncoder().encode(chunk));
  console.log(`Wrote: ${chunk}`);
}
```

## Working with TransformStream

TransformStreams sit between a readable and writable stream, transforming data as it passes through. They are perfect for data processing pipelines.

### Creating a Transform Stream

Here is an example of a TransformStream that converts text to uppercase.

```javascript
// Create a transform stream that uppercases text
const uppercaseTransform = new TransformStream({
  transform(chunk, controller) {
    // Convert the chunk to uppercase and enqueue it
    const text = new TextDecoder().decode(chunk);
    const uppercased = text.toUpperCase();
    controller.enqueue(new TextEncoder().encode(uppercased));
  },
  
  flush(controller) {
    // Called when the input stream closes
    // Useful for outputting any buffered data
    console.log("Transform complete");
  }
});

// Use the transform stream
const input = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode("hello "));
    controller.enqueue(new TextEncoder().encode("world"));
    controller.close();
  }
});

// Pipe through the transform
const transformed = input.pipeThrough(uppercaseTransform);

// Read the transformed output
const result = await new Response(transformed).text();
console.log(result); // "HELLO WORLD"
```

### Chaining Multiple Transforms

You can chain multiple TransformStreams together to create complex data processing pipelines.

```javascript
// Transform that adds a prefix to each chunk
function createPrefixTransform(prefix) {
  return new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const prefixed = prefix + text;
      controller.enqueue(new TextEncoder().encode(prefixed));
    }
  });
}

// Transform that adds a suffix to each chunk
function createSuffixTransform(suffix) {
  return new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const suffixed = text + suffix;
      controller.enqueue(new TextEncoder().encode(suffixed));
    }
  });
}

// Create source stream
const source = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode("message"));
    controller.close();
  }
});

// Chain transforms together
const result = await new Response(
  source
    .pipeThrough(createPrefixTransform("[START] "))
    .pipeThrough(createSuffixTransform(" [END]"))
).text();

console.log(result); // "[START] message [END]"
```

## Piping Streams

Piping is a powerful way to connect streams together. Bun supports both `pipeTo()` for connecting to a WritableStream and `pipeThrough()` for connecting through a TransformStream.

### Using pipeTo()

The pipeTo() method connects a ReadableStream to a WritableStream and returns a promise that resolves when the pipe completes.

```javascript
// Create a source stream
const source = new ReadableStream({
  async start(controller) {
    for (let i = 0; i < 5; i++) {
      controller.enqueue(new TextEncoder().encode(`Chunk ${i}\n`));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    controller.close();
  }
});

// Create a destination that collects data
const chunks = [];
const destination = new WritableStream({
  write(chunk) {
    chunks.push(new TextDecoder().decode(chunk));
  }
});

// Pipe source to destination
await source.pipeTo(destination);

console.log("All chunks:", chunks.join(""));
```

### Pipe Options

You can control piping behavior with options for error handling and cancellation.

```javascript
// Create an AbortController for cancellation
const controller = new AbortController();

// Set up a timeout to cancel the pipe after 500ms
setTimeout(() => controller.abort(), 500);

const slowSource = new ReadableStream({
  async pull(controller) {
    // Simulate slow data generation
    await new Promise(resolve => setTimeout(resolve, 200));
    controller.enqueue(new TextEncoder().encode("data"));
  }
});

const destination = new WritableStream({
  write(chunk) {
    console.log("Received:", new TextDecoder().decode(chunk));
  }
});

try {
  await slowSource.pipeTo(destination, {
    signal: controller.signal,
    preventClose: false, // Close destination when source closes
    preventAbort: false, // Abort destination on source error
    preventCancel: false // Cancel source on destination error
  });
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Pipe was aborted");
  } else {
    throw error;
  }
}
```

## File Streaming in Bun

Bun provides optimized APIs for streaming files, which is essential for handling large files without consuming excessive memory.

### Reading Files as Streams

Use Bun.file() to create a file reference and stream() to get a ReadableStream.

```javascript
// Read a file as a stream
const file = Bun.file("./large-file.txt");

// Get a ReadableStream from the file
const stream = file.stream();

// Process the file in chunks
let totalSize = 0;
for await (const chunk of stream) {
  totalSize += chunk.length;
  // Process each chunk without loading the entire file into memory
  console.log(`Processing chunk of ${chunk.length} bytes`);
}

console.log(`Total file size: ${totalSize} bytes`);
```

### Writing Files with Streams

Bun provides Bun.write() which can accept a ReadableStream as input for efficient file writing.

```javascript
// Create a stream of data to write
const dataStream = new ReadableStream({
  async start(controller) {
    // Generate data in chunks
    for (let i = 0; i < 1000; i++) {
      const line = `Line ${i}: This is some generated content\n`;
      controller.enqueue(new TextEncoder().encode(line));
    }
    controller.close();
  }
});

// Write the stream to a file
await Bun.write("./output.txt", dataStream);
console.log("File written successfully");
```

### Copying Files with Streams

Streams make it easy to copy files efficiently, especially large ones.

```javascript
// Copy a file using streams
async function copyFile(sourcePath, destPath) {
  const sourceFile = Bun.file(sourcePath);
  const sourceStream = sourceFile.stream();
  
  await Bun.write(destPath, sourceStream);
  console.log(`Copied ${sourcePath} to ${destPath}`);
}

await copyFile("./source.txt", "./destination.txt");
```

## HTTP Streaming in Bun

Bun's built-in HTTP server has excellent support for streaming responses, which is perfect for serving large files or real-time data.

### Streaming HTTP Responses

This example shows how to create a streaming HTTP server that sends data incrementally.

```javascript
// Create an HTTP server with streaming responses
const server = Bun.serve({
  port: 3000,
  
  fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/stream") {
      // Create a streaming response
      const stream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < 10; i++) {
            const data = `Event ${i}: ${new Date().toISOString()}\n`;
            controller.enqueue(new TextEncoder().encode(data));
            // Wait between chunks to demonstrate streaming
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain",
          "Transfer-Encoding": "chunked"
        }
      });
    }
    
    return new Response("Hello World");
  }
});

console.log(`Server running at http://localhost:${server.port}`);
```

### Server-Sent Events (SSE)

Streams are perfect for implementing Server-Sent Events for real-time updates.

```javascript
// SSE endpoint for real-time updates
function createSSEResponse() {
  const stream = new ReadableStream({
    async start(controller) {
      let eventId = 0;
      
      // Send events every second
      const interval = setInterval(() => {
        eventId++;
        const event = [
          `id: ${eventId}`,
          `event: update`,
          `data: ${JSON.stringify({ time: Date.now(), value: Math.random() })}`,
          "", // Empty line to mark end of event
          ""
        ].join("\n");
        
        controller.enqueue(new TextEncoder().encode(event));
        
        // Stop after 10 events for this example
        if (eventId >= 10) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);
    }
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}

// Use in a Bun server
Bun.serve({
  port: 3000,
  fetch(request) {
    if (new URL(request.url).pathname === "/events") {
      return createSSEResponse();
    }
    return new Response("Not found", { status: 404 });
  }
});
```

### Streaming File Downloads

Serve large files efficiently by streaming them directly from disk.

```javascript
// Stream a file as a download
Bun.serve({
  port: 3000,
  
  fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === "/download") {
      const filename = url.searchParams.get("file") || "example.zip";
      const file = Bun.file(`./files/${filename}`);
      
      // Check if file exists
      if (!file.size) {
        return new Response("File not found", { status: 404 });
      }
      
      // Return the file stream as response
      return new Response(file.stream(), {
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }
    
    return new Response("Not found", { status: 404 });
  }
});
```

## Bun-Specific Stream APIs

Bun provides several optimized APIs that work seamlessly with streams.

### Using Bun.ArrayBufferSink

For high-performance scenarios, Bun.ArrayBufferSink provides a fast way to accumulate stream data.

```javascript
// High-performance data accumulation
const sink = new Bun.ArrayBufferSink();

// Configure the sink
sink.start({
  // Pre-allocate buffer space for better performance
  highWaterMark: 1024 * 1024, // 1MB initial buffer
  asUint8Array: true // Return Uint8Array instead of ArrayBuffer
});

// Write data to the sink
sink.write(new TextEncoder().encode("Hello "));
sink.write(new TextEncoder().encode("World!"));

// Get all accumulated data
const result = sink.end();
console.log(new TextDecoder().decode(result)); // "Hello World!"
```

### Streaming with Bun.spawn

Bun's process spawning API supports streaming for stdout and stderr.

```javascript
// Spawn a process and stream its output
const proc = Bun.spawn(["ls", "-la"], {
  cwd: ".",
  stdout: "pipe",
  stderr: "pipe"
});

// Stream stdout
const stdoutReader = proc.stdout.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await stdoutReader.read();
  if (done) break;
  process.stdout.write(decoder.decode(value));
}

// Wait for process to complete
const exitCode = await proc.exited;
console.log(`Process exited with code: ${exitCode}`);
```

### Streaming with Bun.Transpiler

Bun's transpiler can work with streams for processing JavaScript/TypeScript code.

```javascript
// Create a transform stream for transpiling TypeScript
function createTranspileTransform() {
  const transpiler = new Bun.Transpiler({
    loader: "ts",
    target: "browser"
  });
  
  return new TransformStream({
    transform(chunk, controller) {
      const code = new TextDecoder().decode(chunk);
      const result = transpiler.transformSync(code);
      controller.enqueue(new TextEncoder().encode(result));
    }
  });
}

// Example usage
const tsCode = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode(`
      const greet = (name: string): string => {
        return \`Hello, \${name}!\`;
      };
    `));
    controller.close();
  }
});

const jsCode = await new Response(
  tsCode.pipeThrough(createTranspileTransform())
).text();

console.log("Transpiled JS:", jsCode);
```

## Error Handling in Streams

Proper error handling is crucial when working with streams to prevent resource leaks and provide good error messages.

### Handling Read Errors

```javascript
// Robust stream reading with error handling
async function safeStreamRead(stream) {
  const reader = stream.getReader();
  const chunks = [];
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return chunks;
  } catch (error) {
    console.error("Error reading stream:", error.message);
    throw error;
  } finally {
    // Always release the reader lock
    reader.releaseLock();
  }
}
```

### Creating Error-Resilient Pipelines

```javascript
// Pipeline with comprehensive error handling
async function resilientPipeline(source, transforms, destination) {
  let stream = source;
  
  // Apply all transforms
  for (const transform of transforms) {
    stream = stream.pipeThrough(transform);
  }
  
  try {
    await stream.pipeTo(destination);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stage: "pipeline"
    };
  }
}
```

## Best Practices Summary

When working with streams in Bun, following these best practices will help you write efficient and maintainable code:

1. **Always release reader/writer locks**: Call `releaseLock()` when you are done with a reader or writer to allow other consumers to access the stream.

2. **Use async iteration when possible**: The `for await...of` syntax is cleaner and handles cleanup automatically.

3. **Respect backpressure**: Always await write operations and check the `ready` promise on writers to avoid overwhelming slow consumers.

4. **Handle errors at every stage**: Wrap stream operations in try-catch blocks and use the error callbacks in stream constructors.

5. **Close streams properly**: Always call `close()` on controllers and writers when you are done sending data.

6. **Use appropriate chunk sizes**: For file operations, larger chunks (64KB to 1MB) are generally more efficient than very small ones.

7. **Leverage Bun-specific APIs**: Use `Bun.file().stream()` and `Bun.write()` for file operations as they are optimized for performance.

8. **Avoid holding references to chunks**: Process and release chunk data promptly to allow garbage collection.

9. **Use TransformStreams for processing**: They provide a clean way to create reusable data processing components.

10. **Test with large data**: Always test your stream implementations with data larger than memory to ensure they truly stream rather than buffer everything.

## Conclusion

Streams are a fundamental concept for building efficient, scalable applications in Bun. They enable you to process data incrementally, handle large files without exhausting memory, and provide real-time responses to clients.

Bun's implementation of the Web Streams API gives you access to a standardized, powerful interface that works consistently across different JavaScript environments. Combined with Bun-specific optimizations like `Bun.file()`, `Bun.write()`, and `Bun.ArrayBufferSink`, you have all the tools needed to build high-performance streaming applications.

The key to mastering streams is understanding the relationship between ReadableStream, WritableStream, and TransformStream, and knowing when to use each one. ReadableStreams are your data sources, WritableStreams are your destinations, and TransformStreams are the processors in between.

Start with simple use cases like file streaming and HTTP responses, then gradually explore more complex patterns like chained transforms and error-resilient pipelines. With practice, you will find that streams become an indispensable tool in your Bun development toolkit.
