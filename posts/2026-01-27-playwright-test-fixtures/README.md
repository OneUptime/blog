# How to Use Playwright Test Fixtures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Playwright, Testing, TypeScript, End-to-End Testing, Automation, Test Fixtures, Web Testing

Description: Learn how to use Playwright test fixtures to share setup, teardown, and state across your end-to-end tests for cleaner and more maintainable test code.

---

> Fixtures are the foundation of Playwright Test. They provide a way to establish the environment for each test, giving you exactly what you need - no more, no less.

## What Are Test Fixtures?

Test fixtures in Playwright are reusable pieces of setup and teardown logic that can be shared across multiple tests. They solve common problems like:

- Setting up browser context and pages
- Creating authenticated sessions
- Preparing test data
- Cleaning up after tests complete

Fixtures are lazily instantiated - they only run when a test actually needs them, making your test suite more efficient.

## Built-in Fixtures

Playwright Test comes with several built-in fixtures that handle common scenarios. Understanding these is essential before creating custom fixtures.

```typescript
// test-builtin.spec.ts
import { test, expect } from '@playwright/test';

// The 'page' fixture provides a fresh browser page for each test
test('page fixture example', async ({ page }) => {
  // Each test gets its own page instance
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});

// The 'context' fixture provides a browser context
test('context fixture example', async ({ context }) => {
  // Create multiple pages within the same context
  // They share cookies and local storage
  const page1 = await context.newPage();
  const page2 = await context.newPage();

  await page1.goto('https://example.com');
  await page2.goto('https://example.com/about');

  // Both pages share the same session
  expect(context.pages()).toHaveLength(2);
});

// The 'browser' fixture provides access to the browser instance
test('browser fixture example', async ({ browser }) => {
  // Create isolated contexts for different scenarios
  const userContext = await browser.newContext();
  const adminContext = await browser.newContext();

  const userPage = await userContext.newPage();
  const adminPage = await adminContext.newPage();

  // Clean up contexts when done
  await userContext.close();
  await adminContext.close();
});

// The 'request' fixture provides an API request context
test('request fixture example', async ({ request }) => {
  // Make API calls without a browser
  const response = await request.get('https://api.example.com/users');
  expect(response.ok()).toBeTruthy();

  const users = await response.json();
  expect(users).toBeInstanceOf(Array);
});
```

## Custom Fixtures

Custom fixtures allow you to extend Playwright Test with your own reusable setup logic. This is where fixtures become truly powerful.

```typescript
// fixtures.ts
import { test as base, expect } from '@playwright/test';

// Define types for your custom fixtures
type CustomFixtures = {
  // A fixture that provides a logged-in page
  authenticatedPage: Page;

  // A fixture that provides test user data
  testUser: { email: string; password: string };

  // A fixture that provides an API client
  apiClient: APIRequestContext;
};

// Extend the base test with custom fixtures
export const test = base.extend<CustomFixtures>({
  // Define the testUser fixture - provides test credentials
  testUser: async ({}, use) => {
    // Setup: create test user data
    const user = {
      email: `test-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    };

    // Provide the fixture value to the test
    await use(user);

    // Teardown: clean up is automatic when test ends
  },

  // Define the authenticatedPage fixture - provides a logged-in page
  authenticatedPage: async ({ page, testUser }, use) => {
    // Setup: navigate to login and authenticate
    await page.goto('/login');
    await page.fill('[data-testid="email"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="login-button"]');

    // Wait for authentication to complete
    await page.waitForURL('/dashboard');

    // Provide the authenticated page to the test
    await use(page);

    // Teardown: logout after test completes
    await page.click('[data-testid="logout-button"]');
  },

  // Define the apiClient fixture - provides an API client with auth
  apiClient: async ({ playwright, testUser }, use) => {
    // Setup: create an authenticated API context
    const apiContext = await playwright.request.newContext({
      baseURL: 'https://api.example.com',
      extraHTTPHeaders: {
        'Authorization': `Bearer ${await getAuthToken(testUser)}`,
        'Content-Type': 'application/json',
      },
    });

    // Provide the API client to the test
    await use(apiContext);

    // Teardown: dispose the API context
    await apiContext.dispose();
  },
});

// Helper function to get auth token
async function getAuthToken(user: { email: string; password: string }): Promise<string> {
  // In real implementation, this would call your auth API
  return 'mock-auth-token';
}

export { expect };
```

Using custom fixtures in tests:

```typescript
// auth.spec.ts
import { test, expect } from './fixtures';

test('user can view dashboard', async ({ authenticatedPage }) => {
  // The page is already logged in - no setup needed in the test
  await expect(authenticatedPage.locator('h1')).toHaveText('Dashboard');
});

test('user can update profile via API', async ({ apiClient, testUser }) => {
  // Make an authenticated API call
  const response = await apiClient.patch('/profile', {
    data: { name: 'Updated Name' },
  });

  expect(response.ok()).toBeTruthy();
});
```

## Fixture Scopes

Fixtures can have different scopes that control their lifetime and how they are shared across tests.

```typescript
// scoped-fixtures.ts
import { test as base } from '@playwright/test';

type ScopedFixtures = {
  // Test-scoped fixture (default) - created for each test
  testData: { id: string };

  // Worker-scoped fixture - shared across all tests in a worker
  sharedDatabase: DatabaseConnection;
};

// Worker-scoped fixtures are defined separately
type WorkerFixtures = {
  sharedDatabase: DatabaseConnection;
};

export const test = base.extend<ScopedFixtures, WorkerFixtures>({
  // Test-scoped fixture (default scope)
  // Created fresh for each test, torn down after each test
  testData: async ({}, use) => {
    const data = { id: `test-${Date.now()}` };
    console.log('Creating test data:', data.id);

    await use(data);

    console.log('Cleaning up test data:', data.id);
  },

  // Worker-scoped fixture - use { scope: 'worker' }
  // Created once per worker process, shared across all tests in that worker
  sharedDatabase: [async ({}, use) => {
    // This runs once when the worker starts
    console.log('Connecting to database...');
    const db = await DatabaseConnection.connect({
      host: 'localhost',
      database: 'test_db',
    });

    await use(db);

    // This runs when the worker shuts down
    console.log('Disconnecting from database...');
    await db.disconnect();
  }, { scope: 'worker' }],
});

// Example database connection class
class DatabaseConnection {
  static async connect(config: { host: string; database: string }) {
    // Connection logic here
    return new DatabaseConnection();
  }

  async disconnect() {
    // Disconnection logic here
  }

  async query(sql: string) {
    // Query logic here
  }
}
```

Scope comparison:

```typescript
// scope-comparison.spec.ts
import { test } from './scoped-fixtures';

// Test 1 in Worker A
test('first test', async ({ testData, sharedDatabase }) => {
  // testData: unique for this test
  // sharedDatabase: shared with other tests in Worker A
  console.log('Test 1 - testData:', testData.id);
});

// Test 2 in Worker A
test('second test', async ({ testData, sharedDatabase }) => {
  // testData: NEW instance, different from test 1
  // sharedDatabase: SAME instance as test 1
  console.log('Test 2 - testData:', testData.id);
});
```

## Automatic Fixtures

Automatic fixtures run for every test without being explicitly requested. They are useful for global setup like logging, screenshots on failure, or performance monitoring.

```typescript
// auto-fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{
  // These fixtures will be available if requested
  logger: Logger;
}, {
  // These fixtures run automatically for every test
  autoScreenshot: void;
  performanceMonitor: void;
}>({
  // Regular fixture - only runs when requested
  logger: async ({}, use) => {
    const logger = new Logger();
    await use(logger);
  },

  // Automatic fixture - runs for every test
  // Use { auto: true } to make it automatic
  autoScreenshot: [async ({ page }, use, testInfo) => {
    // Setup: nothing to do before test
    await use();

    // Teardown: capture screenshot if test failed
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot();
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  }, { auto: true }],

  // Another automatic fixture for performance monitoring
  performanceMonitor: [async ({ page }, use, testInfo) => {
    // Setup: start performance measurement
    const startTime = Date.now();

    await use();

    // Teardown: log performance metrics
    const duration = Date.now() - startTime;
    console.log(`Test "${testInfo.title}" took ${duration}ms`);

    // Attach metrics to test report
    testInfo.annotations.push({
      type: 'performance',
      description: `Duration: ${duration}ms`,
    });
  }, { auto: true }],
});

// Simple logger class
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }

  error(message: string) {
    console.error(`[ERROR] ${message}`);
  }
}
```

Tests automatically benefit from automatic fixtures:

```typescript
// auto-test.spec.ts
import { test, expect } from './auto-fixtures';

// Both autoScreenshot and performanceMonitor run automatically
// without being mentioned in the test signature
test('user registration', async ({ page }) => {
  await page.goto('/register');
  await page.fill('#email', 'new@example.com');
  await page.click('button[type="submit"]');

  // If this fails, autoScreenshot captures the failure state
  await expect(page.locator('.success')).toBeVisible();
});

// You can still request the logger fixture when needed
test('user registration with logging', async ({ page, logger }) => {
  logger.log('Starting registration test');

  await page.goto('/register');
  logger.log('Navigated to registration page');

  await page.fill('#email', 'new@example.com');
  await page.click('button[type="submit"]');

  await expect(page.locator('.success')).toBeVisible();
  logger.log('Registration completed successfully');
});
```

## Fixture Options

Fixture options allow you to configure fixture behavior from the command line or configuration file.

```typescript
// option-fixtures.ts
import { test as base } from '@playwright/test';

// Define option types
type FixtureOptions = {
  // Options are defined like fixtures but with default values
  baseURL: string;
  apiVersion: string;
  slowMo: number;
};

type CustomFixtures = {
  apiEndpoint: string;
  configuredPage: Page;
};

export const test = base.extend<CustomFixtures & FixtureOptions>({
  // Define options with default values using array syntax
  baseURL: ['https://staging.example.com', { option: true }],
  apiVersion: ['v1', { option: true }],
  slowMo: [0, { option: true }],

  // Use options in other fixtures
  apiEndpoint: async ({ baseURL, apiVersion }, use) => {
    const endpoint = `${baseURL}/api/${apiVersion}`;
    await use(endpoint);
  },

  // Configure page based on options
  configuredPage: async ({ page, baseURL, slowMo }, use) => {
    // Apply slow motion if configured
    if (slowMo > 0) {
      await page.setDefaultTimeout(30000);
    }

    // Navigate to base URL
    await page.goto(baseURL);

    await use(page);
  },
});
```

Configure options in playwright.config.ts:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Override fixture options
    baseURL: 'https://production.example.com',
    apiVersion: 'v2',
    slowMo: 100,
  },

  projects: [
    {
      name: 'staging',
      use: {
        baseURL: 'https://staging.example.com',
        apiVersion: 'v1',
      },
    },
    {
      name: 'production',
      use: {
        baseURL: 'https://production.example.com',
        apiVersion: 'v2',
      },
    },
  ],
});
```

Using configured fixtures in tests:

```typescript
// options.spec.ts
import { test, expect } from './option-fixtures';

test('API endpoint is correctly configured', async ({ apiEndpoint }) => {
  // apiEndpoint will be based on the configuration
  // In staging: https://staging.example.com/api/v1
  // In production: https://production.example.com/api/v2
  console.log('Using API endpoint:', apiEndpoint);

  expect(apiEndpoint).toContain('/api/');
});

test('page starts at base URL', async ({ configuredPage, baseURL }) => {
  // configuredPage is already at baseURL
  expect(configuredPage.url()).toBe(baseURL + '/');
});
```

## Worker Fixtures

Worker fixtures are shared across all tests running in a single worker process. They are ideal for expensive setup that should happen once.

```typescript
// worker-fixtures.ts
import { test as base } from '@playwright/test';

type WorkerFixtures = {
  // Expensive resources shared across tests
  testAccount: { username: string; password: string };
  serverConnection: ServerConnection;
};

export const test = base.extend<{}, WorkerFixtures>({
  // Worker fixture for test account - created once per worker
  testAccount: [async ({}, use, workerInfo) => {
    // Create a unique account for this worker
    const account = {
      username: `worker-${workerInfo.workerIndex}-user`,
      password: 'test-password-123',
    };

    // Register the account (expensive operation)
    console.log(`Worker ${workerInfo.workerIndex}: Creating test account`);
    await registerTestAccount(account);

    // Share with all tests in this worker
    await use(account);

    // Cleanup when worker shuts down
    console.log(`Worker ${workerInfo.workerIndex}: Deleting test account`);
    await deleteTestAccount(account.username);
  }, { scope: 'worker' }],

  // Worker fixture for server connection
  serverConnection: [async ({}, use, workerInfo) => {
    console.log(`Worker ${workerInfo.workerIndex}: Establishing connection`);

    const connection = await ServerConnection.establish({
      host: process.env.TEST_SERVER_HOST || 'localhost',
      port: 3000,
    });

    await use(connection);

    console.log(`Worker ${workerInfo.workerIndex}: Closing connection`);
    await connection.close();
  }, { scope: 'worker' }],
});

// Helper functions (would be real implementations)
async function registerTestAccount(account: { username: string; password: string }) {
  // API call to create account
}

async function deleteTestAccount(username: string) {
  // API call to delete account
}

// Server connection class
class ServerConnection {
  static async establish(config: { host: string; port: number }) {
    return new ServerConnection();
  }

  async close() {
    // Close connection
  }

  async query(endpoint: string) {
    // Make request
  }
}
```

Worker fixture usage example:

```typescript
// worker-tests.spec.ts
import { test, expect } from './worker-fixtures';

// All tests in this file share the same testAccount and serverConnection
// when run in the same worker

test('can login with test account', async ({ page, testAccount }) => {
  await page.goto('/login');
  await page.fill('#username', testAccount.username);
  await page.fill('#password', testAccount.password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});

test('can fetch data from server', async ({ serverConnection }) => {
  const data = await serverConnection.query('/api/status');
  expect(data).toBeDefined();
});

test('another test using same account', async ({ page, testAccount }) => {
  // Uses the SAME testAccount as the first test
  // No additional account creation overhead
  await page.goto('/login');
  await page.fill('#username', testAccount.username);
  await page.fill('#password', testAccount.password);
  await page.click('button[type="submit"]');

  await expect(page.locator('.welcome')).toContainText(testAccount.username);
});
```

## Parameterized Fixtures

Parameterized fixtures allow you to run the same tests with different configurations or data sets.

```typescript
// parameterized-fixtures.ts
import { test as base, expect } from '@playwright/test';

// Define parameter types
type BrowserConfig = {
  viewport: { width: number; height: number };
  deviceName: string;
};

type Credentials = {
  username: string;
  password: string;
  role: 'admin' | 'user' | 'guest';
};

type ParameterizedFixtures = {
  browserConfig: BrowserConfig;
  userCredentials: Credentials;
};

export const test = base.extend<ParameterizedFixtures>({
  // Parameterized viewport configuration
  browserConfig: [{
    viewport: { width: 1280, height: 720 },
    deviceName: 'Desktop'
  }, { option: true }],

  // Parameterized user credentials
  userCredentials: [{
    username: 'testuser',
    password: 'password123',
    role: 'user'
  }, { option: true }],
});

// Export for use in config
export { expect };
```

Configure parameters in playwright.config.ts:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    // Desktop configurations
    {
      name: 'desktop-admin',
      use: {
        browserConfig: {
          viewport: { width: 1920, height: 1080 },
          deviceName: 'Desktop HD',
        },
        userCredentials: {
          username: 'admin',
          password: 'admin-pass',
          role: 'admin',
        },
      },
    },
    {
      name: 'desktop-user',
      use: {
        browserConfig: {
          viewport: { width: 1280, height: 720 },
          deviceName: 'Desktop',
        },
        userCredentials: {
          username: 'regular-user',
          password: 'user-pass',
          role: 'user',
        },
      },
    },

    // Mobile configurations
    {
      name: 'mobile-user',
      use: {
        ...devices['iPhone 13'],
        browserConfig: {
          viewport: { width: 390, height: 844 },
          deviceName: 'iPhone 13',
        },
        userCredentials: {
          username: 'mobile-user',
          password: 'mobile-pass',
          role: 'user',
        },
      },
    },

    // Guest configuration
    {
      name: 'guest',
      use: {
        browserConfig: {
          viewport: { width: 1280, height: 720 },
          deviceName: 'Desktop',
        },
        userCredentials: {
          username: 'guest',
          password: 'guest-pass',
          role: 'guest',
        },
      },
    },
  ],
});
```

Tests using parameterized fixtures:

```typescript
// parameterized.spec.ts
import { test, expect } from './parameterized-fixtures';

test('login with configured credentials', async ({ page, userCredentials }) => {
  await page.goto('/login');
  await page.fill('#username', userCredentials.username);
  await page.fill('#password', userCredentials.password);
  await page.click('button[type="submit"]');

  // Different assertions based on role
  if (userCredentials.role === 'admin') {
    await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
  } else if (userCredentials.role === 'user') {
    await expect(page.locator('[data-testid="user-dashboard"]')).toBeVisible();
  } else {
    await expect(page.locator('[data-testid="limited-view"]')).toBeVisible();
  }
});

test('responsive layout matches device', async ({ page, browserConfig }) => {
  await page.setViewportSize(browserConfig.viewport);
  await page.goto('/');

  // Check responsive behavior
  if (browserConfig.viewport.width < 768) {
    // Mobile layout
    await expect(page.locator('.mobile-menu')).toBeVisible();
    await expect(page.locator('.desktop-nav')).toBeHidden();
  } else {
    // Desktop layout
    await expect(page.locator('.desktop-nav')).toBeVisible();
    await expect(page.locator('.mobile-menu')).toBeHidden();
  }

  console.log(`Tested on ${browserConfig.deviceName}`);
});

test('permissions match user role', async ({ page, userCredentials }) => {
  // Login first
  await page.goto('/login');
  await page.fill('#username', userCredentials.username);
  await page.fill('#password', userCredentials.password);
  await page.click('button[type="submit"]');

  // Check role-based permissions
  await page.goto('/settings');

  const deleteButton = page.locator('[data-testid="delete-account"]');

  if (userCredentials.role === 'admin') {
    await expect(deleteButton).toBeEnabled();
  } else {
    await expect(deleteButton).toBeDisabled();
  }
});
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Keep fixtures focused** | Each fixture should do one thing well. Compose multiple fixtures instead of creating monolithic ones. |
| **Use appropriate scope** | Use worker scope for expensive setup (database connections, account creation). Use test scope for isolation. |
| **Leverage automatic fixtures** | Use auto fixtures for cross-cutting concerns like screenshots, logging, and performance monitoring. |
| **Make fixtures configurable** | Use fixture options to allow runtime configuration via CLI or config files. |
| **Clean up in teardown** | Always clean up resources in the teardown phase (after `use()`) to prevent test pollution. |
| **Type your fixtures** | Use TypeScript interfaces to ensure type safety and better IDE support. |
| **Document dependencies** | Fixtures can depend on other fixtures. Document these dependencies clearly. |
| **Avoid fixture side effects** | Fixtures should be deterministic. Avoid global state that could affect other tests. |

## Conclusion

Playwright test fixtures provide a powerful system for managing test setup, teardown, and shared state. By using built-in fixtures, creating custom fixtures, and understanding scopes, you can write cleaner, more maintainable end-to-end tests.

The key benefits of using fixtures effectively:

- **Reduced duplication**: Share common setup across tests
- **Better isolation**: Each test gets exactly what it needs
- **Easier maintenance**: Change setup in one place
- **Improved performance**: Worker-scoped fixtures avoid redundant setup
- **Flexible configuration**: Options allow runtime customization

Start with built-in fixtures, gradually introduce custom fixtures as patterns emerge, and use worker scope judiciously for expensive operations.

---

Monitor your test infrastructure and application performance with [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you track uptime, performance, and reliability across your entire stack.
