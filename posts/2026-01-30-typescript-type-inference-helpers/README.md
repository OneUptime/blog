# How to Build Type Inference Helpers in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Type Inference, Generics, Utility Types

Description: Create type inference helper utilities in TypeScript using infer keyword, conditional types, and mapped types for automatic type extraction.

---

TypeScript's type system is powerful enough to infer types from existing code. Instead of manually defining types everywhere, you can build helper utilities that extract types automatically. This post covers practical patterns for building type inference helpers using the `infer` keyword, conditional types, and mapped types.

## Understanding the `infer` Keyword

The `infer` keyword lets you declare a type variable within a conditional type. Think of it as pattern matching for types - you describe a shape, and TypeScript extracts the part you care about.

Here's the basic syntax:

```typescript
// Basic infer syntax
// T extends SomePattern<infer U> ? U : DefaultType

// If T matches the pattern, U captures the inferred type
// If T doesn't match, we get DefaultType
```

Let's start with a simple example that extracts the element type from an array:

```typescript
// ArrayElement extracts the type of elements in an array
type ArrayElement<T> = T extends (infer E)[] ? E : never;

// Usage examples
type StringArrayElement = ArrayElement<string[]>;
// Result: string

type NumberArrayElement = ArrayElement<number[]>;
// Result: number

type MixedArrayElement = ArrayElement<(string | number)[]>;
// Result: string | number

type NotAnArray = ArrayElement<string>;
// Result: never (string is not an array)
```

The pattern `(infer E)[]` tells TypeScript: "If T is an array, capture the element type as E."

## Extracting Return Types

One of the most common use cases is extracting the return type of a function. TypeScript includes `ReturnType<T>` built-in, but understanding how it works helps you build custom variations.

```typescript
// Custom implementation of ReturnType
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Test functions
function getUser() {
    return { id: 1, name: 'Alice', email: 'alice@example.com' };
}

async function fetchData() {
    return { status: 200, data: [] };
}

const arrowFn = (x: number, y: number) => x + y;

// Extract return types
type UserType = MyReturnType<typeof getUser>;
// Result: { id: number; name: string; email: string; }

type FetchDataType = MyReturnType<typeof fetchData>;
// Result: Promise<{ status: number; data: never[]; }>

type ArrowFnReturn = MyReturnType<typeof arrowFn>;
// Result: number
```

### Extracting Return Types from Overloaded Functions

Overloaded functions present a challenge. TypeScript infers the return type from the last overload signature:

```typescript
// Function with multiple overloads
function process(input: string): string;
function process(input: number): number;
function process(input: boolean): boolean;
function process(input: string | number | boolean): string | number | boolean {
    return input;
}

type ProcessReturn = ReturnType<typeof process>;
// Result: boolean (from the last overload)
```

To capture all possible return types, you need a different approach:

```typescript
// Helper to get union of all overload return types
type OverloadReturnTypes<T> =
    T extends {
        (...args: any[]): infer R1;
        (...args: any[]): infer R2;
        (...args: any[]): infer R3;
    } ? R1 | R2 | R3 :
    T extends {
        (...args: any[]): infer R1;
        (...args: any[]): infer R2;
    } ? R1 | R2 :
    T extends (...args: any[]) => infer R ? R : never;

type AllProcessReturns = OverloadReturnTypes<typeof process>;
// Result: string | number | boolean
```

## Extracting Promise Value Types

When working with async code, you often need to extract the resolved value type from a Promise:

```typescript
// Unwrap a single layer of Promise
type Awaited<T> = T extends Promise<infer V> ? V : T;

// Examples
type ResolvedString = Awaited<Promise<string>>;
// Result: string

type ResolvedUser = Awaited<Promise<{ id: number; name: string }>>;
// Result: { id: number; name: string }

type NotAPromise = Awaited<number>;
// Result: number (returns as-is if not a Promise)
```

For deeply nested Promises, use recursive unwrapping:

```typescript
// Recursively unwrap nested Promises
type DeepAwaited<T> = T extends Promise<infer V> ? DeepAwaited<V> : T;

// Examples
type NestedPromise = Promise<Promise<Promise<string>>>;
type Resolved = DeepAwaited<NestedPromise>;
// Result: string

// Practical use case with async functions
async function getNestedData(): Promise<Promise<{ items: string[] }>> {
    return Promise.resolve({ items: ['a', 'b', 'c'] });
}

type NestedDataResult = DeepAwaited<ReturnType<typeof getNestedData>>;
// Result: { items: string[] }
```

## Function Parameter Inference

Extracting parameter types from functions is useful when building wrappers or middleware:

```typescript
// Extract all parameters as a tuple
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Extract the first parameter
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

// Extract the last parameter
type LastParam<T> = T extends (...args: [...infer _, infer L]) => any ? L : never;

// Test function
function createUser(name: string, age: number, isAdmin: boolean): void {
    // implementation
}

type AllParams = Parameters<typeof createUser>;
// Result: [string, number, boolean]

type FirstParameter = FirstParam<typeof createUser>;
// Result: string

type LastParameter = LastParam<typeof createUser>;
// Result: boolean
```

### Building a Parameter Extractor by Index

```typescript
// Extract parameter at specific index
type ParamAt<T, N extends number> =
    T extends (...args: infer P) => any
        ? P[N] extends undefined ? never : P[N]
        : never;

function handleEvent(
    eventName: string,
    callback: () => void,
    options: { once: boolean }
): void {
    // implementation
}

type EventName = ParamAt<typeof handleEvent, 0>;
// Result: string

type Callback = ParamAt<typeof handleEvent, 1>;
// Result: () => void

type Options = ParamAt<typeof handleEvent, 2>;
// Result: { once: boolean }
```

## Extracting Types from Objects

Object type inference helps when working with configuration objects or API responses:

```typescript
// Extract value types from an object
type ValueOf<T> = T[keyof T];

// Extract keys that have specific value types
type KeysOfType<T, V> = {
    [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// Example object
interface Config {
    port: number;
    host: string;
    debug: boolean;
    timeout: number;
    name: string;
}

type ConfigValues = ValueOf<Config>;
// Result: string | number | boolean

type StringKeys = KeysOfType<Config, string>;
// Result: "host" | "name"

type NumberKeys = KeysOfType<Config, number>;
// Result: "port" | "timeout"
```

### Deep Property Type Extraction

```typescript
// Extract nested property type using a path
type DeepPropertyType<T, Path extends string> =
    Path extends `${infer Key}.${infer Rest}`
        ? Key extends keyof T
            ? DeepPropertyType<T[Key], Rest>
            : never
        : Path extends keyof T
            ? T[Path]
            : never;

// Nested object structure
interface AppState {
    user: {
        profile: {
            name: string;
            email: string;
        };
        settings: {
            theme: 'light' | 'dark';
            notifications: boolean;
        };
    };
    data: {
        items: string[];
        count: number;
    };
}

type UserName = DeepPropertyType<AppState, 'user.profile.name'>;
// Result: string

type Theme = DeepPropertyType<AppState, 'user.settings.theme'>;
// Result: 'light' | 'dark'

type Items = DeepPropertyType<AppState, 'data.items'>;
// Result: string[]
```

## Extracting Types from Arrays and Tuples

Working with tuples requires different inference patterns than regular arrays:

```typescript
// Extract first element type
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;

// Extract all elements except the first
type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;

// Extract last element type
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

// Extract all elements except the last
type Init<T extends any[]> = T extends [...infer I, any] ? I : never;

// Example tuple
type MyTuple = [string, number, boolean, Date];

type FirstElement = Head<MyTuple>;
// Result: string

type RestElements = Tail<MyTuple>;
// Result: [number, boolean, Date]

type LastElement = Last<MyTuple>;
// Result: Date

type InitElements = Init<MyTuple>;
// Result: [string, number, boolean]
```

### Tuple Length and Index Access

```typescript
// Get tuple length as a literal type
type Length<T extends any[]> = T['length'];

// Check if index exists in tuple
type HasIndex<T extends any[], I extends number> =
    I extends keyof T ? true : false;

// Safe index access
type SafeIndex<T extends any[], I extends number> =
    I extends keyof T ? T[I] : undefined;

type TestTuple = [string, number, boolean];

type TupleLength = Length<TestTuple>;
// Result: 3

type HasIndex0 = HasIndex<TestTuple, 0>;
// Result: true

type HasIndex5 = HasIndex<TestTuple, 5>;
// Result: false

type Index1 = SafeIndex<TestTuple, 1>;
// Result: number

type Index10 = SafeIndex<TestTuple, 10>;
// Result: undefined
```

## Practical Utility Types

Let's build some utilities you can use in real projects.

### Type-Safe Event Emitter Types

```typescript
// Extract event names and their payload types
type EventMap = {
    userLogin: { userId: string; timestamp: Date };
    userLogout: { userId: string };
    dataLoaded: { items: any[]; total: number };
    error: { message: string; code: number };
};

// Infer event names
type EventName = keyof EventMap;

// Infer payload for specific event
type EventPayload<E extends EventName> = EventMap[E];

// Type-safe event handler
type EventHandler<E extends EventName> = (payload: EventPayload<E>) => void;

// Usage
const handlers: { [E in EventName]?: EventHandler<E> } = {
    userLogin: (payload) => {
        // payload is typed as { userId: string; timestamp: Date }
        console.log(payload.userId, payload.timestamp);
    },
    error: (payload) => {
        // payload is typed as { message: string; code: number }
        console.log(payload.message, payload.code);
    }
};
```

### API Response Type Inference

```typescript
// Define API endpoints with their response types
type ApiEndpoints = {
    '/users': { id: number; name: string }[];
    '/users/:id': { id: number; name: string; email: string };
    '/posts': { id: number; title: string; body: string }[];
    '/posts/:id': { id: number; title: string; body: string; author: string };
};

// Extract response type for an endpoint
type ApiResponse<E extends keyof ApiEndpoints> = ApiEndpoints[E];

// Extract all endpoints that return arrays
type ListEndpoints = {
    [E in keyof ApiEndpoints]: ApiEndpoints[E] extends any[] ? E : never;
}[keyof ApiEndpoints];
// Result: '/users' | '/posts'

// Extract element type from list endpoints
type ListItemType<E extends ListEndpoints> =
    ApiEndpoints[E] extends (infer T)[] ? T : never;

type UserListItem = ListItemType<'/users'>;
// Result: { id: number; name: string }
```

### Form Field Type Extraction

```typescript
// Form schema definition
interface FormSchema {
    username: { type: 'text'; required: true; minLength: 3 };
    email: { type: 'email'; required: true };
    age: { type: 'number'; required: false; min: 0; max: 120 };
    subscribe: { type: 'checkbox'; required: false };
}

// Map field type to TypeScript type
type FieldValueType<T> =
    T extends { type: 'text' | 'email' } ? string :
    T extends { type: 'number' } ? number :
    T extends { type: 'checkbox' } ? boolean :
    never;

// Extract form values type
type FormValues<Schema> = {
    [K in keyof Schema]: FieldValueType<Schema[K]>;
};

type MyFormValues = FormValues<FormSchema>;
// Result: {
//     username: string;
//     email: string;
//     age: number;
//     subscribe: boolean;
// }

// Extract required fields only
type RequiredFields<Schema> = {
    [K in keyof Schema as Schema[K] extends { required: true } ? K : never]:
        FieldValueType<Schema[K]>;
};

type RequiredFormValues = RequiredFields<FormSchema>;
// Result: {
//     username: string;
//     email: string;
// }
```

### Component Props Inference

```typescript
// React-style component type inference
type ComponentProps<T> = T extends (props: infer P) => any ? P : never;

// Example components
function Button(props: {
    label: string;
    onClick: () => void;
    disabled?: boolean
}) {
    return null;
}

function Input(props: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: 'text' | 'password' | 'email';
}) {
    return null;
}

type ButtonProps = ComponentProps<typeof Button>;
// Result: { label: string; onClick: () => void; disabled?: boolean }

type InputProps = ComponentProps<typeof Input>;
// Result: { value: string; onChange: (value: string) => void; ... }

// Extract required props only
type RequiredProps<T> = {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

type RequiredButtonProps = RequiredProps<ButtonProps>;
// Result: { label: string; onClick: () => void }
```

## Comparison of Inference Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| `T extends (infer E)[]` | Array element extraction | `ArrayElement<string[]>` yields `string` |
| `T extends (...args: any[]) => infer R` | Function return type | `ReturnType<typeof fn>` |
| `T extends (...args: infer P) => any` | Function parameters | `Parameters<typeof fn>` |
| `T extends Promise<infer V>` | Promise unwrapping | `Awaited<Promise<T>>` |
| `T extends [infer H, ...infer R]` | Tuple decomposition | Head and Tail extraction |
| `T extends { [K]: infer V }` | Object property extraction | Property type extraction |

## Advanced Pattern: Recursive Type Inference

Build types that work on deeply nested structures:

```typescript
// Recursively make all properties optional
type DeepPartial<T> = T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

// Recursively make all properties required
type DeepRequired<T> = T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;

// Recursively make all properties readonly
type DeepReadonly<T> = T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// Example
interface NestedConfig {
    server: {
        port: number;
        ssl?: {
            cert: string;
            key: string;
        };
    };
    features?: {
        beta: boolean;
    };
}

type PartialConfig = DeepPartial<NestedConfig>;
// All properties at all levels are optional

type RequiredConfig = DeepRequired<NestedConfig>;
// All properties at all levels are required

type ReadonlyConfig = DeepReadonly<NestedConfig>;
// All properties at all levels are readonly
```

### Flattening Nested Types

```typescript
// Flatten a union of arrays into a union of elements
type FlattenArray<T> = T extends (infer E)[] ? E : T;

// Flatten object to dot-notation paths
type FlattenKeys<T, Prefix extends string = ''> = T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
            ? FlattenKeys<T[K], `${Prefix}${K}.`>
            : `${Prefix}${K}`;
      }[keyof T & string]
    : never;

interface DeepObject {
    a: {
        b: {
            c: string;
        };
        d: number;
    };
    e: boolean;
}

type AllPaths = FlattenKeys<DeepObject>;
// Result: "a.b.c" | "a.d" | "e"
```

## Template Literal Type Inference

TypeScript 4.1 introduced template literal types, enabling string pattern matching:

```typescript
// Extract parts of a route pattern
type ExtractRouteParams<T extends string> =
    T extends `${infer _Start}:${infer Param}/${infer Rest}`
        ? Param | ExtractRouteParams<`/${Rest}`>
        : T extends `${infer _Start}:${infer Param}`
            ? Param
            : never;

type RouteParams = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// Result: 'userId' | 'postId'

// Build params object type from route
type RouteParamsObject<T extends string> = {
    [K in ExtractRouteParams<T>]: string;
};

type UserPostParams = RouteParamsObject<'/users/:userId/posts/:postId'>;
// Result: { userId: string; postId: string }
```

### Event String Parsing

```typescript
// Parse event strings like 'click.button.primary'
type ParseEventString<S extends string> =
    S extends `${infer Event}.${infer Rest}`
        ? { event: Event; modifiers: ParseModifiers<Rest> }
        : { event: S; modifiers: [] };

type ParseModifiers<S extends string> =
    S extends `${infer Mod}.${infer Rest}`
        ? [Mod, ...ParseModifiers<Rest>]
        : [S];

type ClickEvent = ParseEventString<'click.button.primary'>;
// Result: { event: 'click'; modifiers: ['button', 'primary'] }

type SimpleEvent = ParseEventString<'submit'>;
// Result: { event: 'submit'; modifiers: [] }
```

## Building a Type-Safe Query Builder

Putting it all together, here's a practical example of a type-safe query builder:

```typescript
// Database schema definition
interface Schema {
    users: {
        id: number;
        name: string;
        email: string;
        createdAt: Date;
    };
    posts: {
        id: number;
        title: string;
        content: string;
        authorId: number;
        published: boolean;
    };
    comments: {
        id: number;
        postId: number;
        userId: number;
        text: string;
    };
}

// Infer table names
type TableName = keyof Schema;

// Infer columns for a table
type ColumnsOf<T extends TableName> = keyof Schema[T];

// Infer column type
type ColumnType<T extends TableName, C extends ColumnsOf<T>> = Schema[T][C];

// Query result type based on selected columns
type SelectResult<T extends TableName, C extends ColumnsOf<T>> = {
    [K in C]: Schema[T][K];
};

// Type-safe query builder
class QueryBuilder<T extends TableName, Selected extends ColumnsOf<T> = never> {
    private tableName: T;
    private selectedColumns: Selected[] = [];

    constructor(table: T) {
        this.tableName = table;
    }

    select<C extends ColumnsOf<T>>(...columns: C[]): QueryBuilder<T, C> {
        return this as unknown as QueryBuilder<T, C>;
    }

    where<C extends ColumnsOf<T>>(
        column: C,
        value: ColumnType<T, C>
    ): QueryBuilder<T, Selected> {
        return this;
    }

    execute(): SelectResult<T, Selected>[] {
        // Implementation would execute the actual query
        return [] as SelectResult<T, Selected>[];
    }
}

// Usage with full type inference
const query = new QueryBuilder('users')
    .select('id', 'name', 'email')
    .where('id', 1); // 'id' must be number

const results = query.execute();
// Type: { id: number; name: string; email: string }[]

// This would cause a type error:
// .where('id', 'not-a-number') // Error: string is not assignable to number
```

## Summary

Type inference helpers make your TypeScript code more maintainable by deriving types from existing code rather than duplicating type definitions. Key patterns to remember:

1. Use `infer` within conditional types to capture parts of a type
2. Recursive types handle nested structures
3. Template literal types enable string pattern matching
4. Combine multiple patterns for complex scenarios

Start with the built-in utility types (`ReturnType`, `Parameters`, `Awaited`), then build custom helpers when you need project-specific inference logic. The type system becomes a tool that works for you rather than something you work around.
