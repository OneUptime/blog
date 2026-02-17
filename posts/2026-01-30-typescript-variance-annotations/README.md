# How to Create Variance Annotations in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Type System, Generics, Advanced Types

Description: Understand and use variance annotations (in/out) in TypeScript 4.7+ to explicitly declare covariance and contravariance for generic type parameters.

---

TypeScript 4.7 introduced explicit variance annotations for generic type parameters. These annotations let you tell the compiler exactly how a type parameter should behave with respect to subtyping. This feature improves type safety, makes your code more readable, and can significantly speed up type checking in large codebases.

This guide covers the theory behind variance, shows you how to use the `in` and `out` modifiers, and walks through real-world examples you can use in production.

---

## Table of Contents

1. What is Variance?
2. Covariance (out)
3. Contravariance (in)
4. Invariance
5. Bivariance
6. Syntax for Variance Annotations
7. When to Use Explicit Annotations
8. Performance Benefits
9. Real-World Examples
10. Common Mistakes and How to Avoid Them
11. Migration Guide for Existing Code
12. Summary

---

## 1. What is Variance?

Variance describes how subtyping between complex types relates to subtyping between their components. When you have a generic type like `Box<T>`, variance tells you whether `Box<Dog>` is a subtype, supertype, or neither of `Box<Animal>` (assuming `Dog extends Animal`).

There are four kinds of variance:

| Variance Type | Relationship | Example |
|---------------|--------------|---------|
| Covariant | `Box<Dog>` is subtype of `Box<Animal>` | Read-only containers, return types |
| Contravariant | `Box<Animal>` is subtype of `Box<Dog>` | Write-only containers, function parameters |
| Invariant | No subtype relationship | Mutable containers with read and write |
| Bivariant | Both directions work | Legacy TypeScript method parameters |

Understanding variance helps you write safer generic code and avoid runtime type errors that slip past the compiler.

---

## 2. Covariance (out)

A type parameter is covariant when it only appears in output positions - return types and read-only properties. The `out` modifier marks a type parameter as covariant.

Think of it this way: if you have a function that returns `Dog`, you can safely use it where a function returning `Animal` is expected. A `Dog` is always an `Animal`.

### Basic Covariant Interface

The following interface demonstrates covariance. The type parameter `T` only appears as an output (the return type of `get`).

```typescript
// Covariant interface - T only appears in output positions
interface Producer<out T> {
    get(): T;
}

class Animal {
    name: string = "animal";
}

class Dog extends Animal {
    bark(): void {
        console.log("Woof!");
    }
}

// This works because Producer is covariant in T
// Producer<Dog> is a subtype of Producer<Animal>
const dogProducer: Producer<Dog> = {
    get() {
        return new Dog();
    }
};

// Safe assignment - a producer of dogs can be used as a producer of animals
const animalProducer: Producer<Animal> = dogProducer;

// This correctly returns a Dog (which is an Animal)
const animal = animalProducer.get();
console.log(animal.name); // Works fine
```

### Read-Only Collections

Read-only arrays are a classic example of covariance. Since you can only read from them, a readonly array of dogs is safely usable as a readonly array of animals.

```typescript
// ReadonlyArray is covariant
interface ReadonlyBox<out T> {
    readonly value: T;
    getValue(): T;
}

function processAnimals(box: ReadonlyBox<Animal>): void {
    console.log(box.value.name);
}

const dogBox: ReadonlyBox<Dog> = {
    value: new Dog(),
    getValue() {
        return this.value;
    }
};

// This works - ReadonlyBox<Dog> is subtype of ReadonlyBox<Animal>
processAnimals(dogBox);
```

### Promises and Async Results

Promises are naturally covariant because you only read from them (via `then` or `await`).

```typescript
// Promise-like covariant type
interface AsyncResult<out T> {
    then<R>(callback: (value: T) => R): AsyncResult<R>;
}

async function fetchDog(): Promise<Dog> {
    return new Dog();
}

// Promise<Dog> is assignable to Promise<Animal>
async function processAnimal(promise: Promise<Animal>): Promise<void> {
    const animal = await promise;
    console.log(animal.name);
}

// Works correctly
processAnimal(fetchDog());
```

---

## 3. Contravariance (in)

A type parameter is contravariant when it only appears in input positions - function parameters and write-only properties. The `in` modifier marks a type parameter as contravariant.

The relationship flips: if you have a function that accepts `Animal`, you can safely use it where a function accepting `Dog` is expected. Any `Dog` you pass will be valid for a function that handles all `Animal` types.

### Basic Contravariant Interface

The following interface is contravariant because `T` only appears as an input parameter.

```typescript
// Contravariant interface - T only appears in input positions
interface Consumer<in T> {
    accept(value: T): void;
}

// This works because Consumer is contravariant in T
// Consumer<Animal> is a subtype of Consumer<Dog>
const animalConsumer: Consumer<Animal> = {
    accept(animal: Animal): void {
        console.log(`Processing: ${animal.name}`);
    }
};

// Safe assignment - a consumer of animals can handle dogs
const dogConsumer: Consumer<Dog> = animalConsumer;

// This correctly accepts a Dog
dogConsumer.accept(new Dog());
```

### Event Handlers and Callbacks

Event handlers are a practical example of contravariance. A handler for general events can substitute for a handler of specific events.

```typescript
// Base event and specific event types
class UIEvent {
    timestamp: number = Date.now();
}

class ClickEvent extends UIEvent {
    x: number = 0;
    y: number = 0;
}

class KeyEvent extends UIEvent {
    key: string = "";
}

// Contravariant event handler
interface EventHandler<in E> {
    handle(event: E): void;
}

// Generic UI event handler
const uiHandler: EventHandler<UIEvent> = {
    handle(event: UIEvent): void {
        console.log(`Event at ${event.timestamp}`);
    }
};

// A handler for UIEvent can be used where ClickEvent handler is needed
const clickHandler: EventHandler<ClickEvent> = uiHandler;
const keyHandler: EventHandler<KeyEvent> = uiHandler;

// Both work correctly
clickHandler.handle(new ClickEvent());
keyHandler.handle(new KeyEvent());
```

### Comparison Functions

Comparators are another common contravariant pattern.

```typescript
// Contravariant comparator
interface Comparator<in T> {
    compare(a: T, b: T): number;
}

const animalComparator: Comparator<Animal> = {
    compare(a: Animal, b: Animal): number {
        return a.name.localeCompare(b.name);
    }
};

// Can use animal comparator to compare dogs
const dogComparator: Comparator<Dog> = animalComparator;

const dogs: Dog[] = [new Dog(), new Dog()];
dogs[0].name = "Rex";
dogs[1].name = "Buddy";

// Sort dogs using the comparator
dogs.sort((a, b) => dogComparator.compare(a, b));
```

---

## 4. Invariance

When a type parameter appears in both input and output positions, it is invariant. No variance annotation can be applied, and `Box<Dog>` has no subtype relationship with `Box<Animal>`.

### Mutable Containers

Mutable containers must be invariant to maintain type safety.

```typescript
// No variance annotation - T appears in both positions
interface MutableBox<T> {
    value: T;
    get(): T;      // output position - would want covariance
    set(v: T): void; // input position - would want contravariance
}

const dogBox: MutableBox<Dog> = {
    value: new Dog(),
    get() { return this.value; },
    set(v: Dog) { this.value = v; }
};

// This correctly fails to compile
// const animalBox: MutableBox<Animal> = dogBox; // Error!

// Why? If this were allowed:
// animalBox.set(new Animal()); // Would put an Animal in dogBox
// dogBox.get().bark(); // Runtime error - Animal has no bark()
```

### Why Invariance Matters

Here is a concrete example showing why mutable containers cannot be covariant.

```typescript
class Cat extends Animal {
    meow(): void {
        console.log("Meow!");
    }
}

// Hypothetical if MutableBox were covariant (it is not)
function processAnimals(box: MutableBox<Animal>): void {
    // We could legally put a Cat in the box
    box.set(new Cat());
}

const dogBox: MutableBox<Dog> = {
    value: new Dog(),
    get() { return this.value; },
    set(v: Dog) { this.value = v; }
};

// If this assignment worked (it does not):
// processAnimals(dogBox);
// dogBox.get().bark(); // Runtime crash - it is a Cat now!
```

---

## 5. Bivariance

Bivariance means a type works in both covariant and contravariant positions. TypeScript historically treated method parameters as bivariant for compatibility reasons. With strict mode enabled, function types are properly contravariant in their parameters.

### The strictFunctionTypes Flag

```typescript
// With strictFunctionTypes: false (default in loose mode)
// Method parameter types are bivariant

interface Loose {
    method(x: Animal): void;
}

interface Strict {
    method: (x: Animal) => void;
}

const looseHandler: Loose = {
    method(x: Dog): void {  // Bivariant - accepts Dog where Animal expected
        x.bark();
    }
};

// With strictFunctionTypes: true
// Function types are contravariant in parameter types
// The Strict interface above would correctly reject narrower parameter types
```

### Recommendation

Always enable `strictFunctionTypes` in your `tsconfig.json`:

```json
{
    "compilerOptions": {
        "strict": true,
        "strictFunctionTypes": true
    }
}
```

---

## 6. Syntax for Variance Annotations

TypeScript 4.7 added the `in` and `out` modifiers for explicit variance declarations.

### Syntax Reference

| Annotation | Position | Meaning |
|------------|----------|---------|
| `out T` | Covariant | T only in output positions |
| `in T` | Contravariant | T only in input positions |
| `in out T` | Invariant | T in both positions (explicit) |
| `T` (none) | Inferred | TypeScript figures it out |

### Basic Syntax Examples

```typescript
// Covariant - T only appears as output
interface Getter<out T> {
    get(): T;
}

// Contravariant - T only appears as input
interface Setter<in T> {
    set(value: T): void;
}

// Invariant - T appears in both positions
interface Property<in out T> {
    get(): T;
    set(value: T): void;
}

// Multiple type parameters with different variances
interface Transform<in I, out O> {
    transform(input: I): O;
}
```

### Compile-Time Enforcement

TypeScript enforces variance annotations. Using a type parameter in the wrong position causes an error.

```typescript
// Error: Type parameter T is covariant but used in input position
interface BadProducer<out T> {
    get(): T;
    set(value: T): void;  // Error! T cannot appear here
}

// Error: Type parameter T is contravariant but used in output position
interface BadConsumer<in T> {
    accept(value: T): void;
    retrieve(): T;  // Error! T cannot appear here
}
```

---

## 7. When to Use Explicit Annotations

While TypeScript infers variance automatically, explicit annotations provide several benefits.

### Benefits of Explicit Variance

| Benefit | Description |
|---------|-------------|
| Documentation | Makes intent clear to readers |
| Safety | Catches mistakes at definition time |
| Performance | Faster type checking in large codebases |
| Stability | Prevents accidental variance changes |

### When to Add Annotations

Use explicit variance annotations when:

1. The interface is part of a public API
2. You want to guarantee stability across versions
3. Type checking is slow and you want optimization
4. The variance is intentional and should be documented

```typescript
// Public API - explicit variance documents intent
export interface Repository<out T> {
    findById(id: string): T | null;
    findAll(): T[];
}

// Internal type - inference is fine
interface InternalCache<T> {
    get(key: string): T | undefined;
    set(key: string, value: T): void;
}
```

### When to Skip Annotations

Omit variance annotations when:

1. The type is simple and obvious
2. It is internal implementation detail
3. Variance might change during development

---

## 8. Performance Benefits

Explicit variance annotations can significantly speed up type checking. Without annotations, TypeScript must analyze every use of a type parameter to infer variance. With annotations, this analysis is skipped.

### Benchmark Scenario

In large codebases with complex generic hierarchies, explicit variance can reduce type-check times noticeably.

```typescript
// Without annotation - TypeScript must infer variance
interface SlowIterator<T> {
    next(): T | null;
    map<R>(fn: (item: T) => R): SlowIterator<R>;
    filter(predicate: (item: T) => boolean): SlowIterator<T>;
    // Many more methods...
}

// With annotation - variance is known immediately
interface FastIterator<out T> {
    next(): T | null;
    map<R>(fn: (item: T) => R): FastIterator<R>;
    filter(predicate: (item: T) => boolean): FastIterator<T>;
    // Many more methods...
}
```

### Library Authors

If you maintain a TypeScript library used by others, adding variance annotations to your public interfaces can improve compile times for your users.

```typescript
// Good practice for library types
export interface Observable<out T> {
    subscribe(observer: Observer<T>): Subscription;
    pipe<R>(...operators: Operator<T, R>[]): Observable<R>;
}

export interface Observer<in T> {
    next(value: T): void;
    error(err: Error): void;
    complete(): void;
}
```

---

## 9. Real-World Examples

### Event Emitter Pattern

A type-safe event emitter using both covariance and contravariance.

```typescript
// Events map type parameter to payload type
interface Events {
    userLoggedIn: { userId: string; timestamp: Date };
    orderPlaced: { orderId: string; total: number };
    error: { message: string; code: number };
}

// Contravariant listener - accepts event payloads
interface EventListener<in T> {
    handle(event: T): void;
}

// Covariant event source - produces event payloads
interface EventSource<out T> {
    getLatest(): T | null;
    subscribe(listener: EventListener<T>): void;
}

// Type-safe event emitter
class TypedEmitter<E extends Record<string, unknown>> {
    private listeners = new Map<keyof E, EventListener<any>[]>();

    on<K extends keyof E>(event: K, listener: EventListener<E[K]>): void {
        const list = this.listeners.get(event) || [];
        list.push(listener);
        this.listeners.set(event, list);
    }

    emit<K extends keyof E>(event: K, payload: E[K]): void {
        const list = this.listeners.get(event) || [];
        for (const listener of list) {
            listener.handle(payload);
        }
    }
}

// Usage
const emitter = new TypedEmitter<Events>();

emitter.on("userLoggedIn", {
    handle(event) {
        console.log(`User ${event.userId} logged in at ${event.timestamp}`);
    }
});

emitter.emit("userLoggedIn", { userId: "123", timestamp: new Date() });
```

### Repository Pattern

A read-write split repository demonstrating variance in practice.

```typescript
// Entity base type
interface Entity {
    id: string;
    createdAt: Date;
}

interface User extends Entity {
    email: string;
    role: "admin" | "user";
}

interface Product extends Entity {
    name: string;
    price: number;
}

// Read-only repository - covariant
interface ReadRepository<out T extends Entity> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    count(): Promise<number>;
}

// Write-only repository - contravariant
interface WriteRepository<in T extends Entity> {
    save(entity: T): Promise<void>;
    delete(entity: T): Promise<void>;
}

// Full repository - invariant (no annotation)
interface Repository<T extends Entity>
    extends ReadRepository<T>, WriteRepository<T> {}

// Implementation
class UserRepository implements Repository<User> {
    private storage = new Map<string, User>();

    async findById(id: string): Promise<User | null> {
        return this.storage.get(id) || null;
    }

    async findAll(): Promise<User[]> {
        return Array.from(this.storage.values());
    }

    async count(): Promise<number> {
        return this.storage.size;
    }

    async save(user: User): Promise<void> {
        this.storage.set(user.id, user);
    }

    async delete(user: User): Promise<void> {
        this.storage.delete(user.id);
    }
}

// Usage demonstrating variance
async function logAllEntities(repo: ReadRepository<Entity>): Promise<void> {
    const entities = await repo.findAll();
    for (const entity of entities) {
        console.log(`Entity ${entity.id} created at ${entity.createdAt}`);
    }
}

const userRepo = new UserRepository();
// Works - ReadRepository<User> is subtype of ReadRepository<Entity>
await logAllEntities(userRepo);
```

### State Management Pattern

A flux-like state management system using variance.

```typescript
// State types
interface AppState {
    user: UserState;
    products: ProductState;
}

interface UserState {
    currentUser: User | null;
    isLoading: boolean;
}

interface ProductState {
    items: Product[];
    selectedId: string | null;
}

// Action consumer - contravariant
interface ActionHandler<in A> {
    canHandle(action: unknown): action is A;
    handle(action: A): void;
}

// State selector - covariant
interface Selector<out S> {
    select(state: AppState): S;
}

// Store slice with both
interface StoreSlice<St, in A> {
    getState(): St;
    dispatch(action: A): void;
    subscribe(listener: (state: St) => void): () => void;
}

// Concrete actions
interface LoadUserAction {
    type: "LOAD_USER";
    userId: string;
}

interface SetUserAction {
    type: "SET_USER";
    user: User;
}

type UserAction = LoadUserAction | SetUserAction;

// Implementation
class UserSlice implements StoreSlice<UserState, UserAction> {
    private state: UserState = { currentUser: null, isLoading: false };
    private listeners: ((state: UserState) => void)[] = [];

    getState(): UserState {
        return this.state;
    }

    dispatch(action: UserAction): void {
        switch (action.type) {
            case "LOAD_USER":
                this.state = { ...this.state, isLoading: true };
                break;
            case "SET_USER":
                this.state = { currentUser: action.user, isLoading: false };
                break;
        }
        this.notify();
    }

    subscribe(listener: (state: UserState) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }
}
```

### Middleware Pattern

Express-like middleware demonstrating contravariance.

```typescript
// Request types
interface BaseRequest {
    method: string;
    path: string;
    headers: Record<string, string>;
}

interface AuthenticatedRequest extends BaseRequest {
    user: User;
    token: string;
}

interface AdminRequest extends AuthenticatedRequest {
    adminLevel: number;
}

// Middleware - contravariant in request type
interface Middleware<in Req extends BaseRequest> {
    process(req: Req, next: () => void): void;
}

// Logging middleware works with any request
const loggingMiddleware: Middleware<BaseRequest> = {
    process(req: BaseRequest, next: () => void): void {
        console.log(`${req.method} ${req.path}`);
        next();
    }
};

// Can use base middleware where specific middleware is needed
const authMiddleware: Middleware<AuthenticatedRequest> = loggingMiddleware;
const adminMiddleware: Middleware<AdminRequest> = loggingMiddleware;

// More specific middleware
const tokenValidator: Middleware<AuthenticatedRequest> = {
    process(req: AuthenticatedRequest, next: () => void): void {
        if (req.token.length < 10) {
            throw new Error("Invalid token");
        }
        next();
    }
};

// Router that chains middleware
class Router<Req extends BaseRequest> {
    private middlewares: Middleware<Req>[] = [];

    use(middleware: Middleware<Req>): this {
        this.middlewares.push(middleware);
        return this;
    }

    handle(req: Req): void {
        let index = 0;
        const next = (): void => {
            if (index < this.middlewares.length) {
                this.middlewares[index++].process(req, next);
            }
        };
        next();
    }
}

// Usage
const adminRouter = new Router<AdminRequest>();
adminRouter
    .use(loggingMiddleware)  // Base middleware works
    .use(tokenValidator)      // Auth middleware works
    .use({                    // Admin-specific middleware
        process(req: AdminRequest, next: () => void): void {
            if (req.adminLevel < 5) {
                throw new Error("Insufficient privileges");
            }
            next();
        }
    });
```

---

## 10. Common Mistakes and How to Avoid Them

### Mistake 1: Covariant Mutable Container

Trying to make a mutable container covariant breaks type safety.

```typescript
// Wrong - T appears in both positions but marked covariant
interface BadList<out T> {
    get(index: number): T;
    push(item: T): void;  // Error: T in contravariant position
}

// Correct - split into separate interfaces or use no annotation
interface ReadonlyList<out T> {
    get(index: number): T;
    readonly length: number;
}

interface MutableList<T> extends ReadonlyList<T> {
    push(item: T): void;
}
```

### Mistake 2: Contravariant Return Type

Marking something contravariant when it returns that type.

```typescript
// Wrong - T is returned but marked contravariant
interface BadFactory<in T> {
    create(): T;  // Error: T in covariant position
}

// Correct
interface Factory<out T> {
    create(): T;
}
```

### Mistake 3: Forgetting Callback Variance

Callbacks flip the variance of type parameters.

```typescript
// This is actually covariant, not contravariant
// The callback parameter flips T's variance
interface Mappable<out T> {
    // T appears in input position of callback
    // But callback itself is in input position - double flip = covariant
    map<R>(fn: (item: T) => R): Mappable<R>;
}

// This works correctly:
const dogs: Mappable<Dog> = {
    map<R>(fn: (item: Dog) => R): Mappable<R> {
        // Implementation
        return { map: (f) => this.map((d) => f(fn(d))) };
    }
};

// Mappable<Dog> assignable to Mappable<Animal>
const animals: Mappable<Animal> = dogs;
```

### Mistake 4: Ignoring Nested Generics

Variance compounds through nested generics.

```typescript
interface Producer<out T> {
    get(): T;
}

interface Consumer<in T> {
    accept(value: T): void;
}

// Producer<Producer<T>> - still covariant in T
// Consumer<Consumer<T>> - covariant in T (double contravariance)
// Producer<Consumer<T>> - contravariant in T
// Consumer<Producer<T>> - contravariant in T

type ProducerOfProducer<out T> = Producer<Producer<T>>;
type ConsumerOfConsumer<out T> = Consumer<Consumer<T>>;  // Note: out, not in!
type ProducerOfConsumer<in T> = Producer<Consumer<T>>;
type ConsumerOfProducer<in T> = Consumer<Producer<T>>;
```

---

## 11. Migration Guide for Existing Code

### Step 1: Enable Strict Mode

Make sure your project uses strict type checking.

```json
{
    "compilerOptions": {
        "strict": true,
        "strictFunctionTypes": true,
        "noImplicitAny": true
    }
}
```

### Step 2: Identify Candidate Interfaces

Look for interfaces that only use their type parameter in one direction.

```typescript
// Before: no annotations
interface DataFetcher<T> {
    fetch(): Promise<T>;
    fetchMany(): Promise<T[]>;
}

interface DataProcessor<T> {
    process(data: T): void;
    processMany(items: T[]): void;
}

interface DataStore<T> {
    get(id: string): T;
    set(id: string, value: T): void;
}
```

### Step 3: Add Appropriate Annotations

```typescript
// After: explicit variance
interface DataFetcher<out T> {
    fetch(): Promise<T>;
    fetchMany(): Promise<T[]>;
}

interface DataProcessor<in T> {
    process(data: T): void;
    processMany(items: T[]): void;
}

// DataStore uses T in both positions - no annotation
interface DataStore<T> {
    get(id: string): T;
    set(id: string, value: T): void;
}
```

### Step 4: Verify with Compiler

TypeScript will error if your annotations are inconsistent with usage.

```typescript
// TypeScript catches mistakes
interface WrongAnnotation<out T> {
    get(): T;
    set(value: T): void;  // Compiler error here
}
```

### Step 5: Update Tests

Make sure your tests cover the variance relationships you expect.

```typescript
// Test file
import { DataFetcher, DataProcessor } from "./interfaces";

// Should compile - covariance test
function testCovariance(fetcher: DataFetcher<Dog>): DataFetcher<Animal> {
    return fetcher;  // Dog fetcher usable as Animal fetcher
}

// Should compile - contravariance test
function testContravariance(processor: DataProcessor<Animal>): DataProcessor<Dog> {
    return processor;  // Animal processor usable as Dog processor
}
```

---

## 12. Summary

Variance annotations in TypeScript give you explicit control over how generic type parameters relate to subtyping.

### Quick Reference

| When T appears in... | Variance | Annotation | Assignability |
|---------------------|----------|------------|---------------|
| Return types only | Covariant | `out T` | `Box<Sub>` to `Box<Super>` |
| Parameter types only | Contravariant | `in T` | `Box<Super>` to `Box<Sub>` |
| Both positions | Invariant | none or `in out T` | No assignment either way |

### Key Takeaways

1. Use `out` for type parameters that only appear in output positions (return types, readonly properties)
2. Use `in` for type parameters that only appear in input positions (method parameters)
3. Omit annotations for invariant types or when inference is sufficient
4. Explicit annotations improve compile-time performance in large codebases
5. Annotations serve as documentation for API consumers
6. The compiler enforces annotations, catching mistakes early

### When to Use Variance Annotations

- Public library APIs where stability matters
- Complex generic hierarchies where inference might be slow
- Situations where variance is intentional and should be documented
- Performance-critical projects where compile time is important

Variance annotations are a powerful tool for writing safer, more performant TypeScript. They make your generic types more precise and help both the compiler and your fellow developers understand your code's intent.

---

**Related Reading:**

- [TypeScript 4.7 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html)
- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Understanding Covariance and Contravariance](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
