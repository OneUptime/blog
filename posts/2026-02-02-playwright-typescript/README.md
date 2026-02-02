# How to Use Playwright with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Playwright, Testing, E2E, Automation

Description: A practical guide to end-to-end testing with Playwright and TypeScript, covering setup, page objects, fixtures, and CI/CD integration.

---

Playwright has become my go-to tool for end-to-end testing. It supports Chromium, Firefox, and WebKit with a single API, has excellent TypeScript support out of the box, and handles modern web features like auto-waiting and network interception without extra configuration. If you've struggled with flaky tests in other frameworks, Playwright's architecture addresses many of those pain points.

In this guide, I'll walk you through setting up Playwright with TypeScript and show you patterns that work well in real projects.

## Project Setup

Let's start with a fresh project. Playwright has a handy init command that scaffolds everything you need:

```bash
# Create a new project directory
mkdir playwright-demo && cd playwright-demo

# Initialize Playwright - this installs dependencies and creates config files
npm init playwright@latest

# When prompted:
# - Choose TypeScript
# - Name your tests folder (default: tests)
# - Add GitHub Actions workflow: Yes
# - Install Playwright browsers: Yes
```

This creates a `playwright.config.ts` file. Here's a practical configuration with comments explaining each option:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Directory containing your test files
  testDir: './tests',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail the build if you accidentally left test.only in the code
  forbidOnly: !!process.env.CI,

  // Retry failed tests - helpful in CI where flakiness can occur
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers in CI to avoid resource issues
  workers: process.env.CI ? 1 : undefined,

  // Generate HTML report after test run
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL for navigation - use relative URLs in tests
    baseURL: 'http://localhost:3000',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure for debugging
    video: 'retain-on-failure',

    // Collect trace on first retry for debugging flaky tests
    trace: 'on-first-retry',
  },

  // Configure browsers to test against
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Mobile testing
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],

  // Start your dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Configuration Options Quick Reference

Here's a table of the most commonly used configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `testDir` | Directory containing test files | `tests` |
| `timeout` | Test timeout in milliseconds | `30000` |
| `retries` | Number of retry attempts for failed tests | `0` |
| `workers` | Number of parallel workers | `50%` of CPU cores |
| `reporter` | Report format (html, json, list, dot) | `list` |
| `use.baseURL` | Base URL for page.goto() | - |
| `use.screenshot` | When to capture screenshots | `off` |
| `use.video` | When to record videos | `off` |
| `use.trace` | When to collect traces | `off` |

## Writing Your First Test

Playwright tests are straightforward. Create a file in your tests directory:

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login functionality', () => {
  test('should allow user to login with valid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Fill in the form fields - Playwright auto-waits for elements
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'securepassword');

    // Click the submit button
    await page.click('[data-testid="login-button"]');

    // Assert we're redirected to the dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify the welcome message is visible
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Check that the error message appears
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid credentials'
    );
  });
});
```

## Page Object Model

For larger test suites, the Page Object Model keeps your tests maintainable. It encapsulates page-specific selectors and actions:

```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Define locators once - reuse throughout the class
    this.emailInput = page.locator('[data-testid="email"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
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

Now your tests become much cleaner:

```typescript
// tests/login-pom.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('login with page object', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('user@example.com', 'securepassword');

  await expect(page).toHaveURL('/dashboard');
});
```

## Custom Fixtures

Fixtures let you set up common dependencies and share them across tests. Here's how to create a fixture that provides an authenticated user:

```typescript
// fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

// Define the shape of our custom fixtures
type AuthFixtures = {
  authenticatedPage: ReturnType<typeof base['page']>;
};

// Extend the base test with our custom fixtures
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Set up: perform login before test runs
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('testuser@example.com', 'testpassword');

    // Wait for login to complete
    await expect(page).toHaveURL('/dashboard');

    // Provide the authenticated page to the test
    await use(page);

    // Teardown: logout after test completes (optional)
    await page.click('[data-testid="logout-button"]');
  },
});

export { expect } from '@playwright/test';
```

Use the fixture in your tests:

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test('authenticated user can view dashboard', async ({ authenticatedPage }) => {
  // No need to login - the fixture handles it
  await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');
});
```

## Parallel Testing and Test Isolation

Playwright runs tests in parallel by default. Each test gets a fresh browser context, so tests don't interfere with each other. You can control this behavior:

```typescript
// Run tests in this file serially (one after another)
test.describe.configure({ mode: 'serial' });

test.describe('Order flow', () => {
  test('add item to cart', async ({ page }) => {
    // First test in sequence
  });

  test('complete checkout', async ({ page }) => {
    // Depends on previous test
  });
});
```

## Screenshot and Video Capture

Beyond automatic failure captures, you can take screenshots and videos programmatically:

```typescript
test('capture visual state', async ({ page }) => {
  await page.goto('/products');

  // Full page screenshot
  await page.screenshot({
    path: 'screenshots/products-full.png',
    fullPage: true
  });

  // Screenshot of specific element
  const productCard = page.locator('.product-card').first();
  await productCard.screenshot({ path: 'screenshots/product-card.png' });
});
```

## CI/CD Integration

Playwright's init command creates a GitHub Actions workflow. Here's an enhanced version:

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Running Tests

Here are the commands you'll use most often:

```bash
# Run all tests
npx playwright test

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run a specific test file
npx playwright test tests/login.spec.ts

# Run tests matching a pattern
npx playwright test -g "login"

# Run in debug mode with step-through
npx playwright test --debug

# Open the HTML report
npx playwright show-report

# Run codegen to generate tests by interacting with your app
npx playwright codegen localhost:3000
```

## Conclusion

Playwright with TypeScript gives you a solid foundation for E2E testing. The auto-waiting mechanism eliminates most timing issues, the trace viewer makes debugging straightforward, and the parallel execution keeps your test suite fast. Start with simple tests, adopt the Page Object Model as your suite grows, and use fixtures to eliminate setup duplication. Your future self will thank you when you need to debug a failing test at 2 AM.
