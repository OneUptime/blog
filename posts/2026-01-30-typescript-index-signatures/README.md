# How to Implement Index Signatures in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Type Safety, Interfaces, Objects

Description: Master TypeScript index signatures for dynamic object properties with proper type constraints, Record utility type, and handling unknown keys safely.

---

When building TypeScript applications, you often encounter scenarios where you cannot predict all the property names of an object at compile time. Index signatures provide a way to describe objects that can have dynamic keys while still maintaining type safety.

This guide walks through everything you need to know about index signatures, from basic syntax to advanced patterns.

## What Are Index Signatures?

An index signature tells TypeScript that an object can have any number of properties with a specific key type and value type. The syntax uses square brackets with a parameter name and type annotation.

Here is the basic structure:

```typescript
interface DynamicObject {
  [key: string]: valueType;
}
```

The `key` parameter name is arbitrary (you can call it `index`, `prop`, `name`, or anything else). What matters is the type annotation.

## Basic Index Signature Syntax

Let's start with a practical example. Suppose you need to store configuration values where keys are setting names and values are strings.

This interface defines an object that accepts any string key with string values:

```typescript
interface ConfigSettings {
  [settingName: string]: string;
}

const appConfig: ConfigSettings = {
  theme: "dark",
  language: "en-US",
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD"
};

// Adding new properties works fine
appConfig.newSetting = "value";

// TypeScript knows all values are strings
const theme: string = appConfig.theme;

// This would cause an error - number is not assignable to string
// appConfig.maxRetries = 5;
```

You can also use index signatures with type aliases:

```typescript
type StringDictionary = {
  [key: string]: string;
};

type NumberDictionary = {
  [key: string]: number;
};

const userAges: NumberDictionary = {
  alice: 30,
  bob: 25,
  charlie: 35
};

// All values are typed as numbers
const aliceAge: number = userAges.alice;
```

## String Keys vs Number Keys

TypeScript supports two key types for index signatures: `string` and `number`. Understanding their differences is crucial for correct usage.

### String Index Signatures

String index signatures allow any string as a key:

```typescript
interface StringIndexed {
  [key: string]: boolean;
}

const featureFlags: StringIndexed = {
  darkMode: true,
  betaFeatures: false,
  experimentalUI: true
};

// Both dot notation and bracket notation work
featureFlags.newFeature = true;
featureFlags["another-feature"] = false;
```

### Number Index Signatures

Number index signatures are useful for array-like structures:

```typescript
interface NumberIndexed {
  [index: number]: string;
}

const errorMessages: NumberIndexed = {
  404: "Not Found",
  500: "Internal Server Error",
  403: "Forbidden"
};

// Access by numeric index
const notFound: string = errorMessages[404];
```

### Key Type Compatibility Rules

When you use both string and number index signatures, the number index value type must be a subtype of the string index value type. This is because JavaScript converts numeric keys to strings at runtime.

The following table summarizes the compatibility:

| String Index Type | Number Index Type | Valid? |
|-------------------|-------------------|--------|
| `string`          | `string`          | Yes    |
| `any`             | `string`          | Yes    |
| `unknown`         | `string`          | Yes    |
| `string`          | `number`          | No     |
| `Animal`          | `Dog` (extends Animal) | Yes |
| `Dog`             | `Animal`          | No     |

Here is an example showing valid mixed index signatures:

```typescript
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

// Valid - Dog is a subtype of Animal
interface ValidMixed {
  [key: string]: Animal;
  [index: number]: Dog;
}

// Invalid - Animal is not a subtype of Dog
// interface InvalidMixed {
//   [key: string]: Dog;
//   [index: number]: Animal;  // Error!
// }
```

## Combining Index Signatures with Known Properties

One of the most practical patterns is combining index signatures with explicitly defined properties. This lets you have required properties with specific types while allowing additional dynamic properties.

### Basic Combination

When combining known properties with an index signature, the known property types must be compatible with the index signature type:

```typescript
interface UserProfile {
  // Known required properties
  id: string;
  email: string;

  // Index signature for additional metadata
  [key: string]: string;
}

const user: UserProfile = {
  id: "user-123",
  email: "user@example.com",
  department: "Engineering",
  location: "New York"
};
```

### Handling Mixed Value Types

Often you need known properties with different types than your index signature. Use a union type in the index signature:

```typescript
interface FlexibleUser {
  id: number;
  name: string;
  isActive: boolean;

  // Union type allows mixed value types
  [key: string]: string | number | boolean;
}

const flexUser: FlexibleUser = {
  id: 1,
  name: "Alice",
  isActive: true,
  role: "admin",
  loginCount: 42,
  verified: true
};
```

### Optional Known Properties

You can mix optional and required properties with index signatures:

```typescript
interface ApiResponse {
  status: number;
  message: string;
  timestamp?: Date;

  [key: string]: string | number | Date | undefined;
}

function handleResponse(response: ApiResponse): void {
  console.log(`Status: ${response.status}`);
  console.log(`Message: ${response.message}`);

  if (response.timestamp) {
    console.log(`Time: ${response.timestamp.toISOString()}`);
  }

  // Access dynamic properties safely
  for (const key in response) {
    console.log(`${key}: ${response[key]}`);
  }
}
```

## The Record<K, V> Utility Type

TypeScript provides the `Record<K, V>` utility type as a cleaner alternative to index signatures in many cases. It creates a type with keys of type `K` and values of type `V`.

### Basic Record Usage

```typescript
// Equivalent to { [key: string]: number }
type StringToNumber = Record<string, number>;

const prices: StringToNumber = {
  apple: 1.5,
  banana: 0.75,
  orange: 2.0
};
```

### Records with Literal Types

The real power of `Record` comes from using union types for keys:

```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type MethodConfig = Record<HttpMethod, {
  timeout: number;
  retries: number;
}>;

const apiConfig: MethodConfig = {
  GET: { timeout: 5000, retries: 3 },
  POST: { timeout: 10000, retries: 1 },
  PUT: { timeout: 10000, retries: 1 },
  DELETE: { timeout: 5000, retries: 0 }
};

// TypeScript ensures all methods are defined
// Missing "DELETE" would cause an error
```

### Comparing Index Signatures and Record

| Feature | Index Signature | Record<K, V> |
|---------|-----------------|--------------|
| Syntax | `{ [key: string]: T }` | `Record<string, T>` |
| Literal key unions | No | Yes |
| Required keys enforcement | No | Yes with literal unions |
| Readability | Moderate | High |
| Nested type params | Verbose | Clean |

Here is a practical comparison:

```typescript
// Using index signature
interface UserPermissions1 {
  [resource: string]: boolean;
}

// Using Record - equivalent for string keys
type UserPermissions2 = Record<string, boolean>;

// Record shines with literal types
type Permission = "read" | "write" | "delete" | "admin";
type Resource = "users" | "posts" | "comments";

// All combinations of Resource and Permission are required
type PermissionMatrix = Record<Resource, Record<Permission, boolean>>;

const permissions: PermissionMatrix = {
  users: { read: true, write: true, delete: false, admin: false },
  posts: { read: true, write: true, delete: true, admin: false },
  comments: { read: true, write: true, delete: true, admin: false }
};
```

## Readonly Index Signatures

You can make index signatures readonly to prevent modification after initialization:

```typescript
interface ReadonlyConfig {
  readonly [key: string]: string;
}

const config: ReadonlyConfig = {
  apiUrl: "https://api.example.com",
  apiKey: "secret-key-123"
};

// Error: Index signature in type 'ReadonlyConfig' only permits reading
// config.apiUrl = "https://other-api.com";

// Error: Cannot add new properties
// config.newSetting = "value";
```

### Readonly with Known Properties

Combine readonly index signatures with readonly known properties:

```typescript
interface ImmutableSettings {
  readonly version: string;
  readonly environment: string;
  readonly [key: string]: string;
}

function loadSettings(): ImmutableSettings {
  return Object.freeze({
    version: "1.0.0",
    environment: "production",
    logLevel: "info",
    maxConnections: "100"
  });
}

const settings = loadSettings();
// All properties are readonly at the type level
// Object.freeze provides runtime immutability
```

### Using Readonly<T> with Records

```typescript
type AppConfig = Readonly<Record<string, string | number>>;

const frozenConfig: AppConfig = {
  maxRetries: 3,
  baseUrl: "https://api.example.com",
  timeout: 5000
};

// Error: Cannot assign to property because it is a read-only property
// frozenConfig.maxRetries = 5;
```

## Template Literal Index Signatures

TypeScript 4.4 introduced template literal types in index signatures, enabling powerful pattern matching for property names.

### Basic Template Literal Patterns

```typescript
interface DataAttributes {
  [key: `data-${string}`]: string;
}

const element: DataAttributes = {
  "data-id": "123",
  "data-testid": "submit-button",
  "data-analytics": "click-tracking"
};

// Error: Property 'id' is not assignable
// const invalid: DataAttributes = { id: "123" };
```

### Event Handler Patterns

A common use case is typing event handlers:

```typescript
interface EventHandlers {
  [key: `on${Capitalize<string>}`]: (event: Event) => void;
}

const handlers: EventHandlers = {
  onClick: (e) => console.log("clicked", e),
  onMouseEnter: (e) => console.log("mouse entered", e),
  onKeyDown: (e) => console.log("key pressed", e)
};

// Error: Does not match the pattern
// handlers.click = () => {};
```

### Combining Multiple Patterns

You can use union types in template literals:

```typescript
type Prefix = "get" | "set" | "delete";
type Entity = "User" | "Post" | "Comment";

interface CrudOperations {
  [key: `${Prefix}${Entity}`]: () => Promise<void>;
}

const api: CrudOperations = {
  getUser: async () => { /* fetch user */ },
  setUser: async () => { /* update user */ },
  deleteUser: async () => { /* remove user */ },
  getPost: async () => { /* fetch post */ },
  setPost: async () => { /* update post */ },
  deletePost: async () => { /* remove post */ },
  getComment: async () => { /* fetch comment */ },
  setComment: async () => { /* update comment */ },
  deleteComment: async () => { /* remove comment */ }
};
```

### CSS Custom Properties

Template literals work great for CSS custom properties:

```typescript
interface CSSVariables {
  [key: `--${string}`]: string | number;
}

const themeVars: CSSVariables = {
  "--primary-color": "#007bff",
  "--secondary-color": "#6c757d",
  "--font-size-base": "16px",
  "--spacing-unit": 8
};

function applyTheme(vars: CSSVariables): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, String(value));
  }
}
```

## Handling Unknown Keys Safely

When accessing properties via index signatures, TypeScript returns the value type directly. However, the property might not exist at runtime. Here are strategies for safe access.

### The undefined Union Approach

Include `undefined` in your value type:

```typescript
interface SafeDictionary {
  [key: string]: string | undefined;
}

const dict: SafeDictionary = {
  known: "value"
};

// TypeScript knows this might be undefined
const value = dict.unknown;
if (value !== undefined) {
  console.log(value.toUpperCase());  // Safe
}
```

### Using noUncheckedIndexedAccess

Enable this compiler option for automatic undefined unions:

```json
// tsconfig.json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

With this option enabled:

```typescript
interface Dictionary {
  [key: string]: string;
}

const dict: Dictionary = { hello: "world" };

// With noUncheckedIndexedAccess, TypeScript treats this as string | undefined
const value = dict.maybeExists;

// Must check before using
if (value) {
  console.log(value.toUpperCase());
}
```

### Type Guards for Safe Access

Create reusable type guards:

```typescript
function hasKey<T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T {
  return key in obj;
}

interface Config {
  [key: string]: string;
}

const config: Config = {
  apiKey: "secret",
  baseUrl: "https://api.example.com"
};

const key = "apiKey";
if (hasKey(config, key)) {
  // TypeScript knows config[key] exists
  console.log(config[key]);
}
```

### Optional Chaining with Index Access

```typescript
interface NestedConfig {
  [section: string]: {
    [setting: string]: string | number;
  } | undefined;
}

const appConfig: NestedConfig = {
  database: {
    host: "localhost",
    port: 5432
  }
};

// Safe nested access
const port = appConfig.database?.port;
const unknown = appConfig.cache?.size;  // undefined
```

## Practical Examples

### Building a Type-Safe Cache

```typescript
interface CacheEntry<T> {
  value: T;
  expiry: number;
}

class TypedCache<T> {
  private store: { [key: string]: CacheEntry<T> | undefined } = {};

  set(key: string, value: T, ttlMs: number): void {
    this.store[key] = {
      value,
      expiry: Date.now() + ttlMs
    };
  }

  get(key: string): T | undefined {
    const entry = this.store[key];

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiry) {
      delete this.store[key];
      return undefined;
    }

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.store[key];
    return entry !== undefined && Date.now() <= entry.expiry;
  }

  delete(key: string): boolean {
    if (this.store[key]) {
      delete this.store[key];
      return true;
    }
    return false;
  }
}

// Usage
const userCache = new TypedCache<{ name: string; email: string }>();
userCache.set("user-1", { name: "Alice", email: "alice@example.com" }, 60000);

const user = userCache.get("user-1");
if (user) {
  console.log(user.name);  // TypeScript knows the shape
}
```

### Form Field Validation

```typescript
type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
};

type ValidationErrors = {
  [field: string]: string[];
};

interface FormSchema {
  [fieldName: string]: ValidationRule;
}

function validateForm(
  data: Record<string, string>,
  schema: FormSchema
): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field] ?? "";
    const fieldErrors: string[] = [];

    if (rules.required && !value) {
      fieldErrors.push(`${field} is required`);
    }

    if (rules.minLength && value.length < rules.minLength) {
      fieldErrors.push(`${field} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      fieldErrors.push(`${field} must not exceed ${rules.maxLength} characters`);
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      fieldErrors.push(`${field} format is invalid`);
    }

    if (rules.custom && !rules.custom(value)) {
      fieldErrors.push(`${field} failed custom validation`);
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  }

  return errors;
}

// Usage
const registrationSchema: FormSchema = {
  username: { required: true, minLength: 3, maxLength: 20 },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, minLength: 8 }
};

const formData = {
  username: "al",
  email: "invalid-email",
  password: "short"
};

const validationErrors = validateForm(formData, registrationSchema);
console.log(validationErrors);
// {
//   username: ["username must be at least 3 characters"],
//   email: ["email format is invalid"],
//   password: ["password must be at least 8 characters"]
// }
```

### API Response Handler

```typescript
interface ApiEndpoints {
  [path: `/${string}`]: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    response: unknown;
  };
}

interface MyApi extends ApiEndpoints {
  "/users": {
    method: "GET";
    response: { id: number; name: string }[];
  };
  "/users/:id": {
    method: "GET";
    params: { id: string };
    response: { id: number; name: string; email: string };
  };
  "/posts": {
    method: "POST";
    body: { title: string; content: string };
    response: { id: number; created: string };
  };
}

async function apiRequest<P extends keyof MyApi>(
  path: P,
  options?: {
    params?: MyApi[P] extends { params: infer T } ? T : never;
    body?: MyApi[P] extends { body: infer T } ? T : never;
  }
): Promise<MyApi[P]["response"]> {
  let url = path as string;

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url = url.replace(`:${key}`, value);
    }
  }

  const response = await fetch(url, {
    method: "GET",  // Simplified for example
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  return response.json();
}

// Usage with full type safety
async function demo() {
  const users = await apiRequest("/users");
  // users is typed as { id: number; name: string }[]

  const user = await apiRequest("/users/:id", { params: { id: "123" } });
  // user is typed as { id: number; name: string; email: string }

  const newPost = await apiRequest("/posts", {
    body: { title: "Hello", content: "World" }
  });
  // newPost is typed as { id: number; created: string }
}
```

## Common Pitfalls and Solutions

### Pitfall 1: Excess Property Checks

Index signatures bypass excess property checking:

```typescript
interface Strict {
  name: string;
}

interface WithIndex {
  name: string;
  [key: string]: string;
}

// Error: Object literal may only specify known properties
// const strict: Strict = { name: "test", extra: "oops" };

// No error - index signature allows any string property
const indexed: WithIndex = { name: "test", extra: "allowed" };
```

### Pitfall 2: Method Signatures

Methods must match the index signature:

```typescript
// This works - method return type matches index signature
interface Valid {
  [key: string]: string | (() => string);
  getName(): string;
}

// This fails - number return type does not match string
// interface Invalid {
//   [key: string]: string;
//   getAge(): number;  // Error!
// }
```

### Pitfall 3: Class Implementation

When implementing interfaces with index signatures in classes:

```typescript
interface Dictionary {
  [key: string]: string;
}

// Use a separate property to store dynamic data
class DictionaryImpl implements Dictionary {
  [key: string]: string;

  private _data: Map<string, string> = new Map();

  // Error: Property '_data' is not assignable to string index type 'string'
}

// Better approach: use composition
class BetterDictionary {
  private data: Record<string, string> = {};

  get(key: string): string | undefined {
    return this.data[key];
  }

  set(key: string, value: string): void {
    this.data[key] = value;
  }
}
```

## Summary

Index signatures are essential for typing objects with dynamic keys in TypeScript. Here are the key takeaways:

1. Use `[key: string]: ValueType` for objects with arbitrary string keys
2. Number index signature values must be subtypes of string index signature values
3. Combine known properties with index signatures using union types
4. Prefer `Record<K, V>` for cleaner syntax and literal key unions
5. Use `readonly` index signatures for immutable objects
6. Template literal index signatures enable pattern matching on property names
7. Enable `noUncheckedIndexedAccess` for safer property access
8. Always consider undefined when accessing dynamic properties

With these patterns, you can build type-safe applications that handle dynamic data structures while catching errors at compile time.
