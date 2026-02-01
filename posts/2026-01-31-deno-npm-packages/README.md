# How to Use npm Packages with Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, npm, JavaScript, Package Management

Description: A comprehensive guide to using npm packages in Deno, covering the npm: specifier syntax, import maps, CommonJS compatibility, and practical examples with popular libraries.

---

Deno has evolved significantly since its initial release, and one of the most impactful features introduced is native npm package support. This capability bridges the gap between Deno's secure, modern runtime and the vast ecosystem of npm packages that developers have relied on for years. In this guide, we will explore every aspect of using npm packages in Deno, from basic imports to advanced compatibility techniques.

## Understanding Deno's npm Support

Deno introduced native npm support starting with version 1.28, allowing developers to import and use npm packages directly without any build steps or additional tooling. This feature fundamentally changed how developers could approach Deno projects, making it possible to leverage the millions of packages available on npm while still enjoying Deno's security model and TypeScript-first approach.

The key insight behind Deno's npm support is that it downloads and caches npm packages on demand, similar to how it handles URL imports. Packages are stored in a global cache directory, and Deno automatically resolves dependencies following npm's resolution algorithm.

## The npm: Specifier Syntax

The most straightforward way to use npm packages in Deno is through the `npm:` specifier. This syntax tells Deno to fetch and use a package from the npm registry.

Here is a basic example of importing lodash using the npm: specifier:

```typescript
// Import the entire lodash library from npm
import _ from "npm:lodash@4.17.21";

// Use lodash functions directly
const numbers = [1, 2, 3, 4, 5];
const doubled = _.map(numbers, (n) => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

const chunked = _.chunk(numbers, 2);
console.log(chunked); // [[1, 2], [3, 4], [5]]
```

You can also import specific submodules or use named exports to reduce bundle size:

```typescript
// Import only specific functions from lodash for better tree-shaking
import map from "npm:lodash/map";
import chunk from "npm:lodash/chunk";

const numbers = [1, 2, 3, 4, 5];
console.log(map(numbers, (n) => n * 2));
console.log(chunk(numbers, 2));
```

### Version Specifiers

Deno supports various version specifier formats that follow npm's semver conventions:

```typescript
// Exact version - always uses this specific version
import express from "npm:express@4.18.2";

// Caret range - allows minor and patch updates (^4.18.0 means >=4.18.0 <5.0.0)
import chalk from "npm:chalk@^5.0.0";

// Tilde range - allows only patch updates (~4.18.0 means >=4.18.0 <4.19.0)
import axios from "npm:axios@~1.4.0";

// Latest version - omitting version gets the latest (not recommended for production)
import dayjs from "npm:dayjs";
```

## Using Import Maps for Cleaner Code

Import maps allow you to create aliases for your npm imports, making your code cleaner and easier to maintain. They also centralize version management in a single configuration file.

Create a deno.json file with import mappings for commonly used packages:

```json
{
  "imports": {
    "lodash": "npm:lodash@4.17.21",
    "express": "npm:express@4.18.2",
    "chalk": "npm:chalk@5.3.0",
    "dayjs": "npm:dayjs@1.11.10",
    "zod": "npm:zod@3.22.4",
    "@/utils/": "./src/utils/"
  }
}
```

Now you can import packages using the aliases defined in your import map:

```typescript
// Clean imports using aliases from deno.json
import _ from "lodash";
import express from "express";
import chalk from "chalk";
import dayjs from "dayjs";
import { z } from "zod";

// Your code is now cleaner and version changes happen in one place
const app = express();
console.log(chalk.green("Server starting..."));
console.log(dayjs().format("YYYY-MM-DD HH:mm:ss"));
```

## Node.js Compatibility Mode and node_modules

For projects that require closer Node.js compatibility or have complex dependency trees, Deno supports a node_modules directory mode. This is particularly useful when migrating existing Node.js projects or when some packages have issues with Deno's default resolution.

Enable node_modules mode in your deno.json configuration:

```json
{
  "nodeModulesDir": "auto",
  "imports": {
    "express": "npm:express@4.18.2",
    "prisma": "npm:@prisma/client@5.7.0"
  }
}
```

When nodeModulesDir is set to "auto", Deno creates a local node_modules folder and installs packages there. This improves compatibility with packages that use dynamic requires or file system operations relative to their location.

You can also manually install dependencies using the deno install command:

```bash
# Install all dependencies defined in deno.json
deno install

# This creates a node_modules directory with all packages
```

## Working with Popular npm Packages

### Express.js Web Server

Express remains one of the most popular web frameworks. Here is how to create a simple web server:

```typescript
// A complete Express server example running in Deno
import express, { Request, Response, NextFunction } from "npm:express@4.18.2";
import cors from "npm:cors@2.8.5";

const app = express();
const PORT = 3000;

// Middleware setup
app.use(cors());
app.use(express.json());

// Define a simple route handler
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Deno with Express!" });
});

// Route with parameters
app.get("/users/:id", (req: Request, res: Response) => {
  const userId = req.params.id;
  res.json({ userId, name: `User ${userId}` });
});

// POST route example
app.post("/data", (req: Request, res: Response) => {
  const body = req.body;
  console.log("Received:", body);
  res.status(201).json({ received: body, timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

### Data Validation with Zod

Zod is an excellent TypeScript-first schema validation library that works seamlessly with Deno:

```typescript
// Type-safe validation using Zod in Deno
import { z } from "npm:zod@3.22.4";

// Define a schema for user data
const UserSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional(),
  roles: z.array(z.enum(["admin", "user", "moderator"])).default(["user"]),
  createdAt: z.date().default(() => new Date()),
});

// TypeScript type is automatically inferred from the schema
type User = z.infer<typeof UserSchema>;

// Validate incoming data
function createUser(data: unknown): User {
  // This will throw a ZodError if validation fails
  const validatedUser = UserSchema.parse(data);
  return validatedUser;
}

// Safe parsing that returns a result object instead of throwing
function safeCreateUser(data: unknown) {
  const result = UserSchema.safeParse(data);
  
  if (result.success) {
    console.log("Valid user:", result.data);
    return { success: true, user: result.data };
  } else {
    console.error("Validation errors:", result.error.flatten());
    return { success: false, errors: result.error.flatten() };
  }
}

// Example usage
const validData = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  roles: ["admin", "user"],
};

const invalidData = {
  id: -1,
  name: "J",
  email: "not-an-email",
};

console.log(safeCreateUser(validData));
console.log(safeCreateUser(invalidData));
```

### Working with Axios for HTTP Requests

Axios provides a familiar API for making HTTP requests:

```typescript
// Making HTTP requests with Axios in Deno
import axios from "npm:axios@1.6.2";

// Simple GET request
async function fetchUsers() {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/users");
    console.log("Users:", response.data.slice(0, 3));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.message);
    }
  }
}

// POST request with configuration
async function createPost() {
  const response = await axios.post(
    "https://jsonplaceholder.typicode.com/posts",
    {
      title: "My Post",
      body: "Post content here",
      userId: 1,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 5000,
    }
  );
  return response.data;
}

// Create a configured axios instance for reuse
const apiClient = axios.create({
  baseURL: "https://api.example.com",
  timeout: 10000,
  headers: {
    "Authorization": "Bearer your-token-here",
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use((config) => {
  console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
  return config;
});

await fetchUsers();
```

## Handling CommonJS Modules

While Deno natively uses ES modules, many npm packages are still written in CommonJS format. Deno automatically handles the conversion in most cases, but some packages may require special attention.

Here is how Deno handles various CommonJS patterns:

```typescript
// Most CommonJS packages work automatically with default imports
import chalk from "npm:chalk@4.1.2"; // CommonJS version of chalk

// Some packages export their API differently
// Method 1: Default import (works for most packages)
import lodash from "npm:lodash@4.17.21";
console.log(lodash.VERSION);

// Method 2: Namespace import (useful when default export is not available)
import * as path from "npm:path-browserify@1.0.1";
console.log(path.join("a", "b", "c"));

// Method 3: Named imports (when the package supports it)
import { format, parse } from "npm:date-fns@2.30.0";
console.log(format(new Date(), "yyyy-MM-dd"));
```

For packages that have issues with automatic CommonJS conversion, you can use the node: specifier for Node.js built-in modules:

```typescript
// Using Node.js built-in modules with the node: specifier
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";

// Example: Reading a file using Node.js fs module
async function readConfig() {
  const configPath = join(Deno.cwd(), "config.json");
  const content = await readFile(configPath, "utf-8");
  return JSON.parse(content);
}

// Example: Using EventEmitter
class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter();

emitter.on("event", (data) => {
  console.log("Event received:", data);
});

emitter.emit("event", { message: "Hello!" });
```

## TypeScript Types and Type Definitions

Deno's TypeScript integration works well with npm packages that include their own type definitions. For packages without bundled types, you can use the @types packages.

Here is how to work with TypeScript types from npm packages:

```typescript
// Packages with bundled types work automatically
import { z } from "npm:zod@3.22.4";
// Full type inference available!
const schema = z.object({ name: z.string() });
type MyType = z.infer<typeof schema>; // { name: string }

// For packages without bundled types, import @types separately
// The types are used for development but not included in runtime
import express from "npm:express@4.18.2";
import type { Request, Response, Application } from "npm:@types/express@4.17.21";

const app: Application = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Typed response!");
});
```

You can also create ambient type declarations for packages without available types:

```typescript
// Create a file called types.d.ts in your project
// This declares types for a package that lacks type definitions

declare module "npm:some-untyped-package" {
  export function doSomething(input: string): Promise<string>;
  export interface Config {
    timeout: number;
    retries: number;
  }
  export function configure(config: Config): void;
}
```

## Compatibility Layers and Polyfills

Some npm packages rely on Node.js-specific APIs that may not be available in Deno. For these cases, Deno provides compatibility layers through its standard library.

Using Node.js compatibility features from Deno's standard library:

```typescript
// Deno provides Node.js compatibility through the node: specifier
import process from "node:process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

// Access environment variables like in Node.js
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Platform:", process.platform);

// Use Buffer for binary data
const buf = Buffer.from("Hello, World!", "utf-8");
console.log("Buffer:", buf.toString("hex"));

// Crypto operations
const hash = createHash("sha256");
hash.update("secret data");
console.log("Hash:", hash.digest("hex"));
```

For packages that check for specific Node.js globals, you may need to ensure they are available:

```typescript
// Some packages check for global.process or similar
// Deno typically handles this automatically, but you can manually set globals if needed

import process from "node:process";
import { Buffer } from "node:buffer";

// These are usually already available, but can be explicitly set
globalThis.process = process;
globalThis.Buffer = Buffer;

// Now packages that rely on global.process will work
import somePackage from "npm:some-legacy-package";
```

## Real-World Example: Building a REST API

Let us combine multiple npm packages to build a practical REST API with validation, database connectivity, and proper error handling:

```typescript
// A complete REST API example using npm packages in Deno
import express, { Request, Response, NextFunction } from "npm:express@4.18.2";
import { z } from "npm:zod@3.22.4";
import { v4 as uuidv4 } from "npm:uuid@9.0.0";
import cors from "npm:cors@2.8.5";

// Define schemas for validation
const CreateTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  completed: z.boolean().default(false),
});

const UpdateTodoSchema = CreateTodoSchema.partial();

// Type definitions
type Todo = z.infer<typeof CreateTodoSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

// In-memory storage (replace with database in production)
const todos: Map<string, Todo> = new Map();

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());

// Validation middleware factory
function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
}

// Routes
app.get("/api/todos", (_req: Request, res: Response) => {
  const allTodos = Array.from(todos.values());
  res.json({ data: allTodos, count: allTodos.length });
});

app.get("/api/todos/:id", (req: Request, res: Response) => {
  const todo = todos.get(req.params.id);
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }
  res.json({ data: todo });
});

app.post("/api/todos", validate(CreateTodoSchema), (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const todo: Todo = {
    id: uuidv4(),
    ...req.body,
    createdAt: now,
    updatedAt: now,
  };
  todos.set(todo.id, todo);
  res.status(201).json({ data: todo });
});

app.patch("/api/todos/:id", validate(UpdateTodoSchema), (req: Request, res: Response) => {
  const existing = todos.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Todo not found" });
  }
  const updated: Todo = {
    ...existing,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  todos.set(req.params.id, updated);
  res.json({ data: updated });
});

app.delete("/api/todos/:id", (req: Request, res: Response) => {
  if (!todos.has(req.params.id)) {
    return res.status(404).json({ error: "Todo not found" });
  }
  todos.delete(req.params.id);
  res.status(204).send();
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = parseInt(Deno.env.get("PORT") || "3000");
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
```

## Troubleshooting Common Issues

### Package Not Found Errors

When a package fails to resolve, check the following:

```typescript
// Problem: Package not found or version mismatch
// Solution 1: Verify the package name and version on npmjs.com

// Correct
import lodash from "npm:lodash@4.17.21";

// Incorrect (package name typo)
// import lodash from "npm:loadash@4.17.21"; // This will fail

// Solution 2: Clear the cache if you suspect corruption
// Run in terminal: deno cache --reload your_script.ts
```

### Permission Errors

Deno's security model requires explicit permissions. Here are common permission flags:

```typescript
// If your npm package needs network access:
// Run with: deno run --allow-net script.ts

// If it needs file system access:
// Run with: deno run --allow-read --allow-write script.ts

// If it needs environment variables:
// Run with: deno run --allow-env script.ts

// For development, you can use --allow-all (not recommended for production):
// deno run --allow-all script.ts
```

### Native Module Errors

Some npm packages include native modules that may not work in Deno:

```typescript
// Packages with native bindings (like bcrypt) may need alternatives
// Instead of: import bcrypt from "npm:bcrypt";

// Use a pure JavaScript alternative:
import * as bcrypt from "npm:bcryptjs@2.4.3";

const hash = await bcrypt.hash("password", 10);
const isValid = await bcrypt.compare("password", hash);
console.log("Password valid:", isValid);
```

### Import Resolution Issues

When imports are not resolving correctly, check your import map configuration:

```json
{
  "imports": {
    "lodash": "npm:lodash@4.17.21",
    "lodash/": "npm:lodash@4.17.21/"
  },
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

## Best Practices Summary

Following these guidelines will help you successfully integrate npm packages into your Deno projects:

1. **Use Import Maps**: Centralize your dependencies in deno.json to maintain consistent versions across your project and enable cleaner import statements.

2. **Pin Versions**: Always specify exact versions for production code to ensure reproducible builds. Use caret (^) or tilde (~) ranges only during development.

3. **Prefer Native Deno APIs**: When a Deno standard library module provides similar functionality to an npm package, prefer the native solution for better performance and security.

4. **Check Compatibility**: Before adopting an npm package, verify it works with Deno. Packages that rely heavily on Node.js-specific APIs may require workarounds.

5. **Use TypeScript Types**: Take advantage of type definitions to catch errors early. Import @types packages when the main package lacks bundled types.

6. **Handle Permissions Carefully**: Grant only the minimum permissions required by your application. Audit npm packages for their permission requirements.

7. **Test Thoroughly**: Some packages behave differently in Deno than in Node.js. Write tests to verify expected behavior.

8. **Keep Dependencies Updated**: Regularly update your npm dependencies to receive security patches and bug fixes.

9. **Use node_modules Mode When Needed**: For complex projects or packages with compatibility issues, enable nodeModulesDir in your configuration.

10. **Document Workarounds**: When you encounter and solve compatibility issues, document them for your team and consider contributing fixes upstream.

## Conclusion

Deno's npm compatibility has matured significantly, making it a viable choice for projects that need access to the npm ecosystem while benefiting from Deno's modern runtime features. The npm: specifier syntax provides a straightforward way to import packages, while import maps offer centralized dependency management. Combined with Deno's built-in TypeScript support, security model, and standard tooling, you can build robust applications that leverage the best of both worlds.

Whether you are migrating an existing Node.js project or starting fresh, the techniques covered in this guide will help you navigate the integration process. Start with simple imports, gradually adopt import maps for larger projects, and use the node_modules compatibility mode when needed for complex dependency trees.

The ability to mix Deno's native APIs with npm packages gives you unprecedented flexibility in choosing the right tool for each task. As the ecosystem continues to evolve, expect even better compatibility and performance improvements in future Deno releases.

Happy coding with Deno and npm!
