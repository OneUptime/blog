# How to Handle End-to-End Testing with Cypress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cypress, E2E Testing, JavaScript, Testing, Automation, Frontend, Quality Assurance

Description: A comprehensive guide to implementing end-to-end testing with Cypress, covering setup, best practices, custom commands, and CI/CD integration.

---

End-to-end testing validates your entire application from a user's perspective. Cypress has become the go-to tool for modern web applications because it runs directly in the browser, provides excellent debugging capabilities, and offers a straightforward API. This guide covers practical patterns for building reliable E2E tests.

## Understanding Cypress Architecture

Cypress runs inside the browser alongside your application, which gives it direct access to the DOM, network requests, and storage. This architecture differs fundamentally from Selenium-based tools that control browsers remotely.

```mermaid
flowchart LR
    subgraph Browser["Browser Process"]
        CA[Cypress Agent]
        App[Your Application]
        CA <--> App
    end

    subgraph Node["Node.js Process"]
        TR[Test Runner]
        Plugins[Plugins]
        TR --> Plugins
    end

    Node <--> Browser

    style CA fill:#69b3a2
    style App fill:#4a90a4
```

## Setting Up Cypress

Install Cypress and initialize your project:

```bash
# Install Cypress as a dev dependency
npm install --save-dev cypress

# Open Cypress for the first time to generate config files
npx cypress open
```

Configure Cypress in `cypress.config.js`:

```javascript
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Base URL for your application
    baseUrl: 'http://localhost:3000',

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeout configurations
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,

    // Video and screenshot settings
    video: true,
    screenshotOnRunFailure: true,

    // Retry configuration for flaky tests
    retries: {
      runMode: 2,      // Retries in CI
      openMode: 0      // No retries in interactive mode
    },

    setupNodeEvents(on, config) {
      // Register plugins here
      return config;
    }
  }
});
```

## Writing Your First Test

Create a test file at `cypress/e2e/login.cy.js`:

```javascript
// cypress/e2e/login.cy.js
describe('User Authentication', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
  });

  it('should display login form elements', () => {
    // Check that all form elements are present
    cy.get('[data-testid="email-input"]').should('be.visible');
    cy.get('[data-testid="password-input"]').should('be.visible');
    cy.get('[data-testid="submit-button"]').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    // Enter invalid credentials
    cy.get('[data-testid="email-input"]').type('invalid@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="submit-button"]').click();

    // Verify error message appears
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid credentials');
  });

  it('should redirect to dashboard on successful login', () => {
    // Enter valid credentials
    cy.get('[data-testid="email-input"]').type('user@example.com');
    cy.get('[data-testid="password-input"]').type('correctpassword');
    cy.get('[data-testid="submit-button"]').click();

    // Verify redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome');
  });
});
```

## Custom Commands for Reusability

Create custom commands to avoid repetition. Add them to `cypress/support/commands.js`:

```javascript
// cypress/support/commands.js

// Custom login command
Cypress.Commands.add('login', (email, password) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="submit-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});

// API login for faster authentication
Cypress.Commands.add('loginViaApi', (email, password) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password }
  }).then((response) => {
    // Store token in localStorage or cookies
    window.localStorage.setItem('authToken', response.body.token);
  });
});

// Custom command to intercept and mock API calls
Cypress.Commands.add('mockApi', (method, url, fixture) => {
  cy.intercept(method, url, { fixture }).as('mockedRequest');
});
```

## Handling Network Requests

Cypress provides powerful network interception capabilities:

```javascript
// cypress/e2e/api-interactions.cy.js
describe('Dashboard Data Loading', () => {
  beforeEach(() => {
    cy.loginViaApi('user@example.com', 'password123');
  });

  it('should display user data from API', () => {
    // Intercept the API call
    cy.intercept('GET', '/api/users/profile', {
      statusCode: 200,
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin'
      }
    }).as('getProfile');

    cy.visit('/dashboard');

    // Wait for the API call to complete
    cy.wait('@getProfile');

    // Verify data is displayed
    cy.get('[data-testid="user-name"]').should('contain', 'John Doe');
    cy.get('[data-testid="user-role"]').should('contain', 'admin');
  });

  it('should handle API errors gracefully', () => {
    // Simulate server error
    cy.intercept('GET', '/api/users/profile', {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('getProfileError');

    cy.visit('/dashboard');
    cy.wait('@getProfileError');

    // Verify error handling
    cy.get('[data-testid="error-banner"]')
      .should('be.visible')
      .and('contain', 'Failed to load profile');
  });
});
```

## Test Organization and Page Objects

Use page objects to organize selectors and actions:

```javascript
// cypress/support/pages/LoginPage.js
class LoginPage {
  // Selectors
  get emailInput() {
    return cy.get('[data-testid="email-input"]');
  }

  get passwordInput() {
    return cy.get('[data-testid="password-input"]');
  }

  get submitButton() {
    return cy.get('[data-testid="submit-button"]');
  }

  get errorMessage() {
    return cy.get('[data-testid="error-message"]');
  }

  // Actions
  visit() {
    cy.visit('/login');
    return this;
  }

  fillEmail(email) {
    this.emailInput.clear().type(email);
    return this;
  }

  fillPassword(password) {
    this.passwordInput.clear().type(password);
    return this;
  }

  submit() {
    this.submitButton.click();
    return this;
  }

  login(email, password) {
    this.fillEmail(email);
    this.fillPassword(password);
    this.submit();
    return this;
  }
}

export const loginPage = new LoginPage();
```

Use the page object in tests:

```javascript
// cypress/e2e/login-with-page-object.cy.js
import { loginPage } from '../support/pages/LoginPage';

describe('Login with Page Object', () => {
  it('should login successfully', () => {
    loginPage
      .visit()
      .login('user@example.com', 'password123');

    cy.url().should('include', '/dashboard');
  });
});
```

## Test Flow Visualization

```mermaid
flowchart TD
    Start([Start Test]) --> Setup[beforeEach Setup]
    Setup --> Visit[Visit Page]
    Visit --> Interact[User Interactions]
    Interact --> Assert[Assertions]
    Assert --> Pass{Pass?}
    Pass -->|Yes| Next[Next Test]
    Pass -->|No| Retry{Retry Available?}
    Retry -->|Yes| Setup
    Retry -->|No| Fail[Test Failed]
    Next --> More{More Tests?}
    More -->|Yes| Setup
    More -->|No| End([End Suite])
```

## Best Practices for Reliable Tests

### 1. Use Data Attributes for Selectors

```javascript
// Avoid - Brittle selectors
cy.get('.btn-primary').click();
cy.get('#submit').click();

// Prefer - Stable data attributes
cy.get('[data-testid="submit-button"]').click();
```

### 2. Avoid Arbitrary Waits

```javascript
// Avoid - Fixed time waits
cy.wait(5000);

// Prefer - Wait for specific conditions
cy.get('[data-testid="loading"]').should('not.exist');
cy.get('[data-testid="content"]').should('be.visible');

// Or wait for network requests
cy.wait('@apiRequest');
```

### 3. Use Fixtures for Test Data

```javascript
// cypress/fixtures/users.json
{
  "validUser": {
    "email": "test@example.com",
    "password": "securePassword123"
  },
  "invalidUser": {
    "email": "invalid@example.com",
    "password": "wrong"
  }
}

// In your test
cy.fixture('users').then((users) => {
  cy.get('[data-testid="email-input"]').type(users.validUser.email);
});
```

## CI/CD Integration

Configure Cypress for continuous integration in your pipeline:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  cypress-run:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

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

      - name: Start application
        run: npm run start &
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

      - name: Wait for app
        run: npx wait-on http://localhost:3000

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          browser: chrome
          record: true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}

      - name: Upload screenshots on failure
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

## Debugging Failed Tests

Cypress provides several debugging tools:

```javascript
// Use cy.pause() to stop execution
cy.get('[data-testid="button"]').click();
cy.pause(); // Execution stops here for debugging

// Use cy.debug() to log element info
cy.get('[data-testid="form"]').debug();

// Enable Chrome DevTools in headed mode
// Add to cypress.config.js
module.exports = defineConfig({
  e2e: {
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: true
  }
});
```

## Conclusion

Cypress simplifies end-to-end testing with its browser-based architecture and intuitive API. Key takeaways for building reliable test suites include using stable selectors with data attributes, avoiding arbitrary waits in favor of explicit assertions, organizing tests with page objects, and integrating tests into your CI/CD pipeline. Start with critical user flows like authentication and checkout, then expand coverage gradually. Well-maintained E2E tests catch integration issues before they reach production and give your team confidence when deploying changes.
