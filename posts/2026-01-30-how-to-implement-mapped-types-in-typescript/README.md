# How to Implement Mapped Types in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Types, Advanced, Generics

Description: Learn how to use mapped types in TypeScript to transform existing types into new ones with powerful type manipulations.

---

Mapped types are one of TypeScript's most powerful features, allowing you to create new types by transforming properties of existing types. They enable you to write DRY, maintainable type definitions that automatically adapt when your base types change.

## Understanding the keyof Operator

Before diving into mapped types, you need to understand the `keyof` operator. It extracts all property keys from a type as a union of string literals:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type UserKeys = keyof User; // "id" | "name" | "email"
```

This union type becomes the foundation for iterating over properties in mapped types.

## Mapped Type Syntax

The basic syntax for a mapped type uses the `in` keyword to iterate over a union of keys:

```typescript
type MappedType<T> = {
  [K in keyof T]: T[K];
};
```

This creates a new type with the same properties and types as the original. The `K in keyof T` part iterates over each key in `T`, and `T[K]` accesses the type of that property.

Here is a practical example that converts all properties to strings:

```typescript
type Stringify<T> = {
  [K in keyof T]: string;
};

type StringifiedUser = Stringify<User>;
// { id: string; name: string; email: string; }
```

## Property Modifiers: readonly and optional

Mapped types can add or remove modifiers using `+` and `-` prefixes. The two available modifiers are `readonly` and `?` (optional).

### Adding Modifiers

```typescript
type ReadonlyType<T> = {
  readonly [K in keyof T]: T[K];
};

type OptionalType<T> = {
  [K in keyof T]?: T[K];
};

type ReadonlyUser = ReadonlyType<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

type OptionalUser = OptionalType<User>;
// { id?: number; name?: string; email?: string; }
```

### Removing Modifiers

Use the `-` prefix to remove existing modifiers:

```typescript
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type Required<T> = {
  [K in keyof T]-?: T[K];
};

interface PartialConfig {
  readonly host?: string;
  readonly port?: number;
}

type WritableRequiredConfig = Mutable<Required<PartialConfig>>;
// { host: string; port: number; }
```

## Built-in Mapped Types

TypeScript provides several utility types that are implemented as mapped types:

### Partial<T>

Makes all properties optional:

```typescript
type Partial<T> = {
  [K in keyof T]?: T[K];
};

function updateUser(user: User, updates: Partial<User>): User {
  return { ...user, ...updates };
}

updateUser(existingUser, { name: "New Name" }); // Only update name
```

### Required<T>

Makes all properties required:

```typescript
type Required<T> = {
  [K in keyof T]-?: T[K];
};
```

### Readonly<T>

Makes all properties readonly:

```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

const frozenUser: Readonly<User> = { id: 1, name: "John", email: "john@example.com" };
// frozenUser.name = "Jane"; // Error: Cannot assign to 'name' because it is a read-only property
```

### Pick<T, K> and Omit<T, K>

Select or exclude specific properties:

```typescript
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type UserCredentials = Pick<User, "email" | "id">;
// { email: string; id: number; }

type PublicUser = Omit<User, "email">;
// { id: number; name: string; }
```

## Creating Custom Mapped Types

You can build sophisticated type transformations by combining mapped types with conditional types and template literal types:

```typescript
// Prefix all keys with "get"
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string; }

// Make only certain properties nullable
type Nullable<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? T[P] | null : T[P];
};

type UserWithNullableEmail = Nullable<User, "email">;
// { id: number; name: string; email: string | null; }
```

## Conclusion

Mapped types transform how you write type definitions in TypeScript. By mastering the `keyof` operator, understanding modifier syntax, and leveraging built-in utilities, you can create flexible, maintainable types that evolve with your codebase. Start with the built-in types like `Partial` and `Readonly`, then gradually build custom mapped types as your needs grow more sophisticated.
