# How to Get Started with Bun Runtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, JavaScript, TypeScript, Runtime

Description: A comprehensive guide to getting started with Bun, the fast all-in-one JavaScript runtime that includes a bundler, transpiler, and package manager.

---

Bun has taken the JavaScript ecosystem by storm, offering a blazing-fast alternative to Node.js and Deno. Built from the ground up using Zig and leveraging JavaScriptCore (the engine behind Safari), Bun promises significantly faster startup times, better performance, and a more streamlined developer experience. In this comprehensive guide, we will explore everything you need to know to get started with Bun and integrate it into your development workflow.

## What is Bun?

Bun is an all-in-one JavaScript runtime designed for speed and developer experience. Unlike Node.js, which relies on V8 and requires separate tools for bundling, transpiling, and package management, Bun provides all of these features out of the box. It is designed to be a drop-in replacement for Node.js while offering substantial performance improvements.

Key features of Bun include:

- Native TypeScript and JSX support without configuration
- Built-in bundler that rivals esbuild and webpack
- Ultra-fast package manager compatible with npm
- Hot reloading with `bun --watch`
- Built-in test runner
- Web-standard APIs (fetch, WebSocket, etc.)

## Installing Bun

Getting Bun installed on your system is straightforward. Bun supports macOS, Linux, and Windows (via WSL).

The recommended way to install Bun is using the official installation script:

```bash
curl -fsSL https://bun.sh/install | bash
```

If you prefer using Homebrew on macOS:

```bash
brew install oven-sh/bun/bun
```

For npm users who want to try Bun alongside their existing Node.js setup:

```bash
npm install -g bun
```

After installation, verify that Bun is correctly installed by checking the version:

```bash
bun --version
```

You should see output showing the installed version number (e.g., `1.1.0` or higher).

## Creating Your First Bun Project

Let us create a new project from scratch to understand the Bun workflow.

Initialize a new Bun project with the following command:

```bash
mkdir my-bun-app
cd my-bun-app
bun init
```

This command creates a basic project structure with the following files:

- `package.json` - Project configuration and dependencies
- `tsconfig.json` - TypeScript configuration (Bun uses TypeScript by default)
- `index.ts` - Entry point for your application
- `.gitignore` - Git ignore rules
- `README.md` - Project documentation

Here is what a typical `package.json` looks like after initialization:

```json
{
  "name": "my-bun-app",
  "module": "index.ts",
  "type": "module",
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## Running JavaScript and TypeScript Files

One of Bun's most powerful features is its ability to run TypeScript files directly without any compilation step.

Create a simple TypeScript file to test this capability:

```typescript
// index.ts
// Define a typed interface for our data
interface User {
  id: number;
  name: string;
  email: string;
}

// Create a sample user object
const user: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com"
};

// Log the user information
console.log(`User: ${user.name} (${user.email})`);

// Demonstrate async/await with a simple delay function
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Main async function
async function main(): Promise<void> {
  console.log("Starting application...");
  await delay(1000);
  console.log("Application ready!");
}

// Execute the main function
main();
```

Run the file directly with Bun:

```bash
bun run index.ts
```

Notice that there is no need for `ts-node`, `tsc`, or any TypeScript compilation step. Bun handles everything internally.

## Fast Package Management

Bun includes a package manager that is significantly faster than npm, yarn, or pnpm. It uses a global module cache and hardlinks to minimize disk usage and installation time.

Install a package using Bun's package manager:

```bash
# Install a single package
bun add express

# Install a dev dependency
bun add -d @types/express

# Install multiple packages at once
bun add lodash axios dayjs

# Remove a package
bun remove lodash
```

Here is an example of using installed packages in your application:

```typescript
// server.ts
// Import Express framework for building web servers
import express, { Request, Response } from "express";

// Create an Express application instance
const app = express();

// Define the port number for the server
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Define a simple GET endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Hello from Bun!",
    runtime: "Bun",
    timestamp: new Date().toISOString()
  });
});

// Define a POST endpoint that echoes data back
app.post("/echo", (req: Request, res: Response) => {
  res.json({
    received: req.body,
    processedAt: new Date().toISOString()
  });
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

Run the server with:

```bash
bun run server.ts
```

## Native TypeScript and JSX Support

Bun transpiles TypeScript and JSX natively without requiring Babel or additional configuration. This makes it ideal for React and other JSX-based projects.

Create a React component file to demonstrate JSX support:

```tsx
// components/Greeting.tsx
// Define props interface for type safety
interface GreetingProps {
  name: string;
  showTime?: boolean;
}

// Functional component with TypeScript props
export function Greeting({ name, showTime = false }: GreetingProps) {
  // Get current time if needed
  const currentTime = new Date().toLocaleTimeString();
  
  return (
    <div className="greeting">
      <h1>Hello, {name}!</h1>
      {showTime && <p>Current time: {currentTime}</p>}
    </div>
  );
}

// Default export for easier imports
export default Greeting;
```

Bun also supports JSX in `.js` files if you configure the `jsxImportSource` in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  }
}
```

## Built-in Bundler

Bun includes a powerful bundler that can replace tools like webpack, Rollup, or esbuild. It supports code splitting, tree shaking, and various output formats.

Bundle your application for production with a single command:

```bash
bun build ./index.ts --outdir ./dist
```

For more complex bundling scenarios, create a build script:

```typescript
// build.ts
// Import Bun's build function for programmatic bundling
const result = await Bun.build({
  // Entry points for the bundle
  entrypoints: ["./src/index.ts"],
  
  // Output directory for bundled files
  outdir: "./dist",
  
  // Enable minification for production
  minify: true,
  
  // Generate source maps for debugging
  sourcemap: "external",
  
  // Target environment
  target: "browser",
  
  // Split code into separate chunks
  splitting: true,
  
  // Define environment variables
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  }
});

// Check for build errors
if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Log successful build information
console.log("Build successful!");
console.log(`Generated ${result.outputs.length} files:`);
for (const output of result.outputs) {
  console.log(`  - ${output.path}`);
}
```

Run the build script:

```bash
bun run build.ts
```

## Built-in HTTP Server

Bun provides a native HTTP server that is much faster than Node.js's `http` module.

Create a high-performance server using Bun's native APIs:

```typescript
// native-server.ts
// Define the server configuration and request handler
const server = Bun.serve({
  // Port to listen on
  port: 3000,
  
  // Request handler function
  fetch(request: Request): Response {
    // Parse the URL to determine the route
    const url = new URL(request.url);
    
    // Route handling based on pathname
    if (url.pathname === "/") {
      return new Response("Welcome to Bun!", {
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    if (url.pathname === "/json") {
      return Response.json({
        message: "Hello from Bun's native server!",
        timestamp: Date.now()
      });
    }
    
    if (url.pathname === "/html") {
      return new Response("<h1>Hello, Bun!</h1>", {
        headers: { "Content-Type": "text/html" }
      });
    }
    
    // Return 404 for unknown routes
    return new Response("Not Found", { status: 404 });
  },
  
  // Error handler for unhandled errors
  error(error: Error): Response {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

// Log server information
console.log(`Bun server running at http://localhost:${server.port}`);
```

## File System Operations

Bun provides convenient APIs for file system operations that are simpler than Node.js's `fs` module.

Here are common file operations using Bun's native APIs:

```typescript
// file-operations.ts
// Reading a file as text
const textContent = await Bun.file("./data.txt").text();
console.log("File content:", textContent);

// Reading a file as JSON
const jsonData = await Bun.file("./config.json").json();
console.log("Config:", jsonData);

// Writing text to a file
await Bun.write("./output.txt", "Hello from Bun!");

// Writing JSON to a file
await Bun.write(
  "./output.json",
  JSON.stringify({ name: "Bun", version: "1.0" }, null, 2)
);

// Check if a file exists
const file = Bun.file("./data.txt");
const exists = await file.exists();
console.log("File exists:", exists);

// Get file size
const size = file.size;
console.log("File size:", size, "bytes");

// Read file as ArrayBuffer for binary data
const buffer = await Bun.file("./image.png").arrayBuffer();
console.log("Binary data length:", buffer.byteLength);
```

## Comparison with Node.js and Deno

Understanding how Bun compares to other JavaScript runtimes helps you make informed decisions about when to use each.

| Feature | Bun | Node.js | Deno |
|---------|-----|---------|------|
| TypeScript Support | Native | Requires transpilation | Native |
| Package Manager | Built-in (npm compatible) | npm/yarn/pnpm | Built-in (npm compatible) |
| Bundler | Built-in | External (webpack, etc.) | Built-in |
| Startup Time | ~25ms | ~100ms | ~50ms |
| Web APIs | Native | External packages | Native |
| npm Compatibility | High | Full | Good |
| Maturity | Growing | Stable | Stable |

Here is a code comparison showing the same HTTP server in all three runtimes:

```typescript
// Bun native server
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello World!");
  }
});

// Node.js equivalent
import { createServer } from "http";
createServer((req, res) => {
  res.end("Hello World!");
}).listen(3000);

// Deno equivalent
Deno.serve({ port: 3000 }, () => {
  return new Response("Hello World!");
});
```

## Using Bun's Test Runner

Bun includes a built-in test runner that is compatible with Jest syntax.

Create a test file to demonstrate the testing capabilities:

```typescript
// math.test.ts
// Import test utilities from Bun
import { expect, test, describe, beforeAll, afterAll } from "bun:test";

// Import the module to test
import { add, multiply, divide } from "./math";

// Group related tests together
describe("Math operations", () => {
  // Test addition function
  test("add should correctly sum two numbers", () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });
  
  // Test multiplication function
  test("multiply should correctly multiply two numbers", () => {
    expect(multiply(3, 4)).toBe(12);
    expect(multiply(-2, 3)).toBe(-6);
    expect(multiply(0, 100)).toBe(0);
  });
  
  // Test division function with error handling
  test("divide should handle division correctly", () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(7, 2)).toBe(3.5);
  });
  
  // Test error cases
  test("divide should throw on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });
});

// Async test example
test("async operations work correctly", async () => {
  const result = await Promise.resolve(42);
  expect(result).toBe(42);
});
```

Run your tests with:

```bash
bun test
```

For watch mode during development:

```bash
bun test --watch
```

## Environment Variables

Bun automatically loads environment variables from `.env` files without requiring additional packages.

Create a `.env` file with your configuration:

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your-secret-api-key
NODE_ENV=development
PORT=3000
```

Access environment variables in your code:

```typescript
// config.ts
// Access environment variables directly through Bun.env or process.env
const config = {
  databaseUrl: Bun.env.DATABASE_URL || "sqlite://local.db",
  apiKey: Bun.env.API_KEY,
  nodeEnv: Bun.env.NODE_ENV || "development",
  port: parseInt(Bun.env.PORT || "3000", 10)
};

// Validate required environment variables
function validateConfig(): void {
  if (!config.apiKey) {
    throw new Error("API_KEY environment variable is required");
  }
  
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
}

// Export validated configuration
export { config, validateConfig };
```

## Hot Reloading with Watch Mode

Bun supports hot reloading out of the box, making development faster and more efficient.

Run your application with watch mode enabled:

```bash
bun --watch run index.ts
```

For HTTP servers, Bun can preserve the server state during hot reloads:

```bash
bun --hot run server.ts
```

The difference between `--watch` and `--hot`:

- `--watch` restarts the entire process when files change
- `--hot` reloads modules in place without restarting (faster, but requires stateless design)

## Best Practices Summary

Based on our exploration of Bun, here are the recommended best practices:

1. **Use native Bun APIs when possible**: Bun's native `Bun.serve()`, `Bun.file()`, and `Bun.write()` are more performant than Node.js equivalents.

2. **Leverage TypeScript by default**: Since Bun runs TypeScript natively, use it for better code quality and developer experience.

3. **Use the built-in bundler**: For production builds, use `bun build` instead of adding webpack or other bundlers.

4. **Prefer `bun --watch` during development**: This speeds up your development cycle significantly.

5. **Use environment files**: Bun loads `.env` files automatically, so use them for configuration.

6. **Write tests with `bun:test`**: Use the built-in test runner for faster test execution.

7. **Lock dependencies with `bun.lockb`**: Commit the lockfile to ensure reproducible builds.

8. **Use `Bun.env` over `process.env`**: While both work, `Bun.env` is typed and more explicit.

9. **Check compatibility before migration**: While Bun has high npm compatibility, test your dependencies before migrating production applications.

10. **Use `bunx` for one-off commands**: Similar to `npx`, use `bunx` to run packages without installing them globally.

## Conclusion

Bun represents a significant evolution in the JavaScript runtime ecosystem. Its focus on performance, developer experience, and all-in-one tooling makes it an attractive choice for new projects and teams looking to simplify their build pipeline.

The key advantages of Bun include its native TypeScript support, blazing-fast package installation, built-in bundler, and significantly improved startup times compared to Node.js. While it is still maturing, Bun has reached a level of stability that makes it suitable for many production use cases.

For developers starting new projects, Bun offers a streamlined experience that eliminates the need for multiple tools. For existing Node.js projects, Bun can serve as a faster test runner and package manager, with full migration possible as your comfort level grows.

We recommend starting with Bun for side projects or new internal tools to gain familiarity with its APIs and tooling. As you become more comfortable, you can gradually adopt it for larger projects. The JavaScript ecosystem continues to evolve, and Bun is leading the charge toward faster, more efficient development workflows.

Give Bun a try in your next project and experience the speed difference for yourself!
