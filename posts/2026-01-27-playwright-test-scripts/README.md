# How to Write Playwright Test Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Playwright, E2E Testing, Test Automation, JavaScript, TypeScript

Description: Learn how to write effective Playwright test scripts for end-to-end testing, including selectors, actions, assertions, and page objects for maintainable test suites.

---

> End-to-end tests catch bugs that unit tests miss. Playwright makes writing fast, reliable browser tests simple - if you structure them correctly from the start.

Playwright is a modern browser automation framework from Microsoft that supports Chromium, Firefox, and WebKit with a single API. It handles the complexities of browser testing - auto-waiting, network interception, and multi-tab scenarios - so you can focus on writing meaningful tests.

This guide covers everything you need to write production-ready Playwright tests in TypeScript.

---

## Table of Contents

1. Installation and Setup
2. Test Structure and Organization
3. Selectors and Locators
4. Actions - Interacting with Elements
5. Assertions and Expectations
6. Handling Async Operations
7. Screenshots and Videos
8. Test Hooks
9. Running Tests
10. Best Practices

---

## 1. Installation and Setup

Install Playwright in your project:

```bash
# Create a new project with Playwright
npm init playwright@latest

# Or add to an existing project
npm install -D @playwright/test
npx playwright install
```

This creates a basic project structure:

```
project/
├── playwright.config.ts    # Configuration file
├── tests/                  # Test files go here
│   └── example.spec.ts
├── tests-examples/         # Example tests for reference
└── package.json
```

### Basic Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Directory containing test files
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry failed tests (useful on CI)
  retries: process.env.CI ? 2 : 0,

  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Collect trace on failure
    trace: 'on-first-retry',
  },

  // Configure browsers to test against
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

---

## 2. Test Structure and Organization

### Basic Test File

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

// Group related tests with describe blocks
test.describe('Login Page', () => {

  // Individual test case
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Verify form elements are visible
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in wrong credentials
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify error message appears
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('should redirect to dashboard on successful login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('correctpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify redirect happened
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### File Organization

Organize tests by feature or page:

```
tests/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── registration.spec.ts
├── dashboard/
│   ├── overview.spec.ts
│   └── settings.spec.ts
├── api/
│   └── users.spec.ts
└── fixtures/
    └── auth.ts
```

---

## 3. Selectors and Locators

Playwright provides multiple ways to locate elements. Prefer user-facing locators for resilient tests.

### Recommended Locators (Priority Order)

```typescript
// tests/selectors.spec.ts
import { test, expect } from '@playwright/test';

test('locator examples', async ({ page }) => {
  await page.goto('/form');

  // 1. BEST: Role-based locators (accessibility-focused)
  // Finds elements by their ARIA role
  const submitButton = page.getByRole('button', { name: 'Submit' });
  const emailInput = page.getByRole('textbox', { name: 'Email' });
  const checkbox = page.getByRole('checkbox', { name: 'Remember me' });
  const dropdown = page.getByRole('combobox', { name: 'Country' });

  // 2. GOOD: Label-based locators
  // Finds form elements by their associated label
  const passwordField = page.getByLabel('Password');
  const termsCheckbox = page.getByLabel('I agree to terms');

  // 3. GOOD: Placeholder text
  const searchInput = page.getByPlaceholder('Search...');

  // 4. GOOD: Text content (for non-interactive elements)
  const heading = page.getByText('Welcome to Our App');
  const exactMatch = page.getByText('Submit', { exact: true });

  // 5. OK: Test IDs (when other options are not available)
  // Requires adding data-testid attributes to your HTML
  const customComponent = page.getByTestId('user-avatar');

  // 6. AVOID: CSS selectors (fragile, tied to implementation)
  // Use only when necessary
  const cssSelector = page.locator('.header .nav-item:first-child');

  // 7. AVOID: XPath (complex, hard to read)
  const xpathSelector = page.locator('xpath=//div[@class="container"]//button');
});
```

### Chaining and Filtering Locators

```typescript
test('chaining locators', async ({ page }) => {
  await page.goto('/products');

  // Find a specific item in a list
  const productCard = page.locator('.product-card').filter({
    hasText: 'Premium Widget'
  });

  // Chain to find elements within
  const addToCartButton = productCard.getByRole('button', { name: 'Add to Cart' });
  await addToCartButton.click();

  // Filter by another locator
  const cardWithPrice = page.locator('.product-card').filter({
    has: page.locator('.price', { hasText: '$99' })
  });

  // Get nth element
  const firstProduct = page.locator('.product-card').first();
  const lastProduct = page.locator('.product-card').last();
  const thirdProduct = page.locator('.product-card').nth(2);

  // Count elements
  const productCount = await page.locator('.product-card').count();
  expect(productCount).toBeGreaterThan(0);
});
```

---

## 4. Actions - Interacting with Elements

Playwright auto-waits for elements to be actionable before performing actions.

### Common Actions

```typescript
// tests/actions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Actions', () => {

  test('form interactions', async ({ page }) => {
    await page.goto('/form');

    // Click actions
    await page.getByRole('button', { name: 'Open Menu' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();

    // Double click
    await page.getByText('Editable Text').dblclick();

    // Right click (context menu)
    await page.getByTestId('canvas').click({ button: 'right' });

    // Text input
    await page.getByLabel('Username').fill('testuser');

    // Clear and type (simulates real typing)
    await page.getByLabel('Search').clear();
    await page.getByLabel('Search').type('query', { delay: 100 });

    // Checkbox and radio
    await page.getByRole('checkbox', { name: 'Subscribe' }).check();
    await page.getByRole('checkbox', { name: 'Marketing' }).uncheck();
    await page.getByRole('radio', { name: 'Monthly' }).check();

    // Select dropdown
    await page.getByRole('combobox', { name: 'Country' }).selectOption('US');
    await page.getByRole('combobox', { name: 'Colors' }).selectOption(['red', 'blue']);

    // File upload
    await page.getByLabel('Upload File').setInputFiles('path/to/file.pdf');
    await page.getByLabel('Upload Multiple').setInputFiles([
      'path/to/file1.pdf',
      'path/to/file2.pdf'
    ]);
  });

  test('keyboard actions', async ({ page }) => {
    await page.goto('/editor');

    // Focus an element
    await page.getByRole('textbox').focus();

    // Press keys
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');

    // Key combinations
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');

    // Type with special keys
    await page.keyboard.type('Hello World');
    await page.keyboard.press('Backspace');
  });

  test('mouse actions', async ({ page }) => {
    await page.goto('/canvas');

    // Hover
    await page.getByRole('button', { name: 'Menu' }).hover();

    // Drag and drop
    await page.getByTestId('draggable').dragTo(page.getByTestId('droppable'));

    // Manual drag
    const source = page.getByTestId('source');
    const target = page.getByTestId('target');
    await source.hover();
    await page.mouse.down();
    await target.hover();
    await page.mouse.up();
  });
});
```

### Navigation Actions

```typescript
test('navigation', async ({ page }) => {
  // Go to URL
  await page.goto('https://example.com');
  await page.goto('/relative-path');  // Uses baseURL from config

  // Wait for navigation after click
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole('link', { name: 'Next Page' }).click()
  ]);

  // Or use waitForURL
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.waitForURL('/dashboard');

  // Browser navigation
  await page.goBack();
  await page.goForward();
  await page.reload();
});
```

---

## 5. Assertions and Expectations

Playwright's assertions auto-retry until the condition is met or timeout.

### Web-First Assertions

```typescript
// tests/assertions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Assertions', () => {

  test('element assertions', async ({ page }) => {
    await page.goto('/dashboard');

    // Visibility
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('loading-spinner')).toBeHidden();
    await expect(page.getByTestId('deleted-item')).not.toBeVisible();

    // Text content
    await expect(page.getByTestId('welcome')).toHaveText('Welcome, User!');
    await expect(page.getByTestId('description')).toContainText('partial text');

    // Attributes
    await expect(page.getByRole('link', { name: 'Help' })).toHaveAttribute('href', '/help');
    await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Loading' })).toBeDisabled();

    // CSS classes
    await expect(page.getByTestId('alert')).toHaveClass(/alert-success/);

    // Form state
    await expect(page.getByRole('checkbox', { name: 'Active' })).toBeChecked();
    await expect(page.getByLabel('Email')).toHaveValue('user@example.com');
    await expect(page.getByLabel('Email')).toBeFocused();

    // Count
    await expect(page.locator('.list-item')).toHaveCount(5);
  });

  test('page assertions', async ({ page }) => {
    await page.goto('/home');

    // URL
    await expect(page).toHaveURL('/home');
    await expect(page).toHaveURL(/.*home.*/);

    // Title
    await expect(page).toHaveTitle('Home - My App');
    await expect(page).toHaveTitle(/Home/);
  });

  test('soft assertions', async ({ page }) => {
    await page.goto('/dashboard');

    // Soft assertions do not stop test execution on failure
    // All failures are collected and reported at the end
    await expect.soft(page.getByTestId('metric-1')).toHaveText('100');
    await expect.soft(page.getByTestId('metric-2')).toHaveText('200');
    await expect.soft(page.getByTestId('metric-3')).toHaveText('300');

    // Test continues even if above assertions fail
    await page.getByRole('button', { name: 'Refresh' }).click();
  });

  test('custom timeout', async ({ page }) => {
    await page.goto('/slow-page');

    // Override default timeout for slow operations
    await expect(page.getByTestId('slow-content')).toBeVisible({ timeout: 30000 });
  });
});
```

### Generic Assertions

```typescript
test('generic assertions', async ({ page }) => {
  await page.goto('/api-data');

  // Get values for custom assertions
  const itemCount = await page.locator('.item').count();
  expect(itemCount).toBeGreaterThan(0);
  expect(itemCount).toBeLessThanOrEqual(100);

  const text = await page.getByTestId('status').textContent();
  expect(text).toMatch(/success|complete/i);

  // Array assertions
  const items = await page.locator('.item').allTextContents();
  expect(items).toContain('Expected Item');
  expect(items).toHaveLength(5);
});
```

---

## 6. Handling Async Operations

### Waiting for Elements and Events

```typescript
// tests/async.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Async Operations', () => {

  test('waiting for elements', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for element to appear (auto-waiting in most cases)
    await page.getByRole('button', { name: 'Load Data' }).click();

    // Explicit wait for element
    await page.waitForSelector('.data-table');

    // Wait for element to be hidden
    await page.getByTestId('loading').waitFor({ state: 'hidden' });

    // Wait for element to be attached to DOM (but maybe not visible)
    await page.getByTestId('lazy-component').waitFor({ state: 'attached' });
  });

  test('waiting for network', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for specific API response
    const responsePromise = page.waitForResponse('/api/users');
    await page.getByRole('button', { name: 'Load Users' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Wait for request to be made
    const requestPromise = page.waitForRequest('/api/save');
    await page.getByRole('button', { name: 'Save' }).click();
    await requestPromise;

    // Wait for all network requests to complete
    await page.waitForLoadState('networkidle');
  });

  test('waiting for events', async ({ page }) => {
    await page.goto('/app');

    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Report' }).click();
    const download = await downloadPromise;
    await download.saveAs('report.pdf');

    // Wait for popup/new tab
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Open in New Tab' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await expect(popup).toHaveURL('/new-page');
  });

  test('polling for condition', async ({ page }) => {
    await page.goto('/processing');

    // Poll until condition is met
    await expect(async () => {
      const status = await page.getByTestId('status').textContent();
      expect(status).toBe('Complete');
    }).toPass({
      timeout: 30000,
      intervals: [1000, 2000, 5000]  // Retry intervals
    });
  });
});
```

### Handling Dynamic Content

```typescript
test('dynamic content', async ({ page }) => {
  await page.goto('/feed');

  // Wait for content to load
  await page.getByRole('article').first().waitFor();

  // Scroll to load more (infinite scroll)
  while (await page.locator('.article').count() < 20) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);  // Brief pause for content to load
  }

  // Handle modal that may or may not appear
  const modal = page.getByRole('dialog');
  if (await modal.isVisible()) {
    await modal.getByRole('button', { name: 'Close' }).click();
  }
});
```

---

## 7. Screenshots and Videos

### Capturing Screenshots

```typescript
// tests/screenshots.spec.ts
import { test, expect } from '@playwright/test';

test('screenshot examples', async ({ page }) => {
  await page.goto('/dashboard');

  // Full page screenshot
  await page.screenshot({ path: 'screenshots/dashboard-full.png', fullPage: true });

  // Viewport only
  await page.screenshot({ path: 'screenshots/dashboard-viewport.png' });

  // Specific element
  await page.getByTestId('chart').screenshot({ path: 'screenshots/chart.png' });

  // With options
  await page.screenshot({
    path: 'screenshots/dashboard.png',
    fullPage: true,
    animations: 'disabled',  // Disable CSS animations
    mask: [page.getByTestId('dynamic-content')],  // Mask dynamic elements
  });
});

test('visual comparison', async ({ page }) => {
  await page.goto('/dashboard');

  // Compare against baseline screenshot
  await expect(page).toHaveScreenshot('dashboard.png');

  // With threshold for allowed difference
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100,
  });

  // Element screenshot comparison
  await expect(page.getByTestId('header')).toHaveScreenshot('header.png');
});
```

### Video Recording

Configure in `playwright.config.ts`:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Record video for all tests
    video: 'on',

    // Or only on failure
    video: 'retain-on-failure',

    // Video options
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 }
    },
  },
});
```

Access video in test:

```typescript
test('with video', async ({ page }, testInfo) => {
  await page.goto('/checkout');
  // ... test steps

  // Video is automatically saved to test-results/
  // Access path: testInfo.attachments
});
```

---

## 8. Test Hooks

### Setup and Teardown

```typescript
// tests/hooks.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {

  // Run once before all tests in this describe block
  test.beforeAll(async ({ browser }) => {
    console.log('Starting test suite');
    // Setup that is shared across all tests
    // Note: No page available here, only browser
  });

  // Run once after all tests in this describe block
  test.afterAll(async ({ browser }) => {
    console.log('Test suite complete');
    // Cleanup shared resources
  });

  // Run before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to starting page
    await page.goto('/users');

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
  });

  // Run after each test
  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `screenshots/failure-${testInfo.title}.png`
      });
    }
  });

  test('view user list', async ({ page }) => {
    await expect(page.locator('.user-row')).toHaveCount(10);
  });

  test('add new user', async ({ page }) => {
    await page.getByRole('button', { name: 'Add User' }).click();
    // ...
  });
});
```

### Custom Fixtures

```typescript
// tests/fixtures/auth.ts
import { test as base, expect } from '@playwright/test';

// Define custom fixture types
type AuthFixtures = {
  authenticatedPage: ReturnType<typeof base['page']>;
};

// Extend base test with custom fixtures
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login before test
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('/dashboard');

    // Provide the authenticated page to the test
    await use(page);

    // Teardown: Logout after test
    await page.goto('/logout');
  },
});

export { expect };
```

Use the custom fixture:

```typescript
// tests/dashboard.spec.ts
import { test, expect } from './fixtures/auth';

test('authenticated user can view dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.getByText('Welcome back')).toBeVisible();
});
```

---

## 9. Running Tests

### Command Line Options

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/login.spec.ts

# Run tests with specific name
npx playwright test -g "should display login form"

# Run in headed mode (see browser)
npx playwright test --headed

# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Run with UI mode (interactive debugging)
npx playwright test --ui

# Debug mode (step through tests)
npx playwright test --debug

# Run specific number of workers
npx playwright test --workers=4

# Update snapshots
npx playwright test --update-snapshots

# Show HTML report
npx playwright show-report
```

### Configuration for Different Environments

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },

  // Define environment-specific projects
  projects: [
    {
      name: 'staging',
      use: {
        baseURL: 'https://staging.example.com',
      },
    },
    {
      name: 'production',
      use: {
        baseURL: 'https://example.com',
      },
    },
  ],
});
```

Run with project:

```bash
# Run against staging
npx playwright test --project=staging

# Run against production
npx playwright test --project=production
```

---

## 10. Best Practices

### Test Independence

```typescript
// GOOD: Each test is independent
test('create order', async ({ page }) => {
  // Setup within the test
  await createTestUser(page);
  await page.goto('/orders/new');
  // ... test logic
});

test('view orders', async ({ page }) => {
  // Has its own setup, does not depend on previous test
  await createTestUser(page);
  await createTestOrder(page);
  await page.goto('/orders');
  // ... test logic
});

// BAD: Tests depend on each other
let orderId: string;
test('create order', async ({ page }) => {
  // ... creates order
  orderId = await page.getByTestId('order-id').textContent();
});

test('view created order', async ({ page }) => {
  // Fails if previous test did not run
  await page.goto(`/orders/${orderId}`);
});
```

### Page Object Model

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

Use the Page Object:

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login', () => {
  test('successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'password123');
    await expect(page).toHaveURL('/dashboard');
  });

  test('failed login shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrongpass');
    await loginPage.expectError('Invalid credentials');
  });
});
```

### Summary of Best Practices

| Practice | Description |
|----------|-------------|
| Use role-based locators | `getByRole()`, `getByLabel()` are resilient to UI changes |
| Keep tests independent | Each test should set up its own data and state |
| Use Page Objects | Encapsulate page interactions for reusability |
| Prefer auto-waiting | Let Playwright handle timing instead of explicit waits |
| Test user flows | Focus on user journeys, not implementation details |
| Use meaningful names | Test names should describe the expected behavior |
| Run in CI | Integrate tests into your CI/CD pipeline |
| Use visual regression | Catch UI bugs with screenshot comparisons |
| Keep tests fast | Use API calls for setup instead of UI when possible |
| Handle flakiness | Use retries in CI, investigate root causes |

---

## Summary

Playwright provides a robust foundation for end-to-end testing. The key points:

1. **Setup once, run anywhere** - Single API works across Chromium, Firefox, and WebKit
2. **User-first selectors** - Role and label-based locators make tests resilient
3. **Auto-waiting** - Playwright handles async complexity automatically
4. **Rich assertions** - Web-first assertions retry until conditions are met
5. **Debugging tools** - UI mode, traces, and screenshots make debugging easy

Start with simple tests for critical user flows, then expand coverage. Organize with Page Objects as your test suite grows.

---

*Need to monitor your web application after tests pass? [OneUptime](https://oneuptime.com) provides uptime monitoring, status pages, and incident management to keep your production systems running smoothly.*
