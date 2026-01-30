# How to Implement Branded Types in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Types, Branding, Type Safety

Description: Learn how to use branded types in TypeScript to create distinct types that prevent accidental type mixing at compile time.

---

TypeScript's structural typing system is powerful, but it can sometimes lead to subtle bugs when different values share the same underlying type. Branded types solve this problem by creating nominally distinct types that the compiler can differentiate, even when their runtime representations are identical.

## What Are Branded Types?

Branded types (also called opaque types or nominal types) are a pattern that adds a unique "brand" to a type, making it distinct from other types with the same structure. This prevents accidental mixing of semantically different values that happen to share the same primitive type.

Consider this common problem:

```typescript
function processOrder(userId: string, orderId: string) {
  // What if someone passes orderId as userId?
}

const userId = "user-123";
const orderId = "order-456";

// This compiles without error - dangerous!
processOrder(orderId, userId);
```

Both parameters are strings, so TypeScript cannot catch the mistake. Branded types fix this.

## Creating Brands with Unique Symbols

The most robust way to create branded types is using unique symbols. This ensures that each brand is truly unique and cannot be accidentally replicated.

```typescript
// Define unique symbols for each brand
declare const UserIdBrand: unique symbol;
declare const OrderIdBrand: unique symbol;

// Create branded types using intersection
type UserId = string & { readonly [UserIdBrand]: typeof UserIdBrand };
type OrderId = string & { readonly [OrderIdBrand]: typeof OrderIdBrand };

// Type-safe constructor functions
function createUserId(id: string): UserId {
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  return id as OrderId;
}
```

The `unique symbol` ensures that each brand is globally unique, even across different modules.

## UserId vs OrderId Example

Now let's see how branded types prevent mixing:

```typescript
function processOrder(userId: UserId, orderId: OrderId) {
  console.log(`Processing order ${orderId} for user ${userId}`);
}

const userId = createUserId("user-123");
const orderId = createOrderId("order-456");

// This works correctly
processOrder(userId, orderId);

// These all fail at compile time!
processOrder(orderId, userId);  // Error: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'
processOrder("user-123", orderId);  // Error: Argument of type 'string' is not assignable to parameter of type 'UserId'
processOrder(userId, "order-456");  // Error: Argument of type 'string' is not assignable to parameter of type 'OrderId'
```

The compiler now catches all incorrect usages, making your code significantly safer.

## A Reusable Brand Type Helper

You can create a generic helper to simplify brand creation:

```typescript
declare const __brand: unique symbol;

type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// Now creating branded types is concise
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
type Email = Brand<string, "Email">;
type PositiveNumber = Brand<number, "PositiveNumber">;
```

## Runtime Validation with Brands

Branded types work best when combined with runtime validation. This ensures that values not only have the correct type but also meet business rules.

```typescript
type Email = Brand<string, "Email">;

function createEmail(input: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input)) {
    throw new Error(`Invalid email format: ${input}`);
  }
  return input as Email;
}

type PositiveNumber = Brand<number, "PositiveNumber">;

function createPositiveNumber(input: number): PositiveNumber {
  if (input <= 0) {
    throw new Error(`Number must be positive: ${input}`);
  }
  return input as PositiveNumber;
}

// Usage with validation
const userEmail = createEmail("user@example.com");  // Valid
const quantity = createPositiveNumber(5);  // Valid

createEmail("invalid-email");  // Throws at runtime
createPositiveNumber(-1);  // Throws at runtime
```

## Zod Integration

Zod is a popular validation library that integrates beautifully with branded types. You can use Zod's `.brand()` method to create validated branded types:

```typescript
import { z } from "zod";

// Define branded schemas with validation
const UserIdSchema = z.string()
  .min(1)
  .startsWith("user-")
  .brand<"UserId">();

const OrderIdSchema = z.string()
  .min(1)
  .startsWith("order-")
  .brand<"OrderId">();

const EmailSchema = z.string()
  .email()
  .brand<"Email">();

// Infer the branded types
type UserId = z.infer<typeof UserIdSchema>;
type OrderId = z.infer<typeof OrderIdSchema>;
type Email = z.infer<typeof EmailSchema>;

// Parse and validate input
const userId = UserIdSchema.parse("user-123");  // Returns UserId
const orderId = OrderIdSchema.parse("order-456");  // Returns OrderId
const email = EmailSchema.parse("user@example.com");  // Returns Email

// Invalid input throws ZodError
UserIdSchema.parse("invalid");  // Throws: String must start with "user-"
EmailSchema.parse("not-an-email");  // Throws: Invalid email
```

Zod's `.safeParse()` method returns a result object instead of throwing:

```typescript
const result = EmailSchema.safeParse(userInput);

if (result.success) {
  const email: Email = result.data;
  sendEmail(email);
} else {
  console.error(result.error.issues);
}
```

## Conclusion

Branded types are a powerful pattern for adding compile-time type safety to values that would otherwise be indistinguishable. By combining unique symbols with runtime validation (optionally through libraries like Zod), you can create robust APIs that catch bugs early and make your codebase more maintainable. Start using branded types in your TypeScript projects today to prevent those subtle bugs caused by accidentally swapping similar values.
