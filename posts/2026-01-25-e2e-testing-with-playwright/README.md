# How to Configure E2E Testing with Playwright

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Playwright, E2E Testing, Test Automation, JavaScript, TypeScript, Browser Testing

Description: Learn how to set up end-to-end testing with Playwright, including test configuration, page objects, fixtures, and CI/CD integration for reliable browser automation.

---

End-to-end tests verify that your application works correctly from the user's perspective. Playwright is a modern browser automation library that supports Chromium, Firefox, and WebKit. It runs tests fast, handles flaky tests gracefully, and provides excellent debugging tools.

## Installing Playwright

Initialize Playwright in your project:

```bash
# Create a new project with Playwright
npm init playwright@latest

# Or add to existing project
npm install -D @playwright/test

# Install browsers
npx playwright install
```

The initialization creates a configuration file and example tests.

## Configuration

Create or modify `playwright.config.ts`:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Directory containing test files
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,

  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'results/junit.xml' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'on-first-retry',
  },

  // Configure projects for different browsers
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
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Start local dev server before tests
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Writing Your First Test

Create a test file in the tests directory:

```typescript
// tests/home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the welcome message', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Check the title
    await expect(page).toHaveTitle(/My Application/);

    // Verify welcome message is visible
    const heading = page.getByRole('heading', { name: 'Welcome' });
    await expect(heading).toBeVisible();
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/');

    // Click the about link
    await page.getByRole('link', { name: 'About' }).click();

    // Verify navigation
    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('heading', { name: 'About Us' })).toBeVisible();
  });
});
```

Run the tests:

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/home.spec.ts

# Run tests in headed mode (see the browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium

# Debug mode with step-by-step execution
npx playwright test --debug
```

## Page Object Model

Organize your tests with page objects:

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

```typescript
// pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly logoutButton: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
    this.userMenu = page.getByTestId('user-menu');
  }

  async expectWelcome(name: string) {
    await expect(this.welcomeMessage).toContainText(`Welcome, ${name}`);
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
```

Use page objects in tests:

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.login('user@example.com', 'validpassword');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await dashboardPage.expectWelcome('Test User');
  });

  test('should show error with invalid credentials', async () => {
    await loginPage.login('user@example.com', 'wrongpassword');
    await loginPage.expectError('Invalid email or password');
  });

  test('should require email', async () => {
    await loginPage.login('', 'password');
    await loginPage.expectError('Email is required');
  });
});
```

## Custom Fixtures

Create reusable test fixtures:

```typescript
// fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

// Define fixture types
type AuthFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: DashboardPage;
};

// Extend base test with custom fixtures
export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  // Fixture that provides an authenticated session
  authenticatedPage: async ({ page, context }, use) => {
    // Set up authentication state
    await context.addCookies([
      {
        name: 'session',
        value: 'test-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect };
```

Use the fixture:

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Dashboard', () => {
  test('should show user data when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.expectWelcome('Test User');
  });

  test('should allow logout', async ({ authenticatedPage, page }) => {
    await authenticatedPage.logout();
    await expect(page).toHaveURL('/login');
  });
});
```

## API Mocking

Mock API responses during tests:

```typescript
// tests/products.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Products Page', () => {
  test('should display products from API', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Product A', price: 29.99 },
          { id: 2, name: 'Product B', price: 49.99 },
        ]),
      });
    });

    await page.goto('/products');

    // Verify mocked data is displayed
    await expect(page.getByText('Product A')).toBeVisible();
    await expect(page.getByText('Product B')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock an error response
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/products');

    // Verify error message is shown
    await expect(page.getByText('Failed to load products')).toBeVisible();
  });
});
```

## Visual Regression Testing

Capture and compare screenshots:

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('home page matches snapshot', async ({ page }) => {
    await page.goto('/');

    // Wait for animations to complete
    await page.waitForLoadState('networkidle');

    // Compare full page screenshot
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('login form matches snapshot', async ({ page }) => {
    await page.goto('/login');

    // Compare specific element
    const loginForm = page.getByTestId('login-form');
    await expect(loginForm).toHaveScreenshot('login-form.png');
  });
});
```

## CI/CD Integration

Add Playwright to GitHub Actions:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
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

## Debugging Failed Tests

Use Playwright's debugging tools:

```bash
# Open trace viewer for failed tests
npx playwright show-trace trace.zip

# Run with UI mode for interactive debugging
npx playwright test --ui

# Generate and view HTML report
npx playwright show-report
```

Add debug helpers in tests:

```typescript
test('debug example', async ({ page }) => {
  await page.goto('/');

  // Pause execution for manual inspection
  await page.pause();

  // Take screenshot at specific point
  await page.screenshot({ path: 'debug-screenshot.png' });

  // Log page content
  console.log(await page.content());
});
```

## Best Practices

1. Use semantic locators like getByRole, getByLabel, getByText
2. Avoid hardcoded waits, use Playwright's auto-waiting
3. Keep tests independent and isolated
4. Use page objects to reduce duplication
5. Run tests in parallel for faster feedback
6. Mock external services for reliability
7. Capture traces on failure for debugging
8. Test on multiple browsers and viewports

---

Playwright makes E2E testing reliable and maintainable. Start with simple tests, gradually add page objects and fixtures as your test suite grows. The debugging tools and trace viewer make it easy to investigate failures.
