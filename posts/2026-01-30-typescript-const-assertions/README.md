# How to Create Const Assertions in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Type Safety, Constants, Patterns

Description: Use const assertions in TypeScript to create literal types, readonly structures, and type-safe enums without runtime overhead.

---

Const assertions are one of TypeScript's most powerful features for creating immutable, type-safe data structures. Introduced in TypeScript 3.4, the `as const` syntax tells the compiler to infer the narrowest possible type for a value. This guide covers everything you need to know about const assertions, from basic syntax to advanced patterns.

## What Are Const Assertions?

A const assertion is a type assertion that uses the `as const` suffix. When you apply `as const` to a value, TypeScript will:

1. Infer literal types instead of general types (e.g., `"hello"` instead of `string`)
2. Make all properties `readonly`
3. Make arrays `readonly` tuples

Let's start with a simple comparison.

Without const assertion:

```typescript
// TypeScript infers general types
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};

// Inferred type:
// {
//   apiUrl: string;
//   timeout: number;
//   retries: number;
// }

// This is allowed, which might not be what you want
config.apiUrl = "https://different-url.com";
```

With const assertion:

```typescript
// TypeScript infers literal types and makes everything readonly
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
} as const;

// Inferred type:
// {
//   readonly apiUrl: "https://api.example.com";
//   readonly timeout: 5000;
//   readonly retries: 3;
// }

// This now produces a TypeScript error
// config.apiUrl = "https://different-url.com";
// Error: Cannot assign to 'apiUrl' because it is a read-only property
```

## Basic Syntax and Literal Type Inference

The `as const` assertion can be applied to primitives, arrays, and objects. Here's how it affects type inference for each.

### Primitive Values

For primitive values, `as const` narrows the type to its literal form.

```typescript
// Without as const - inferred as string
const greeting = "Hello, World!";
// Type: string

// With as const - inferred as literal
const greetingLiteral = "Hello, World!" as const;
// Type: "Hello, World!"

// Same applies to numbers
const port = 3000;
// Type: number

const portLiteral = 3000 as const;
// Type: 3000

// And booleans
const isEnabled = true;
// Type: boolean

const isEnabledLiteral = true as const;
// Type: true
```

### Type Inference Comparison Table

| Value | Without `as const` | With `as const` |
|-------|-------------------|-----------------|
| `"hello"` | `string` | `"hello"` |
| `42` | `number` | `42` |
| `true` | `boolean` | `true` |
| `[1, 2, 3]` | `number[]` | `readonly [1, 2, 3]` |
| `{ x: 1 }` | `{ x: number }` | `{ readonly x: 1 }` |

## Readonly Arrays and Tuples

One of the most practical uses of const assertions is creating readonly tuple types from arrays.

### Creating Readonly Tuples

```typescript
// Without as const - inferred as string[]
const statusCodes = [200, 201, 204, 400, 404, 500];
// Type: number[]

// With as const - inferred as readonly tuple
const statusCodesConst = [200, 201, 204, 400, 404, 500] as const;
// Type: readonly [200, 201, 204, 400, 404, 500]

// You cannot push, pop, or modify the array
// statusCodesConst.push(502);
// Error: Property 'push' does not exist on type 'readonly [200, 201, 204, 400, 404, 500]'

// You cannot reassign elements
// statusCodesConst[0] = 201;
// Error: Cannot assign to '0' because it is a read-only property
```

### Mixed Type Tuples

Const assertions preserve the exact type of each element in a tuple.

```typescript
// Without as const - inferred as (string | number | boolean)[]
const mixedArray = ["api", 3000, true];
// Type: (string | number | boolean)[]

// With as const - exact tuple type preserved
const mixedTuple = ["api", 3000, true] as const;
// Type: readonly ["api", 3000, true]

// Each element has its specific type
type First = (typeof mixedTuple)[0];  // "api"
type Second = (typeof mixedTuple)[1]; // 3000
type Third = (typeof mixedTuple)[2];  // true
```

### Practical Example: Function Parameters

Const assertions work well when you need to pass specific values to functions.

```typescript
// A function that expects specific HTTP methods
function makeRequest(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE"
): void {
  console.log(`Making ${method} request to ${url}`);
}

// Without as const, this fails
const requestConfig = {
  url: "/api/users",
  method: "GET" // Type: string, not "GET"
};

// makeRequest(requestConfig.url, requestConfig.method);
// Error: Argument of type 'string' is not assignable to parameter of type '"GET" | "POST" | "PUT" | "DELETE"'

// With as const, this works
const requestConfigConst = {
  url: "/api/users",
  method: "GET"
} as const;

makeRequest(requestConfigConst.url, requestConfigConst.method);
// Works! method is inferred as "GET"
```

## Readonly Objects and Nested Structures

Const assertions recursively apply `readonly` to all nested properties.

### Deep Readonly Objects

```typescript
// Complex nested configuration
const appConfig = {
  server: {
    host: "localhost",
    port: 8080,
    ssl: {
      enabled: true,
      certPath: "/etc/ssl/cert.pem"
    }
  },
  database: {
    host: "db.example.com",
    port: 5432,
    credentials: {
      username: "admin",
      password: "secret"
    }
  },
  features: {
    darkMode: true,
    notifications: false
  }
} as const;

// All properties are deeply readonly
// appConfig.server.port = 9000;
// Error: Cannot assign to 'port' because it is a read-only property

// appConfig.server.ssl.enabled = false;
// Error: Cannot assign to 'enabled' because it is a read-only property

// Even nested object references are readonly
// appConfig.server = { host: "other", port: 3000, ssl: { enabled: false, certPath: "" } };
// Error: Cannot assign to 'server' because it is a read-only property
```

### Extracting Types from Const Objects

You can use `typeof` to extract types from const objects and their nested properties.

```typescript
const routes = {
  home: "/",
  about: "/about",
  users: {
    list: "/users",
    detail: "/users/:id",
    create: "/users/new"
  },
  products: {
    list: "/products",
    detail: "/products/:id"
  }
} as const;

// Extract the full type
type Routes = typeof routes;

// Extract nested types
type UserRoutes = typeof routes.users;
// Type: { readonly list: "/users"; readonly detail: "/users/:id"; readonly create: "/users/new" }

// Extract all route values
type AllRouteValues =
  | typeof routes.home
  | typeof routes.about
  | typeof routes.users[keyof typeof routes.users]
  | typeof routes.products[keyof typeof routes.products];
// Type: "/" | "/about" | "/users" | "/users/:id" | "/users/new" | "/products" | "/products/:id"
```

## Creating Type-Safe Enums with Const Assertions

Const assertions provide an excellent alternative to TypeScript enums. This approach has several advantages: no runtime overhead, better tree-shaking, and more predictable behavior.

### Basic Const Object as Enum

```typescript
// Traditional TypeScript enum
enum TraditionalStatus {
  Pending = "pending",
  Active = "active",
  Completed = "completed",
  Failed = "failed"
}

// Const assertion alternative
const Status = {
  Pending: "pending",
  Active: "active",
  Completed: "completed",
  Failed: "failed"
} as const;

// Create a type from the values
type StatusType = typeof Status[keyof typeof Status];
// Type: "pending" | "active" | "completed" | "failed"

// Usage
function updateStatus(status: StatusType): void {
  console.log(`Status updated to: ${status}`);
}

updateStatus(Status.Active);     // Works
updateStatus("completed");       // Works
// updateStatus("invalid");      // Error: Argument of type '"invalid"' is not assignable
```

### Comparison: Enum vs Const Assertion

| Feature | TypeScript Enum | Const Assertion |
|---------|-----------------|-----------------|
| Runtime code | Yes (generates JS) | No |
| Tree-shaking | Limited | Full support |
| Type narrowing | Works | Works |
| Reverse mapping | For numeric enums | Not built-in |
| Object methods | No | Yes (Object.keys, etc.) |
| Bundle size | Larger | Smaller |

### Advanced Enum Pattern with Helper Types

```typescript
// Define the const object
const HttpStatus = {
  OK: 200,
  Created: 201,
  NoContent: 204,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  InternalServerError: 500
} as const;

// Helper type to extract values
type ValueOf<T> = T[keyof T];

// Create the status code type
type HttpStatusCode = ValueOf<typeof HttpStatus>;
// Type: 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500

// Create a type for the keys
type HttpStatusName = keyof typeof HttpStatus;
// Type: "OK" | "Created" | "NoContent" | "BadRequest" | "Unauthorized" | "Forbidden" | "NotFound" | "InternalServerError"

// Usage in functions
function handleResponse(statusCode: HttpStatusCode): string {
  switch (statusCode) {
    case HttpStatus.OK:
      return "Request successful";
    case HttpStatus.Created:
      return "Resource created";
    case HttpStatus.NotFound:
      return "Resource not found";
    case HttpStatus.InternalServerError:
      return "Server error occurred";
    default:
      return "Unknown status";
  }
}

console.log(handleResponse(HttpStatus.OK)); // "Request successful"
console.log(handleResponse(200));           // "Request successful"
```

### Grouped Constants Pattern

```typescript
// Organize related constants into namespaces
const Colors = {
  Primary: {
    Blue: "#0066cc",
    Green: "#00cc66",
    Red: "#cc0000"
  },
  Neutral: {
    White: "#ffffff",
    Gray: "#808080",
    Black: "#000000"
  },
  Status: {
    Success: "#28a745",
    Warning: "#ffc107",
    Error: "#dc3545",
    Info: "#17a2b8"
  }
} as const;

// Extract specific color groups
type PrimaryColor = ValueOf<typeof Colors.Primary>;
// Type: "#0066cc" | "#00cc66" | "#cc0000"

type StatusColor = ValueOf<typeof Colors.Status>;
// Type: "#28a745" | "#ffc107" | "#dc3545" | "#17a2b8"

// Extract all colors
type AllColors =
  | ValueOf<typeof Colors.Primary>
  | ValueOf<typeof Colors.Neutral>
  | ValueOf<typeof Colors.Status>;

// Use in components
interface ButtonProps {
  backgroundColor: AllColors;
  textColor: AllColors;
}

const button: ButtonProps = {
  backgroundColor: Colors.Primary.Blue,
  textColor: Colors.Neutral.White
};
```

## Deriving Types from Const Objects

One of the most powerful patterns with const assertions is deriving complex types from your constant definitions.

### Creating Union Types from Arrays

```typescript
// Define allowed values as a const array
const SUPPORTED_LOCALES = ["en", "es", "fr", "de", "ja", "zh"] as const;

// Derive the union type
type Locale = typeof SUPPORTED_LOCALES[number];
// Type: "en" | "es" | "fr" | "de" | "ja" | "zh"

// Use in functions
function setLocale(locale: Locale): void {
  console.log(`Locale set to: ${locale}`);
}

setLocale("en");     // Works
setLocale("es");     // Works
// setLocale("it"); // Error: Argument of type '"it"' is not assignable

// Runtime validation
function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
```

### Creating Object Types from Const Definitions

```typescript
// Define field configuration
const FORM_FIELDS = {
  username: {
    type: "text",
    required: true,
    minLength: 3,
    maxLength: 20
  },
  email: {
    type: "email",
    required: true,
    pattern: "^[^@]+@[^@]+\\.[^@]+$"
  },
  age: {
    type: "number",
    required: false,
    min: 18,
    max: 120
  },
  bio: {
    type: "textarea",
    required: false,
    maxLength: 500
  }
} as const;

// Derive field names
type FieldName = keyof typeof FORM_FIELDS;
// Type: "username" | "email" | "age" | "bio"

// Derive form data type
type FormData = {
  [K in FieldName]: typeof FORM_FIELDS[K]["type"] extends "number"
    ? number
    : string;
};
// Type: { username: string; email: string; age: number; bio: string }

// Derive required fields
type RequiredFieldName = {
  [K in FieldName]: typeof FORM_FIELDS[K]["required"] extends true ? K : never;
}[FieldName];
// Type: "username" | "email"
```

### Building Discriminated Unions

```typescript
// Define action types
const ActionTypes = {
  FETCH_START: "FETCH_START",
  FETCH_SUCCESS: "FETCH_SUCCESS",
  FETCH_ERROR: "FETCH_ERROR",
  RESET: "RESET"
} as const;

type ActionType = ValueOf<typeof ActionTypes>;

// Build action interfaces
interface FetchStartAction {
  type: typeof ActionTypes.FETCH_START;
}

interface FetchSuccessAction {
  type: typeof ActionTypes.FETCH_SUCCESS;
  payload: {
    data: unknown[];
    total: number;
  };
}

interface FetchErrorAction {
  type: typeof ActionTypes.FETCH_ERROR;
  error: string;
}

interface ResetAction {
  type: typeof ActionTypes.RESET;
}

// Combined action type
type Action =
  | FetchStartAction
  | FetchSuccessAction
  | FetchErrorAction
  | ResetAction;

// Type-safe reducer
function reducer(state: unknown, action: Action): unknown {
  switch (action.type) {
    case ActionTypes.FETCH_START:
      return { ...state, loading: true };
    case ActionTypes.FETCH_SUCCESS:
      // TypeScript knows action.payload exists here
      return { ...state, loading: false, data: action.payload.data };
    case ActionTypes.FETCH_ERROR:
      // TypeScript knows action.error exists here
      return { ...state, loading: false, error: action.error };
    case ActionTypes.RESET:
      return { loading: false, data: [], error: null };
  }
}
```

## Using `satisfies` with Const Assertions

TypeScript 4.9 introduced the `satisfies` operator, which pairs well with const assertions. This combination gives you both type checking and literal type inference.

### Basic satisfies Usage

```typescript
// Define a type for validation
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

// Without satisfies - no type checking during definition
const themeUnchecked = {
  colors: {
    primary: "#007bff",
    secondary: "#6c757d",
    background: "#ffffff"
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24
  }
} as const;

// With satisfies - type checked AND literal types preserved
const theme = {
  colors: {
    primary: "#007bff",
    secondary: "#6c757d",
    background: "#ffffff"
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24
  }
} as const satisfies Theme;

// The type is still the narrow literal type
type PrimaryColor = typeof theme.colors.primary;
// Type: "#007bff" (not just string)

// But we get errors if the shape is wrong
const invalidTheme = {
  colors: {
    primary: "#007bff",
    // secondary: "#6c757d", // Uncommenting this line would cause an error
    background: "#ffffff"
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24
  }
} as const satisfies Theme;
// Error: Property 'secondary' is missing
```

### Ensuring Completeness with satisfies

```typescript
// Define all possible event types
type EventName = "click" | "hover" | "focus" | "blur" | "submit";

// Define handler configuration type
type EventHandlers = Record<EventName, { enabled: boolean; handler: string }>;

// Using satisfies ensures all events are covered
const eventConfig = {
  click: { enabled: true, handler: "handleClick" },
  hover: { enabled: true, handler: "handleHover" },
  focus: { enabled: false, handler: "handleFocus" },
  blur: { enabled: false, handler: "handleBlur" },
  submit: { enabled: true, handler: "handleSubmit" }
} as const satisfies EventHandlers;

// If you forget an event, TypeScript will tell you
const incompleteConfig = {
  click: { enabled: true, handler: "handleClick" },
  hover: { enabled: true, handler: "handleHover" }
  // Missing: focus, blur, submit
} as const satisfies EventHandlers;
// Error: Type is missing properties: focus, blur, submit
```

### Constraining Values While Preserving Types

```typescript
// Define allowed API endpoints
type ApiEndpoint = `/api/${string}`;

// Define the route configuration
const apiRoutes = {
  users: "/api/users",
  posts: "/api/posts",
  comments: "/api/comments",
  auth: "/api/auth/login"
} as const satisfies Record<string, ApiEndpoint>;

// We still get literal types
type UsersEndpoint = typeof apiRoutes.users;
// Type: "/api/users"

// But invalid endpoints are caught
const invalidRoutes = {
  users: "/api/users",
  external: "https://external.com/api" // Not an ApiEndpoint
} as const satisfies Record<string, ApiEndpoint>;
// Error: Type '"https://external.com/api"' is not assignable to type '`/api/${string}`'
```

## Practical Examples and Patterns

### Configuration Objects

```typescript
// Application configuration with const assertions
const CONFIG = {
  app: {
    name: "MyApp",
    version: "1.0.0",
    environment: "production"
  },
  api: {
    baseUrl: "https://api.myapp.com",
    timeout: 30000,
    retryAttempts: 3,
    endpoints: {
      users: "/users",
      products: "/products",
      orders: "/orders"
    }
  },
  features: {
    enableDarkMode: true,
    enableNotifications: true,
    enableAnalytics: false,
    maxUploadSize: 10485760 // 10MB
  },
  supported: {
    languages: ["en", "es", "fr", "de"],
    currencies: ["USD", "EUR", "GBP"],
    countries: ["US", "CA", "UK", "DE", "FR"]
  }
} as const;

// Derive types from config
type Environment = typeof CONFIG.app.environment;
// Type: "production"

type SupportedLanguage = typeof CONFIG.supported.languages[number];
// Type: "en" | "es" | "fr" | "de"

type SupportedCurrency = typeof CONFIG.supported.currencies[number];
// Type: "USD" | "EUR" | "GBP"

type ApiEndpoint = typeof CONFIG.api.endpoints[keyof typeof CONFIG.api.endpoints];
// Type: "/users" | "/products" | "/orders"

// Use in typed functions
function formatPrice(amount: number, currency: SupportedCurrency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount);
}

console.log(formatPrice(99.99, "USD")); // $99.99
console.log(formatPrice(99.99, CONFIG.supported.currencies[1])); // Works with const values
```

### State Machine Definition

```typescript
// Define states and transitions
const STATES = {
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error"
} as const;

const TRANSITIONS = {
  idle: ["loading"],
  loading: ["success", "error"],
  success: ["idle", "loading"],
  error: ["idle", "loading"]
} as const;

type State = ValueOf<typeof STATES>;
type TransitionMap = typeof TRANSITIONS;

// Create a type-safe state machine
class StateMachine {
  private currentState: State = STATES.idle;

  getState(): State {
    return this.currentState;
  }

  canTransitionTo(nextState: State): boolean {
    const allowedTransitions = TRANSITIONS[this.currentState];
    return allowedTransitions.includes(nextState as never);
  }

  transitionTo(nextState: State): boolean {
    if (this.canTransitionTo(nextState)) {
      this.currentState = nextState;
      return true;
    }
    return false;
  }
}

const machine = new StateMachine();
console.log(machine.getState()); // "idle"
console.log(machine.canTransitionTo(STATES.loading)); // true
console.log(machine.canTransitionTo(STATES.success)); // false
```

### Validation Schema Definition

```typescript
// Define validation rules
const VALIDATION_RULES = {
  required: {
    type: "required",
    message: "This field is required"
  },
  email: {
    type: "email",
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address"
  },
  minLength: (min: number) => ({
    type: "minLength" as const,
    min,
    message: `Must be at least ${min} characters`
  }),
  maxLength: (max: number) => ({
    type: "maxLength" as const,
    max,
    message: `Must be no more than ${max} characters`
  }),
  range: (min: number, max: number) => ({
    type: "range" as const,
    min,
    max,
    message: `Must be between ${min} and ${max}`
  })
} as const;

// Define form field with validation
const userFormSchema = {
  username: {
    label: "Username",
    rules: [
      VALIDATION_RULES.required,
      VALIDATION_RULES.minLength(3),
      VALIDATION_RULES.maxLength(20)
    ]
  },
  email: {
    label: "Email",
    rules: [
      VALIDATION_RULES.required,
      VALIDATION_RULES.email
    ]
  },
  age: {
    label: "Age",
    rules: [
      VALIDATION_RULES.range(18, 120)
    ]
  }
} as const;

// Extract field names for type safety
type UserFormField = keyof typeof userFormSchema;
// Type: "username" | "email" | "age"
```

### Event Emitter with Type-Safe Events

```typescript
// Define event map
const EVENTS = {
  USER_LOGIN: "user:login",
  USER_LOGOUT: "user:logout",
  DATA_LOADED: "data:loaded",
  ERROR_OCCURRED: "error:occurred"
} as const;

type EventName = ValueOf<typeof EVENTS>;

// Define payload types for each event
interface EventPayloads {
  [EVENTS.USER_LOGIN]: { userId: string; timestamp: Date };
  [EVENTS.USER_LOGOUT]: { userId: string };
  [EVENTS.DATA_LOADED]: { data: unknown[]; count: number };
  [EVENTS.ERROR_OCCURRED]: { message: string; code: number };
}

// Type-safe event emitter
class TypedEventEmitter {
  private listeners: Map<EventName, Set<Function>> = new Map();

  on<E extends EventName>(
    event: E,
    callback: (payload: EventPayloads[E]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit<E extends EventName>(event: E, payload: EventPayloads[E]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(payload));
    }
  }

  off<E extends EventName>(
    event: E,
    callback: (payload: EventPayloads[E]) => void
  ): void {
    this.listeners.get(event)?.delete(callback);
  }
}

// Usage
const emitter = new TypedEventEmitter();

emitter.on(EVENTS.USER_LOGIN, (payload) => {
  // TypeScript knows payload has userId and timestamp
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
});

emitter.emit(EVENTS.USER_LOGIN, {
  userId: "123",
  timestamp: new Date()
});
```

## Common Pitfalls and Solutions

### Pitfall 1: Forgetting as const on Nested Objects

```typescript
// Problem: as const only applies at the top level
const config = {
  settings: getDefaultSettings() // This returns a mutable object
} as const;

// The settings object itself is not deeply frozen
// because it was returned from a function

// Solution: Apply as const to the function return value
function getDefaultSettings() {
  return {
    theme: "dark",
    fontSize: 14
  } as const;
}
```

### Pitfall 2: Type Widening in Function Returns

```typescript
// Problem: Returning const values can widen the type
function getStatus() {
  const status = "active" as const;
  return status; // Type is still "active" here
}

const result = getStatus();
// Type: "active" - this works!

// But watch out for conditionals
function getStatusConditional(isActive: boolean) {
  if (isActive) {
    return "active" as const;
  }
  return "inactive" as const;
}

const conditionalResult = getStatusConditional(true);
// Type: "active" | "inactive" - both branches are preserved
```

### Pitfall 3: Object Spread Removes Readonly

```typescript
// Problem: Spreading removes readonly
const original = { x: 1, y: 2 } as const;
// Type: { readonly x: 1; readonly y: 2 }

const copy = { ...original };
// Type: { x: number; y: number } - readonly and literal types are lost!

// Solution: Add as const to the spread result
const copyConst = { ...original } as const;
// Type: { readonly x: 1; readonly y: 2 }
```

## Summary

Const assertions are a fundamental tool for writing type-safe TypeScript code. Here are the key takeaways:

1. **Use `as const`** to create literal types and readonly structures
2. **Prefer const objects over enums** for better tree-shaking and flexibility
3. **Derive types from constants** using `typeof` and index access types
4. **Combine with `satisfies`** to get type checking while preserving literal types
5. **Be aware of type widening** in function returns and object spreads

By mastering const assertions, you can write more robust TypeScript code with better type inference and compile-time safety. The patterns covered in this guide will help you build type-safe configurations, state machines, event systems, and more.
