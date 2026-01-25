# How to Handle Type Narrowing in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Type Narrowing, Type Guards, Control Flow Analysis, Union Types, Type Safety

Description: Master TypeScript type narrowing techniques to write safer code with proper handling of union types, null checks, and discriminated unions.

---

## Introduction

Type narrowing is one of TypeScript's most powerful features for working with union types and handling values that could be multiple types. When you narrow a type, you tell TypeScript's compiler that within a certain code block, a value is a more specific type than originally declared. This guide covers all the type narrowing techniques available in TypeScript and when to use each one.

## Understanding Type Narrowing

### What Is Type Narrowing?

Type narrowing is the process of refining a type from a broader type to a more specific one. TypeScript's control flow analysis tracks these refinements automatically:

```typescript
function processValue(value: string | number) {
  // Here, value is string | number

  if (typeof value === "string") {
    // Here, value is narrowed to string
    console.log(value.toUpperCase());
  } else {
    // Here, value is narrowed to number
    console.log(value.toFixed(2));
  }
}
```

### Why It Matters

Without type narrowing, you would need type assertions everywhere, which bypasses TypeScript's safety checks. Proper narrowing lets TypeScript verify your code is handling all cases correctly.

```mermaid
flowchart TD
    A[Value: string | number | null] --> B{typeof check}
    B -->|string| C[Narrowed: string]
    B -->|number| D[Narrowed: number]
    B -->|object| E{null check}
    E -->|null| F[Narrowed: null]
    E -->|not null| G[Error: unexpected type]
```

## Built-in Type Guards

### typeof Operator

The `typeof` operator narrows primitive types:

```typescript
function formatValue(value: string | number | boolean): string {
  if (typeof value === "string") {
    return `"${value}"`;
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  // TypeScript knows value is boolean here
  return value ? "Yes" : "No";
}
```

Supported `typeof` checks:
- `"string"`
- `"number"`
- `"bigint"`
- `"boolean"`
- `"symbol"`
- `"undefined"`
- `"object"` (includes `null`)
- `"function"`

### instanceof Operator

Use `instanceof` to narrow class instances:

```typescript
class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

class ValidationError extends Error {
  fields: string[];

  constructor(message: string, fields: string[]) {
    super(message);
    this.fields = fields;
  }
}

function handleError(error: Error) {
  if (error instanceof ApiError) {
    // error is ApiError here
    console.log(`API Error ${error.statusCode}: ${error.message}`);
  } else if (error instanceof ValidationError) {
    // error is ValidationError here
    console.log(`Validation failed for: ${error.fields.join(", ")}`);
  } else {
    // error is Error here
    console.log(`Unknown error: ${error.message}`);
  }
}
```

### in Operator

The `in` operator checks for property existence:

```typescript
interface Bird {
  fly(): void;
  layEggs(): void;
}

interface Fish {
  swim(): void;
  layEggs(): void;
}

function move(animal: Bird | Fish) {
  if ("fly" in animal) {
    // animal is Bird here
    animal.fly();
  } else {
    // animal is Fish here
    animal.swim();
  }
}
```

## Truthiness Narrowing

### Filtering Out Null and Undefined

Truthiness checks narrow out falsy values:

```typescript
function processName(name: string | null | undefined) {
  if (name) {
    // name is string here (null and undefined filtered out)
    console.log(name.toUpperCase());
  }
}

// Also works with optional chaining
function getLength(value?: string): number {
  if (value) {
    return value.length;
  }
  return 0;
}
```

### Caution with Truthiness

Be careful with values that can be legitimately falsy:

```typescript
function processCount(count: number | null) {
  // Bug: This filters out 0, which might be valid
  if (count) {
    console.log(`Count: ${count}`);
  }

  // Better: Explicitly check for null
  if (count !== null) {
    console.log(`Count: ${count}`);  // 0 is now handled correctly
  }
}
```

## Equality Narrowing

### Strict Equality

Strict equality narrows types precisely:

```typescript
function compare(x: string | number, y: string | boolean) {
  if (x === y) {
    // x and y are both string here (the only common type)
    console.log(x.toUpperCase());
    console.log(y.toLowerCase());
  }
}
```

### Checking Against Literals

```typescript
type Status = "pending" | "active" | "completed" | "failed";

function getStatusColor(status: Status): string {
  if (status === "pending") {
    return "yellow";
  }
  if (status === "active") {
    return "blue";
  }
  if (status === "completed") {
    return "green";
  }
  // status is "failed" here
  return "red";
}
```

## User-Defined Type Guards

### Type Predicates

Create custom type guards using type predicates:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface Admin extends User {
  permissions: string[];
  department: string;
}

// Type predicate function
function isAdmin(user: User): user is Admin {
  return "permissions" in user && "department" in user;
}

function displayUserInfo(user: User) {
  console.log(`Name: ${user.name}`);

  if (isAdmin(user)) {
    // user is Admin here
    console.log(`Department: ${user.department}`);
    console.log(`Permissions: ${user.permissions.join(", ")}`);
  }
}
```

### Assertion Functions

Assertion functions narrow types by throwing on invalid input:

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`Expected string, got ${typeof value}`);
  }
}

function processInput(input: unknown) {
  assertIsString(input);
  // input is string here
  console.log(input.toUpperCase());
}

// Non-null assertion function
function assertNonNull<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error("Value cannot be null or undefined");
  }
}
```

## Discriminated Unions

### Using a Discriminant Property

Discriminated unions use a literal property to distinguish between types:

```typescript
interface LoadingState {
  status: "loading";
}

interface SuccessState {
  status: "success";
  data: string[];
}

interface ErrorState {
  status: "error";
  message: string;
}

type State = LoadingState | SuccessState | ErrorState;

function renderState(state: State) {
  switch (state.status) {
    case "loading":
      return "Loading...";

    case "success":
      // state is SuccessState here
      return `Data: ${state.data.join(", ")}`;

    case "error":
      // state is ErrorState here
      return `Error: ${state.message}`;
  }
}
```

### Exhaustiveness Checking

Use the `never` type to ensure all cases are handled:

```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

function handleState(state: State): string {
  switch (state.status) {
    case "loading":
      return "Loading...";
    case "success":
      return state.data.join(", ");
    case "error":
      return state.message;
    default:
      // If we add a new state type, TypeScript will error here
      return assertNever(state);
  }
}
```

### Complex Discriminated Unions

Real-world example with API responses:

```typescript
type ApiResponse<T> =
  | { type: "success"; data: T; timestamp: Date }
  | { type: "error"; error: { code: number; message: string } }
  | { type: "pending"; requestId: string };

function handleResponse<T>(response: ApiResponse<T>): T | null {
  switch (response.type) {
    case "success":
      console.log(`Received at ${response.timestamp}`);
      return response.data;

    case "error":
      console.error(`Error ${response.error.code}: ${response.error.message}`);
      return null;

    case "pending":
      console.log(`Request ${response.requestId} is pending`);
      return null;
  }
}
```

## Advanced Narrowing Patterns

### Narrowing with Array Methods

Type narrowing works with array filter:

```typescript
interface Item {
  id: string;
  value: number | null;
}

const items: Item[] = [
  { id: "a", value: 10 },
  { id: "b", value: null },
  { id: "c", value: 20 }
];

// Type guard for filtering
function hasValue(item: Item): item is Item & { value: number } {
  return item.value !== null;
}

// filteredItems has type (Item & { value: number })[]
const filteredItems = items.filter(hasValue);

// Now we can safely use value without null checks
const total = filteredItems.reduce((sum, item) => sum + item.value, 0);
```

### Narrowing in Callbacks

Be aware that narrowing does not persist across callbacks:

```typescript
function processAsync(value: string | null) {
  if (value !== null) {
    // value is string here

    setTimeout(() => {
      // TypeScript cannot guarantee value is still string
      // because the outer scope could have changed
      console.log(value.toUpperCase());  // This works because value is captured
    }, 100);
  }
}

// For mutable variables, you need to re-check or use const
let mutableValue: string | null = "hello";

if (mutableValue !== null) {
  const captured = mutableValue;  // Capture the value

  setTimeout(() => {
    // captured is guaranteed to be string
    console.log(captured.toUpperCase());
  }, 100);
}
```

### Narrowing with Object Destructuring

```typescript
interface Response {
  success: boolean;
  data?: { items: string[] };
  error?: { message: string };
}

function processResponse(response: Response) {
  const { success, data, error } = response;

  if (success && data) {
    // data is { items: string[] } here
    console.log(data.items.join(", "));
  } else if (!success && error) {
    // error is { message: string } here
    console.log(error.message);
  }
}
```

## Control Flow Refinements

### Early Returns

Early returns are a clean way to narrow types:

```typescript
function processUser(user: User | null | undefined): string {
  if (!user) {
    return "No user provided";
  }

  // user is User here
  return `Hello, ${user.name}!`;
}
```

### Throwing Errors

Throwing narrows types in subsequent code:

```typescript
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  // value is string here
  return value;
}
```

### Assignment Narrowing

TypeScript tracks assignments:

```typescript
let value: string | number;

value = "hello";
// value is string here
console.log(value.toUpperCase());

value = 42;
// value is number here
console.log(value.toFixed(2));
```

## Common Pitfalls

### Accidental Type Widening

```typescript
function processItems(items: string[] | null) {
  // Bug: This creates a new reference
  let processedItems = items;

  if (items !== null) {
    // items is string[] here
    // but processedItems is still string[] | null
    processedItems = items.map(i => i.toUpperCase());
  }

  // Better: Use the narrowed variable directly
  if (items !== null) {
    return items.map(i => i.toUpperCase());
  }
  return [];
}
```

### Narrowing Does Not Persist Across Function Calls

```typescript
let value: string | null = "hello";

function mightModify() {
  // This function could theoretically modify value
}

if (value !== null) {
  mightModify();
  // TypeScript still considers value as string here
  // because it does not analyze mightModify's side effects
  console.log(value.toUpperCase());
}
```

## Best Practices

### Prefer Discriminated Unions

When designing types, use discriminated unions for cleaner narrowing:

```typescript
// Less ideal: Optional properties
interface Result {
  success: boolean;
  data?: string;
  error?: string;
}

// Better: Discriminated union
type BetterResult =
  | { success: true; data: string }
  | { success: false; error: string };
```

### Use Type Guards for Complex Checks

```typescript
// Complex validation logic in a type guard
function isValidUser(data: unknown): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "name" in data &&
    "email" in data &&
    typeof (data as User).id === "string" &&
    typeof (data as User).name === "string" &&
    typeof (data as User).email === "string"
  );
}
```

### Keep Narrowing Close to Usage

```typescript
// Good: Narrow and use immediately
function process(value: string | null) {
  if (value !== null) {
    return value.toUpperCase();
  }
  return "";
}

// Avoid: Large gaps between narrowing and usage
function processLong(value: string | null) {
  if (value === null) return "";

  // ... 50 lines of other code ...

  // Hard to remember that value is narrowed here
  return value.toUpperCase();
}
```

## Conclusion

Type narrowing is essential for writing safe TypeScript code. By understanding how TypeScript's control flow analysis works, you can write code that correctly handles union types without resorting to type assertions.

Key techniques to remember:

1. Use `typeof` for primitives and `instanceof` for classes
2. The `in` operator checks for property existence
3. Create custom type guards with type predicates
4. Design discriminated unions with a literal discriminant property
5. Use exhaustiveness checking with `never` to catch missing cases
6. Be aware of narrowing limitations in callbacks and across function calls

Master these patterns to write TypeScript code that is both type-safe and maintainable.
