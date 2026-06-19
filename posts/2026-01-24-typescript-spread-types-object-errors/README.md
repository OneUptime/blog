# How to Fix 'Spread Types Must Be Object Type' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Type Errors, Object Spread, Generics, Type Safety, Debugging

Description: Learn how to diagnose and fix the 'Spread types may only be created from object types' error in TypeScript with practical solutions and examples.

---

## Introduction

The error "Spread types may only be created from object types" is one of the more confusing TypeScript errors you might encounter. It appears when using the spread operator (`...`) with values that TypeScript knows might be non-object values at compile time. This guide explains why this error occurs and provides practical solutions for different scenarios.

## Understanding the Error

### What Causes This Error

TypeScript's spread operator (`...`) in object literals is designed to work with object-like values. When TypeScript sees a type such as `unknown` or a union that includes a non-object primitive, it raises this error to prevent potential runtime issues.

Here is a simple example that triggers the error:

```typescript
// Error: Spread types may only be created from object types
function mergeWithDefaults(
  defaults: { theme: string },
  overrides: { theme?: string } | string
) {
  return { ...defaults, ...overrides };
}
```

The error occurs because `overrides` might be a `string`, which is not a valid object spread type in TypeScript.

### When It Happens

Common scenarios that trigger this error include:

1. Using generic constraints that still allow non-object types
2. Spreading values typed as `unknown`
3. Spreading union types that include non-object types
4. Working with values from external sources without proper type guards

## Solution 1: Constrain Generic Types

When a generic value should always be spread as an object, constrain your generic type to extend `object`:

```typescript
// Fixed: T is constrained to object types
function mergeWithDefaults<T extends object>(defaults: T, overrides: Partial<T>): T {
  return { ...defaults, ...overrides } as T;
}

// Usage
interface UserSettings {
  theme: string;
  notifications: boolean;
  language: string;
}

const defaults: UserSettings = {
  theme: "light",
  notifications: true,
  language: "en"
};

const userPrefs = mergeWithDefaults(defaults, { theme: "dark" });
// Result: { theme: "dark", notifications: true, language: "en" }
```

### Understanding the Constraint

The `extends object` constraint excludes primitive types:

```typescript
// These work with T extends object
mergeWithDefaults({ a: 1 }, { a: 2 });           // Objects work
mergeWithDefaults({ items: [1, 2] }, { items: [3, 4] }); // Nested arrays work

// These would cause compile errors (as intended)
// mergeWithDefaults("hello", "world");          // strings not allowed
// mergeWithDefaults(123, 456);                  // numbers not allowed
// mergeWithDefaults(null, null);                // null not allowed
```

## Solution 2: Handle Nullable Types

When dealing with values that might be `null` or `undefined`, use a fallback object when you want to make the runtime behavior explicit. For values typed as `unknown` or broader unions, use type guards:

### Conditional Spreading with Nullish Coalescing

```typescript
interface Config {
  host: string;
  port: number;
  ssl: boolean;
}

function buildConfig(
  base: Config,
  overrides?: Partial<Config> | null
): Config {
  // Use nullish coalescing to provide an empty object fallback
  return {
    ...base,
    ...(overrides ?? {})
  };
}

// Both calls work correctly
const config1 = buildConfig({ host: "localhost", port: 3000, ssl: false });
const config2 = buildConfig(
  { host: "localhost", port: 3000, ssl: false },
  { port: 8080 }
);
```

### Using Type Guards

For more complex scenarios, use type guards to narrow the type:

```typescript
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeMerge<T extends object>(
  target: T,
  source: unknown
): T {
  if (isObject(source)) {
    return { ...target, ...source } as T;
  }
  return target;
}

// Usage
const result = safeMerge({ name: "John" }, { age: 30 });
// Result: { name: "John", age: 30 }

const unchanged = safeMerge({ name: "John" }, null);
// Result: { name: "John" }
```

## Solution 3: Use Record Types

When working with dynamic keys from values that start as unknown input, use `Record` types after narrowing or constraining the input:

```typescript
// Before: Error with unknown input
function addProperty<K extends string, V>(obj: unknown, key: K, value: V) {
  return { ...obj, [key]: value };  // Error
}

// After: Constrained to Record type
function addProperty<T extends Record<string, unknown>, K extends string, V>(
  obj: T,
  key: K,
  value: V
): T & Record<K, V> {
  return { ...obj, [key]: value } as T & Record<K, V>;
}

// Usage
const user = { name: "Alice" };
const userWithAge = addProperty(user, "age", 25);
// Type: { name: string } & Record<"age", number>
```

## Solution 4: Intersection Types with Spread

When merging multiple object types, use intersection types to preserve type information:

```typescript
interface BaseEntity {
  id: string;
  createdAt: Date;
}

interface UserData {
  name: string;
  email: string;
}

// Merge function that preserves both types
function createEntity<T extends object>(
  base: BaseEntity,
  data: T
): BaseEntity & T {
  return { ...base, ...data };
}

// Usage
const user = createEntity(
  { id: "123", createdAt: new Date() },
  { name: "Bob", email: "bob@example.com" }
);

// user has type: BaseEntity & { name: string; email: string }
console.log(user.id);        // string
console.log(user.name);      // string
console.log(user.createdAt); // Date
```

## Solution 5: Mapped Types for Partial Spread

When you need to spread optional properties conditionally:

```typescript
type SpreadableProps<T> = {
  [K in keyof T]?: T[K] | undefined;
};

function updateEntity<T extends object>(
  entity: T,
  updates: SpreadableProps<T>
): T {
  // Filter out undefined values before spreading
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  return { ...entity, ...cleanUpdates } as T;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const product: Product = {
  id: "p1",
  name: "Widget",
  price: 9.99,
  stock: 100
};

const updated = updateEntity(product, { price: 12.99, stock: undefined });
// Result: { id: "p1", name: "Widget", price: 12.99, stock: 100 }
```

## Solution 6: Generic Constraints with Multiple Bounds

For complex scenarios involving multiple type parameters:

```typescript
// Merge two objects while preserving specific types
function deepMerge<
  T extends object,
  U extends object
>(target: T, source: U): T & U {
  const result = { ...target } as T & U;

  for (const key of Object.keys(source) as (keyof U)[]) {
    const sourceValue = source[key];
    const targetValue = (target as any)[key];

    if (
      isObject(sourceValue) &&
      isObject(targetValue)
    ) {
      (result as any)[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      );
    } else {
      (result as any)[key] = sourceValue;
    }
  }

  return result;
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

// Usage
const config = deepMerge(
  {
    server: { host: "localhost", port: 3000 },
    logging: { level: "info" }
  },
  {
    server: { port: 8080 },
    logging: { format: "json" }
  }
);
// Result: { server: { host: "localhost", port: 8080 }, logging: { level: "info", format: "json" } }
```

## Common Patterns and Fixes

### Pattern 1: React Component Props

A common scenario in React is spreading props with additional properties:

```typescript
import { ComponentProps } from "react";

// Error-prone approach
function Button<T>(props: T) {
  return <button {...props} />;  // Error
}

// Fixed approach with proper constraints
interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary";
}

function Button({ variant = "primary", ...rest }: ButtonProps) {
  const className = variant === "primary" ? "btn-primary" : "btn-secondary";
  return <button className={className} {...rest} />;
}
```

### Pattern 2: State Updates

When updating state objects in React or state management libraries:

```typescript
interface AppState {
  user: { name: string; email: string } | null;
  settings: { theme: string };
  isLoading: boolean;
}

// Type-safe state updater
function updateState<K extends keyof AppState>(
  state: AppState,
  key: K,
  value: AppState[K]
): AppState {
  return { ...state, [key]: value };
}

// Usage
const initialState: AppState = {
  user: null,
  settings: { theme: "light" },
  isLoading: false
};

const newState = updateState(initialState, "user", { name: "Alice", email: "alice@example.com" });
```

### Pattern 3: API Response Transformation

When transforming API responses that might have varying shapes:

```typescript
interface ApiResponse<T extends object> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
  };
}

function transformResponse<T extends object>(
  response: ApiResponse<T>,
  additionalData: Partial<T>
): ApiResponse<T> {
  return {
    ...response,
    data: { ...response.data, ...additionalData }
  };
}

// Usage
interface User {
  id: string;
  name: string;
  role?: string;
}

const apiResponse: ApiResponse<User> = {
  data: { id: "1", name: "John" },
  meta: { timestamp: "2024-01-15", version: "1.0" }
};

const enriched = transformResponse(apiResponse, { role: "admin" });
```

## Debugging Tips

### Check the Full Error Message

TypeScript points to the spread expression that uses a non-object type:

```typescript
declare const value: unknown;

const result = { ...value };
//             ^^^^^^^^^^
// Error TS2698: Spread types may only be created from object types.
```

This tells you to inspect the type at the spread site and narrow it to an object type before spreading.

### Use Type Assertions Sparingly

While type assertions can fix the error, they bypass type safety:

```typescript
// Works but loses type safety
function unsafeMerge<T>(a: T, b: T): T {
  return { ...(a as object), ...(b as object) } as T;
}

// Better: Add proper constraints
function safeMerge<T extends object>(a: T, b: Partial<T>): T {
  return { ...a, ...b } as T;
}
```

### Inspect Types with Hover

In your editor, hover over variables to see their inferred types. This helps identify when a type is wider than expected.

## Conclusion

The "Spread types may only be created from object types" error is TypeScript protecting you from spreading non-object values. The key solutions are:

1. Add `extends object` constraints to generic type parameters
2. Handle `unknown` and broad unions with type guards
3. Use `Record` types for dynamic key scenarios
4. Apply intersection types to preserve type information when merging
5. Use mapped types for conditional property handling

By understanding why TypeScript raises this error, you can write more type-safe code that handles edge cases properly while maintaining the flexibility of generic programming.
