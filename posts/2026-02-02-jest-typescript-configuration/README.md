# How to Configure Jest for TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Jest, Testing, Configuration, Unit Tests

Description: Learn how to configure Jest for TypeScript projects with proper transpilation, type checking, and optimal test performance settings.

---

Getting Jest to work smoothly with TypeScript can be frustrating. You'll run into cryptic errors about ESM modules, unexpected tokens in import statements, and tests that pass locally but fail in CI. This guide walks through a production-ready setup that handles the common pain points.

## Why TypeScript + Jest Requires Extra Configuration

Jest runs on Node.js and expects JavaScript. TypeScript needs to be transpiled before Jest can execute your tests. The challenge is doing this efficiently without sacrificing type checking or test performance.

| Challenge | Solution |
|-----------|----------|
| TypeScript files not recognized | ts-jest transformer |
| Slow test runs | Isolated modules, caching |
| Type errors not caught | Separate type-check step |
| Path aliases not resolved | moduleNameMapper config |
| ESM/CJS conflicts | Proper module settings |

## Installing Dependencies

Start by installing Jest along with ts-jest (the TypeScript preprocessor) and the type definitions:

```bash
# Core dependencies
npm install --save-dev jest ts-jest @types/jest

# If you want to run type checking separately (recommended)
npm install --save-dev typescript
```

## Basic ts-jest Setup

The fastest way to get started is using the ts-jest initialization command:

```bash
# Generate a jest.config.js with ts-jest preset
npx ts-jest config:init
```

This creates a minimal config. For most projects, you'll want something more complete. Here's a production-ready configuration:

```javascript
// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Run tests in Node environment (use 'jsdom' for browser code)
  testEnvironment: 'node',

  // Where to look for test files
  roots: ['<rootDir>/src'],

  // Match test files - supports both .test.ts and .spec.ts conventions
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // Transform TypeScript files using ts-jest
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // File extensions Jest should recognize
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Enable verbose output for debugging
  verbose: true,
};
```

## TypeScript Configuration for Tests

Your tests might need different TypeScript settings than your production code. Create a separate config that extends your main tsconfig:

```json
// tsconfig.json - your main config
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

```json
// tsconfig.test.json - extends main config with test-specific settings
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // Include test files in compilation
    "rootDir": ".",

    // No need to emit files for tests
    "noEmit": true,

    // Allow importing test utilities
    "types": ["jest", "node"]
  },
  "include": [
    "src/**/*",
    "tests/**/*",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

Now update your Jest config to use the test-specific TypeScript config:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],

  // Point ts-jest to your test TypeScript config
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
};
```

## Handling Path Aliases

If your TypeScript config uses path aliases, Jest won't understand them by default. You need to mirror them in moduleNameMapper:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@models/*": ["src/models/*"]
    }
  }
}
```

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Map TypeScript path aliases to Jest module resolution
  moduleNameMapper: {
    // @/* maps to src/*
    '^@/(.*)$': '<rootDir>/src/$1',

    // @utils/* maps to src/utils/*
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',

    // @models/* maps to src/models/*
    '^@models/(.*)$': '<rootDir>/src/models/$1',
  },
};
```

## Mocking in TypeScript Tests

Jest's mocking works with TypeScript, but you need to handle types properly. Here's how to mock modules while maintaining type safety:

```typescript
// src/services/user-service.ts
import { Database } from '@/database';

export class UserService {
  constructor(private db: Database) {}

  async findUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}
```

```typescript
// src/services/user-service.test.ts
import { UserService } from './user-service';
import { Database } from '@/database';

// Mock the entire database module
jest.mock('@/database');

// Get the mocked constructor with proper typing
const MockedDatabase = Database as jest.MockedClass<typeof Database>;

describe('UserService', () => {
  let userService: UserService;
  let mockDb: jest.Mocked<Database>;

  beforeEach(() => {
    // Clear all mock state between tests
    jest.clearAllMocks();

    // Create a fresh mock instance
    mockDb = new MockedDatabase() as jest.Mocked<Database>;
    userService = new UserService(mockDb);
  });

  it('should query database with correct parameters', async () => {
    // Set up mock return value
    const mockUser = { id: '123', name: 'John' };
    mockDb.query.mockResolvedValue([mockUser]);

    // Call the method under test
    const result = await userService.findUser('123');

    // Verify the database was called correctly
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = ?',
      ['123']
    );
    expect(result).toEqual([mockUser]);
  });

  it('should handle database errors', async () => {
    // Mock a database failure
    mockDb.query.mockRejectedValue(new Error('Connection failed'));

    // Verify error propagation
    await expect(userService.findUser('123'))
      .rejects.toThrow('Connection failed');
  });
});
```

## Code Coverage Configuration

Set up coverage reporting to identify untested code paths:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Enable coverage collection
  collectCoverage: true,

  // Collect coverage from source files, not test files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',        // Exclude type declaration files
    '!src/**/*.test.ts',     // Exclude test files
    '!src/**/*.spec.ts',
    '!src/**/index.ts',      // Exclude barrel exports (optional)
  ],

  // Output directory for coverage reports
  coverageDirectory: 'coverage',

  // Generate multiple report formats
  coverageReporters: ['text', 'lcov', 'html'],

  // Set minimum coverage thresholds (optional but recommended)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Performance Optimization

TypeScript compilation can slow down your test suite. Here are settings to speed things up:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Use isolated modules for faster compilation
  // Skips type checking during tests (run tsc separately)
  globals: {
    'ts-jest': {
      isolatedModules: true,  // Much faster - skips type checking
    },
  },

  // Cache transformed files between runs
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Run tests in parallel (default behavior, but be explicit)
  maxWorkers: '50%',  // Use half of available CPU cores

  // Only run tests related to changed files in watch mode
  watchPathIgnorePatterns: ['node_modules', 'dist'],
};
```

| Setting | Performance Impact | Tradeoff |
|---------|-------------------|----------|
| `isolatedModules: true` | 2-5x faster | No type checking in tests |
| `cache: true` | Faster subsequent runs | Uses disk space |
| `maxWorkers: '50%'` | Parallel execution | More memory usage |

Since `isolatedModules` skips type checking, add a separate type-check script:

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "typecheck": "tsc --noEmit -p tsconfig.test.json",
    "validate": "npm run typecheck && npm run test"
  }
}
```

## Complete Configuration Example

Here's a full configuration that combines all the best practices:

```javascript
// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // TypeScript support via ts-jest
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file locations
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],

  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true,  // Faster compilation
    },
  },

  // Path alias resolution (must match tsconfig paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Performance
  cache: true,
  maxWorkers: '50%',

  // Setup files (optional - for global test setup)
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};
```

```typescript
// tests/setup.ts - global test setup
// Increase timeout for async tests
jest.setTimeout(10000);

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});
```

## Troubleshooting Common Issues

**"Cannot use import statement outside a module"**

This usually means a dependency is shipping ESM but Jest expects CommonJS. Add the package to transformIgnorePatterns:

```javascript
// jest.config.js
module.exports = {
  transformIgnorePatterns: [
    'node_modules/(?!(problematic-package)/)',  // Transform this package
  ],
};
```

**"Cannot find module '@/...'"**

Path aliases aren't configured. Make sure moduleNameMapper matches your tsconfig paths exactly.

**Tests are slow**

Enable `isolatedModules: true` and run type checking separately with `tsc --noEmit`.

## Summary

| Component | Purpose |
|-----------|---------|
| ts-jest | Transpiles TypeScript for Jest |
| tsconfig.test.json | Test-specific TypeScript settings |
| moduleNameMapper | Resolves path aliases |
| isolatedModules | Faster test execution |
| coverageThreshold | Enforces minimum coverage |

The key insight is to separate type checking from test execution. Use `isolatedModules` for fast tests, and run `tsc --noEmit` separately (in CI or as a pre-commit hook) to catch type errors. This gives you the best of both worlds: quick feedback during development and type safety before merging.
