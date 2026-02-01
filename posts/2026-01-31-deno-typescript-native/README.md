# How to Use TypeScript Native Support in Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, TypeScript, Runtime, Type Safety

Description: Learn how to leverage Deno's built-in TypeScript support to write type-safe applications without any configuration or compilation steps.

---

Deno is a modern JavaScript and TypeScript runtime that treats TypeScript as a first-class citizen. Unlike Node.js, where you need to set up transpilers, configure bundlers, and manage multiple dependencies just to run TypeScript code, Deno executes TypeScript files directly out of the box. This native support dramatically simplifies the development workflow and makes TypeScript adoption seamless.

In this comprehensive guide, we will explore how to take full advantage of Deno's native TypeScript support, from basic type checking to advanced patterns like generics and decorators. Whether you are migrating from Node.js or starting a new project, this guide will help you understand the power and simplicity of TypeScript in Deno.

## Why Deno for TypeScript?

Before diving into the technical details, let us understand why Deno is an excellent choice for TypeScript development:

1. **Zero Configuration**: No need for `tsconfig.json`, `babel.config.js`, or webpack configurations to run TypeScript.
2. **Built-in Type Checking**: Deno includes a TypeScript compiler that performs type checking at runtime.
3. **URL-based Imports**: Import modules directly from URLs without a package manager.
4. **Secure by Default**: Deno runs in a sandbox and requires explicit permissions for file, network, and environment access.
5. **Modern Standards**: Built on web standards with native support for ES modules, fetch API, and Web Workers.

## Getting Started with TypeScript in Deno

Running a TypeScript file in Deno requires no setup. Simply create a `.ts` file and execute it with the `deno run` command.

Here is a simple example that demonstrates TypeScript running natively in Deno:

```typescript
// greeting.ts
// Define a typed function that accepts a string parameter
function greet(name: string): string {
  return `Hello, ${name}! Welcome to Deno.`;
}

// TypeScript will catch type errors at runtime
const message: string = greet("Developer");
console.log(message);

// This would cause a type error:
// greet(123); // Argument of type 'number' is not assignable to parameter of type 'string'
```

To run this file, simply execute:

```bash
deno run greeting.ts
```

Deno automatically compiles the TypeScript code and executes it. If there are type errors, Deno will report them before running the code.

## Type Checking in Deno

Deno provides multiple levels of type checking that you can configure based on your needs.

### Default Type Checking

By default, Deno performs type checking on your TypeScript files. You can explicitly enable strict type checking using the `--check` flag:

```bash
deno run --check main.ts
```

### Skipping Type Checking

For faster development iterations, you can skip type checking entirely. This is useful when you want quick feedback during development:

```bash
deno run --no-check main.ts
```

### Type Checking Only

If you want to check types without executing the code, use the `deno check` command:

```bash
deno check main.ts
```

This is particularly useful in CI/CD pipelines where you want to validate type safety before deployment.

## Working with Interfaces

Interfaces are fundamental to TypeScript development. They define the shape of objects and enable powerful type checking.

Here is an example showing how to define and use interfaces for a user management system:

```typescript
// interfaces.ts
// Define an interface for user data
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  isActive: boolean;
}

// Define an interface for user creation (without auto-generated fields)
interface CreateUserInput {
  name: string;
  email: string;
}

// Function that creates a new user with proper typing
function createUser(input: CreateUserInput): User {
  return {
    id: Math.floor(Math.random() * 10000),
    name: input.name,
    email: input.email,
    createdAt: new Date(),
    isActive: true,
  };
}

// Function to display user information
function displayUser(user: User): void {
  console.log(`User: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Active: ${user.isActive}`);
  console.log(`Created: ${user.createdAt.toISOString()}`);
}

// Create and display a user
const newUser = createUser({
  name: "John Doe",
  email: "john@example.com",
});

displayUser(newUser);
```

### Extending Interfaces

Interfaces can extend other interfaces to build complex type hierarchies:

```typescript
// extended-interfaces.ts
// Base interface for all entities
interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

// User interface extends the base entity
interface User extends BaseEntity {
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
}

// Admin interface adds additional properties
interface Admin extends User {
  permissions: string[];
  department: string;
}

// Function that works with any entity type
function logEntity(entity: BaseEntity): void {
  console.log(`Entity ID: ${entity.id}`);
  console.log(`Created: ${entity.createdAt}`);
  console.log(`Updated: ${entity.updatedAt}`);
}

// Create an admin user
const admin: Admin = {
  id: 1,
  name: "Alice Admin",
  email: "alice@company.com",
  role: "admin",
  permissions: ["read", "write", "delete", "manage-users"],
  department: "Engineering",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Admin satisfies the BaseEntity interface requirements
logEntity(admin);
```

## Generics in Deno TypeScript

Generics allow you to write reusable code that works with multiple types while maintaining type safety.

Here is a practical example of generics for building a type-safe API response handler:

```typescript
// generics.ts
// Generic interface for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: Date;
}

// Generic function to create success responses
function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data: data,
    error: null,
    timestamp: new Date(),
  };
}

// Generic function to create error responses
function errorResponse<T>(message: string): ApiResponse<T> {
  return {
    success: false,
    data: null,
    error: message,
    timestamp: new Date(),
  };
}

// Define specific data types
interface Product {
  id: number;
  name: string;
  price: number;
}

interface Order {
  orderId: string;
  products: Product[];
  total: number;
}

// Use generics with specific types
const productResponse: ApiResponse<Product> = successResponse({
  id: 1,
  name: "Laptop",
  price: 999.99,
});

const orderResponse: ApiResponse<Order> = successResponse({
  orderId: "ORD-12345",
  products: [{ id: 1, name: "Laptop", price: 999.99 }],
  total: 999.99,
});

console.log("Product Response:", productResponse);
console.log("Order Response:", orderResponse);
```

### Generic Constraints

You can constrain generics to ensure they have certain properties:

```typescript
// generic-constraints.ts
// Interface that all identifiable entities must implement
interface Identifiable {
  id: number | string;
}

// Generic function constrained to identifiable objects
function findById<T extends Identifiable>(items: T[], id: T["id"]): T | undefined {
  return items.find((item) => item.id === id);
}

// User type with id
interface User {
  id: number;
  name: string;
}

// Product type with string id
interface Product {
  id: string;
  title: string;
  price: number;
}

// Both types work with the generic function
const users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

const products: Product[] = [
  { id: "PROD-001", title: "Widget", price: 29.99 },
  { id: "PROD-002", title: "Gadget", price: 49.99 },
];

const foundUser = findById(users, 1);
const foundProduct = findById(products, "PROD-001");

console.log("Found User:", foundUser);
console.log("Found Product:", foundProduct);
```

## Decorators in Deno

Decorators are a powerful feature for adding metadata and modifying class behavior. In Deno, you need to enable experimental decorators in your configuration.

Here is how to enable and use decorators with a practical logging example:

```typescript
// decorators.ts
// Note: Decorators require experimental support enabled in deno.json

// Method decorator for logging function calls
function Log(
  target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    console.log(`[LOG] Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`[LOG] ${propertyKey} returned:`, result);
    return result;
  };

  return descriptor;
}

// Class decorator for adding metadata
function Entity(tableName: string) {
  return function <T extends { new (...args: unknown[]): object }>(constructor: T) {
    return class extends constructor {
      _tableName = tableName;
    };
  };
}

// Property decorator for validation
function Required(target: object, propertyKey: string): void {
  let value: unknown;

  const getter = () => value;
  const setter = (newValue: unknown) => {
    if (newValue === null || newValue === undefined || newValue === "") {
      throw new Error(`${propertyKey} is required`);
    }
    value = newValue;
  };

  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true,
  });
}

// Using decorators in a class
@Entity("users")
class UserService {
  @Required
  private userName: string = "";

  constructor(name: string) {
    this.userName = name;
  }

  @Log
  getUserName(): string {
    return this.userName;
  }

  @Log
  updateUserName(newName: string): void {
    this.userName = newName;
  }
}

// Test the decorated class
const service = new UserService("Alice");
console.log(service.getUserName());
service.updateUserName("Bob");
```

## Importing Types in Deno

Deno supports importing types from various sources, including local files, remote URLs, and npm packages.

### Importing from Local Files

Organize your types in separate files for better maintainability:

```typescript
// types/user.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export type UserRole = "admin" | "editor" | "viewer";

export interface UserWithRole extends User {
  role: UserRole;
}
```

Import types in your main application:

```typescript
// main.ts
import type { User, UserRole, UserWithRole } from "./types/user.ts";

// Using imported types
function createAdmin(user: User): UserWithRole {
  return {
    ...user,
    role: "admin" as UserRole,
  };
}

const user: User = {
  id: 1,
  name: "Admin User",
  email: "admin@example.com",
};

const adminUser = createAdmin(user);
console.log(adminUser);
```

### Importing from Remote URLs

Deno allows you to import types directly from URLs:

```typescript
// Using types from deno.land/std
import type { ServerRequest } from "https://deno.land/std@0.224.0/http/server.ts";

// The imported type can be used in function signatures
function handleRequest(request: ServerRequest): void {
  console.log("Handling request:", request.url);
}
```

### Type-Only Imports

Use `import type` to import only the type information without the runtime code:

```typescript
// type-imports.ts
// Import types only (no runtime overhead)
import type { User } from "./types/user.ts";

// Import both values and types from the same module
import { createUser, type UserInput } from "./user-service.ts";

// Type-only imports are removed during compilation
const input: UserInput = {
  name: "Test User",
  email: "test@example.com",
};

const user: User = createUser(input);
```

## Configuring TypeScript with deno.json

While Deno works without configuration, you can customize TypeScript behavior using a `deno.json` or `deno.jsonc` file.

Here is a comprehensive deno.json configuration file with TypeScript compiler options:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "lint": {
    "include": ["src/"],
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo", "no-unused-vars"],
      "exclude": ["no-explicit-any"]
    }
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": true,
    "proseWrap": "preserve"
  },
  "imports": {
    "@std/": "https://deno.land/std@0.224.0/",
    "@/": "./src/"
  },
  "tasks": {
    "dev": "deno run --watch --allow-all main.ts",
    "test": "deno test --allow-all",
    "check": "deno check main.ts",
    "lint": "deno lint",
    "fmt": "deno fmt"
  }
}
```

### Key Configuration Options Explained

Let us break down the important compiler options:

**Strict Type Checking Options:**
- `strict`: Enables all strict type checking options
- `noImplicitAny`: Raises errors when a type cannot be inferred
- `strictNullChecks`: Ensures null and undefined are handled explicitly
- `strictFunctionTypes`: Enables stricter checking of function types

**Code Quality Options:**
- `noUnusedLocals`: Reports errors on unused local variables
- `noUnusedParameters`: Reports errors on unused parameters
- `noImplicitReturns`: Ensures all code paths return a value

**Decorator Support:**
- `experimentalDecorators`: Enables experimental decorator support
- `emitDecoratorMetadata`: Emits design-type metadata for decorators

### Import Maps

The `imports` field in `deno.json` allows you to create aliases for modules:

```typescript
// With the import map configured above
import { serve } from "@std/http/server.ts";
import { UserService } from "@/services/user.ts";

// These resolve to:
// https://deno.land/std@0.224.0/http/server.ts
// ./src/services/user.ts
```

## Type Checking Third-Party Modules

When working with third-party modules, you may need to handle type definitions.

Here is how to work with typed and untyped modules:

```typescript
// typed-modules.ts
// Most Deno modules include TypeScript types
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// Creating a typed Oak application
const app = new Application();
const router = new Router();

// TypeScript knows the types of request and response
router.get("/api/users", (ctx) => {
  // ctx is fully typed
  ctx.response.body = { users: [] };
  ctx.response.type = "application/json";
});

app.use(router.routes());
app.use(router.allowedMethods());
```

For modules without types, you can create declaration files:

```typescript
// types/untyped-module.d.ts
declare module "https://example.com/untyped-module.js" {
  export function doSomething(input: string): Promise<string>;
  export interface ModuleConfig {
    timeout: number;
    retries: number;
  }
}
```

## Advanced Type Patterns

Here are some advanced TypeScript patterns that work seamlessly in Deno.

### Utility Types in Practice

This example demonstrates using TypeScript utility types for API development:

```typescript
// utility-types.ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Partial makes all properties optional (for updates)
type UpdateUserInput = Partial<Omit<User, "id" | "createdAt" | "updatedAt">>;

// Pick selects specific properties (for public responses)
type PublicUser = Pick<User, "id" | "name" | "email">;

// Required makes all properties required
type RequiredUser = Required<User>;

// Readonly prevents modifications
type ImmutableUser = Readonly<User>;

// Record creates a dictionary type
type UserCache = Record<number, User>;

// Function using utility types
function updateUser(id: number, updates: UpdateUserInput): PublicUser {
  // Simulate database update
  const user: User = {
    id,
    name: updates.name ?? "Unknown",
    email: updates.email ?? "unknown@example.com",
    password: updates.password ?? "hashed",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Return only public fields
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

const updated = updateUser(1, { name: "New Name" });
console.log(updated);
```

### Discriminated Unions

Create type-safe state management with discriminated unions:

```typescript
// discriminated-unions.ts
// Define possible states for async operations
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

// Type guard function
function isSuccess<T>(state: AsyncState<T>): state is { status: "success"; data: T } {
  return state.status === "success";
}

// Function that handles all states
function renderState<T>(state: AsyncState<T>, renderData: (data: T) => string): string {
  switch (state.status) {
    case "idle":
      return "Ready to load...";
    case "loading":
      return "Loading...";
    case "success":
      return renderData(state.data);
    case "error":
      return `Error: ${state.error.message}`;
  }
}

// Usage example
interface Product {
  id: number;
  name: string;
}

let productState: AsyncState<Product[]> = { status: "idle" };

// Transition through states
productState = { status: "loading" };
productState = {
  status: "success",
  data: [
    { id: 1, name: "Widget" },
    { id: 2, name: "Gadget" },
  ],
};

console.log(renderState(productState, (products) => `Found ${products.length} products`));
```

## Best Practices Summary

Following these best practices will help you get the most out of TypeScript in Deno:

1. **Use Strict Mode**: Always enable `strict: true` in your `deno.json` to catch type errors early.

2. **Leverage Type Inference**: Let TypeScript infer types when they are obvious, but explicitly type function parameters and return values.

3. **Prefer Interfaces Over Type Aliases**: Use interfaces for object shapes as they provide better error messages and are more extensible.

4. **Use Type-Only Imports**: Import types using `import type` to avoid unnecessary runtime code.

5. **Create Type Declaration Files**: For untyped third-party modules, create `.d.ts` files to maintain type safety.

6. **Use Utility Types**: Take advantage of built-in utility types like `Partial`, `Pick`, `Omit`, and `Record` instead of manually defining types.

7. **Enable Strict Null Checks**: Always handle null and undefined explicitly to prevent runtime errors.

8. **Use Discriminated Unions**: For state management, use discriminated unions to ensure exhaustive handling of all cases.

9. **Run Type Checks in CI**: Use `deno check` in your CI pipeline to catch type errors before deployment.

10. **Keep Types Close to Usage**: Define types near where they are used, or in dedicated type files for shared types.

## Conclusion

Deno's native TypeScript support transforms the developer experience by eliminating the configuration burden that has traditionally accompanied TypeScript projects. You can write type-safe applications immediately without setting up transpilers, bundlers, or complex configuration files.

Throughout this guide, we explored the full spectrum of TypeScript features in Deno, from basic type checking and interfaces to advanced patterns like generics, decorators, and discriminated unions. The `deno.json` configuration file gives you fine-grained control over TypeScript behavior when you need it, while sensible defaults keep simple projects simple.

The combination of Deno's security model, modern JavaScript APIs, and seamless TypeScript integration makes it an excellent choice for building robust, maintainable applications. Whether you are creating a simple script, a REST API, or a complex distributed system, Deno's TypeScript support scales with your needs.

Start your next project with Deno and experience the joy of TypeScript development without the configuration headaches. Your future self will thank you for the type safety, and your team will appreciate the reduced setup time and improved code quality.
