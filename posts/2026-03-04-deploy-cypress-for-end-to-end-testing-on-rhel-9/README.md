# How to Deploy Cypress for End-to-End Testing on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Cypress, Testing, End-to-End, JavaScript, Linux

Description: Learn how to install and deploy Cypress for end-to-end testing on RHEL, including headless execution, test writing, custom commands, CI/CD integration, and parallel test runs.

---

Cypress is a JavaScript end-to-end testing framework that runs directly in the browser, giving you fast, reliable tests with built-in waiting, automatic retries, and real-time reloading. Unlike Selenium, Cypress executes in the same run loop as your application, which eliminates many of the flakiness issues that plague browser testing. This guide covers setting up Cypress on RHEL.

## Prerequisites

- RHEL with root or sudo access
- Node.js 18 or newer
- A web application to test

## Installing Node.js

```bash
# Install Node.js 18 from AppStream
sudo dnf module install -y nodejs:18
```

Verify:

```bash
# Check Node.js version
node --version
npm --version
```

## Installing Cypress Dependencies

Cypress requires several system libraries for running browsers:

```bash
# Install Cypress system dependencies
sudo dnf install -y \
  xorg-x11-server-Xvfb \
  gtk3 \
  nss \
  alsa-lib \
  libXScrnSaver \
  GConf2 \
  at-spi2-atk \
  mesa-libgbm
```

## Setting Up a Cypress Project

```bash
# Create a project directory
mkdir -p /opt/cypress-tests
cd /opt/cypress-tests
npm init -y
```

```bash
# Install Cypress
npm install cypress --save-dev
```

```bash
# Open Cypress to generate the default project structure
npx cypress open
```

If running on a headless server:

```bash
# Run Cypress in headless mode to verify installation
npx cypress run
```

## Project Structure

After initialization, Cypress creates:

```bash
cypress/
  e2e/           # Test files
  fixtures/      # Test data
  support/       # Custom commands and configuration
cypress.config.js  # Configuration file
```

## Configuring Cypress

```javascript
// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      // Node event listeners
    },
  },
});
```

## Writing Your First Test

```javascript
// cypress/e2e/homepage.cy.js
describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the correct title', () => {
    cy.title().should('include', 'My Application');
  });

  it('should have a navigation bar', () => {
    cy.get('nav').should('be.visible');
    cy.get('nav a').should('have.length.at.least', 3);
  });

  it('should navigate to the about page', () => {
    cy.get('a[href="/about"]').click();
    cy.url().should('include', '/about');
    cy.get('h1').should('contain', 'About');
  });
});
```

## Testing Forms

```javascript
// cypress/e2e/login.cy.js
describe('Login', () => {
  it('should login with valid credentials', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('user@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('.welcome-message').should('contain', 'Welcome');
  });

  it('should show error with invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    cy.get('.error-message').should('be.visible');
    cy.get('.error-message').should('contain', 'Invalid credentials');
  });
});
```

## Testing API Requests

```javascript
// cypress/e2e/api.cy.js
describe('API Tests', () => {
  it('should fetch users from the API', () => {
    cy.request('GET', '/api/users').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.length.greaterThan(0);
      expect(response.body[0]).to.have.property('name');
    });
  });

  it('should create a new user', () => {
    cy.request('POST', '/api/users', {
      name: 'Test User',
      email: 'test@example.com',
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.name).to.eq('Test User');
    });
  });
});
```

## Custom Commands

Create reusable commands:

```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('logout', () => {
  cy.get('.user-menu').click();
  cy.get('.logout-button').click();
  cy.url().should('include', '/login');
});
```

Use them in tests:

```javascript
describe('Dashboard', () => {
  beforeEach(() => {
    cy.login('user@example.com', 'password123');
  });

  it('should display user dashboard', () => {
    cy.get('.dashboard').should('be.visible');
  });
});
```

## Using Fixtures

```json
// cypress/fixtures/users.json
{
  "validUser": {
    "email": "user@example.com",
    "password": "password123"
  },
  "adminUser": {
    "email": "admin@example.com",
    "password": "admin123"
  }
}
```

```javascript
describe('Login with fixtures', () => {
  it('should login with fixture data', () => {
    cy.fixture('users').then((users) => {
      cy.login(users.validUser.email, users.validUser.password);
    });
  });
});
```

## Running Tests Headlessly

```bash
# Run all tests headlessly
npx cypress run

# Run a specific test file
npx cypress run --spec cypress/e2e/login.cy.js

# Run with a specific browser
npx cypress run --browser chrome

# Run with Firefox
npx cypress run --browser firefox
```

## Parallel Test Execution

For parallel runs, use Cypress Cloud or split tests manually:

```bash
# Run specific specs in parallel CI jobs
npx cypress run --spec "cypress/e2e/login.cy.js,cypress/e2e/homepage.cy.js"
```

## CI/CD Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          build: npm run build
          start: npm start
          wait-on: 'http://localhost:3000'
          browser: chrome
          headed: false
```

## Environment Variables

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    env: {
      apiUrl: 'http://localhost:3000/api',
      testUser: 'user@example.com',
    },
  },
});
```

Access in tests:

```javascript
cy.request(Cypress.env('apiUrl') + '/users');
```

Override from the command line:

```bash
# Set environment variables at runtime
npx cypress run --env apiUrl=http://staging.example.com/api
```

## Conclusion

Cypress on RHEL provides a modern, reliable end-to-end testing solution for web applications. Its built-in automatic waiting, time-travel debugging, and real-time reloading make tests easier to write and maintain. With headless execution, custom commands, and CI/CD integration, Cypress fits naturally into your development workflow and catches regressions before they reach production.
