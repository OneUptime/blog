# How to Set Up Strict TypeScript Configuration for React Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, TypeScript, Configuration, Strict Mode, Best Practices, Frontend

Description: Learn how to configure TypeScript with strict mode enabled for React projects to catch bugs early, improve code quality, and ensure type safety across your entire codebase.

---

## Introduction

TypeScript has become the de facto standard for building large-scale React applications. While TypeScript provides excellent type safety out of the box, its default configuration is relatively lenient to ease adoption. However, to truly leverage TypeScript's power and catch potential bugs before they reach production, you need to enable strict mode and configure additional compiler options.

In this comprehensive guide, we'll walk through setting up a strict TypeScript configuration for React projects. We'll cover every important compiler option, explain what each flag does, and provide practical examples of how strict typing catches common errors.

## Why Use Strict TypeScript?

Before diving into configuration, let's understand why strict TypeScript matters:

### 1. Catch Bugs at Compile Time

Strict mode catches many common JavaScript errors before your code even runs:

```typescript
// Without strict mode, this compiles fine but crashes at runtime
function greet(name: string) {
  return name.toUpperCase();
}

greet(null); // Runtime error!

// With strict mode (strictNullChecks), TypeScript catches this
// Error: Argument of type 'null' is not assignable to parameter of type 'string'
```

### 2. Better Code Documentation

Strict typing forces you to be explicit about your intentions, making code self-documenting:

```typescript
// Implicit any - unclear what this function accepts
function processData(data) {
  return data.map((item) => item.value);
}

// With strict mode (noImplicitAny) - crystal clear
function processData(data: Array<{ value: number }>): number[] {
  return data.map((item) => item.value);
}
```

### 3. Improved IDE Support

Strict configurations enable better autocomplete, refactoring, and error detection in your IDE.

### 4. Easier Refactoring

When your types are strict, refactoring becomes safer because TypeScript will catch any breaking changes.

## Setting Up Your Project

Let's start by creating a new React project with TypeScript or adding TypeScript to an existing project.

### Creating a New React + TypeScript Project

```bash
# Using Vite (recommended)
npm create vite@latest my-app -- --template react-ts

# Using Create React App
npx create-react-app my-app --template typescript

# Using Next.js
npx create-next-app@latest my-app --typescript
```

### Adding TypeScript to an Existing Project

```bash
# Install TypeScript and React types
npm install --save-dev typescript @types/react @types/react-dom

# Generate a tsconfig.json file
npx tsc --init
```

## The Base tsconfig.json Structure

Here's a complete strict TypeScript configuration for React projects:

```json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",

    // Strict Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,

    // Module Resolution
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,

    // Emit
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Path Mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"]
    },

    // Skip type checking of declaration files
    "skipLibCheck": true
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist", "build"]
}
```

## Understanding Strict Mode Flags

The `"strict": true` flag is a shorthand that enables multiple strict type-checking options. Let's examine each one in detail.

### 1. noImplicitAny

When enabled, TypeScript will raise an error when it cannot infer the type and would fall back to `any`.

```typescript
// Error: Parameter 'x' implicitly has an 'any' type
function double(x) {
  return x * 2;
}

// Correct: Explicitly type the parameter
function double(x: number): number {
  return x * 2;
}
```

**React Example:**

```tsx
// Error: Parameter 'props' implicitly has an 'any' type
function UserCard(props) {
  return <div>{props.name}</div>;
}

// Correct: Define props interface
interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
}

function UserCard(props: UserCardProps) {
  return (
    <div>
      <h2>{props.name}</h2>
      <p>{props.email}</p>
      {props.avatar && <img src={props.avatar} alt={props.name} />}
    </div>
  );
}
```

### 2. strictNullChecks

This is perhaps the most impactful strict flag. It makes `null` and `undefined` distinct types that must be explicitly handled.

```typescript
// Without strictNullChecks
let name: string = null; // OK (but dangerous!)

// With strictNullChecks
let name: string = null; // Error!
let name: string | null = null; // OK - explicit about nullability
```

**React Example:**

```tsx
interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile() {
  const [user, setUser] = useState<User | null>(null);

  // Error: 'user' is possibly 'null'
  return <div>{user.name}</div>;

  // Correct: Handle the null case
  if (!user) {
    return <div>Loading...</div>;
  }
  return <div>{user.name}</div>;

  // Or use optional chaining with fallback
  return <div>{user?.name ?? "Unknown"}</div>;
}
```

### 3. strictFunctionTypes

Enables stricter checking of function types, particularly for contravariance in parameter types.

```typescript
type Handler = (event: MouseEvent) => void;

// Without strictFunctionTypes, this is allowed (dangerous!)
const handleClick: Handler = (event: Event) => {
  console.log(event.clientX); // Runtime error - Event doesn't have clientX
};

// With strictFunctionTypes, TypeScript catches this
// Error: Type '(event: Event) => void' is not assignable to type 'Handler'
```

**React Example:**

```tsx
interface ButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// Error: Handler expects more specific event type
const Button: React.FC<ButtonProps> = ({ onClick }) => {
  const handleClick = (event: React.SyntheticEvent) => {
    onClick(event); // Error!
  };

  return <button onClick={handleClick}>Click me</button>;
};

// Correct: Use the correct event type
const Button: React.FC<ButtonProps> = ({ onClick }) => {
  return <button onClick={onClick}>Click me</button>;
};
```

### 4. strictBindCallApply

Ensures that `bind`, `call`, and `apply` methods are invoked with correct argument types.

```typescript
function greet(name: string, age: number): string {
  return `Hello ${name}, you are ${age} years old`;
}

// Without strictBindCallApply
greet.call(undefined, "Alice", "thirty"); // No error (dangerous!)

// With strictBindCallApply
greet.call(undefined, "Alice", "thirty");
// Error: Argument of type 'string' is not assignable to parameter of type 'number'

// Correct
greet.call(undefined, "Alice", 30);
```

### 5. strictPropertyInitialization

Ensures class properties are initialized in the constructor or have a definite assignment assertion.

```typescript
// Error: Property 'name' has no initializer
class User {
  name: string;
  email: string;

  constructor() {
    this.name = "John";
    // Forgot to initialize email!
  }
}

// Correct: Initialize all properties
class User {
  name: string;
  email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }
}

// Or use definite assignment assertion if initialized elsewhere
class User {
  name!: string; // Initialized by dependency injection or similar
}
```

**React Class Component Example:**

```tsx
interface State {
  count: number;
}

class Counter extends React.Component<{}, State> {
  // Error: Property 'state' has no initializer
  state: State;

  // Correct: Initialize state
  state: State = {
    count: 0,
  };

  // Or initialize in constructor
  constructor(props: {}) {
    super(props);
    this.state = { count: 0 };
  }
}
```

### 6. noImplicitThis

Raises an error when `this` has an implicit `any` type.

```typescript
// Error: 'this' implicitly has type 'any'
function handleClick() {
  console.log(this.value);
}

// Correct: Explicitly type 'this'
function handleClick(this: HTMLButtonElement) {
  console.log(this.value);
}

// Or use arrow functions (no 'this' binding)
const handleClick = () => {
  // 'this' refers to lexical scope
};
```

### 7. useUnknownInCatchVariables

Types catch clause variables as `unknown` instead of `any`.

```typescript
// Without useUnknownInCatchVariables
try {
  throw new Error("Something went wrong");
} catch (error) {
  console.log(error.message); // error is 'any' - no type safety
}

// With useUnknownInCatchVariables
try {
  throw new Error("Something went wrong");
} catch (error) {
  // error is 'unknown' - must narrow the type
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

**React Example:**

```tsx
async function fetchUser(id: number): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (error) {
    // Must handle unknown type
    if (error instanceof Error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    throw new Error("Failed to fetch user: Unknown error");
  }
}
```

### 8. alwaysStrict

Ensures that JavaScript strict mode (`'use strict'`) is emitted for all files.

## Additional Type Checking Flags

Beyond the strict mode flags, there are additional compiler options that enhance type safety.

### noUnusedLocals

Reports errors on unused local variables.

```typescript
function calculateTotal(items: number[]) {
  const tax = 0.1; // Error: 'tax' is declared but never used
  return items.reduce((sum, item) => sum + item, 0);
}
```

### noUnusedParameters

Reports errors on unused function parameters.

```typescript
// Error: 'index' is declared but never used
function processItem(item: string, index: number) {
  return item.toUpperCase();
}

// Solution 1: Remove unused parameter
function processItem(item: string) {
  return item.toUpperCase();
}

// Solution 2: Prefix with underscore to indicate intentionally unused
function processItem(item: string, _index: number) {
  return item.toUpperCase();
}
```

### exactOptionalPropertyTypes

Makes optional properties truly optional, not `undefined`-assignable.

```typescript
interface Settings {
  theme?: "light" | "dark";
}

// Without exactOptionalPropertyTypes
const settings: Settings = { theme: undefined }; // OK

// With exactOptionalPropertyTypes
const settings: Settings = { theme: undefined }; // Error!
const settings: Settings = {}; // OK - property is absent
```

### noImplicitReturns

Ensures all code paths in a function return a value.

```typescript
// Error: Not all code paths return a value
function getDiscount(isPremium: boolean): number {
  if (isPremium) {
    return 0.2;
  }
  // Forgot to return for non-premium!
}

// Correct
function getDiscount(isPremium: boolean): number {
  if (isPremium) {
    return 0.2;
  }
  return 0;
}
```

### noFallthroughCasesInSwitch

Ensures switch statements have explicit breaks or returns.

```typescript
// Error: Fallthrough case in switch
function handleStatus(status: "pending" | "approved" | "rejected") {
  switch (status) {
    case "pending":
      console.log("Waiting for approval");
    // Fallthrough! Missing break
    case "approved":
      console.log("Request approved");
      break;
    case "rejected":
      console.log("Request rejected");
      break;
  }
}

// Correct: Add break or return statements
function handleStatus(status: "pending" | "approved" | "rejected") {
  switch (status) {
    case "pending":
      console.log("Waiting for approval");
      break;
    case "approved":
      console.log("Request approved");
      break;
    case "rejected":
      console.log("Request rejected");
      break;
  }
}
```

### noUncheckedIndexedAccess

Adds `undefined` to index signature returns, forcing null checks.

```typescript
interface StringMap {
  [key: string]: string;
}

const map: StringMap = { name: "John" };

// Without noUncheckedIndexedAccess
const value: string = map["email"]; // Type is string (but could be undefined!)

// With noUncheckedIndexedAccess
const value: string | undefined = map["email"]; // Must handle undefined
if (value !== undefined) {
  console.log(value.toUpperCase());
}
```

**React Example:**

```tsx
interface Product {
  id: number;
  name: string;
  price: number;
}

function ProductList({ products }: { products: Product[] }) {
  // With noUncheckedIndexedAccess
  const firstProduct = products[0]; // Type is Product | undefined

  // Must handle undefined
  if (!firstProduct) {
    return <div>No products available</div>;
  }

  return <div>{firstProduct.name}</div>;
}
```

### noImplicitOverride

Requires explicit `override` keyword when overriding base class methods.

```typescript
class Animal {
  speak() {
    console.log("Animal sound");
  }
}

// Error: Method must have 'override' modifier
class Dog extends Animal {
  speak() {
    console.log("Woof!");
  }
}

// Correct
class Dog extends Animal {
  override speak() {
    console.log("Woof!");
  }
}
```

### noPropertyAccessFromIndexSignature

Requires indexed access for properties defined via index signature.

```typescript
interface Config {
  name: string;
  [key: string]: string;
}

const config: Config = { name: "MyApp", version: "1.0.0" };

// Without noPropertyAccessFromIndexSignature
const version = config.version; // OK (but property might not exist)

// With noPropertyAccessFromIndexSignature
const version = config.version; // Error!
const version = config["version"]; // OK - explicit about dynamic access
const name = config.name; // OK - 'name' is explicitly defined
```

## Module Resolution Configuration

Proper module resolution is crucial for React projects.

### moduleResolution Options

```json
{
  "compilerOptions": {
    // For Vite, Webpack 5+, or modern bundlers
    "moduleResolution": "bundler",

    // For Node.js 16+ with ES modules
    "moduleResolution": "node16",

    // For older Node.js or CommonJS
    "moduleResolution": "node"
  }
}
```

### Path Mapping for Clean Imports

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@services/*": ["src/services/*"],
      "@assets/*": ["src/assets/*"]
    }
  }
}
```

**Usage Example:**

```tsx
// Before: Relative imports get messy
import { Button } from "../../../components/Button";
import { useAuth } from "../../hooks/useAuth";
import { formatDate } from "../../../utils/date";

// After: Clean alias imports
import { Button } from "@components/Button";
import { useAuth } from "@hooks/useAuth";
import { formatDate } from "@utils/date";
```

Note: You'll need to configure your bundler to understand these aliases as well (e.g., `vite.config.ts` or `webpack.config.js`).

## React-Specific TypeScript Configuration

### JSX Configuration

```json
{
  "compilerOptions": {
    // For React 17+ (automatic JSX runtime)
    "jsx": "react-jsx",

    // For React 16 and below
    "jsx": "react"
  }
}
```

### Typing React Components

**Function Components:**

```tsx
// Using React.FC (includes children by default in older React types)
const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};

// Preferred: Explicit typing (more control)
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

function Button({ children, onClick, variant = "primary" }: ButtonProps) {
  return (
    <button onClick={onClick} className={variant}>
      {children}
    </button>
  );
}
```

**Generic Components:**

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
interface User {
  id: number;
  name: string;
}

<List<User>
  items={users}
  renderItem={(user) => <span>{user.name}</span>}
  keyExtractor={(user) => user.id}
/>;
```

**Typing Hooks:**

```tsx
// useState with complex types
interface FormState {
  name: string;
  email: string;
  errors: Record<string, string>;
}

const [form, setForm] = useState<FormState>({
  name: "",
  email: "",
  errors: {},
});

// useRef with strict types
const inputRef = useRef<HTMLInputElement>(null);

// Later use requires null check with strictNullChecks
if (inputRef.current) {
  inputRef.current.focus();
}

// useCallback with typed parameters
const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // Handle form submission
}, []);
```

**Typing Context:**

```tsx
interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook with type guard
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

## Project Structure for TypeScript React Projects

Here's a recommended project structure:

```
my-react-app/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFetch.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── types/
│   │   ├── api.ts
│   │   ├── user.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   ├── pages/
│   │   └── ...
│   ├── App.tsx
│   └── main.tsx
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── package.json
```

### Multiple tsconfig Files

For projects with different environments (e.g., Vite config uses Node.js):

**tsconfig.json (main config):**

```json
{
  "compilerOptions": {
    // ... all strict options
  },
  "include": ["src/**/*"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**tsconfig.node.json (for Node.js config files):**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

## Common Strict Mode Challenges and Solutions

### Challenge 1: Third-Party Libraries Without Types

```typescript
// Error: Could not find a declaration file for module 'some-library'
import something from "some-library";

// Solution 1: Install types if available
// npm install --save-dev @types/some-library

// Solution 2: Create a declaration file (src/types/some-library.d.ts)
declare module "some-library" {
  export function doSomething(value: string): number;
  export default class SomeClass {
    constructor(options: Record<string, unknown>);
  }
}

// Solution 3: Use require with any type (not recommended)
const something = require("some-library") as any;
```

### Challenge 2: Event Handler Types

```tsx
// Error: Event type is too generic
function handleChange(event: React.ChangeEvent) {
  console.log(event.target.value); // Error: Property 'value' does not exist
}

// Solution: Be specific about the element type
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  console.log(event.target.value); // OK
}

// For select elements
function handleSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
  console.log(event.target.value);
}
```

### Challenge 3: Object Keys Iteration

```typescript
interface Person {
  name: string;
  age: number;
}

const person: Person = { name: "John", age: 30 };

// Error with strict settings
Object.keys(person).forEach((key) => {
  console.log(person[key]); // Error: Element implicitly has an 'any' type
});

// Solution 1: Type assertion
(Object.keys(person) as Array<keyof Person>).forEach((key) => {
  console.log(person[key]);
});

// Solution 2: Use Object.entries
Object.entries(person).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});

// Solution 3: Type-safe helper function
function typedKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

typedKeys(person).forEach((key) => {
  console.log(person[key]);
});
```

### Challenge 4: Async Component Data

```tsx
interface User {
  id: number;
  name: string;
}

function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        const data: User = await response.json();
        setUser(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("Unknown error occurred"));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  // TypeScript now knows user is not null
  return <div>{user.name}</div>;
}
```

### Challenge 5: Form Handling with Strict Types

```tsx
interface FormData {
  username: string;
  email: string;
  password: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    // Type-safe update
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username) {
      newErrors.username = "Username is required";
    }

    if (!formData.email.includes("@")) {
      newErrors.email = "Invalid email address";
    }

    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validate()) {
      // Submit form
      console.log("Form submitted:", formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Username"
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>
      <div>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      <div>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>
      <button type="submit">Register</button>
    </form>
  );
}
```

## ESLint Integration for TypeScript

Combine TypeScript's strict mode with ESLint for even better code quality.

### Installing ESLint with TypeScript Support

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
```

### ESLint Configuration (.eslintrc.json)

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    },
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/strict",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "react/react-in-jsx-scope": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

## Summary: Complete tsconfig.json Reference Table

Here's a comprehensive table of all the strict and recommended TypeScript compiler options for React projects:

| Option | Category | Default | Recommended | Description |
|--------|----------|---------|-------------|-------------|
| `strict` | Strict | `false` | `true` | Enables all strict type-checking options |
| `noImplicitAny` | Strict | `false` | `true` | Error on expressions and declarations with implied `any` type |
| `strictNullChecks` | Strict | `false` | `true` | Makes `null` and `undefined` distinct types |
| `strictFunctionTypes` | Strict | `false` | `true` | Enables strict checking of function types |
| `strictBindCallApply` | Strict | `false` | `true` | Enables strict checking of `bind`, `call`, and `apply` |
| `strictPropertyInitialization` | Strict | `false` | `true` | Ensures class properties are initialized |
| `noImplicitThis` | Strict | `false` | `true` | Error on `this` expressions with implied `any` type |
| `useUnknownInCatchVariables` | Strict | `false` | `true` | Types catch variables as `unknown` instead of `any` |
| `alwaysStrict` | Strict | `false` | `true` | Ensures JavaScript strict mode is emitted |
| `noUnusedLocals` | Additional | `false` | `true` | Reports errors on unused local variables |
| `noUnusedParameters` | Additional | `false` | `true` | Reports errors on unused parameters |
| `exactOptionalPropertyTypes` | Additional | `false` | `true` | Differentiates between `undefined` and missing properties |
| `noImplicitReturns` | Additional | `false` | `true` | Ensures all code paths return a value |
| `noFallthroughCasesInSwitch` | Additional | `false` | `true` | Reports errors for fallthrough cases in switch |
| `noUncheckedIndexedAccess` | Additional | `false` | `true` | Adds `undefined` to index signature returns |
| `noImplicitOverride` | Additional | `false` | `true` | Requires `override` keyword for overridden methods |
| `noPropertyAccessFromIndexSignature` | Additional | `false` | `true` | Requires indexed access for index signature properties |
| `allowUnusedLabels` | Additional | `true` | `false` | Disallows unused labels |
| `allowUnreachableCode` | Additional | `true` | `false` | Disallows unreachable code |
| `target` | Language | `ES3` | `ES2022` | ECMAScript target version |
| `lib` | Language | varies | `["ES2022", "DOM", "DOM.Iterable"]` | Library files to include |
| `jsx` | Language | `undefined` | `react-jsx` | JSX code generation (React 17+) |
| `module` | Module | `CommonJS` | `ESNext` | Module code generation |
| `moduleResolution` | Module | `Classic` | `bundler` | Module resolution strategy |
| `esModuleInterop` | Module | `false` | `true` | Enables ES module interoperability |
| `allowSyntheticDefaultImports` | Module | `false` | `true` | Allows default imports from modules with no default export |
| `resolveJsonModule` | Module | `false` | `true` | Enables importing JSON files |
| `isolatedModules` | Module | `false` | `true` | Ensures each file can be safely transpiled |
| `forceConsistentCasingInFileNames` | Module | `false` | `true` | Ensures consistent file name casing |
| `skipLibCheck` | Performance | `false` | `true` | Skips type checking of declaration files |
| `noEmit` | Emit | `false` | `true` | Disables emitting files (when using bundler) |
| `sourceMap` | Emit | `false` | `true` | Generates source map files |

## Conclusion

Setting up strict TypeScript configuration for React projects is an investment that pays dividends throughout your project's lifecycle. While it may require more upfront effort to satisfy the type checker, the benefits are substantial:

1. **Fewer Runtime Errors**: Many bugs are caught at compile time rather than in production
2. **Better Developer Experience**: Improved autocomplete, refactoring, and documentation
3. **Easier Maintenance**: Self-documenting code that's easier to understand and modify
4. **Safer Refactoring**: Confidence that changes won't break existing functionality
5. **Team Scalability**: New team members can understand the codebase faster

Start with the configuration provided in this guide and adjust based on your team's needs. Remember that you can gradually adopt stricter settings if migrating an existing project. The key is to find the right balance between type safety and development velocity for your specific use case.

By combining TypeScript's strict mode with ESLint and following best practices for typing React components, you'll build more robust, maintainable applications that stand the test of time.

## Additional Resources

- [TypeScript Official Documentation](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript Compiler Options Reference](https://www.typescriptlang.org/tsconfig)
- [ESLint TypeScript Plugin](https://typescript-eslint.io/)
