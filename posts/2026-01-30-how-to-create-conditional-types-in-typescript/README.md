# How to Create Conditional Types in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Types, Conditional, Advanced

Description: Learn how to use conditional types in TypeScript for powerful type-level programming and type inference.

---

Conditional types are one of the most powerful features in TypeScript's type system. They allow you to create types that depend on other types, enabling sophisticated type-level programming and inference. In this post, we will explore how to create and use conditional types effectively.

## Understanding the Extends Keyword in Types

At the heart of conditional types is the `extends` keyword. In type context, `extends` acts like a type-level ternary operator, checking if one type is assignable to another.

The basic syntax follows this pattern:

```typescript
type ConditionalType<T> = T extends SomeType ? TrueType : FalseType;
```

Here is a practical example:

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
type C = IsString<"hello">; // true (literal types extend their base type)
```

This creates a type-level function that returns `true` if the input type is a string, and `false` otherwise.

## The Infer Keyword for Type Extraction

The `infer` keyword allows you to extract types from within other types. It can only be used within the `extends` clause of a conditional type.

```typescript
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type Func = (x: number, y: string) => boolean;
type Result = GetReturnType<Func>; // boolean
```

You can use `infer` to extract multiple types:

```typescript
type GetFirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

type FirstArg = GetFirstArg<(name: string, age: number) => void>; // string
```

Here is another example extracting element types from arrays:

```typescript
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type Numbers = ArrayElement<number[]>; // number
type Mixed = ArrayElement<(string | number)[]>; // string | number
```

## Distributive Conditional Types

When a conditional type acts on a generic type parameter that is a union, it becomes distributive. This means the conditional type is applied to each member of the union individually.

```typescript
type ToArray<T> = T extends any ? T[] : never;

type StrOrNumArray = ToArray<string | number>;
// Result: string[] | number[] (not (string | number)[])
```

The distribution happens automatically when `T` is a naked type parameter. To prevent distribution, wrap the type parameter in a tuple:

```typescript
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type StrOrNumArray = ToArrayNonDist<string | number>;
// Result: (string | number)[]
```

## Built-in Conditional Types

TypeScript provides several utility types built with conditional types that you should know:

### Exclude and Extract

`Exclude` removes types from a union that are assignable to another type:

```typescript
type T0 = Exclude<"a" | "b" | "c", "a">;  // "b" | "c"
type T1 = Exclude<string | number | (() => void), Function>; // string | number
```

`Extract` does the opposite, keeping only types assignable to another type:

```typescript
type T2 = Extract<"a" | "b" | "c", "a" | "f">;  // "a"
type T3 = Extract<string | number | (() => void), Function>; // () => void
```

### NonNullable

`NonNullable` removes `null` and `undefined` from a type:

```typescript
type T4 = NonNullable<string | number | undefined | null>; // string | number
```

Here is how these utility types are implemented:

```typescript
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T extends null | undefined ? never : T;
```

## Practical Examples

Let us build some useful conditional types for real-world scenarios.

### Flatten Nested Types

```typescript
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;

type Nested = number[][][];
type Flat = Flatten<Nested>; // number
```

### Create a Deep Readonly Type

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

interface User {
  name: string;
  address: {
    city: string;
    zip: number;
  };
}

type ReadonlyUser = DeepReadonly<User>;
// All nested properties are now readonly
```

### Conditional Property Picker

```typescript
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Mixed {
  name: string;
  age: number;
  active: boolean;
  email: string;
}

type StringProps = PickByType<Mixed, string>;
// { name: string; email: string; }
```

## Conclusion

Conditional types unlock powerful type-level programming capabilities in TypeScript. By combining the `extends` keyword for type checking, the `infer` keyword for type extraction, and understanding distributive behavior, you can create sophisticated type utilities that make your code safer and more expressive. Start with the built-in utility types and gradually build your own as you encounter patterns in your codebase that could benefit from type-level logic.
