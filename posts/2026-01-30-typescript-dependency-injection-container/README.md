# How to Create Dependency Injection Container in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Design Patterns, Architecture, Testing

Description: Build a lightweight dependency injection container in TypeScript from scratch, supporting constructor injection, singleton scope, and interface-based resolution.

---

Dependency injection is a design pattern where objects receive their dependencies from external sources rather than creating them internally. This inversion of control makes code more modular, testable, and maintainable. Instead of hardcoding dependencies, you inject them at runtime.

Most TypeScript projects either avoid DI entirely or reach for heavyweight frameworks like InversifyJS. But you can build a capable DI container in under 200 lines of code that handles most real-world scenarios.

## Why Dependency Injection Matters

Without DI, classes create their own dependencies:

```typescript
// Tightly coupled - hard to test and modify
class UserService {
  private database: PostgresDatabase;
  private logger: ConsoleLogger;

  constructor() {
    // Dependencies are hardcoded - can't swap them out
    this.database = new PostgresDatabase();
    this.logger = new ConsoleLogger();
  }

  async getUser(id: string) {
    this.logger.log(`Fetching user ${id}`);
    return this.database.query(`SELECT * FROM users WHERE id = $1`, [id]);
  }
}
```

This creates several problems:

| Problem | Impact |
|---------|--------|
| Testing requires real database | Tests are slow and flaky |
| Can't swap implementations | Stuck with PostgresDatabase forever |
| Hidden dependencies | Must read constructor to understand requirements |
| Circular dependencies | Hard to detect and resolve |
| No lifecycle management | Each instance creates new dependencies |

With DI, dependencies are provided from outside:

```typescript
// Loosely coupled - easy to test and modify
class UserService {
  constructor(
    private database: Database,      // Interface, not implementation
    private logger: Logger           // Can be any logger
  ) {}

  async getUser(id: string) {
    this.logger.log(`Fetching user ${id}`);
    return this.database.query(`SELECT * FROM users WHERE id = $1`, [id]);
  }
}

// In tests, inject mocks
const service = new UserService(mockDatabase, mockLogger);

// In production, inject real implementations
const service = new UserService(postgresDatabase, winstonLogger);
```

## Building a Simple Container

Let's build a DI container from scratch. We'll start with the core concept, a registry that maps tokens to factory functions.

### The Container Interface

First, define what our container will do:

```typescript
// Tokens identify dependencies - can be strings, symbols, or class constructors
type Token<T> = string | symbol | (new (...args: any[]) => T);

// Factory function that creates instances
type Factory<T> = (container: Container) => T;

// Scope determines instance lifetime
type Scope = 'singleton' | 'transient';

interface Registration<T> {
  factory: Factory<T>;
  scope: Scope;
  instance?: T;  // Cached singleton instance
}

interface Container {
  register<T>(token: Token<T>, factory: Factory<T>, scope?: Scope): void;
  resolve<T>(token: Token<T>): T;
  createChild(): Container;
}
```

### Basic Implementation

The container stores registrations and resolves dependencies on demand:

```typescript
class DIContainer implements Container {
  // Map of token -> registration (factory + scope + cached instance)
  private registrations = new Map<any, Registration<any>>();

  // Parent container for hierarchical scoping
  private parent?: DIContainer;

  constructor(parent?: DIContainer) {
    this.parent = parent;
  }

  // Register a dependency with its factory function
  register<T>(
    token: Token<T>,
    factory: Factory<T>,
    scope: Scope = 'transient'
  ): void {
    this.registrations.set(token, { factory, scope });
  }

  // Resolve a dependency by its token
  resolve<T>(token: Token<T>): T {
    // Check local registrations first
    let registration = this.registrations.get(token);

    // Fall back to parent container if not found
    if (!registration && this.parent) {
      return this.parent.resolve(token);
    }

    if (!registration) {
      throw new Error(`No registration found for token: ${String(token)}`);
    }

    // For singletons, return cached instance or create and cache
    if (registration.scope === 'singleton') {
      if (!registration.instance) {
        registration.instance = registration.factory(this);
      }
      return registration.instance;
    }

    // For transient, create new instance every time
    return registration.factory(this);
  }

  // Create child container that inherits parent registrations
  createChild(): DIContainer {
    return new DIContainer(this);
  }
}
```

### Using the Container

Register dependencies and resolve them when needed:

```typescript
// Create container instance
const container = new DIContainer();

// Register implementations
container.register<Logger>('Logger', () => new ConsoleLogger(), 'singleton');

container.register<Database>('Database', (c) => {
  // Dependencies can resolve other dependencies
  const logger = c.resolve<Logger>('Logger');
  return new PostgresDatabase(logger);
}, 'singleton');

container.register<UserService>('UserService', (c) => {
  const database = c.resolve<Database>('Database');
  const logger = c.resolve<Logger>('Logger');
  return new UserService(database, logger);
}, 'transient');

// Resolve services - container wires everything up
const userService = container.resolve<UserService>('UserService');
```

## Registration Patterns

### Singleton vs Transient Scope

Scope determines how many instances exist:

| Scope | Behavior | Use Case |
|-------|----------|----------|
| Singleton | One instance per container | Database connections, loggers, config |
| Transient | New instance per resolve | Request handlers, short-lived services |

```typescript
// Singleton - same instance every time
container.register('Config', () => loadConfig(), 'singleton');

const config1 = container.resolve('Config');
const config2 = container.resolve('Config');
console.log(config1 === config2); // true

// Transient - new instance every time
container.register('RequestContext', () => new RequestContext(), 'transient');

const ctx1 = container.resolve('RequestContext');
const ctx2 = container.resolve('RequestContext');
console.log(ctx1 === ctx2); // false
```

### Scoped Registration (Request Scope)

For web applications, you often need request-scoped services that live for the duration of a single HTTP request. Child containers enable this:

```typescript
class DIContainer implements Container {
  // ... previous implementation ...

  // Create a scoped container for request lifetime
  createScope(): DIContainer {
    const scope = this.createChild();

    // Override singleton behavior within scope
    // Singletons in scope are unique to that scope
    return scope;
  }
}

// Express middleware example
function diMiddleware(rootContainer: DIContainer) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Create request-scoped container
    req.container = rootContainer.createScope();

    // Register request-specific values
    req.container.register('Request', () => req, 'singleton');
    req.container.register('Response', () => res, 'singleton');

    // Clean up on response finish
    res.on('finish', () => {
      // Scope and its instances are garbage collected
    });

    next();
  };
}
```

### Factory Registration

Sometimes you need to defer construction or pass runtime parameters:

```typescript
// Register a factory that accepts runtime parameters
container.register('UserRepositoryFactory', (c) => {
  const database = c.resolve<Database>('Database');

  // Return a factory function, not an instance
  return (tableName: string) => new UserRepository(database, tableName);
}, 'singleton');

// Usage - call the factory with runtime parameters
type UserRepoFactory = (tableName: string) => UserRepository;
const factory = container.resolve<UserRepoFactory>('UserRepositoryFactory');
const legacyRepo = factory('legacy_users');
const newRepo = factory('users_v2');
```

## Decorator-Based Injection

TypeScript decorators enable automatic dependency resolution based on metadata. This requires `experimentalDecorators` and `emitDecoratorMetadata` in tsconfig.json.

### Setting Up Decorators

```typescript
import 'reflect-metadata';

// Tokens stored as metadata on classes
const INJECT_METADATA_KEY = Symbol('inject');
const INJECTABLE_METADATA_KEY = Symbol('injectable');

// Mark a class as injectable
function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
  };
}

// Mark a constructor parameter for injection with a specific token
function Inject(token: any): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    // Get existing injection metadata or create new array
    const existingTokens =
      Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];

    // Store token at the parameter index
    existingTokens[parameterIndex] = token;

    Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target);
  };
}
```

### Enhanced Container with Auto-Resolution

The container reads metadata to automatically resolve constructor parameters:

```typescript
class DecoratorContainer extends DIContainer {
  // Resolve a class by automatically injecting its constructor dependencies
  resolveClass<T>(target: new (...args: any[]) => T): T {
    // Check if class is marked as injectable
    const isInjectable = Reflect.getMetadata(INJECTABLE_METADATA_KEY, target);
    if (!isInjectable) {
      throw new Error(`Class ${target.name} is not marked as @Injectable`);
    }

    // Get constructor parameter types from TypeScript metadata
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];

    // Get custom injection tokens (from @Inject decorators)
    const customTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];

    // Resolve each constructor parameter
    const args = paramTypes.map((type: any, index: number) => {
      // Use custom token if specified, otherwise use the type itself
      const token = customTokens[index] || type;
      return this.resolve(token);
    });

    // Construct instance with resolved dependencies
    return new target(...args);
  }
}
```

### Using Decorators

Decorators make the DI syntax cleaner and more declarative:

```typescript
// Define interfaces and tokens
interface Logger {
  log(message: string): void;
}

const LOGGER_TOKEN = Symbol('Logger');
const DATABASE_TOKEN = Symbol('Database');

// Implement interfaces
@Injectable()
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

@Injectable()
class PostgresDatabase {
  constructor(
    @Inject(LOGGER_TOKEN) private logger: Logger
  ) {}

  async query(sql: string): Promise<any[]> {
    this.logger.log(`Executing: ${sql}`);
    // Execute query...
    return [];
  }
}

@Injectable()
class UserService {
  constructor(
    @Inject(DATABASE_TOKEN) private database: PostgresDatabase,
    @Inject(LOGGER_TOKEN) private logger: Logger
  ) {}

  async findAll(): Promise<User[]> {
    this.logger.log('Finding all users');
    return this.database.query('SELECT * FROM users');
  }
}

// Register implementations
const container = new DecoratorContainer();
container.register(LOGGER_TOKEN, () => new ConsoleLogger(), 'singleton');
container.register(DATABASE_TOKEN, (c) => {
  const logger = c.resolve<Logger>(LOGGER_TOKEN);
  return new PostgresDatabase(logger);
}, 'singleton');

// Resolve with auto-wiring
const userService = container.resolveClass(UserService);
```

## Interface Tokens

TypeScript interfaces don't exist at runtime, so you can't use them directly as tokens. Instead, use symbols or string tokens to identify interface implementations.

### Symbol Tokens

Symbols guarantee uniqueness and prevent naming collisions:

```typescript
// Define tokens as symbols - guaranteed unique
export const Tokens = {
  Logger: Symbol.for('Logger'),
  Database: Symbol.for('Database'),
  UserRepository: Symbol.for('UserRepository'),
  Config: Symbol.for('Config'),
} as const;

// Type-safe token helper
function createToken<T>(name: string): symbol & { __type?: T } {
  return Symbol.for(name) as symbol & { __type?: T };
}

// Tokens carry type information (for IDE support only)
const LoggerToken = createToken<Logger>('Logger');
const DatabaseToken = createToken<Database>('Database');

// Registration with tokens
container.register(Tokens.Logger, () => new ConsoleLogger());
container.register(Tokens.Database, (c) => {
  return new PostgresDatabase(c.resolve(Tokens.Logger));
});
```

### Token Classes

For better type inference, use token classes:

```typescript
// Token class that carries type information
class InjectionToken<T> {
  constructor(public readonly description: string) {}
}

// Create typed tokens
const LOGGER = new InjectionToken<Logger>('Logger');
const DATABASE = new InjectionToken<Database>('Database');
const CONFIG = new InjectionToken<AppConfig>('Config');

// Type-safe registration and resolution
class TypedContainer {
  private registrations = new Map<InjectionToken<any>, Registration<any>>();

  register<T>(token: InjectionToken<T>, factory: Factory<T>, scope?: Scope): void {
    this.registrations.set(token, { factory, scope: scope || 'transient' });
  }

  resolve<T>(token: InjectionToken<T>): T {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`No registration for: ${token.description}`);
    }
    // ... resolution logic
    return registration.factory(this as any);
  }
}

// Usage - fully type-safe
const container = new TypedContainer();
container.register(LOGGER, () => new ConsoleLogger());
const logger = container.resolve(LOGGER); // Type: Logger
```

## Testing Benefits

DI shines during testing. You can inject mocks, stubs, or fakes without modifying production code.

### Unit Testing with Mocks

```typescript
describe('UserService', () => {
  let container: DIContainer;
  let mockDatabase: jest.Mocked<Database>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create fresh container for each test
    container = new DIContainer();

    // Create mocks
    mockDatabase = {
      query: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    // Register mocks
    container.register('Database', () => mockDatabase, 'singleton');
    container.register('Logger', () => mockLogger, 'singleton');
    container.register('UserService', (c) => {
      return new UserService(
        c.resolve('Database'),
        c.resolve('Logger')
      );
    });
  });

  it('should fetch user by id', async () => {
    const mockUser = { id: '1', name: 'John' };
    mockDatabase.query.mockResolvedValue([mockUser]);

    const service = container.resolve<UserService>('UserService');
    const user = await service.getUser('1');

    expect(user).toEqual(mockUser);
    expect(mockDatabase.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      ['1']
    );
    expect(mockLogger.log).toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockDatabase.query.mockRejectedValue(new Error('Connection lost'));

    const service = container.resolve<UserService>('UserService');

    await expect(service.getUser('1')).rejects.toThrow('Connection lost');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

### Integration Testing with Test Doubles

```typescript
// Test implementations that behave like real ones
class InMemoryDatabase implements Database {
  private data = new Map<string, any[]>();

  async query(sql: string, params: any[]): Promise<any[]> {
    // Simple in-memory query simulation
    const table = this.parseTableName(sql);
    return this.data.get(table) || [];
  }

  // Helper for seeding test data
  seed(table: string, rows: any[]): void {
    this.data.set(table, rows);
  }

  private parseTableName(sql: string): string {
    const match = sql.match(/FROM\s+(\w+)/i);
    return match ? match[1] : '';
  }
}

describe('UserService Integration', () => {
  let container: DIContainer;
  let testDb: InMemoryDatabase;

  beforeEach(() => {
    container = new DIContainer();
    testDb = new InMemoryDatabase();

    // Use test implementations
    container.register('Database', () => testDb, 'singleton');
    container.register('Logger', () => new ConsoleLogger(), 'singleton');
    container.register('UserService', (c) => {
      return new UserService(
        c.resolve('Database'),
        c.resolve('Logger')
      );
    });
  });

  it('should find users by role', async () => {
    // Seed test data
    testDb.seed('users', [
      { id: '1', name: 'Admin', role: 'admin' },
      { id: '2', name: 'User', role: 'user' },
    ]);

    const service = container.resolve<UserService>('UserService');
    const admins = await service.findByRole('admin');

    expect(admins).toHaveLength(1);
    expect(admins[0].name).toBe('Admin');
  });
});
```

## Complete Container Implementation

Here's a full-featured container with all the patterns discussed:

```typescript
import 'reflect-metadata';

// Core types
type Token<T = any> = string | symbol | InjectionToken<T> | (new (...args: any[]) => T);
type Factory<T> = (container: Container) => T;
type Scope = 'singleton' | 'transient' | 'scoped';

interface Registration<T> {
  factory: Factory<T>;
  scope: Scope;
  instance?: T;
}

// Type-safe injection token
class InjectionToken<T> {
  constructor(public readonly description: string) {}

  // Prevents structural typing from matching different tokens
  private readonly _brand: T = undefined as any;
}

// Decorator metadata keys
const INJECTABLE_KEY = Symbol('injectable');
const INJECT_KEY = Symbol('inject');

// Decorators
function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
  };
}

function Inject(token: Token): ParameterDecorator {
  return (target, _, index) => {
    const tokens = Reflect.getMetadata(INJECT_KEY, target) || [];
    tokens[index] = token;
    Reflect.defineMetadata(INJECT_KEY, tokens, target);
  };
}

// Main container implementation
class Container {
  private registrations = new Map<Token, Registration<any>>();
  private scopedInstances = new Map<Token, any>();
  private parent?: Container;

  constructor(parent?: Container) {
    this.parent = parent;
  }

  // Register a factory function
  register<T>(token: Token<T>, factory: Factory<T>, scope: Scope = 'transient'): this {
    this.registrations.set(token, { factory, scope });
    return this;
  }

  // Register a class (auto-resolve constructor params)
  registerClass<T>(
    token: Token<T>,
    target: new (...args: any[]) => T,
    scope: Scope = 'transient'
  ): this {
    return this.register(token, (c) => c.instantiate(target), scope);
  }

  // Register a value directly
  registerValue<T>(token: Token<T>, value: T): this {
    return this.register(token, () => value, 'singleton');
  }

  // Resolve a dependency
  resolve<T>(token: Token<T>): T {
    // Check scoped instances first (for request scope)
    if (this.scopedInstances.has(token)) {
      return this.scopedInstances.get(token);
    }

    // Find registration in current or parent container
    let registration = this.registrations.get(token);
    let container: Container = this;

    if (!registration && this.parent) {
      registration = this.parent.registrations.get(token);
      container = this.parent;
    }

    if (!registration) {
      // Try auto-resolving if token is a class
      if (typeof token === 'function') {
        return this.instantiate(token as new (...args: any[]) => T);
      }
      throw new Error(`No registration for: ${String(token)}`);
    }

    // Handle different scopes
    switch (registration.scope) {
      case 'singleton':
        if (registration.instance === undefined) {
          registration.instance = registration.factory(container);
        }
        return registration.instance;

      case 'scoped':
        if (!this.scopedInstances.has(token)) {
          this.scopedInstances.set(token, registration.factory(this));
        }
        return this.scopedInstances.get(token);

      case 'transient':
      default:
        return registration.factory(this);
    }
  }

  // Create class instance with auto-injected dependencies
  instantiate<T>(target: new (...args: any[]) => T): T {
    // Get constructor parameter types
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const customTokens = Reflect.getMetadata(INJECT_KEY, target) || [];

    // Resolve each parameter
    const args = paramTypes.map((type: any, i: number) => {
      const token = customTokens[i] || type;
      return this.resolve(token);
    });

    return new target(...args);
  }

  // Create child container for scoped services
  createScope(): Container {
    const scope = new Container(this);
    // Copy registrations but not instances
    return scope;
  }

  // Check if a dependency is registered
  has(token: Token): boolean {
    if (this.registrations.has(token)) return true;
    if (this.parent) return this.parent.has(token);
    return false;
  }

  // Clear scoped instances (useful for request cleanup)
  clearScope(): void {
    this.scopedInstances.clear();
  }
}

// Export for use
export { Container, InjectionToken, Injectable, Inject, Token, Scope };
```

## Comparison with Popular Libraries

| Feature | Custom Container | tsyringe | InversifyJS |
|---------|-----------------|----------|-------------|
| Bundle size | ~2KB | ~8KB | ~50KB |
| Decorators required | Optional | Yes | Yes |
| Auto-wiring | Yes | Yes | Yes |
| Scopes | All | Singleton, Transient | All |
| Child containers | Yes | Yes | Yes |
| Lazy injection | Manual | Yes | Yes |
| Circular dependency detection | Manual | Yes | Yes |
| Learning curve | Low | Low | Medium |
| TypeScript support | Native | Native | Native |

### When to Use What

**Use a custom container when:**
- You want minimal dependencies
- Your DI needs are straightforward
- You want full control over behavior
- Bundle size matters

**Use tsyringe when:**
- You want a lightweight, battle-tested solution
- You prefer decorator-based injection
- You need Microsoft backing and support

**Use InversifyJS when:**
- You need advanced features (tagged bindings, contextual injection)
- You have complex dependency graphs
- You want extensive documentation and community

## Best Practices

### 1. Register at Startup

Configure all dependencies at application startup, not scattered throughout code:

```typescript
// container.ts - single source of truth
export function configureContainer(): Container {
  const container = new Container();

  // Infrastructure
  container.register(Tokens.Logger, () => new WinstonLogger(), 'singleton');
  container.register(Tokens.Database, (c) =>
    new PostgresDatabase(c.resolve(Tokens.Logger)), 'singleton');

  // Repositories
  container.register(Tokens.UserRepository, (c) =>
    new UserRepository(c.resolve(Tokens.Database)), 'singleton');

  // Services
  container.register(Tokens.UserService, (c) =>
    new UserService(
      c.resolve(Tokens.UserRepository),
      c.resolve(Tokens.Logger)
    ), 'transient');

  return container;
}

// main.ts
const container = configureContainer();
```

### 2. Prefer Constructor Injection

Constructor injection makes dependencies explicit and immutable:

```typescript
// Preferred - dependencies are clear and required
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly logger: Logger
  ) {}
}

// Avoid - hidden dependencies, hard to test
class UserService {
  private userRepo = container.resolve(UserRepository);
}
```

### 3. Program to Interfaces

Depend on abstractions, not implementations:

```typescript
// Define interfaces
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Register implementations
container.register(Tokens.UserRepository, () => new PostgresUserRepository());

// In tests, swap implementation
container.register(Tokens.UserRepository, () => new InMemoryUserRepository());
```

### 4. Avoid Service Locator Pattern

Don't pass the container around. Inject specific dependencies:

```typescript
// Bad - service locator anti-pattern
class UserService {
  constructor(private container: Container) {}

  getUser(id: string) {
    // Hidden dependency, untestable
    const repo = this.container.resolve(UserRepository);
    return repo.findById(id);
  }
}

// Good - explicit dependencies
class UserService {
  constructor(private userRepo: UserRepository) {}

  getUser(id: string) {
    return this.userRepo.findById(id);
  }
}
```

## Summary

Building your own DI container teaches you the fundamentals of inversion of control without the overhead of large frameworks. The key concepts are:

1. **Tokens** identify dependencies (strings, symbols, or classes)
2. **Factories** create instances when needed
3. **Scopes** control instance lifetime (singleton, transient, scoped)
4. **Decorators** enable automatic dependency resolution
5. **Child containers** support request-scoped services

Start with the basic container and add features as needed. Most applications only need singleton and transient scopes with manual registration. Add decorator support and scoped instances when your codebase grows.

The testing benefits alone make DI worthwhile. Being able to swap real databases for in-memory implementations and inject mock loggers transforms how you write tests. Your code becomes modular, your tests become fast, and changes become less risky.
