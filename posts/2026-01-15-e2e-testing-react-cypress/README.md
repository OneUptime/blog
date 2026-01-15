# How to Set Up End-to-End Testing for React with Cypress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Cypress, E2E Testing, Testing, Automation, Frontend

Description: Learn how to configure Cypress for comprehensive end-to-end testing in React applications with custom commands, best practices, and real-world testing patterns.

---

End-to-end testing validates your entire application works correctly from a user's perspective. Unlike unit tests that test isolated functions, E2E tests simulate real user interactions - clicking buttons, filling forms, and navigating pages. Cypress has become the de facto standard for E2E testing in React applications due to its developer-friendly API, real-time reloading, and powerful debugging capabilities.

## Why Cypress for React?

| Feature | Benefit |
|---------|---------|
| **Time travel debugging** | See snapshots at each test step |
| **Automatic waiting** | No manual waits or sleeps |
| **Real browser testing** | Tests run in actual Chrome/Firefox |
| **Network stubbing** | Mock API responses easily |
| **Component testing** | Test components in isolation |
| **Video recording** | Automatic recordings of failures |

## Project Setup

Start by installing Cypress in your React project:

```bash
npm install cypress --save-dev
```

Add test scripts to your `package.json`:

```json
{
  "scripts": {
    "cypress:open": "cypress open",
    "cypress:run": "cypress run",
    "test:e2e": "cypress run --browser chrome",
    "test:e2e:headed": "cypress run --headed --browser chrome"
  }
}
```

Initialize Cypress to create the default folder structure:

```bash
npx cypress open
```

This creates the following structure in your project:

```
cypress/
  downloads/
  e2e/              # Your test files go here
  fixtures/         # Static test data
  support/
    commands.ts     # Custom commands
    e2e.ts          # Support file loaded before tests
cypress.config.ts   # Main configuration file
```

## Configuring Cypress

Create `cypress.config.ts` in your project root with React-specific settings. This configuration sets up base URLs, timeouts, and enables features like component testing.

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  // E2E testing configuration
  e2e: {
    // Base URL for your React dev server
    baseUrl: 'http://localhost:3000',

    // Folder containing test specs
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

    // Support file loaded before each test
    supportFile: 'cypress/support/e2e.ts',

    // Viewport settings (match common screen sizes)
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeouts
    defaultCommandTimeout: 10000,  // Commands timeout after 10s
    requestTimeout: 10000,         // API requests timeout after 10s
    responseTimeout: 30000,        // Wait up to 30s for responses

    // Video and screenshots
    video: true,                   // Record videos of test runs
    screenshotOnRunFailure: true,  // Capture screenshots on failure

    // Retry configuration for flaky tests
    retries: {
      runMode: 2,      // Retry twice in CI
      openMode: 0,     // No retries in interactive mode
    },

    // Setup node events for plugins
    setupNodeEvents(on, config) {
      // Register plugins here
      return config;
    },
  },

  // Component testing configuration (optional)
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',  // or 'webpack' depending on your setup
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
  },

  // Environment variables available in tests via Cypress.env()
  env: {
    apiUrl: 'http://localhost:3001/api',
    coverage: false,
  },
});
```

## TypeScript Configuration

For TypeScript support, create `cypress/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "types": ["cypress", "node"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "isolatedModules": false,
    "strict": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

## Writing Your First Test

Create a test file in `cypress/e2e/`. Cypress tests use a BDD-style syntax with `describe`, `it`, and chainable commands. The test below verifies the homepage loads correctly.

```typescript
// cypress/e2e/home.cy.ts
describe('Home Page', () => {
  // Runs before each test in this describe block
  beforeEach(() => {
    // Visit the base URL defined in cypress.config.ts
    cy.visit('/');
  });

  it('should display the welcome message', () => {
    // Find element by data-testid attribute (recommended)
    cy.get('[data-testid="welcome-message"]')
      .should('be.visible')
      .and('contain', 'Welcome to Our App');
  });

  it('should have a working navigation', () => {
    // Click the navigation link
    cy.get('[data-testid="nav-about"]').click();

    // Verify URL changed
    cy.url().should('include', '/about');

    // Verify page content loaded
    cy.get('[data-testid="about-heading"]')
      .should('be.visible');
  });

  it('should be responsive on mobile', () => {
    // Change viewport to mobile size
    cy.viewport('iphone-x');

    // Mobile menu should be visible
    cy.get('[data-testid="mobile-menu-button"]')
      .should('be.visible');

    // Desktop nav should be hidden
    cy.get('[data-testid="desktop-nav"]')
      .should('not.be.visible');
  });
});
```

## Testing User Authentication

Authentication flows are critical paths that must work correctly. This test suite covers login, logout, and protected route access.

```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'SecurePass123!',
  };

  describe('Login', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should login with valid credentials', () => {
      // Fill in login form
      cy.get('[data-testid="email-input"]')
        .type(testUser.email);

      cy.get('[data-testid="password-input"]')
        .type(testUser.password);

      // Submit form
      cy.get('[data-testid="login-button"]').click();

      // Verify successful login
      cy.url().should('eq', Cypress.config('baseUrl') + '/dashboard');

      // Verify user is logged in
      cy.get('[data-testid="user-menu"]')
        .should('contain', testUser.email);
    });

    it('should show error with invalid credentials', () => {
      cy.get('[data-testid="email-input"]')
        .type('wrong@example.com');

      cy.get('[data-testid="password-input"]')
        .type('wrongpassword');

      cy.get('[data-testid="login-button"]').click();

      // Error message should appear
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Invalid email or password');

      // Should remain on login page
      cy.url().should('include', '/login');
    });

    it('should validate required fields', () => {
      // Try to submit empty form
      cy.get('[data-testid="login-button"]').click();

      // Validation messages should appear
      cy.get('[data-testid="email-error"]')
        .should('contain', 'Email is required');

      cy.get('[data-testid="password-error"]')
        .should('contain', 'Password is required');
    });

    it('should validate email format', () => {
      cy.get('[data-testid="email-input"]')
        .type('invalid-email');

      cy.get('[data-testid="password-input"]')
        .type(testUser.password);

      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="email-error"]')
        .should('contain', 'Please enter a valid email');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Login before each test using custom command (defined later)
      cy.login(testUser.email, testUser.password);
    });

    it('should logout successfully', () => {
      // Open user menu
      cy.get('[data-testid="user-menu"]').click();

      // Click logout
      cy.get('[data-testid="logout-button"]').click();

      // Should redirect to login page
      cy.url().should('include', '/login');

      // User menu should not exist
      cy.get('[data-testid="user-menu"]').should('not.exist');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when not authenticated', () => {
      // Try to access protected route directly
      cy.visit('/dashboard');

      // Should redirect to login
      cy.url().should('include', '/login');

      // Should have redirect param
      cy.url().should('include', 'redirect=/dashboard');
    });

    it('should redirect to intended page after login', () => {
      // Try to access protected route
      cy.visit('/settings');

      // Should be on login page
      cy.url().should('include', '/login');

      // Login
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      // Should redirect to originally intended page
      cy.url().should('include', '/settings');
    });
  });
});
```

## Testing Forms

Forms are where users input data and bugs often hide. Test validation, submission, and error handling thoroughly.

```typescript
// cypress/e2e/forms.cy.ts
describe('Contact Form', () => {
  beforeEach(() => {
    cy.visit('/contact');
  });

  it('should submit form with valid data', () => {
    // Fill in all fields
    cy.get('[data-testid="name-input"]')
      .type('John Doe');

    cy.get('[data-testid="email-input"]')
      .type('john@example.com');

    cy.get('[data-testid="subject-select"]')
      .select('General Inquiry');

    cy.get('[data-testid="message-textarea"]')
      .type('This is a test message for the contact form.');

    // Intercept the API call
    cy.intercept('POST', '/api/contact', {
      statusCode: 200,
      body: { success: true, messageId: '123' },
    }).as('submitContact');

    // Submit form
    cy.get('[data-testid="submit-button"]').click();

    // Wait for API call
    cy.wait('@submitContact').its('request.body').should('deep.equal', {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'General Inquiry',
      message: 'This is a test message for the contact form.',
    });

    // Success message should appear
    cy.get('[data-testid="success-message"]')
      .should('be.visible')
      .and('contain', 'Message sent successfully');
  });

  it('should handle server errors gracefully', () => {
    // Fill form
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john@example.com');
    cy.get('[data-testid="subject-select"]').select('General Inquiry');
    cy.get('[data-testid="message-textarea"]').type('Test message');

    // Simulate server error
    cy.intercept('POST', '/api/contact', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('submitContact');

    cy.get('[data-testid="submit-button"]').click();

    cy.wait('@submitContact');

    // Error message should appear
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Something went wrong');

    // Form should still have data (for retry)
    cy.get('[data-testid="name-input"]')
      .should('have.value', 'John Doe');
  });

  it('should disable submit button while submitting', () => {
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john@example.com');
    cy.get('[data-testid="subject-select"]').select('General Inquiry');
    cy.get('[data-testid="message-textarea"]').type('Test message');

    // Delay response to observe loading state
    cy.intercept('POST', '/api/contact', {
      delay: 1000,
      statusCode: 200,
      body: { success: true },
    }).as('submitContact');

    cy.get('[data-testid="submit-button"]').click();

    // Button should be disabled
    cy.get('[data-testid="submit-button"]')
      .should('be.disabled')
      .and('contain', 'Sending...');

    cy.wait('@submitContact');

    // Button should be enabled again
    cy.get('[data-testid="submit-button"]')
      .should('not.be.disabled')
      .and('contain', 'Send Message');
  });

  it('should clear form after successful submission', () => {
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john@example.com');
    cy.get('[data-testid="subject-select"]').select('General Inquiry');
    cy.get('[data-testid="message-textarea"]').type('Test message');

    cy.intercept('POST', '/api/contact', {
      statusCode: 200,
      body: { success: true },
    }).as('submitContact');

    cy.get('[data-testid="submit-button"]').click();

    cy.wait('@submitContact');

    // Form fields should be cleared
    cy.get('[data-testid="name-input"]').should('have.value', '');
    cy.get('[data-testid="email-input"]').should('have.value', '');
    cy.get('[data-testid="message-textarea"]').should('have.value', '');
  });
});
```

## Custom Commands

Custom commands encapsulate common actions and make tests more readable. Define them in `cypress/support/commands.ts`.

```typescript
// cypress/support/commands.ts

// Extend Cypress types for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login with email and password
       * @example cy.login('user@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Logout the current user
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Login via API (faster than UI login)
       * @example cy.loginByApi('user@example.com', 'password123')
       */
      loginByApi(email: string, password: string): Chainable<void>;

      /**
       * Get element by data-testid attribute
       * @example cy.getByTestId('submit-button')
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Fill and submit a form
       * @example cy.fillForm({ name: 'John', email: 'john@example.com' })
       */
      fillForm(fields: Record<string, string>): Chainable<void>;

      /**
       * Wait for page to fully load
       * @example cy.waitForPageLoad()
       */
      waitForPageLoad(): Chainable<void>;

      /**
       * Assert toast notification appears
       * @example cy.expectToast('Success', 'Item created')
       */
      expectToast(type: string, message: string): Chainable<void>;
    }
  }
}

// Login via UI - use when testing the login flow itself
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type(email);
      cy.get('[data-testid="password-input"]').type(password);
      cy.get('[data-testid="login-button"]').click();
      cy.url().should('not.include', '/login');
    },
    {
      // Validate session is still valid
      validate: () => {
        cy.getCookie('session').should('exist');
      },
    }
  );
});

// Login via API - faster for tests where login is just setup
Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/auth/login`,
        body: { email, password },
      }).then((response) => {
        expect(response.status).to.eq(200);
        // Store token in localStorage if using JWT
        window.localStorage.setItem('authToken', response.body.token);
      });
    },
    {
      validate: () => {
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/auth/me`,
          failOnStatusCode: false,
        }).its('status').should('eq', 200);
      },
    }
  );
});

// Logout
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Get by data-testid - cleaner syntax for common pattern
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

// Fill form fields by data-testid
Cypress.Commands.add('fillForm', (fields: Record<string, string>) => {
  Object.entries(fields).forEach(([testId, value]) => {
    cy.getByTestId(testId).clear().type(value);
  });
});

// Wait for page to fully load (useful after navigation)
Cypress.Commands.add('waitForPageLoad', () => {
  cy.document().its('readyState').should('eq', 'complete');
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});

// Assert toast notification
Cypress.Commands.add('expectToast', (type: string, message: string) => {
  cy.get(`[data-testid="toast-${type}"]`)
    .should('be.visible')
    .and('contain', message);
});

export {};
```

Import commands in the support file:

```typescript
// cypress/support/e2e.ts
import './commands';

// Global hooks
beforeEach(() => {
  // Clear cookies and localStorage before each test for isolation
  // Note: cy.session() handles this automatically for sessions
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false prevents Cypress from failing the test
  // Only use this for expected/known errors
  if (err.message.includes('ResizeObserver loop')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});
```

## Network Stubbing and Interception

Cypress can intercept HTTP requests to mock API responses, test error handling, and verify request payloads.

```typescript
// cypress/e2e/api-integration.cy.ts
describe('API Integration', () => {
  beforeEach(() => {
    cy.loginByApi('test@example.com', 'password123');
  });

  describe('Data Loading', () => {
    it('should display loading state while fetching data', () => {
      // Delay response to observe loading state
      cy.intercept('GET', '/api/users', {
        delay: 500,
        fixture: 'users.json',
      }).as('getUsers');

      cy.visit('/users');

      // Loading spinner should appear
      cy.getByTestId('loading-spinner').should('be.visible');

      cy.wait('@getUsers');

      // Loading spinner should disappear
      cy.getByTestId('loading-spinner').should('not.exist');

      // Data should be displayed
      cy.getByTestId('users-list').should('be.visible');
    });

    it('should display empty state when no data', () => {
      cy.intercept('GET', '/api/users', {
        statusCode: 200,
        body: { users: [] },
      }).as('getUsers');

      cy.visit('/users');

      cy.wait('@getUsers');

      cy.getByTestId('empty-state')
        .should('be.visible')
        .and('contain', 'No users found');
    });

    it('should display error state on API failure', () => {
      cy.intercept('GET', '/api/users', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getUsers');

      cy.visit('/users');

      cy.wait('@getUsers');

      cy.getByTestId('error-state')
        .should('be.visible')
        .and('contain', 'Failed to load users');

      // Retry button should be present
      cy.getByTestId('retry-button').should('be.visible');
    });

    it('should retry on error', () => {
      let requestCount = 0;

      cy.intercept('GET', '/api/users', (req) => {
        requestCount++;
        if (requestCount === 1) {
          req.reply({ statusCode: 500 });
        } else {
          req.reply({ fixture: 'users.json' });
        }
      }).as('getUsers');

      cy.visit('/users');

      cy.wait('@getUsers');

      // Click retry
      cy.getByTestId('retry-button').click();

      cy.wait('@getUsers');

      // Should now show data
      cy.getByTestId('users-list').should('be.visible');
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/users', {
        fixture: 'users.json',
      }).as('getUsers');
    });

    it('should create a new user', () => {
      cy.intercept('POST', '/api/users', {
        statusCode: 201,
        body: { id: 'new-123', name: 'New User', email: 'new@example.com' },
      }).as('createUser');

      cy.visit('/users');
      cy.wait('@getUsers');

      cy.getByTestId('add-user-button').click();

      cy.getByTestId('user-name-input').type('New User');
      cy.getByTestId('user-email-input').type('new@example.com');
      cy.getByTestId('save-user-button').click();

      cy.wait('@createUser').its('request.body').should('deep.equal', {
        name: 'New User',
        email: 'new@example.com',
      });

      cy.expectToast('success', 'User created successfully');
    });

    it('should update an existing user', () => {
      cy.intercept('PUT', '/api/users/1', {
        statusCode: 200,
        body: { id: '1', name: 'Updated Name', email: 'test@example.com' },
      }).as('updateUser');

      cy.visit('/users');
      cy.wait('@getUsers');

      cy.getByTestId('edit-user-1').click();

      cy.getByTestId('user-name-input').clear().type('Updated Name');
      cy.getByTestId('save-user-button').click();

      cy.wait('@updateUser');

      cy.expectToast('success', 'User updated successfully');
    });

    it('should delete a user with confirmation', () => {
      cy.intercept('DELETE', '/api/users/1', {
        statusCode: 200,
      }).as('deleteUser');

      cy.visit('/users');
      cy.wait('@getUsers');

      cy.getByTestId('delete-user-1').click();

      // Confirmation modal should appear
      cy.getByTestId('confirm-modal')
        .should('be.visible')
        .and('contain', 'Are you sure');

      cy.getByTestId('confirm-delete').click();

      cy.wait('@deleteUser');

      cy.expectToast('success', 'User deleted');
    });
  });
});
```

## Fixtures

Fixtures provide consistent test data. Create JSON files in `cypress/fixtures/`.

```json
// cypress/fixtures/users.json
{
  "users": [
    {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "createdAt": "2025-01-15T00:00:00Z"
    },
    {
      "id": "2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "user",
      "createdAt": "2025-01-16T00:00:00Z"
    },
    {
      "id": "3",
      "name": "Bob Wilson",
      "email": "bob@example.com",
      "role": "user",
      "createdAt": "2025-01-17T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 10
  }
}
```

```json
// cypress/fixtures/user-profile.json
{
  "id": "1",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "notifications": true,
    "language": "en"
  }
}
```

## Testing React-Specific Patterns

### Testing React Router Navigation

```typescript
// cypress/e2e/navigation.cy.ts
describe('Navigation', () => {
  beforeEach(() => {
    cy.loginByApi('test@example.com', 'password123');
  });

  it('should navigate using React Router', () => {
    cy.visit('/');

    // Click navigation link
    cy.getByTestId('nav-dashboard').click();

    // URL should change without page reload
    cy.url().should('include', '/dashboard');

    // Go back using browser button
    cy.go('back');
    cy.url().should('eq', Cypress.config('baseUrl') + '/');

    // Go forward
    cy.go('forward');
    cy.url().should('include', '/dashboard');
  });

  it('should handle 404 routes', () => {
    cy.visit('/non-existent-page', { failOnStatusCode: false });

    cy.getByTestId('not-found-page')
      .should('be.visible')
      .and('contain', 'Page not found');

    cy.getByTestId('go-home-button').click();
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  it('should preserve query parameters', () => {
    cy.visit('/search?q=test&category=all');

    cy.url().should('include', 'q=test');
    cy.url().should('include', 'category=all');

    cy.getByTestId('search-input').should('have.value', 'test');
    cy.getByTestId('category-filter').should('have.value', 'all');
  });
});
```

### Testing Modals and Dialogs

```typescript
// cypress/e2e/modals.cy.ts
describe('Modal Components', () => {
  beforeEach(() => {
    cy.loginByApi('test@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('should open and close modal', () => {
    cy.getByTestId('open-modal-button').click();

    // Modal should be visible
    cy.getByTestId('modal-overlay').should('be.visible');
    cy.getByTestId('modal-content').should('be.visible');

    // Close with X button
    cy.getByTestId('modal-close-button').click();

    cy.getByTestId('modal-overlay').should('not.exist');
  });

  it('should close modal on overlay click', () => {
    cy.getByTestId('open-modal-button').click();

    // Click outside modal content
    cy.getByTestId('modal-overlay').click('topLeft');

    cy.getByTestId('modal-overlay').should('not.exist');
  });

  it('should close modal on escape key', () => {
    cy.getByTestId('open-modal-button').click();

    cy.getByTestId('modal-content').should('be.visible');

    // Press escape
    cy.get('body').type('{esc}');

    cy.getByTestId('modal-overlay').should('not.exist');
  });

  it('should trap focus within modal', () => {
    cy.getByTestId('open-modal-button').click();

    // First focusable element should be focused
    cy.getByTestId('modal-first-input').should('have.focus');

    // Tab to last element
    cy.getByTestId('modal-first-input').tab();
    cy.getByTestId('modal-second-input').should('have.focus');

    cy.getByTestId('modal-second-input').tab();
    cy.getByTestId('modal-submit-button').should('have.focus');

    // Tab again should loop to first
    cy.getByTestId('modal-submit-button').tab();
    cy.getByTestId('modal-first-input').should('have.focus');
  });
});
```

### Testing React State Management

```typescript
// cypress/e2e/state-management.cy.ts
describe('Shopping Cart State', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/products', {
      fixture: 'products.json',
    }).as('getProducts');

    cy.visit('/products');
    cy.wait('@getProducts');
  });

  it('should add items to cart', () => {
    // Cart should start empty
    cy.getByTestId('cart-count').should('contain', '0');

    // Add first product
    cy.getByTestId('add-to-cart-1').click();

    cy.getByTestId('cart-count').should('contain', '1');

    // Add second product
    cy.getByTestId('add-to-cart-2').click();

    cy.getByTestId('cart-count').should('contain', '2');
  });

  it('should persist cart across page navigation', () => {
    cy.getByTestId('add-to-cart-1').click();
    cy.getByTestId('add-to-cart-2').click();

    cy.getByTestId('cart-count').should('contain', '2');

    // Navigate to different page
    cy.visit('/about');

    // Cart should still have items
    cy.getByTestId('cart-count').should('contain', '2');

    // Navigate back
    cy.visit('/products');
    cy.wait('@getProducts');

    cy.getByTestId('cart-count').should('contain', '2');
  });

  it('should update quantity in cart', () => {
    cy.getByTestId('add-to-cart-1').click();

    cy.visit('/cart');

    cy.getByTestId('item-quantity-1').should('have.value', '1');

    // Increase quantity
    cy.getByTestId('increase-quantity-1').click();
    cy.getByTestId('item-quantity-1').should('have.value', '2');

    // Decrease quantity
    cy.getByTestId('decrease-quantity-1').click();
    cy.getByTestId('item-quantity-1').should('have.value', '1');
  });

  it('should remove item from cart', () => {
    cy.getByTestId('add-to-cart-1').click();
    cy.getByTestId('add-to-cart-2').click();

    cy.visit('/cart');

    cy.getByTestId('cart-item-1').should('exist');
    cy.getByTestId('cart-item-2').should('exist');

    cy.getByTestId('remove-item-1').click();

    cy.getByTestId('cart-item-1').should('not.exist');
    cy.getByTestId('cart-item-2').should('exist');
  });

  it('should calculate cart total correctly', () => {
    // Add product with price $10
    cy.getByTestId('add-to-cart-1').click();

    // Add product with price $20
    cy.getByTestId('add-to-cart-2').click();

    cy.visit('/cart');

    cy.getByTestId('cart-subtotal').should('contain', '$30.00');

    // Increase first item quantity
    cy.getByTestId('increase-quantity-1').click();

    cy.getByTestId('cart-subtotal').should('contain', '$40.00');
  });
});
```

## Accessibility Testing

Cypress can integrate with axe-core for automated accessibility testing.

```bash
npm install cypress-axe axe-core --save-dev
```

```typescript
// cypress/support/e2e.ts
import 'cypress-axe';
```

```typescript
// cypress/e2e/accessibility.cy.ts
describe('Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should have no detectable accessibility violations on home page', () => {
    cy.checkA11y();
  });

  it('should have no accessibility violations on login form', () => {
    cy.visit('/login');
    cy.injectAxe();
    cy.checkA11y('[data-testid="login-form"]');
  });

  it('should have proper focus management', () => {
    cy.visit('/login');
    cy.injectAxe();

    // Check specific rules
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
        'label': { enabled: true },
      },
    });
  });

  it('should report violations for specific elements', () => {
    cy.visit('/dashboard');
    cy.injectAxe();

    // Check only specific section
    cy.checkA11y('[data-testid="dashboard-widgets"]', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa'],
      },
    });
  });
});
```

## Visual Regression Testing

Integrate with Percy or Cypress's screenshot comparison for visual testing.

```typescript
// cypress/e2e/visual-regression.cy.ts
describe('Visual Regression', () => {
  beforeEach(() => {
    cy.loginByApi('test@example.com', 'password123');
  });

  it('should match homepage snapshot', () => {
    cy.visit('/');
    cy.waitForPageLoad();

    // Take full page screenshot
    cy.screenshot('homepage-full', { capture: 'fullPage' });
  });

  it('should match dashboard at different viewports', () => {
    cy.visit('/dashboard');
    cy.waitForPageLoad();

    // Desktop
    cy.viewport(1920, 1080);
    cy.screenshot('dashboard-desktop');

    // Tablet
    cy.viewport('ipad-2');
    cy.screenshot('dashboard-tablet');

    // Mobile
    cy.viewport('iphone-x');
    cy.screenshot('dashboard-mobile');
  });

  it('should match component states', () => {
    cy.visit('/components');
    cy.waitForPageLoad();

    // Default state
    cy.getByTestId('button-primary').screenshot('button-default');

    // Hover state
    cy.getByTestId('button-primary')
      .trigger('mouseover')
      .screenshot('button-hover');

    // Focus state
    cy.getByTestId('button-primary')
      .focus()
      .screenshot('button-focus');
  });
});
```

## CI/CD Integration

Configure Cypress for continuous integration. Example GitHub Actions workflow:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  cypress:
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        browser: [chrome, firefox]

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

      - name: Start application
        run: npm start &
        env:
          PORT: 3000

      - name: Wait for application
        run: npx wait-on http://localhost:3000

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          browser: ${{ matrix.browser }}
          record: true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots-${{ matrix.browser }}
          path: cypress/screenshots

      - name: Upload videos
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cypress-videos-${{ matrix.browser }}
          path: cypress/videos
```

## Best Practices

| Practice | Description |
|----------|-------------|
| **Use data-testid attributes** | Decouples tests from CSS and structure |
| **Test user workflows** | Not implementation details |
| **Use cy.session()** | Caches login state across tests |
| **Stub network requests** | Faster and more reliable tests |
| **Keep tests independent** | Each test should work in isolation |
| **Use fixtures** | Consistent, predictable test data |
| **Wait for elements** | Use assertions, not arbitrary waits |
| **Test error states** | Cover unhappy paths too |

## Common Patterns Cheat Sheet

| Task | Pattern |
|------|---------|
| **Wait for element** | `cy.get('[data-testid="x"]').should('be.visible')` |
| **Wait for API** | `cy.intercept(...).as('alias'); cy.wait('@alias')` |
| **Clear input** | `cy.get('input').clear().type('new value')` |
| **Select dropdown** | `cy.get('select').select('option')` |
| **Check checkbox** | `cy.get('[type="checkbox"]').check()` |
| **Upload file** | `cy.get('input[type="file"]').selectFile('path')` |
| **Assert URL** | `cy.url().should('include', '/path')` |
| **Assert cookie** | `cy.getCookie('name').should('exist')` |
| **Scroll to element** | `cy.get('element').scrollIntoView()` |
| **Hover** | `cy.get('element').trigger('mouseover')` |

## Debugging Tips

```typescript
// Pause test execution for debugging
cy.pause();

// Print debug information
cy.debug();

// Log to Cypress command log
cy.log('Custom message');

// Log to browser console
cy.task('log', 'Message for Node console');

// Print current subject
cy.get('element').then(console.log);

// Take screenshot for debugging
cy.screenshot('debug-screenshot');
```

## Summary Table

| Component | File | Purpose |
|-----------|------|---------|
| **Config** | `cypress.config.ts` | Main Cypress configuration |
| **Support** | `cypress/support/e2e.ts` | Global hooks and imports |
| **Commands** | `cypress/support/commands.ts` | Custom reusable commands |
| **Tests** | `cypress/e2e/*.cy.ts` | Test specifications |
| **Fixtures** | `cypress/fixtures/*.json` | Test data files |
| **TypeScript** | `cypress/tsconfig.json` | TypeScript configuration |

Cypress provides everything needed for comprehensive E2E testing of React applications. Start with critical user flows like authentication and core features, then expand coverage to edge cases and error handling. The time invested in E2E tests pays dividends in catching regressions before they reach users.
