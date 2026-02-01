# How to Use TypeScript with Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, TypeScript, JavaScript, Type Safety

Description: A comprehensive guide to using TypeScript with Bun runtime, covering zero-config setup, tsconfig options, type checking, decorators, path aliases, and best practices.

---

Bun has emerged as one of the fastest JavaScript runtimes available, and one of its most compelling features is first-class TypeScript support. Unlike Node.js, which requires transpilation steps or additional tooling, Bun runs TypeScript files directly out of the box. This guide will walk you through everything you need to know about using TypeScript effectively with Bun.

## Why Bun for TypeScript?

Before diving into the technical details, let's understand why Bun stands out for TypeScript development:

- **Zero Configuration**: Bun executes `.ts` and `.tsx` files directly without any build step
- **Built-in Transpiler**: Uses a native transpiler written in Zig, making it extremely fast
- **Seamless Integration**: TypeScript works identically to JavaScript in Bun's ecosystem
- **Native JSX Support**: TSX files work out of the box without additional configuration

## Zero-Config TypeScript

The most significant advantage of using Bun with TypeScript is that it requires no configuration to get started. You can create a TypeScript file and run it immediately.

Create a simple TypeScript file to verify everything works:

```typescript
// hello.ts
interface User {
  name: string;
  email: string;
  age: number;
}

function greetUser(user: User): string {
  return `Hello, ${user.name}! You are ${user.age} years old.`;
}

const user: User = {
  name: "Alice",
  email: "alice@example.com",
  age: 30
};

console.log(greetUser(user));
```

Run this file directly with Bun:

```bash
bun run hello.ts
```

That's it. No `tsc` compilation, no `ts-node`, no configuration files. Bun handles everything automatically.

## Understanding Bun's TypeScript Transpiler

Bun uses its own transpiler to convert TypeScript to JavaScript at runtime. This transpiler is optimized for speed rather than full type checking. Here's what you need to understand:

The transpiler strips type annotations and converts TypeScript syntax to JavaScript. It does not perform type checking during execution:

```typescript
// This will run without errors in Bun, even though there's a type mismatch
// types.ts
function add(a: number, b: number): number {
  return a + b;
}

// Type error: argument of type string is not assignable to number
// But Bun will still execute this
const result = add("hello" as any, "world" as any);
console.log(result); // Output: "helloworld"
```

This behavior is intentional for performance reasons. Type checking happens separately, which we'll cover in the next section.

## Type Checking with Bun

While Bun's transpiler doesn't perform type checking, you should still verify your types during development. Bun provides a built-in way to run the TypeScript compiler for type checking.

Use Bun's integrated type checker to validate your code:

```bash
# Check types without emitting files
bun --bun tsc --noEmit

# Or use the shorthand
bunx tsc --noEmit
```

For a complete development workflow, you might want to set up a script in your `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts"
  }
}
```

## Configuring tsconfig.json

Although Bun works without configuration, you'll want a `tsconfig.json` for proper IDE support and type checking. Bun supports most TypeScript compiler options.

Here's a recommended tsconfig.json configuration for Bun projects:

```json
{
  "compilerOptions": {
    // Target and module settings optimized for Bun
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    
    // Enable strict type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Additional checks for code quality
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    
    // Enable decorators
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    
    // JSX support
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    
    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    },
    
    // Output settings (for type checking only)
    "noEmit": true,
    "skipLibCheck": true,
    
    // Bun-specific types
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Install Bun's type definitions to get proper autocomplete and type checking for Bun-specific APIs:

```bash
bun add -d bun-types
```

## Strict Mode Configuration

Strict mode in TypeScript catches many common programming errors at compile time. Let's explore each strict option and why it matters.

This example demonstrates the benefits of strict null checks:

```typescript
// strict-examples.ts

// strictNullChecks: Prevents null/undefined errors
interface Config {
  apiUrl: string;
  timeout?: number;
}

function getTimeout(config: Config): number {
  // Error without strictNullChecks handling
  // return config.timeout; // Type 'number | undefined' is not assignable to type 'number'
  
  // Correct approach with strict null checks
  return config.timeout ?? 5000;
}

// noImplicitAny: Forces explicit type declarations
function processData(data: unknown): string {
  // Must narrow the type before using
  if (typeof data === "string") {
    return data.toUpperCase();
  }
  if (typeof data === "number") {
    return data.toString();
  }
  return String(data);
}

// strictPropertyInitialization: Ensures class properties are initialized
class UserService {
  private apiClient: ApiClient;
  private cache: Map<string, User>;
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.cache = new Map();
  }
}

interface ApiClient {
  get(url: string): Promise<unknown>;
}

interface User {
  id: string;
  name: string;
}
```

## Working with Decorators

Bun fully supports TypeScript decorators, which are useful for metaprogramming patterns common in frameworks. You need to enable them in your tsconfig.json.

Here's a practical example using decorators for logging and validation:

```typescript
// decorators.ts

// Method decorator for logging
function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    console.log(`[LOG] Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`[LOG] ${propertyKey} returned:`, result);
    return result;
  };
  
  return descriptor;
}

// Property decorator for validation
function MinLength(length: number) {
  return function (target: any, propertyKey: string) {
    let value: string;
    
    const getter = () => value;
    const setter = (newVal: string) => {
      if (newVal.length < length) {
        throw new Error(`${propertyKey} must be at least ${length} characters`);
      }
      value = newVal;
    };
    
    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true
    });
  };
}

// Class decorator for timing all methods
function TimeAll<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      
      const prototype = Object.getPrototypeOf(this);
      const methodNames = Object.getOwnPropertyNames(prototype)
        .filter(name => name !== "constructor" && typeof prototype[name] === "function");
      
      for (const methodName of methodNames) {
        const originalMethod = prototype[methodName];
        (this as any)[methodName] = function (...args: any[]) {
          const start = performance.now();
          const result = originalMethod.apply(this, args);
          const end = performance.now();
          console.log(`[TIME] ${methodName} took ${(end - start).toFixed(2)}ms`);
          return result;
        };
      }
    }
  };
}

// Using the decorators
@TimeAll
class Calculator {
  @Log
  add(a: number, b: number): number {
    return a + b;
  }
  
  @Log
  multiply(a: number, b: number): number {
    return a * b;
  }
}

class User {
  @MinLength(3)
  name!: string;
  
  @MinLength(8)
  password!: string;
}

// Test the decorators
const calc = new Calculator();
calc.add(5, 3);
calc.multiply(4, 7);

const user = new User();
user.name = "Alice"; // Works
// user.password = "short"; // Throws error: password must be at least 8 characters
user.password = "securepassword123"; // Works
```

## Path Aliases for Clean Imports

Path aliases make your imports cleaner and your codebase more maintainable. Configure them in tsconfig.json and Bun will resolve them automatically.

Set up a typical path alias configuration for a project:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@config": ["src/config/index.ts"]
    }
  }
}
```

Now you can use clean imports throughout your project:

```typescript
// src/services/user-service.ts
import { User } from "@types/user";
import { validateEmail } from "@utils/validation";
import { config } from "@config";
import { ApiClient } from "@services/api-client";

export class UserService {
  private apiClient: ApiClient;
  
  constructor() {
    this.apiClient = new ApiClient(config.apiUrl);
  }
  
  async createUser(email: string, name: string): Promise<User> {
    if (!validateEmail(email)) {
      throw new Error("Invalid email format");
    }
    
    const response = await this.apiClient.post("/users", { email, name });
    return response as User;
  }
}
```

The corresponding type definition file:

```typescript
// src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
}
```

## Mixed JavaScript and TypeScript Projects

Bun handles mixed JavaScript and TypeScript projects seamlessly. This is useful when gradually migrating a JavaScript codebase to TypeScript.

Configure your tsconfig.json to allow JavaScript files:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

You can import JavaScript modules in TypeScript files and vice versa:

```javascript
// src/legacy/math.js
// This is a legacy JavaScript file

/**
 * Adds two numbers together
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum
 */
export function add(a, b) {
  return a + b;
}

/**
 * @typedef {Object} Point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * Calculates distance between two points
 * @param {Point} p1 - First point
 * @param {Point} p2 - Second point
 * @returns {number} Distance between points
 */
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
```

```typescript
// src/main.ts
// TypeScript file importing from JavaScript module

import { add, distance } from "./legacy/math.js";

// TypeScript understands the JSDoc types
const sum = add(5, 3);
console.log(`Sum: ${sum}`);

const point1 = { x: 0, y: 0 };
const point2 = { x: 3, y: 4 };
const dist = distance(point1, point2);
console.log(`Distance: ${dist}`); // Output: 5
```

## JSX and TSX Support

Bun provides native support for JSX and TSX files, making it excellent for React or other JSX-based frameworks.

Configure JSX in your tsconfig.json based on your framework:

```json
{
  "compilerOptions": {
    // For React 17+ with automatic JSX runtime
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    
    // For Preact
    // "jsx": "react-jsx",
    // "jsxImportSource": "preact",
    
    // For classic React (pre-17)
    // "jsx": "react",
    // "jsxFactory": "React.createElement",
    // "jsxFragmentFactory": "React.Fragment"
  }
}
```

Create a simple React component with TypeScript:

```tsx
// src/components/UserCard.tsx
import { useState, useCallback } from "react";

interface UserCardProps {
  name: string;
  email: string;
  avatarUrl?: string;
  onDelete?: (email: string) => void;
}

interface UserStats {
  posts: number;
  followers: number;
  following: number;
}

export function UserCard({ name, email, avatarUrl, onDelete }: UserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(email);
    }
  }, [email, onDelete]);
  
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${email}/stats`);
      const data = await response.json() as UserStats;
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, [email]);
  
  return (
    <div className="user-card">
      <div className="user-card-header">
        {avatarUrl && (
          <img src={avatarUrl} alt={`${name}'s avatar`} className="avatar" />
        )}
        <div className="user-info">
          <h3>{name}</h3>
          <p>{email}</p>
        </div>
        <button onClick={handleToggle}>
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>
      
      {isExpanded && (
        <div className="user-card-details">
          <button onClick={fetchStats} disabled={loading}>
            {loading ? "Loading..." : "Load Stats"}
          </button>
          
          {stats && (
            <div className="stats">
              <span>Posts: {stats.posts}</span>
              <span>Followers: {stats.followers}</span>
              <span>Following: {stats.following}</span>
            </div>
          )}
          
          {onDelete && (
            <button onClick={handleDelete} className="delete-btn">
              Delete User
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

## Using Bun APIs with TypeScript

Bun provides many built-in APIs that are fully typed when you install `bun-types`. Here are examples of common Bun-specific features.

Working with Bun's file system API:

```typescript
// src/file-operations.ts
import { file, write } from "bun";

interface UserData {
  id: string;
  name: string;
  preferences: {
    theme: "light" | "dark";
    notifications: boolean;
  };
}

async function saveUserData(userData: UserData): Promise<void> {
  const filePath = `./data/users/${userData.id}.json`;
  const content = JSON.stringify(userData, null, 2);
  
  await write(filePath, content);
  console.log(`Saved user data to ${filePath}`);
}

async function loadUserData(userId: string): Promise<UserData | null> {
  const filePath = `./data/users/${userId}.json`;
  const bunFile = file(filePath);
  
  if (!(await bunFile.exists())) {
    return null;
  }
  
  const content = await bunFile.text();
  return JSON.parse(content) as UserData;
}

// Using Bun's built-in SQLite
import { Database } from "bun:sqlite";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

class TodoRepository {
  private db: Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }
  
  private initialize(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  create(title: string): Todo {
    const stmt = this.db.prepare(
      "INSERT INTO todos (title) VALUES (?) RETURNING *"
    );
    const result = stmt.get(title) as any;
    
    return {
      id: result.id,
      title: result.title,
      completed: Boolean(result.completed),
      createdAt: result.created_at
    };
  }
  
  findAll(): Todo[] {
    const stmt = this.db.prepare("SELECT * FROM todos ORDER BY created_at DESC");
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      completed: Boolean(row.completed),
      createdAt: row.created_at
    }));
  }
  
  markComplete(id: number): void {
    const stmt = this.db.prepare("UPDATE todos SET completed = 1 WHERE id = ?");
    stmt.run(id);
  }
}
```

Creating a typed HTTP server with Bun:

```typescript
// src/server.ts
import { serve } from "bun";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const users: Map<string, User> = new Map();

function jsonResponse<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const server = serve({
  port: 3000,
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // GET /users
    if (method === "GET" && path === "/users") {
      const allUsers = Array.from(users.values());
      return jsonResponse({ success: true, data: allUsers });
    }
    
    // GET /users/:id
    if (method === "GET" && path.startsWith("/users/")) {
      const id = path.split("/")[2];
      const user = users.get(id);
      
      if (!user) {
        return jsonResponse({ success: false, error: "User not found" }, 404);
      }
      
      return jsonResponse({ success: true, data: user });
    }
    
    // POST /users
    if (method === "POST" && path === "/users") {
      try {
        const body = await request.json() as Partial<User>;
        
        if (!body.name || !body.email) {
          return jsonResponse(
            { success: false, error: "Name and email are required" },
            400
          );
        }
        
        const id = crypto.randomUUID();
        const user: User = { id, name: body.name, email: body.email };
        users.set(id, user);
        
        return jsonResponse({ success: true, data: user }, 201);
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
      }
    }
    
    return jsonResponse({ success: false, error: "Not found" }, 404);
  }
});

console.log(`Server running at http://localhost:${server.port}`);
```

## Best Practices Summary

Here are the key best practices for using TypeScript with Bun:

1. **Always Install bun-types**: Add `bun-types` as a dev dependency to get proper IntelliSense and type checking for Bun-specific APIs.

2. **Use Strict Mode**: Enable all strict options in tsconfig.json to catch errors early and write safer code.

3. **Run Type Checks Separately**: Since Bun's transpiler doesn't type-check, run `tsc --noEmit` as part of your CI/CD pipeline and during development.

4. **Configure Path Aliases**: Use path aliases to keep imports clean and make refactoring easier.

5. **Leverage Bun's Speed**: Take advantage of Bun's fast startup time for development workflows with `--watch` mode.

6. **Use JSDoc in JS Files**: When working with mixed projects, add JSDoc comments to JavaScript files for better type inference.

7. **Set moduleResolution to bundler**: This setting works best with Bun's module resolution behavior.

8. **Keep tsconfig.json Updated**: Regularly review and update your TypeScript configuration as your project grows.

9. **Use Decorators Thoughtfully**: While Bun supports decorators, use them judiciously as they add runtime overhead.

10. **Test Type Boundaries**: Write tests that verify type assertions, especially when dealing with external data.

## Conclusion

Bun provides an exceptional developer experience for TypeScript projects. The zero-configuration setup, combined with lightning-fast execution, makes it an attractive choice for both new projects and migrations from Node.js. While Bun's transpiler focuses on speed over type checking, integrating `tsc` into your workflow ensures you maintain type safety.

The key takeaway is that Bun removes the traditional friction of TypeScript development. You no longer need complex build configurations, multiple transpilation tools, or slow compilation steps. Just write TypeScript and run it.

As Bun continues to mature, we can expect even better TypeScript integration and tooling. For now, the combination of Bun's runtime performance and TypeScript's type safety creates a powerful foundation for building modern applications.

Start your next project with Bun and TypeScript today. The setup time you save can be invested in building features that matter.
