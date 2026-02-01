# How to Handle Streams in Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Streams, Web Streams API, Performance

Description: A comprehensive guide to working with streams in Deno, covering ReadableStream, WritableStream, TransformStream, piping, async iteration, and real-world examples for efficient data processing.

---

Streams are a fundamental concept in modern programming that allow you to process data piece by piece, rather than loading everything into memory at once. Deno, built on modern web standards, provides first-class support for the Web Streams API. This makes working with streams in Deno intuitive, powerful, and memory-efficient.

In this guide, we will explore how to effectively use streams in Deno for various use cases including file processing, HTTP responses, data transformation, and more.

## Understanding the Web Streams API

The Web Streams API is a standard specification that defines interfaces for creating, composing, and consuming streams of data. Deno implements this API natively, which means you can use the same streaming patterns you would use in a browser environment.

There are three main types of streams:

- **ReadableStream**: Represents a source of data that you can read from
- **WritableStream**: Represents a destination where you can write data
- **TransformStream**: Represents a duplex stream that transforms data as it passes through

## Working with ReadableStream

A ReadableStream represents a source of data that can be consumed incrementally. This is incredibly useful when dealing with large files, network responses, or any data source where you do not want to load everything into memory.

Here is how to create a basic ReadableStream that produces numbers:

```typescript
// Create a ReadableStream that yields numbers 1 through 5
// The underlying source object defines how data is produced
const numberStream = new ReadableStream<number>({
  start(controller) {
    // The start method is called once when the stream is created
    for (let i = 1; i <= 5; i++) {
      // Enqueue adds data to the stream's internal queue
      controller.enqueue(i);
    }
    // Close signals that no more data will be added
    controller.close();
  },
});

// Consume the stream using the reader interface
const reader = numberStream.getReader();

// Read values one at a time until the stream is exhausted
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log("Received:", value);
}
```

### Async Iteration with ReadableStream

One of the most elegant ways to consume a ReadableStream in Deno is through async iteration. This approach makes your code more readable and easier to maintain.

Here is how to iterate over a stream using for-await-of:

```typescript
// Create a stream that yields strings asynchronously
const messageStream = new ReadableStream<string>({
  async start(controller) {
    const messages = ["Hello", "World", "From", "Deno", "Streams"];
    
    for (const msg of messages) {
      // Simulate async data arrival with a delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      controller.enqueue(msg);
    }
    controller.close();
  },
});

// Use for-await-of to iterate over the stream
// This is the cleanest way to consume stream data
for await (const message of messageStream) {
  console.log("Message:", message);
}
```

## Working with WritableStream

A WritableStream represents a destination for data. You can use it to write data incrementally, which is perfect for scenarios like writing large files or sending data over a network connection.

Here is an example of creating and using a WritableStream:

```typescript
// Create a WritableStream that logs each chunk it receives
// The underlying sink object defines how data is handled
const logStream = new WritableStream<string>({
  write(chunk) {
    // The write method is called for each chunk of data
    console.log("Writing chunk:", chunk);
  },
  close() {
    // Called when the stream is closed normally
    console.log("Stream closed successfully");
  },
  abort(reason) {
    // Called if the stream is aborted due to an error
    console.error("Stream aborted:", reason);
  },
});

// Get a writer to send data to the stream
const writer = logStream.getWriter();

// Write multiple chunks of data
await writer.write("First chunk");
await writer.write("Second chunk");
await writer.write("Third chunk");

// Close the writer to signal completion
await writer.close();
```

## TransformStream for Data Transformation

TransformStream is a powerful construct that allows you to transform data as it flows from a readable side to a writable side. This is incredibly useful for tasks like data parsing, compression, encryption, or any kind of data manipulation.

Here is an example that transforms text to uppercase:

```typescript
// Create a TransformStream that converts strings to uppercase
// The transformer object defines how each chunk is processed
const uppercaseTransform = new TransformStream<string, string>({
  transform(chunk, controller) {
    // Transform each chunk and enqueue the result
    controller.enqueue(chunk.toUpperCase());
  },
});

// Create a source stream with lowercase text
const sourceStream = new ReadableStream<string>({
  start(controller) {
    const words = ["hello", "deno", "streams"];
    for (const word of words) {
      controller.enqueue(word);
    }
    controller.close();
  },
});

// Pipe the source through the transform
const transformedStream = sourceStream.pipeThrough(uppercaseTransform);

// Consume the transformed output
for await (const chunk of transformedStream) {
  console.log("Transformed:", chunk); // Outputs: HELLO, DENO, STREAMS
}
```

### Chaining Multiple Transforms

You can chain multiple TransformStreams together to create complex data processing pipelines. Each transform in the chain processes the output of the previous one.

Here is an example of a multi-stage transformation pipeline:

```typescript
// Transform that adds a prefix to each chunk
const prefixTransform = new TransformStream<string, string>({
  transform(chunk, controller) {
    controller.enqueue(`[LOG] ${chunk}`);
  },
});

// Transform that adds a timestamp to each chunk
const timestampTransform = new TransformStream<string, string>({
  transform(chunk, controller) {
    const timestamp = new Date().toISOString();
    controller.enqueue(`${timestamp} - ${chunk}`);
  },
});

// Create source data
const logSource = new ReadableStream<string>({
  start(controller) {
    controller.enqueue("Application started");
    controller.enqueue("Processing request");
    controller.enqueue("Request completed");
    controller.close();
  },
});

// Chain transforms together using pipeThrough
// Data flows: source -> prefixTransform -> timestampTransform
const processedLogs = logSource
  .pipeThrough(prefixTransform)
  .pipeThrough(timestampTransform);

// Output the fully processed log entries
for await (const log of processedLogs) {
  console.log(log);
}
```

## Piping Streams Together

The pipeTo and pipeThrough methods provide elegant ways to connect streams together. This is the recommended approach for moving data between streams as it handles backpressure automatically.

Here is an example demonstrating stream piping:

```typescript
// Create a readable source
const dataSource = new ReadableStream<Uint8Array>({
  start(controller) {
    // Simulate binary data chunks
    controller.enqueue(new TextEncoder().encode("Chunk 1\n"));
    controller.enqueue(new TextEncoder().encode("Chunk 2\n"));
    controller.enqueue(new TextEncoder().encode("Chunk 3\n"));
    controller.close();
  },
});

// Create a writable destination that collects all data
const chunks: Uint8Array[] = [];
const dataDestination = new WritableStream<Uint8Array>({
  write(chunk) {
    chunks.push(chunk);
  },
  close() {
    // Combine all chunks and decode the result
    const combined = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    console.log("Received:", new TextDecoder().decode(combined));
  },
});

// Use pipeTo to connect the source to the destination
// This handles backpressure and error propagation automatically
await dataSource.pipeTo(dataDestination);
```

## File Streaming in Deno

One of the most practical uses of streams is reading and writing files efficiently. Deno provides built-in support for file streams that integrate seamlessly with the Web Streams API.

Here is how to read a file as a stream:

```typescript
// Open a file and get a readable stream
// This is memory-efficient for large files
const file = await Deno.open("./large-file.txt", { read: true });

// The readable property gives us a ReadableStream
const fileStream = file.readable;

// Process the file chunk by chunk
let totalBytes = 0;
for await (const chunk of fileStream) {
  totalBytes += chunk.length;
  // Process each chunk without loading the entire file into memory
  console.log(`Read chunk of ${chunk.length} bytes`);
}

console.log(`Total bytes read: ${totalBytes}`);
// Note: file.readable automatically closes the file when exhausted
```

Here is how to write data to a file using streams:

```typescript
// Open a file for writing and get a writable stream
const outputFile = await Deno.open("./output.txt", {
  write: true,
  create: true,
  truncate: true,
});

// Get the writable stream from the file
const fileWriter = outputFile.writable.getWriter();

// Write data in chunks
const encoder = new TextEncoder();
await fileWriter.write(encoder.encode("Line 1\n"));
await fileWriter.write(encoder.encode("Line 2\n"));
await fileWriter.write(encoder.encode("Line 3\n"));

// Close the writer to flush and close the file
await fileWriter.close();
console.log("File written successfully");
```

### Copying Files with Streams

Streams make file copying efficient and straightforward. Here is how to copy a file using stream piping:

```typescript
// Open source file for reading
const sourceFile = await Deno.open("./source.txt", { read: true });

// Open destination file for writing
const destFile = await Deno.open("./destination.txt", {
  write: true,
  create: true,
  truncate: true,
});

// Pipe directly from source to destination
// This is memory-efficient even for very large files
await sourceFile.readable.pipeTo(destFile.writable);

console.log("File copied successfully");
// Both files are automatically closed after piping completes
```

## HTTP Streaming

Streams are essential for handling HTTP requests and responses efficiently. Deno's HTTP server and fetch API both support streaming natively.

Here is an example of streaming an HTTP response:

```typescript
// Create an HTTP server that streams a large response
Deno.serve({ port: 8000 }, (_request) => {
  // Create a stream that generates data over time
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Simulate streaming data over time
      for (let i = 1; i <= 10; i++) {
        // Add a delay to simulate real-time data generation
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const data = `Data chunk ${i}\n`;
        controller.enqueue(encoder.encode(data));
      }
      
      controller.close();
    },
  });

  // Return a streaming response
  // The client will receive data as it becomes available
  return new Response(stream, {
    headers: { "Content-Type": "text/plain" },
  });
});

console.log("Server running at http://localhost:8000");
```

Here is how to consume a streaming HTTP response:

```typescript
// Fetch a resource and process it as a stream
const response = await fetch("https://example.com/large-file");

// Check if the response body exists
if (response.body) {
  let totalBytes = 0;
  
  // Process the response body as a stream
  for await (const chunk of response.body) {
    totalBytes += chunk.length;
    // Process each chunk as it arrives
    // This is efficient for large downloads
    console.log(`Received ${chunk.length} bytes`);
  }
  
  console.log(`Total downloaded: ${totalBytes} bytes`);
}
```

## Understanding Backpressure

Backpressure is a critical concept in stream processing. It occurs when a consumer cannot process data as fast as a producer generates it. The Web Streams API handles backpressure automatically when you use piping methods.

Here is an example demonstrating backpressure handling:

```typescript
// Create a fast producer that generates data quickly
const fastProducer = new ReadableStream<number>({
  async pull(controller) {
    // Pull is called when the consumer is ready for more data
    // This naturally handles backpressure
    const value = Math.random();
    controller.enqueue(value);
    
    // Simulate fast data production
    await new Promise((resolve) => setTimeout(resolve, 10));
  },
});

// Create a slow consumer that processes data slowly
const slowConsumer = new WritableStream<number>({
  async write(chunk) {
    // Simulate slow processing
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log("Processed:", chunk);
  },
});

// When piping, the producer automatically slows down
// to match the consumer's pace
// This prevents memory from building up
await fastProducer.pipeTo(slowConsumer);
```

### Custom Queuing Strategy

You can control backpressure behavior by specifying a custom queuing strategy. This determines how much data can be buffered before backpressure kicks in.

Here is an example with a custom high water mark:

```typescript
// Create a stream with a custom queuing strategy
const customStream = new ReadableStream<Uint8Array>(
  {
    start(controller) {
      // Add data to the stream
      for (let i = 0; i < 100; i++) {
        controller.enqueue(new Uint8Array(1024)); // 1KB chunks
      }
      controller.close();
    },
  },
  // Queuing strategy with custom high water mark
  new ByteLengthQueuingStrategy({
    // Buffer up to 16KB before applying backpressure
    highWaterMark: 16 * 1024,
  })
);
```

## Memory Efficiency with Streams

Streams excel at processing large amounts of data with minimal memory overhead. Instead of loading entire files or datasets into memory, you process data incrementally.

Here is an example that processes a large CSV file efficiently:

```typescript
// Transform stream that parses CSV lines
const csvParser = new TransformStream<string, string[]>({
  transform(line, controller) {
    // Skip empty lines
    if (line.trim()) {
      // Split the line into fields
      const fields = line.split(",").map((field) => field.trim());
      controller.enqueue(fields);
    }
  },
});

// Transform stream that converts text to lines
const lineBreaker = new TransformStream<Uint8Array, string>({
  buffer: "",
  transform(chunk, controller) {
    // Decode the chunk and add to buffer
    const text = new TextDecoder().decode(chunk);
    this.buffer += text;
    
    // Split by newlines and emit complete lines
    const lines = this.buffer.split("\n");
    // Keep the last potentially incomplete line in the buffer
    this.buffer = lines.pop() || "";
    
    for (const line of lines) {
      controller.enqueue(line);
    }
  },
  flush(controller) {
    // Emit any remaining data when stream ends
    if (this.buffer) {
      controller.enqueue(this.buffer);
    }
  },
});

// Process a large CSV file without loading it entirely into memory
async function processLargeCsv(filePath: string): Promise<void> {
  const file = await Deno.open(filePath, { read: true });
  
  // Chain transforms to process the file
  const processedStream = file.readable
    .pipeThrough(lineBreaker)
    .pipeThrough(csvParser);
  
  let rowCount = 0;
  for await (const row of processedStream) {
    rowCount++;
    // Process each row individually
    // Memory usage stays constant regardless of file size
    if (rowCount <= 5) {
      console.log("Row:", row);
    }
  }
  
  console.log(`Processed ${rowCount} rows`);
}
```

## Tee: Splitting a Stream

The tee method allows you to split a ReadableStream into two independent streams. Both streams receive the same data, which is useful when you need to process the same data in multiple ways.

Here is how to use tee:

```typescript
// Create a source stream
const source = new ReadableStream<string>({
  start(controller) {
    controller.enqueue("Data packet 1");
    controller.enqueue("Data packet 2");
    controller.enqueue("Data packet 3");
    controller.close();
  },
});

// Split the stream into two independent streams
const [stream1, stream2] = source.tee();

// Process both streams concurrently
// Each stream receives all the data independently
const [result1, result2] = await Promise.all([
  // First consumer: collect all data
  (async () => {
    const items: string[] = [];
    for await (const item of stream1) {
      items.push(item);
    }
    return items;
  })(),
  // Second consumer: count items
  (async () => {
    let count = 0;
    for await (const _ of stream2) {
      count++;
    }
    return count;
  })(),
]);

console.log("All items:", result1);
console.log("Item count:", result2);
```

## Error Handling in Streams

Proper error handling is essential when working with streams. Errors can occur at any stage of the pipeline and need to be handled appropriately.

Here is how to handle errors in stream pipelines:

```typescript
// Create a stream that may produce errors
const riskyStream = new ReadableStream<number>({
  start(controller) {
    controller.enqueue(1);
    controller.enqueue(2);
    // Simulate an error condition
    controller.error(new Error("Something went wrong!"));
  },
});

// Wrap stream consumption in try-catch
try {
  for await (const value of riskyStream) {
    console.log("Value:", value);
  }
} catch (error) {
  console.error("Stream error:", error.message);
}

// Alternative: Handle errors when piping
const destination = new WritableStream<number>({
  write(chunk) {
    console.log("Writing:", chunk);
  },
});

try {
  await riskyStream.pipeTo(destination);
} catch (error) {
  console.error("Pipeline error:", error.message);
}
```

## Best Practices Summary

Here are the key best practices for working with streams in Deno:

1. **Use streams for large data**: When dealing with files or data larger than available memory, always use streams to process data incrementally.

2. **Prefer pipeTo and pipeThrough**: These methods handle backpressure automatically and provide cleaner error propagation compared to manual reading and writing.

3. **Use async iteration**: The for-await-of syntax provides the cleanest way to consume ReadableStreams when you do not need fine-grained control.

4. **Close streams properly**: Always ensure streams are closed when you are done with them to release resources. Using pipeTo does this automatically.

5. **Handle errors at the pipeline level**: Wrap your entire pipeline in try-catch rather than trying to handle errors at each stage.

6. **Use TransformStreams for data processing**: When you need to modify data as it flows, TransformStream provides a clean abstraction.

7. **Consider backpressure**: Be aware of producer and consumer speed differences. The Streams API handles this automatically with piping, but be careful with manual implementations.

8. **Use tee sparingly**: While tee is useful, remember that it buffers data for the slower consumer, which can increase memory usage.

9. **Leverage built-in streams**: Deno provides streaming interfaces for files, HTTP, and other I/O operations. Use these instead of loading data into memory.

10. **Test with large datasets**: Always test your stream implementations with realistically large data to ensure they handle backpressure and memory constraints correctly.

## Conclusion

Streams are a powerful and essential tool in modern Deno development. The Web Streams API provides a standardized, well-designed interface for handling data that flows over time. Whether you are processing large files, building HTTP servers, or creating data transformation pipelines, understanding streams will help you write more efficient and scalable applications.

The key advantage of streams is their memory efficiency. By processing data incrementally, you can handle datasets much larger than your available memory. Combined with automatic backpressure handling through piping, streams provide a robust foundation for building performant applications.

Deno's native support for the Web Streams API means you can use the same streaming patterns across server-side and client-side code. This consistency makes it easier to learn once and apply everywhere. As you build more complex applications with Deno, mastering streams will become an invaluable skill in your development toolkit.

Start with simple use cases like file streaming and gradually explore more advanced patterns like transform chains and custom backpressure strategies. With practice, working with streams will become second nature, and you will appreciate the elegance and power they bring to data processing in Deno.
