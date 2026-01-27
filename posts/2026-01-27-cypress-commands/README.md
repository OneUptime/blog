# How to Write Cypress Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cypress, Testing, JavaScript, TypeScript, E2E Testing, Test Automation, Custom Commands

Description: A comprehensive guide to writing custom Cypress commands that simplify test code, improve maintainability, and enable powerful test automation patterns.

---

> Custom Cypress commands transform repetitive test code into reusable, readable abstractions that make your test suite easier to write, maintain, and understand.

Cypress provides a powerful mechanism for extending its command chain with custom commands. Whether you need to encapsulate authentication flows, interact with complex UI components, or create domain-specific testing utilities, custom commands help you build a clean and maintainable test architecture.

This guide covers everything you need to know about writing Cypress commands: from the basics of `Cypress.Commands.add()` to advanced patterns like TypeScript support, command chaining, and overwriting existing commands.

---

## Table of Contents

1. Understanding Cypress.Commands.add
2. Parent Commands
3. Child Commands
4. Dual Commands
5. Overwriting Existing Commands
6. TypeScript Support
7. Command Chaining Patterns
8. Best Practices

---

## Understanding Cypress.Commands.add

The `Cypress.Commands.add()` method is the foundation for creating custom commands. It registers a new command that becomes available on the `cy` object throughout your test suite.

### Basic Syntax

```javascript
// cypress/support/commands.js

// The basic structure of adding a custom command
// Parameters:
//   - name: string - the command name (what you call after cy.)
//   - options: object (optional) - configuration for the command type
//   - callbackFn: function - the implementation of your command
Cypress.Commands.add('commandName', (arg1, arg2) => {
  // Command implementation
  // This code runs when you call cy.commandName(arg1, arg2)
});
```

### A Simple Example

```javascript
// cypress/support/commands.js

// Create a custom command to log in to the application
// This encapsulates the login flow so tests can simply call cy.login()
Cypress.Commands.add('login', (username, password) => {
  // Visit the login page
  cy.visit('/login');

  // Fill in the username field
  // Using data-testid attributes for reliable element selection
  cy.get('[data-testid="username-input"]').type(username);

  // Fill in the password field
  cy.get('[data-testid="password-input"]').type(password);

  // Click the submit button
  cy.get('[data-testid="login-button"]').click();

  // Wait for successful login by checking for a known element
  // This ensures the command completes only after login succeeds
  cy.get('[data-testid="dashboard"]').should('be.visible');
});
```

Usage in tests:

```javascript
// cypress/e2e/dashboard.cy.js

describe('Dashboard', () => {
  beforeEach(() => {
    // Now login is a single, readable command
    // Much cleaner than repeating all the login steps in every test
    cy.login('testuser@example.com', 'securePassword123');
  });

  it('should display user welcome message', () => {
    cy.get('[data-testid="welcome-message"]')
      .should('contain', 'Welcome, testuser');
  });
});
```

---

## Parent Commands

Parent commands start a new command chain. They do not operate on a previously yielded subject - instead, they create a new subject or perform an action independently.

### Characteristics of Parent Commands

- Begin a new chain (called directly on `cy`)
- Do not receive a subject from a previous command
- Can yield a new subject to subsequent commands

```javascript
// cypress/support/commands.js

// Parent command: Creates a new user via API
// Parent commands start fresh - they don't need a previous subject
// This command yields the created user object for chaining
Cypress.Commands.add('createUser', (userData) => {
  // Use cy.request to make API calls
  // This is faster than going through the UI for setup tasks
  return cy.request({
    method: 'POST',
    url: '/api/users',
    body: {
      email: userData.email,
      password: userData.password,
      name: userData.name || 'Test User',
    },
    // Fail the test if the API returns an error status
    failOnStatusCode: true,
  }).then((response) => {
    // Log the created user for debugging purposes
    cy.log(`Created user: ${response.body.email}`);

    // Return the response body so it can be used in the chain
    // This allows: cy.createUser({...}).then(user => ...)
    return response.body;
  });
});

// Parent command: Seed the database with test data
// Useful for setting up complex test scenarios
Cypress.Commands.add('seedDatabase', (fixtures) => {
  // Accept an array of fixture names to load
  const fixturePromises = fixtures.map((fixture) => {
    // cy.fixture loads JSON files from cypress/fixtures/
    return cy.fixture(fixture);
  });

  // Use cy.wrap to work with the fixture data
  // This seeds multiple data sets in sequence
  cy.wrap(fixturePromises).each((fixtureData, index) => {
    cy.request({
      method: 'POST',
      url: '/api/seed',
      body: {
        collection: fixtures[index],
        data: fixtureData,
      },
    });
  });
});
```

Usage:

```javascript
// cypress/e2e/user-management.cy.js

describe('User Management', () => {
  it('should create and verify a new user', () => {
    // Parent command starts the chain
    // The yielded user object flows to .then()
    cy.createUser({
      email: 'newuser@example.com',
      password: 'TestPass123!',
      name: 'Jane Doe',
    }).then((user) => {
      // Verify the user was created with correct data
      expect(user.email).to.equal('newuser@example.com');
      expect(user.id).to.exist;
    });
  });
});
```

---

## Child Commands

Child commands operate on a subject yielded by a previous command. They must be chained off a parent command or another child command that yields a subject.

### Characteristics of Child Commands

- Cannot start a chain (must follow another command)
- Receive the subject from the previous command
- Can transform and yield a new subject

```javascript
// cypress/support/commands.js

// Child command: Upload a file to an input element
// The { prevSubject: true } option makes this a child command
// It receives whatever element the previous command yielded
Cypress.Commands.add(
  'uploadFile',
  { prevSubject: true },
  (subject, fileName, mimeType) => {
    // subject is the element from the previous command
    // For example: cy.get('input[type="file"]').uploadFile('test.pdf')

    // Load the file from fixtures
    return cy.fixture(fileName, 'base64').then((fileContent) => {
      // Convert base64 to blob for upload
      const blob = Cypress.Blob.base64StringToBlob(fileContent, mimeType);

      // Create a File object from the blob
      const testFile = new File([blob], fileName, { type: mimeType });

      // Create a DataTransfer to simulate file selection
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(testFile);

      // Set the files on the input element
      // subject[0] gets the raw DOM element from the jQuery object
      subject[0].files = dataTransfer.files;

      // Trigger change event so the application knows a file was selected
      return cy.wrap(subject).trigger('change', { force: true });
    });
  }
);

// Child command: Assert element has specific CSS property
// Useful for visual testing scenarios
Cypress.Commands.add(
  'shouldHaveCss',
  { prevSubject: true },
  (subject, property, value) => {
    // Wrap the subject to use Cypress commands on it
    // The should() will retry until the assertion passes or times out
    return cy.wrap(subject).should(($el) => {
      // Get the computed style of the element
      const computedStyle = window.getComputedStyle($el[0]);
      const actualValue = computedStyle.getPropertyValue(property);

      // Assert the CSS property matches expected value
      expect(actualValue.trim()).to.equal(value);
    });
  }
);

// Child command: Click and wait for network request
// Combines user action with API synchronization
Cypress.Commands.add(
  'clickAndWait',
  { prevSubject: true },
  (subject, alias) => {
    // Click the subject element
    cy.wrap(subject).click();

    // Wait for the aliased network request to complete
    // The alias should be set up with cy.intercept() beforehand
    cy.wait(alias);

    // Return the original subject for further chaining
    return cy.wrap(subject);
  }
);
```

Usage:

```javascript
// cypress/e2e/file-upload.cy.js

describe('File Upload', () => {
  it('should upload a PDF document', () => {
    cy.visit('/documents/upload');

    // Chain the child command off cy.get()
    // The file input element is passed as 'subject' to uploadFile
    cy.get('[data-testid="file-input"]')
      .uploadFile('sample-document.pdf', 'application/pdf');

    // Verify upload success
    cy.get('[data-testid="upload-status"]')
      .should('contain', 'Upload successful');
  });

  it('should verify button styling', () => {
    cy.visit('/');

    // Chain shouldHaveCss to check element styles
    cy.get('[data-testid="primary-button"]')
      .shouldHaveCss('background-color', 'rgb(59, 130, 246)');
  });
});
```

---

## Dual Commands

Dual commands can work both as parent commands (starting a new chain) and as child commands (operating on a previous subject). This flexibility is useful for commands that have sensible default behavior but can also operate on specific elements.

### Characteristics of Dual Commands

- Can start a chain OR be chained off another command
- Use `{ prevSubject: 'optional' }` in options
- Check for subject existence to determine behavior

```javascript
// cypress/support/commands.js

// Dual command: Find element by text content
// Can be used as: cy.findByText('Hello') OR cy.get('.container').findByText('Hello')
Cypress.Commands.add(
  'findByText',
  { prevSubject: 'optional' },
  (subject, text, options = {}) => {
    // Determine the search scope based on whether we have a subject
    const scope = subject ? cy.wrap(subject) : cy.get('body');

    // Build the contains selector
    // The :contains() pseudo-selector finds elements with matching text
    const selector = options.exact
      ? `:contains("${text}")`  // Exact match
      : `*`;  // We'll filter manually for partial match

    if (options.exact) {
      // For exact match, use contains with the full text
      return scope.contains(text);
    } else {
      // For partial match, find all elements and filter
      return scope.find('*').filter((index, element) => {
        return element.textContent.includes(text);
      }).first();
    }
  }
);

// Dual command: Scroll element into view
// Works on specific element or defaults to finding by selector
Cypress.Commands.add(
  'scrollIntoCenter',
  { prevSubject: 'optional' },
  (subject, selector) => {
    // If we have a subject, use it; otherwise query for the selector
    const element = subject ? cy.wrap(subject) : cy.get(selector);

    return element.then(($el) => {
      // Use native scrollIntoView with center alignment
      // This is often better UX than scrolling to top/bottom
      $el[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // Return the element for further chaining
      return cy.wrap($el);
    });
  }
);

// Dual command: Take a screenshot of element or page
// Demonstrates conditional logic based on subject presence
Cypress.Commands.add(
  'capture',
  { prevSubject: 'optional' },
  (subject, name) => {
    if (subject) {
      // If chained off an element, screenshot just that element
      cy.log(`Capturing element screenshot: ${name}`);
      return cy.wrap(subject).screenshot(name);
    } else {
      // If called as parent command, screenshot the full page
      cy.log(`Capturing full page screenshot: ${name}`);
      return cy.screenshot(name);
    }
  }
);
```

Usage:

```javascript
// cypress/e2e/navigation.cy.js

describe('Navigation and UI', () => {
  it('should find text in different scopes', () => {
    cy.visit('/');

    // As parent command - searches entire page
    cy.findByText('Welcome to our application');

    // As child command - searches within specific container
    cy.get('[data-testid="sidebar"]')
      .findByText('Settings');
  });

  it('should scroll elements into view', () => {
    cy.visit('/long-page');

    // As parent command with selector
    cy.scrollIntoCenter('[data-testid="footer"]');

    // As child command on existing element
    cy.get('[data-testid="section-5"]')
      .scrollIntoCenter()
      .should('be.visible');
  });

  it('should capture screenshots flexibly', () => {
    cy.visit('/dashboard');

    // Full page screenshot (parent command usage)
    cy.capture('dashboard-full-page');

    // Element screenshot (child command usage)
    cy.get('[data-testid="chart-widget"]')
      .capture('chart-widget');
  });
});
```

---

## Overwriting Existing Commands

Cypress allows you to overwrite built-in commands to extend or modify their behavior. This is useful for adding logging, default options, or custom behavior to standard commands.

### When to Overwrite Commands

- Adding consistent logging or analytics
- Setting default options across all uses
- Adding retry logic or error handling
- Integrating with external tools

```javascript
// cypress/support/commands.js

// Overwrite cy.visit() to add authentication headers
// Use Cypress.Commands.overwrite() instead of .add()
Cypress.Commands.overwrite('visit', (originalFn, url, options = {}) => {
  // Get auth token from environment or storage
  const authToken = Cypress.env('AUTH_TOKEN') || localStorage.getItem('authToken');

  // Merge custom headers with any existing options
  const enhancedOptions = {
    ...options,
    headers: {
      ...options.headers,
      // Add authorization header if token exists
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
    // Log the visit for debugging
    onBeforeLoad: (win) => {
      cy.log(`Visiting: ${url}`);
      // Call original onBeforeLoad if provided
      if (options.onBeforeLoad) {
        options.onBeforeLoad(win);
      }
    },
  };

  // Call the original visit command with enhanced options
  return originalFn(url, enhancedOptions);
});

// Overwrite cy.click() to add automatic scrolling and logging
Cypress.Commands.overwrite('click', (originalFn, subject, options = {}) => {
  // Log which element is being clicked
  const elementInfo = subject.selector || subject.toString();
  cy.log(`Clicking: ${elementInfo}`);

  // Add scrollIntoView by default for more reliable clicks
  const enhancedOptions = {
    scrollBehavior: 'center',  // Scroll element to center before clicking
    ...options,  // Allow overriding with explicit options
  };

  // Call original click with enhanced options
  return originalFn(subject, enhancedOptions);
});

// Overwrite cy.type() to mask sensitive data in logs
Cypress.Commands.overwrite('type', (originalFn, subject, text, options = {}) => {
  // Check if this is a password or sensitive field
  const isPassword = subject.attr('type') === 'password';
  const isSensitive = subject.attr('data-sensitive') === 'true';

  if (isPassword || isSensitive) {
    // Mask the input in Cypress logs for security
    cy.log(`Typing: ${'*'.repeat(text.length)} (masked)`);
  } else {
    cy.log(`Typing: ${text}`);
  }

  // Call original type command
  return originalFn(subject, text, options);
});

// Overwrite cy.request() to add default timeout and logging
Cypress.Commands.overwrite('request', (originalFn, ...args) => {
  // Normalize arguments (request can be called multiple ways)
  let options;
  if (typeof args[0] === 'string') {
    // cy.request(url) or cy.request(method, url) or cy.request(method, url, body)
    if (typeof args[1] === 'string') {
      options = { method: args[0], url: args[1], body: args[2] };
    } else {
      options = { url: args[0], ...args[1] };
    }
  } else {
    options = args[0];
  }

  // Add default timeout if not specified
  const enhancedOptions = {
    timeout: 30000,  // 30 second default timeout
    ...options,
  };

  // Log the request details
  cy.log(`API ${enhancedOptions.method || 'GET'}: ${enhancedOptions.url}`);

  // Call original and add response logging
  return originalFn(enhancedOptions).then((response) => {
    cy.log(`Response: ${response.status}`);
    return response;
  });
});
```

Usage:

```javascript
// cypress/e2e/api-tests.cy.js

describe('Overwritten Commands', () => {
  it('should use enhanced visit with auth', () => {
    // Set auth token before tests
    Cypress.env('AUTH_TOKEN', 'test-jwt-token');

    // visit() now automatically includes auth headers
    cy.visit('/protected-page');
  });

  it('should mask password input in logs', () => {
    cy.visit('/login');

    // type() will mask this in the command log
    cy.get('[type="password"]').type('superSecretPassword123');
  });
});
```

---

## TypeScript Support

Adding TypeScript support for custom commands provides autocompletion, type checking, and better documentation in your IDE.

### Setting Up Type Definitions

```typescript
// cypress/support/index.d.ts

// Extend Cypress namespace with custom command types
declare namespace Cypress {
  interface Chainable<Subject = any> {
    /**
     * Custom command to log in to the application
     * @param username - The user's email address
     * @param password - The user's password
     * @example cy.login('user@example.com', 'password123')
     */
    login(username: string, password: string): Chainable<void>;

    /**
     * Create a new user via API
     * @param userData - The user data object
     * @returns The created user object
     * @example cy.createUser({ email: 'test@example.com', password: 'pass123' })
     */
    createUser(userData: CreateUserInput): Chainable<User>;

    /**
     * Upload a file to a file input element
     * @param fileName - Name of the file in fixtures folder
     * @param mimeType - MIME type of the file
     * @example cy.get('input[type="file"]').uploadFile('doc.pdf', 'application/pdf')
     */
    uploadFile(fileName: string, mimeType: string): Chainable<JQuery<HTMLElement>>;

    /**
     * Assert element has specific CSS property value
     * @param property - CSS property name
     * @param value - Expected CSS value
     * @example cy.get('.btn').shouldHaveCss('color', 'rgb(0, 0, 0)')
     */
    shouldHaveCss(property: string, value: string): Chainable<JQuery<HTMLElement>>;

    /**
     * Find element by text content
     * Can be used as parent or child command
     * @param text - Text to search for
     * @param options - Search options
     * @example cy.findByText('Submit')
     * @example cy.get('.modal').findByText('Confirm')
     */
    findByText(
      text: string,
      options?: { exact?: boolean }
    ): Chainable<JQuery<HTMLElement>>;

    /**
     * Seed the database with fixture data
     * @param fixtures - Array of fixture file names
     * @example cy.seedDatabase(['users', 'products'])
     */
    seedDatabase(fixtures: string[]): Chainable<void>;

    /**
     * Click element and wait for network request
     * @param alias - The intercept alias to wait for (including @)
     * @example cy.get('button').clickAndWait('@submitForm')
     */
    clickAndWait(alias: string): Chainable<JQuery<HTMLElement>>;
  }
}

// Define interfaces for command parameters
interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'user' | 'guest';
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}
```

### Implementing Commands with TypeScript

```typescript
// cypress/support/commands.ts

// Import types for better type checking in implementation
import type { CreateUserInput, User } from './index.d';

// Login command with TypeScript
Cypress.Commands.add('login', (username: string, password: string): void => {
  // Type annotations help catch errors during development
  cy.visit('/login');
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.get('[data-testid="dashboard"]').should('be.visible');
});

// Create user command with typed input and output
Cypress.Commands.add('createUser', (userData: CreateUserInput): Cypress.Chainable<User> => {
  return cy.request<User>({
    method: 'POST',
    url: '/api/users',
    body: {
      email: userData.email,
      password: userData.password,
      name: userData.name || 'Test User',
      role: userData.role || 'user',
    },
  }).then((response) => {
    // TypeScript knows response.body is of type User
    return response.body;
  });
});

// Child command with proper typing
Cypress.Commands.add(
  'uploadFile',
  { prevSubject: 'element' },
  (
    subject: JQuery<HTMLElement>,
    fileName: string,
    mimeType: string
  ): Cypress.Chainable<JQuery<HTMLElement>> => {
    return cy.fixture(fileName, 'base64').then((fileContent: string) => {
      const blob = Cypress.Blob.base64StringToBlob(fileContent, mimeType);
      const testFile = new File([blob], fileName, { type: mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(testFile);

      // TypeScript ensures subject[0] is an HTMLElement
      const inputElement = subject[0] as HTMLInputElement;
      inputElement.files = dataTransfer.files;

      return cy.wrap(subject).trigger('change', { force: true });
    });
  }
);

// Dual command with optional subject typing
Cypress.Commands.add(
  'findByText',
  { prevSubject: 'optional' },
  (
    subject: JQuery<HTMLElement> | undefined,
    text: string,
    options: { exact?: boolean } = {}
  ): Cypress.Chainable<JQuery<HTMLElement>> => {
    const scope = subject ? cy.wrap(subject) : cy.get('body');

    if (options.exact) {
      return scope.contains(text);
    }

    return scope.contains(text);
  }
);
```

### Configure TypeScript for Cypress

```json
// cypress/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "types": ["cypress", "node"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts", "support/index.d.ts"]
}
```

---

## Command Chaining Patterns

Understanding how to properly chain commands and manage subjects is crucial for writing effective custom commands.

### Returning Subjects for Chaining

```javascript
// cypress/support/commands.js

// Pattern 1: Return the original subject for continued chaining
// Useful when your command modifies or validates but shouldn't change the subject
Cypress.Commands.add(
  'highlight',
  { prevSubject: true },
  (subject) => {
    // Add visual highlight for debugging
    cy.wrap(subject).then(($el) => {
      $el.css('outline', '3px solid red');
    });

    // Return original subject so chain can continue
    // cy.get('button').highlight().click() works because we return subject
    return cy.wrap(subject);
  }
);

// Pattern 2: Return a new/transformed subject
// Useful when your command produces different output
Cypress.Commands.add(
  'getTableData',
  { prevSubject: true },
  (subject) => {
    // subject is expected to be a table element
    const tableData: string[][] = [];

    // Extract data from table rows
    cy.wrap(subject)
      .find('tbody tr')
      .each(($row) => {
        const rowData: string[] = [];
        $row.find('td').each((index, cell) => {
          rowData.push(cell.textContent?.trim() || '');
        });
        tableData.push(rowData);
      })
      .then(() => {
        // Return the extracted data, not the table element
        return cy.wrap(tableData);
      });
  }
);

// Pattern 3: Command that performs setup and yields a value
Cypress.Commands.add('createOrderAndGetId', (orderData) => {
  return cy.request({
    method: 'POST',
    url: '/api/orders',
    body: orderData,
  }).then((response) => {
    // Store order ID for cleanup
    Cypress.env('lastOrderId', response.body.id);

    // Yield just the ID for convenient chaining
    return response.body.id;
  });
});
```

### Chaining Multiple Custom Commands

```javascript
// cypress/support/commands.js

// Command that sets up test user with full profile
Cypress.Commands.add('setupTestUser', () => {
  // Chain multiple operations, each yielding to the next
  return cy.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
  }).then((user) => {
    // Add profile data
    return cy.request({
      method: 'PUT',
      url: `/api/users/${user.id}/profile`,
      body: {
        avatar: 'default.png',
        preferences: { theme: 'dark' },
      },
    }).then(() => user);  // Pass through the user object
  }).then((user) => {
    // Store credentials for login
    Cypress.env('testUser', user);
    return user;
  });
});

// Command that creates related entities
Cypress.Commands.add('setupTestProject', () => {
  // First ensure we have a user
  return cy.setupTestUser().then((user) => {
    // Create a project for this user
    return cy.request({
      method: 'POST',
      url: '/api/projects',
      body: {
        name: 'Test Project',
        ownerId: user.id,
      },
    }).then((response) => {
      // Return both user and project for test usage
      return {
        user,
        project: response.body,
      };
    });
  });
});
```

Usage:

```javascript
// cypress/e2e/projects.cy.js

describe('Project Management', () => {
  it('should allow editing project settings', () => {
    // Setup creates user and project, yields both
    cy.setupTestProject().then(({ user, project }) => {
      // Login as the created user
      cy.login(user.email, 'TestPass123!');

      // Navigate to the created project
      cy.visit(`/projects/${project.id}/settings`);

      // Now run the actual test
      cy.get('[data-testid="project-name"]')
        .clear()
        .type('Updated Project Name');

      cy.get('[data-testid="save-button"]').click();

      cy.get('[data-testid="success-message"]')
        .should('be.visible');
    });
  });
});
```

### Using Aliases with Custom Commands

```javascript
// cypress/support/commands.js

// Command that creates and aliases an entity for later use
Cypress.Commands.add('createAndAliasProduct', (productData, aliasName) => {
  return cy.request({
    method: 'POST',
    url: '/api/products',
    body: productData,
  }).then((response) => {
    // Create an alias so the product can be referenced later
    cy.wrap(response.body).as(aliasName);
    return response.body;
  });
});

// Command that sets up intercepts with standard aliases
Cypress.Commands.add('setupApiIntercepts', () => {
  // Intercept common API calls and alias them
  cy.intercept('GET', '/api/user/profile').as('getProfile');
  cy.intercept('GET', '/api/notifications').as('getNotifications');
  cy.intercept('POST', '/api/events/**').as('trackEvent');

  // Return chainable for further setup
  return cy.wrap(null);
});
```

Usage:

```javascript
// cypress/e2e/shopping.cy.js

describe('Shopping Cart', () => {
  beforeEach(() => {
    // Set up standard intercepts
    cy.setupApiIntercepts();

    // Create a product and alias it
    cy.createAndAliasProduct(
      { name: 'Test Widget', price: 29.99 },
      'testProduct'
    );
  });

  it('should add product to cart', () => {
    // Access the aliased product
    cy.get('@testProduct').then((product) => {
      cy.visit(`/products/${product.id}`);

      cy.get('[data-testid="add-to-cart"]').click();

      // Wait for tracking event
      cy.wait('@trackEvent');

      cy.get('[data-testid="cart-count"]')
        .should('contain', '1');
    });
  });
});
```

---

## Best Practices Summary

### 1. Name Commands Clearly and Consistently

```javascript
// Good: Clear, action-oriented names
cy.login()
cy.createUser()
cy.uploadFile()
cy.waitForApiResponse()

// Avoid: Vague or inconsistent names
cy.doLogin()        // Redundant 'do'
cy.user()           // Unclear action
cy.handleFile()     // What does 'handle' mean?
```

### 2. Keep Commands Focused and Single-Purpose

```javascript
// Good: Each command does one thing well
Cypress.Commands.add('fillLoginForm', (username, password) => {
  cy.get('[data-testid="username"]').type(username);
  cy.get('[data-testid="password"]').type(password);
});

Cypress.Commands.add('submitLoginForm', () => {
  cy.get('[data-testid="login-button"]').click();
});

// Can be combined when needed
Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.fillLoginForm(username, password);
  cy.submitLoginForm();
});
```

### 3. Add Meaningful Logging

```javascript
Cypress.Commands.add('createOrder', (orderData) => {
  cy.log('Creating order with items:', JSON.stringify(orderData.items));

  return cy.request({
    method: 'POST',
    url: '/api/orders',
    body: orderData,
  }).then((response) => {
    cy.log(`Order created: ${response.body.id}`);
    return response.body;
  });
});
```

### 4. Handle Errors Gracefully

```javascript
Cypress.Commands.add('safeClick', { prevSubject: true }, (subject) => {
  return cy.wrap(subject)
    .should('be.visible')
    .should('not.be.disabled')
    .click()
    .then(() => {
      cy.log('Click successful');
      return subject;
    });
});
```

### 5. Document Commands with JSDoc

```javascript
/**
 * Creates a new user and logs them in
 *
 * @param {Object} options - Configuration options
 * @param {string} options.email - User email address
 * @param {string} options.password - User password
 * @param {string} [options.role='user'] - User role (admin, user, guest)
 * @returns {Cypress.Chainable<User>} The created user object
 *
 * @example
 * // Create a basic user
 * cy.createAndLoginUser({ email: 'test@example.com', password: 'pass123' });
 *
 * @example
 * // Create an admin user
 * cy.createAndLoginUser({ email: 'admin@example.com', password: 'pass123', role: 'admin' });
 */
Cypress.Commands.add('createAndLoginUser', (options) => {
  // Implementation
});
```

### 6. Use Environment Variables for Configuration

```javascript
Cypress.Commands.add('apiRequest', (method, endpoint, body) => {
  const baseUrl = Cypress.env('API_BASE_URL') || 'http://localhost:3000';
  const apiKey = Cypress.env('API_KEY');

  return cy.request({
    method,
    url: `${baseUrl}${endpoint}`,
    body,
    headers: {
      'X-API-Key': apiKey,
    },
  });
});
```

### 7. Clean Up After Commands When Needed

```javascript
Cypress.Commands.add('withTestUser', (testFn) => {
  // Create user
  cy.createUser({ email: `temp-${Date.now()}@test.com`, password: 'temp123' })
    .then((user) => {
      // Run the test function with the user
      testFn(user);

      // Clean up: delete the user after test
      cy.request({
        method: 'DELETE',
        url: `/api/users/${user.id}`,
        failOnStatusCode: false,
      });
    });
});
```

---

## Summary

Custom Cypress commands are a powerful tool for creating maintainable, readable test suites. Key takeaways:

- Use **parent commands** for actions that start a new chain (API calls, page visits, data setup)
- Use **child commands** when operating on a yielded subject (element interactions, assertions)
- Use **dual commands** for flexible utilities that work in both contexts
- **Overwrite existing commands** sparingly to add logging, defaults, or integrations
- **Add TypeScript definitions** for better IDE support and type safety
- **Return appropriate subjects** to enable smooth command chaining
- **Document your commands** so team members understand their purpose and usage

Well-designed custom commands reduce code duplication, improve test readability, and make your test suite more maintainable as it grows.

---

*Building reliable software requires comprehensive testing. Monitor your applications and get instant alerts when tests or services fail with [OneUptime](https://oneuptime.com) - the complete observability platform for modern engineering teams.*
