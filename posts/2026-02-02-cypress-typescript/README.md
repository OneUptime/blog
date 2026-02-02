# How to Use Cypress with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Cypress, Testing, E2E, Automation

Description: Learn how to write type-safe end-to-end tests with Cypress and TypeScript, including custom commands, fixtures, and best practices.

---

End-to-end testing catches bugs that unit tests miss. Cypress has become the go-to tool for E2E testing in JavaScript applications, and adding TypeScript to the mix gives you autocomplete, type checking, and better refactoring support. This guide walks through setting up Cypress with TypeScript and covers patterns that work well in real projects.

## Setting Up Cypress with TypeScript

### Installation

Start by installing Cypress and the TypeScript dependencies:

```bash
# Install Cypress
npm install --save-dev cypress

# Install TypeScript (if you don't have it already)
npm install --save-dev typescript

# Open Cypress to generate the initial folder structure
npx cypress open
```

### TypeScript Configuration

Create a `tsconfig.json` in your `cypress` folder. This keeps your test configuration separate from your main application:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "types": ["cypress", "node"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@support/*": ["./support/*"],
      "@fixtures/*": ["./fixtures/*"],
      "@pages/*": ["./support/pages/*"]
    }
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Cypress Configuration

Configure Cypress in `cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Base URL for your application
    baseUrl: 'http://localhost:3000',

    // Where to find spec files
    specPattern: 'cypress/e2e/**/*.cy.ts',

    // Where to find support files
    supportFile: 'cypress/support/e2e.ts',

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,

    // Retries for flaky tests
    retries: {
      runMode: 2,
      openMode: 0,
    },

    // Video recording
    video: true,
    videoCompression: 32,

    // Screenshot settings
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      // Register plugins here
      return config;
    },
  },
});
```

## Configuration Options Reference

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | string | Base URL prepended to `cy.visit()` and `cy.request()` |
| `specPattern` | string | Glob pattern for test files |
| `supportFile` | string | Path to support file loaded before each spec |
| `defaultCommandTimeout` | number | Time in ms to wait for commands |
| `retries` | object | Number of retries for failed tests |
| `video` | boolean | Whether to record video during test runs |
| `env` | object | Environment variables accessible via `Cypress.env()` |

## Writing Your First TypeScript Test

Create a test file at `cypress/e2e/login.cy.ts`:

```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
  });

  it('should display validation errors for empty form', () => {
    // Click submit without filling the form
    cy.get('[data-testid="submit-button"]').click();

    // Check for validation messages
    cy.get('[data-testid="email-error"]')
      .should('be.visible')
      .and('contain', 'Email is required');

    cy.get('[data-testid="password-error"]')
      .should('be.visible')
      .and('contain', 'Password is required');
  });

  it('should login successfully with valid credentials', () => {
    // Fill in the form
    cy.get('[data-testid="email-input"]').type('user@example.com');
    cy.get('[data-testid="password-input"]').type('securePassword123');

    // Submit the form
    cy.get('[data-testid="submit-button"]').click();

    // Verify redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome');
  });

  it('should show error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('wrongPassword');
    cy.get('[data-testid="submit-button"]').click();

    // Check for error message
    cy.get('[data-testid="login-error"]')
      .should('be.visible')
      .and('contain', 'Invalid email or password');
  });
});
```

## Custom Commands with TypeScript

Custom commands let you reuse common test logic. The key is adding proper type definitions so you get autocomplete.

### Creating Custom Commands

Add commands in `cypress/support/commands.ts`:

```typescript
// cypress/support/commands.ts

// Login command that can be reused across tests
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="submit-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});

// Command to get elements by data-testid
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

// Command to intercept and mock API calls
Cypress.Commands.add('mockApi', (method: string, url: string, response: object) => {
  cy.intercept(method, url, {
    statusCode: 200,
    body: response,
  }).as('mockedRequest');
});

// Command to wait for loading states to finish
Cypress.Commands.add('waitForLoader', () => {
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});
```

### Adding Type Definitions

Create `cypress/support/index.d.ts` to tell TypeScript about your custom commands:

```typescript
// cypress/support/index.d.ts

declare namespace Cypress {
  interface Chainable {
    /**
     * Logs in a user with email and password
     * @param email - User's email address
     * @param password - User's password
     */
    login(email: string, password: string): Chainable<void>;

    /**
     * Gets an element by its data-testid attribute
     * @param testId - The data-testid value
     */
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

    /**
     * Mocks an API endpoint with a custom response
     * @param method - HTTP method (GET, POST, etc.)
     * @param url - URL pattern to intercept
     * @param response - Response body to return
     */
    mockApi(method: string, url: string, response: object): Chainable<void>;

    /**
     * Waits for loading spinner to disappear
     */
    waitForLoader(): Chainable<void>;
  }
}
```

### Using Custom Commands

```typescript
// cypress/e2e/dashboard.cy.ts
describe('Dashboard', () => {
  beforeEach(() => {
    // Use the custom login command
    cy.login('user@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('should display user data', () => {
    // Mock the API response
    cy.mockApi('GET', '/api/user/stats', {
      totalOrders: 42,
      totalSpent: 1250.00,
    });

    cy.visit('/dashboard');
    cy.waitForLoader();

    // Use getByTestId for cleaner selectors
    cy.getByTestId('total-orders').should('contain', '42');
    cy.getByTestId('total-spent').should('contain', '$1,250.00');
  });
});
```

## Page Object Pattern

Page objects help organize tests by grouping selectors and actions for each page:

```typescript
// cypress/support/pages/LoginPage.ts
export class LoginPage {
  // Selectors
  private emailInput = '[data-testid="email-input"]';
  private passwordInput = '[data-testid="password-input"]';
  private submitButton = '[data-testid="submit-button"]';
  private errorMessage = '[data-testid="login-error"]';

  // Navigate to the login page
  visit(): this {
    cy.visit('/login');
    return this;
  }

  // Fill in email
  typeEmail(email: string): this {
    cy.get(this.emailInput).clear().type(email);
    return this;
  }

  // Fill in password
  typePassword(password: string): this {
    cy.get(this.passwordInput).clear().type(password);
    return this;
  }

  // Submit the form
  submit(): this {
    cy.get(this.submitButton).click();
    return this;
  }

  // Chainable login method
  loginWith(email: string, password: string): this {
    return this.typeEmail(email).typePassword(password).submit();
  }

  // Assert error message is shown
  assertError(message: string): this {
    cy.get(this.errorMessage).should('be.visible').and('contain', message);
    return this;
  }

  // Assert successful redirect
  assertLoggedIn(): void {
    cy.url().should('include', '/dashboard');
  }
}
```

Using the page object in tests:

```typescript
// cypress/e2e/login-page-object.cy.ts
import { LoginPage } from '../support/pages/LoginPage';

describe('Login with Page Object', () => {
  const loginPage = new LoginPage();

  it('should login successfully', () => {
    loginPage
      .visit()
      .loginWith('user@example.com', 'password123')
      .assertLoggedIn();
  });

  it('should show error for invalid credentials', () => {
    loginPage
      .visit()
      .loginWith('wrong@example.com', 'wrongpass')
      .assertError('Invalid email or password');
  });
});
```

## Working with Fixtures

Fixtures store test data in JSON files. TypeScript interfaces keep the data type-safe.

### Define Fixture Types

```typescript
// cypress/support/types/fixtures.ts
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface TestData {
  users: User[];
  products: Product[];
}
```

### Create Fixture Files

```json
// cypress/fixtures/users.json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  },
  {
    "id": 2,
    "email": "user@example.com",
    "name": "Regular User",
    "role": "user"
  }
]
```

### Use Fixtures in Tests

```typescript
// cypress/e2e/users.cy.ts
import { User } from '../support/types/fixtures';

describe('User Management', () => {
  let users: User[];

  before(() => {
    // Load fixture data before tests run
    cy.fixture('users.json').then((data: User[]) => {
      users = data;
    });
  });

  it('should display admin user', () => {
    const adminUser = users.find(u => u.role === 'admin');

    cy.login(adminUser!.email, 'password123');
    cy.visit('/admin/users');

    cy.getByTestId('user-list').should('contain', adminUser!.name);
  });
});
```

## Environment Variables

Use environment variables for configuration that changes between environments.

### Define Environment Variables

```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      apiUrl: 'http://localhost:4000/api',
      adminEmail: 'admin@example.com',
      adminPassword: 'adminPass123',
    },
    // ...
  },
});
```

### Type-Safe Environment Variables

```typescript
// cypress/support/env.ts
interface CypressEnv {
  apiUrl: string;
  adminEmail: string;
  adminPassword: string;
}

export function getEnv(): CypressEnv {
  return {
    apiUrl: Cypress.env('apiUrl'),
    adminEmail: Cypress.env('adminEmail'),
    adminPassword: Cypress.env('adminPassword'),
  };
}
```

### Use in Tests

```typescript
// cypress/e2e/admin.cy.ts
import { getEnv } from '../support/env';

describe('Admin Panel', () => {
  const env = getEnv();

  beforeEach(() => {
    cy.login(env.adminEmail, env.adminPassword);
  });

  it('should access admin API', () => {
    cy.request(`${env.apiUrl}/admin/stats`).then((response) => {
      expect(response.status).to.eq(200);
    });
  });
});
```

## CI Configuration

### GitHub Actions

```yaml
# .github/workflows/cypress.yml
name: Cypress Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  cypress:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          wait-on-timeout: 120
        env:
          CYPRESS_apiUrl: ${{ secrets.API_URL }}

      - name: Upload screenshots on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots

      - name: Upload videos
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cypress-videos
          path: cypress/videos
```

## Summary

| Topic | Key Points |
|-------|------------|
| **Setup** | Separate `tsconfig.json` in cypress folder, configure paths for imports |
| **Custom Commands** | Define in `commands.ts`, add types in `index.d.ts` |
| **Page Objects** | Group selectors and actions per page, return `this` for chaining |
| **Fixtures** | Define TypeScript interfaces, load with `cy.fixture()` |
| **Environment Variables** | Define in config, create typed getter function |
| **CI** | Use official Cypress GitHub Action, upload artifacts on failure |

TypeScript makes Cypress tests more maintainable as your test suite grows. The type checking catches errors early, and autocomplete speeds up writing tests. Start with the basics and add page objects and custom commands as your test suite expands.
