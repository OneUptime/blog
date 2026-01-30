# How to Create E2E Testing Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, E2E, Playwright, Quality Assurance

Description: Implement reliable end-to-end tests with Playwright using page objects, test isolation, and flake-resistant patterns for maintainable test suites.

---

End-to-end testing validates your application from the user's perspective. When done right, E2E tests catch bugs before they reach production. When done poorly, they become a maintenance nightmare that slows down your team. This guide covers practical patterns for building reliable, maintainable E2E test suites with Playwright.

## Setting Up Playwright

Before diving into best practices, let's set up a solid Playwright foundation.

Install Playwright and initialize your project:

```bash
npm init playwright@latest
```

Configure Playwright with sensible defaults in `playwright.config.ts`:

```typescript
// playwright.config.ts
// This configuration sets up parallel execution, retries, and multiple browsers

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Directory containing test files
  testDir: './tests',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail the build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry failed tests to handle transient failures
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI to avoid resource contention
  workers: process.env.CI ? 4 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Capture trace on first retry
    trace: 'on-first-retry',

    // Default timeout for actions
    actionTimeout: 10000,
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
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## The Page Object Pattern

Page objects encapsulate page-specific logic, making tests readable and maintainable. When the UI changes, you update one file instead of dozens of tests.

### Basic Page Object Structure

Create a base page class that other page objects extend:

```typescript
// pages/BasePage.ts
// Base class providing common functionality for all page objects

import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Navigate to the page URL
  abstract goto(): Promise<void>;

  // Wait for the page to be fully loaded
  abstract waitForPageLoad(): Promise<void>;

  // Common method to check if an element is visible
  protected async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // Common method to get text with retry logic
  protected async getTextWithRetry(
    locator: Locator,
    retries: number = 3
  ): Promise<string> {
    for (let i = 0; i < retries; i++) {
      const text = await locator.textContent();
      if (text && text.trim()) {
        return text.trim();
      }
      await this.page.waitForTimeout(500);
    }
    throw new Error('Failed to get text content');
  }
}
```

### Implementing Page Objects

Here's a login page object with clear, descriptive methods:

```typescript
// pages/LoginPage.ts
// Page object for the login functionality

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Define locators as readonly properties
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    // Use data-testid attributes for stable selectors
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.errorMessage = page.getByTestId('login-error');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    this.rememberMeCheckbox = page.getByLabel('Remember me');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.emailInput.waitFor({ state: 'visible' });
  }

  // Fill in credentials and submit the form
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  // Login with remember me option
  async loginWithRememberMe(
    email: string,
    password: string
  ): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.rememberMeCheckbox.check();
    await this.submitButton.click();
  }

  // Get the error message text
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible' });
    return await this.errorMessage.textContent() || '';
  }

  // Check if error message is displayed
  async hasError(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  // Navigate to forgot password page
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
```

### Dashboard Page Object with Complex Interactions

```typescript
// pages/DashboardPage.ts
// Page object for the main dashboard with multiple components

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  private readonly welcomeMessage: Locator;
  private readonly navigationMenu: Locator;
  private readonly userDropdown: Locator;
  private readonly notificationBell: Locator;
  private readonly searchInput: Locator;
  private readonly projectCards: Locator;
  private readonly createProjectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.navigationMenu = page.getByRole('navigation');
    this.userDropdown = page.getByTestId('user-dropdown');
    this.notificationBell = page.getByTestId('notification-bell');
    this.searchInput = page.getByPlaceholder('Search projects...');
    this.projectCards = page.getByTestId('project-card');
    this.createProjectButton = page.getByRole('button', { name: 'Create Project' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for key elements to be visible
    await this.welcomeMessage.waitFor({ state: 'visible' });
    await this.navigationMenu.waitFor({ state: 'visible' });
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  // Get the welcome message text
  async getWelcomeText(): Promise<string> {
    return await this.getTextWithRetry(this.welcomeMessage);
  }

  // Search for a project
  async searchProject(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for debounce and results to load
    await this.page.waitForResponse(
      response => response.url().includes('/api/projects/search')
    );
  }

  // Get all visible project names
  async getProjectNames(): Promise<string[]> {
    const cards = await this.projectCards.all();
    const names: string[] = [];
    for (const card of cards) {
      const name = await card.getByTestId('project-name').textContent();
      if (name) names.push(name.trim());
    }
    return names;
  }

  // Click on a specific project
  async openProject(projectName: string): Promise<void> {
    await this.projectCards
      .filter({ hasText: projectName })
      .first()
      .click();
  }

  // Open user dropdown and select option
  async selectUserOption(option: string): Promise<void> {
    await this.userDropdown.click();
    await this.page.getByRole('menuitem', { name: option }).click();
  }

  // Logout from the application
  async logout(): Promise<void> {
    await this.selectUserOption('Logout');
    await this.page.waitForURL('/login');
  }

  // Get notification count
  async getNotificationCount(): Promise<number> {
    const badge = this.notificationBell.locator('.badge');
    if (await badge.isVisible()) {
      const count = await badge.textContent();
      return parseInt(count || '0', 10);
    }
    return 0;
  }
}
```

## Test Isolation and Independence

Each test should run independently, without relying on other tests or shared state. This makes tests reliable and parallelizable.

### Using Fixtures for Test Setup

Playwright fixtures provide isolated test contexts:

```typescript
// fixtures/test-fixtures.ts
// Custom fixtures for authenticated users and test data

import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TestDataFactory } from '../utils/TestDataFactory';

// Define custom fixture types
type TestFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: DashboardPage;
  testData: TestDataFactory;
};

// Extend base test with custom fixtures
export const test = base.extend<TestFixtures>({
  // Login page fixture
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  // Dashboard page fixture
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  // Pre-authenticated dashboard fixture
  authenticatedPage: async ({ page, context }, use) => {
    // Set authentication state before test
    await context.addCookies([
      {
        name: 'session',
        value: process.env.TEST_SESSION_TOKEN || 'test-session',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // Add auth header for API requests
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await use(dashboardPage);
  },

  // Test data factory fixture
  testData: async ({}, use) => {
    const factory = new TestDataFactory();
    await use(factory);
    // Cleanup test data after test
    await factory.cleanup();
  },
});

export { expect };
```

### Storage State for Authentication

Save and reuse authentication state to speed up tests:

```typescript
// auth.setup.ts
// Setup file to create authenticated state

import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Perform login
  await page.goto('/login');
  await page.getByTestId('login-email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByTestId('login-password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByTestId('login-submit').click();

  // Wait for successful login
  await page.waitForURL('/dashboard');
  await expect(page.getByTestId('welcome-message')).toBeVisible();

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
```

Configure projects to use the saved state:

```typescript
// playwright.config.ts - projects section

projects: [
  // Setup project for authentication
  { name: 'setup', testMatch: /.*\.setup\.ts/ },

  // Tests that require authentication
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/user.json',
    },
    dependencies: ['setup'],
  },

  // Tests that don't require authentication
  {
    name: 'chromium-no-auth',
    testMatch: /.*\.noauth\.spec\.ts/,
    use: { ...devices['Desktop Chrome'] },
  },
],
```

## Waiting Strategies

Flaky tests often result from improper waiting. Playwright has built-in auto-waiting, but complex scenarios need explicit waits.

### Comparison of Waiting Methods

| Method | Use Case | Example |
|--------|----------|---------|
| `waitFor` | Wait for element state | `locator.waitFor({ state: 'visible' })` |
| `waitForURL` | Navigation completion | `page.waitForURL('/dashboard')` |
| `waitForResponse` | API call completion | `page.waitForResponse('/api/data')` |
| `waitForLoadState` | Page load states | `page.waitForLoadState('networkidle')` |
| `waitForFunction` | Custom conditions | `page.waitForFunction(() => condition)` |
| `expect.toBeVisible` | Assertion with retry | `expect(locator).toBeVisible()` |

### Implementing Robust Waits

```typescript
// utils/WaitHelpers.ts
// Utility functions for complex waiting scenarios

import { Page, Locator, expect } from '@playwright/test';

export class WaitHelpers {
  constructor(private page: Page) {}

  // Wait for an element to be stable (not moving or changing)
  async waitForStableElement(locator: Locator): Promise<void> {
    let previousBox = await locator.boundingBox();
    let stableCount = 0;

    while (stableCount < 3) {
      await this.page.waitForTimeout(100);
      const currentBox = await locator.boundingBox();

      if (
        previousBox &&
        currentBox &&
        previousBox.x === currentBox.x &&
        previousBox.y === currentBox.y &&
        previousBox.width === currentBox.width &&
        previousBox.height === currentBox.height
      ) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      previousBox = currentBox;
    }
  }

  // Wait for multiple API calls to complete
  async waitForAPICalls(
    urlPatterns: string[],
    action: () => Promise<void>
  ): Promise<void> {
    const responsePromises = urlPatterns.map(pattern =>
      this.page.waitForResponse(
        response => response.url().includes(pattern),
        { timeout: 30000 }
      )
    );

    await Promise.all([action(), ...responsePromises]);
  }

  // Wait for loading spinner to disappear
  async waitForLoadingComplete(): Promise<void> {
    const spinner = this.page.getByTestId('loading-spinner');

    // First check if spinner appears
    try {
      await spinner.waitFor({ state: 'visible', timeout: 1000 });
      // If it appears, wait for it to disappear
      await spinner.waitFor({ state: 'hidden', timeout: 30000 });
    } catch {
      // Spinner never appeared, which is fine
    }
  }

  // Wait for table data to load
  async waitForTableData(
    tableLocator: Locator,
    minRows: number = 1
  ): Promise<void> {
    await expect(async () => {
      const rows = await tableLocator.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(minRows);
    }).toPass({ timeout: 10000 });
  }

  // Wait for toast notification and get its message
  async waitForToast(): Promise<string> {
    const toast = this.page.getByRole('alert');
    await toast.waitFor({ state: 'visible' });
    const message = await toast.textContent();
    return message || '';
  }
}
```

### Using Web-First Assertions

Playwright's web-first assertions automatically retry until the condition is met:

```typescript
// tests/dashboard.spec.ts
// Tests demonstrating web-first assertions

import { test, expect } from '../fixtures/test-fixtures';

test.describe('Dashboard', () => {
  test('displays project list after loading', async ({ authenticatedPage }) => {
    // Web-first assertion - retries until visible or timeout
    await expect(
      authenticatedPage.page.getByTestId('project-card')
    ).toHaveCount(3, { timeout: 10000 });
  });

  test('shows notification badge with correct count', async ({ authenticatedPage, page }) => {
    // Wait for API response that updates the count
    await page.waitForResponse('/api/notifications/count');

    // Assert badge shows expected count
    await expect(
      page.getByTestId('notification-badge')
    ).toHaveText('5');
  });

  test('filters projects by search query', async ({ authenticatedPage }) => {
    await authenticatedPage.searchProject('monitoring');

    // Assert filtered results
    const projectNames = await authenticatedPage.getProjectNames();
    expect(projectNames.every(name =>
      name.toLowerCase().includes('monitoring')
    )).toBeTruthy();
  });
});
```

## Handling Flaky Tests

Flaky tests fail intermittently without code changes. Here are strategies to identify and fix them.

### Common Causes and Solutions

| Cause | Solution |
|-------|----------|
| Timing issues | Use proper waits, avoid hardcoded timeouts |
| Race conditions | Wait for specific conditions, not arbitrary time |
| Shared state | Isolate tests, use unique test data |
| Animation interference | Wait for animations to complete |
| Network variability | Mock slow or unreliable endpoints |
| Order dependence | Make tests self-contained |

### Retry and Quarantine Strategies

```typescript
// playwright.config.ts - retry configuration

export default defineConfig({
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Custom reporter for flaky test tracking
  reporter: [
    ['list'],
    ['./reporters/flaky-reporter.ts'],
  ],
});
```

```typescript
// reporters/flaky-reporter.ts
// Custom reporter to track flaky tests

import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface FlakyTest {
  title: string;
  file: string;
  retryCount: number;
  lastError: string;
}

class FlakyReporter implements Reporter {
  private flakyTests: FlakyTest[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    // Track tests that passed after retry
    if (result.status === 'passed' && result.retry > 0) {
      this.flakyTests.push({
        title: test.title,
        file: test.location.file,
        retryCount: result.retry,
        lastError: result.errors[0]?.message || 'Unknown error',
      });
    }
  }

  async onEnd(): Promise<void> {
    if (this.flakyTests.length > 0) {
      console.log('\n--- Flaky Tests Detected ---');
      for (const test of this.flakyTests) {
        console.log(`  ${test.title}`);
        console.log(`    File: ${test.file}`);
        console.log(`    Retries needed: ${test.retryCount}`);
      }

      // Write to file for CI tracking
      const fs = await import('fs');
      await fs.promises.writeFile(
        'test-results/flaky-tests.json',
        JSON.stringify(this.flakyTests, null, 2)
      );
    }
  }
}

export default FlakyReporter;
```

### Debugging Flaky Tests

```typescript
// tests/debug-example.spec.ts
// Techniques for debugging flaky tests

import { test, expect } from '@playwright/test';

test.describe('Debugging flaky tests', () => {
  // Run this test multiple times to reproduce flakiness
  test.describe.configure({ retries: 5 });

  test('potentially flaky interaction', async ({ page }) => {
    await page.goto('/complex-page');

    // Add verbose logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('request', req => console.log('Request:', req.url()));
    page.on('response', res => console.log('Response:', res.status(), res.url()));

    // Take screenshots at key points
    await page.screenshot({ path: 'debug-1-initial.png' });

    await page.getByRole('button', { name: 'Load Data' }).click();

    // Wait for specific condition instead of arbitrary timeout
    await expect(page.getByTestId('data-table')).toBeVisible();

    await page.screenshot({ path: 'debug-2-after-load.png' });

    // Add trace for detailed debugging
    const rows = await page.getByTestId('data-row').count();
    console.log(`Found ${rows} rows`);

    expect(rows).toBeGreaterThan(0);
  });
});
```

## Test Data Management

Proper test data management prevents test interference and makes tests reproducible.

### Test Data Factory

```typescript
// utils/TestDataFactory.ts
// Factory for creating and managing test data

import { APIRequestContext, request } from '@playwright/test';

interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

interface Project {
  id: string;
  name: string;
  ownerId: string;
}

export class TestDataFactory {
  private createdUsers: User[] = [];
  private createdProjects: Project[] = [];
  private apiContext: APIRequestContext | null = null;

  // Initialize API context for data creation
  async init(baseURL: string): Promise<void> {
    this.apiContext = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Create a unique user for testing
  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const timestamp = Date.now();
    const user: Omit<User, 'id'> = {
      email: `test-user-${timestamp}@example.com`,
      name: `Test User ${timestamp}`,
      password: 'SecurePassword123!',
      ...overrides,
    };

    const response = await this.apiContext!.post('/api/admin/users', {
      data: user,
    });

    const createdUser = await response.json();
    this.createdUsers.push(createdUser);
    return createdUser;
  }

  // Create a project for testing
  async createProject(
    ownerId: string,
    overrides: Partial<Project> = {}
  ): Promise<Project> {
    const timestamp = Date.now();
    const project = {
      name: `Test Project ${timestamp}`,
      ownerId,
      ...overrides,
    };

    const response = await this.apiContext!.post('/api/admin/projects', {
      data: project,
    });

    const createdProject = await response.json();
    this.createdProjects.push(createdProject);
    return createdProject;
  }

  // Create a complete test scenario with user and projects
  async createTestScenario(): Promise<{
    user: User;
    projects: Project[];
  }> {
    const user = await this.createUser();
    const projects = await Promise.all([
      this.createProject(user.id, { name: 'Monitoring Dashboard' }),
      this.createProject(user.id, { name: 'API Gateway' }),
      this.createProject(user.id, { name: 'User Service' }),
    ]);

    return { user, projects };
  }

  // Cleanup all created test data
  async cleanup(): Promise<void> {
    if (!this.apiContext) return;

    // Delete projects first (foreign key constraints)
    for (const project of this.createdProjects) {
      await this.apiContext.delete(`/api/admin/projects/${project.id}`);
    }

    // Then delete users
    for (const user of this.createdUsers) {
      await this.apiContext.delete(`/api/admin/users/${user.id}`);
    }

    this.createdProjects = [];
    this.createdUsers = [];
    await this.apiContext.dispose();
  }
}
```

### Using Test Data in Tests

```typescript
// tests/project-management.spec.ts
// Tests using the test data factory

import { test, expect } from '../fixtures/test-fixtures';

test.describe('Project Management', () => {
  test.beforeAll(async () => {
    // Initialize test data factory
  });

  test('user can view their projects', async ({ page, testData }) => {
    // Create isolated test data
    const { user, projects } = await testData.createTestScenario();

    // Login as the created user
    await page.goto('/login');
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);
    await page.getByTestId('login-submit').click();

    // Verify projects are displayed
    await page.waitForURL('/dashboard');

    for (const project of projects) {
      await expect(
        page.getByText(project.name)
      ).toBeVisible();
    }
  });

  test('user can create a new project', async ({ page, testData }) => {
    const { user } = await testData.createTestScenario();

    await page.goto('/login');
    await page.getByTestId('login-email').fill(user.email);
    await page.getByTestId('login-password').fill(user.password);
    await page.getByTestId('login-submit').click();

    await page.waitForURL('/dashboard');
    await page.getByRole('button', { name: 'Create Project' }).click();

    const newProjectName = `New Project ${Date.now()}`;
    await page.getByLabel('Project Name').fill(newProjectName);
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify project was created
    await expect(page.getByText(newProjectName)).toBeVisible();
  });
});
```

## Parallel Execution

Running tests in parallel speeds up your test suite significantly.

### Configuring Parallel Execution

```typescript
// playwright.config.ts - parallel configuration

export default defineConfig({
  // Run all tests in parallel
  fullyParallel: true,

  // Number of parallel workers
  workers: process.env.CI ? 4 : undefined,

  // Shard tests across multiple machines
  // Run with: npx playwright test --shard=1/3
});
```

### Test Organization for Parallelism

```typescript
// tests/parallel-safe.spec.ts
// Tests designed for parallel execution

import { test, expect } from '@playwright/test';

// Each test file runs in its own worker
// Tests within a file can run in parallel with fullyParallel: true

test.describe('User Settings', () => {
  // Use unique data per test to avoid conflicts
  test('can update display name', async ({ page }) => {
    const uniqueName = `User ${Date.now()}`;
    // Test implementation
  });

  test('can change password', async ({ page }) => {
    // Independent test, no shared state
  });

  test('can update notification preferences', async ({ page }) => {
    // Independent test, no shared state
  });
});

// Use test.describe.serial for tests that must run in order
test.describe.serial('Checkout Flow', () => {
  test('add item to cart', async ({ page }) => {
    // Step 1
  });

  test('proceed to checkout', async ({ page }) => {
    // Step 2 - depends on step 1
  });

  test('complete payment', async ({ page }) => {
    // Step 3 - depends on step 2
  });
});
```

### Sharding for CI

Split tests across multiple CI jobs:

```yaml
# .github/workflows/e2e-tests.yml
# GitHub Actions workflow with test sharding

name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.shard }}
          path: |
            test-results/
            playwright-report/
          retention-days: 7

  merge-reports:
    needs: test
    runs-on: ubuntu-latest
    if: always()

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Download all test results
        uses: actions/download-artifact@v4
        with:
          pattern: test-results-*
          merge-multiple: true
          path: all-results

      - name: Merge reports
        run: npx playwright merge-reports ./all-results
```

## CI Integration

Integrate E2E tests into your CI pipeline with proper error handling and reporting.

### Complete CI Configuration

```yaml
# .github/workflows/ci.yml
# Complete CI workflow with E2E tests

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

env:
  NODE_VERSION: 20

jobs:
  lint-and-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit

  e2e:
    needs: lint-and-unit
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Setup database
        run: npm run db:migrate
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test

      - name: Seed test data
        run: npm run db:seed:test
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test

      - name: Start application
        run: npm run start:test &
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
          PORT: 3000

      - name: Wait for app to be ready
        run: npx wait-on http://localhost:3000/health --timeout 60000

      - name: Run E2E tests
        run: npx playwright test --project=chromium
        env:
          BASE_URL: http://localhost:3000
          TEST_USER_EMAIL: test@example.com
          TEST_USER_PASSWORD: testpassword

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Upload traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: traces
          path: test-results/
          retention-days: 7
```

### Docker-Based Test Environment

```dockerfile
# Dockerfile.e2e
# Docker image for running E2E tests

FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy test files
COPY playwright.config.ts ./
COPY tests/ ./tests/
COPY pages/ ./pages/
COPY fixtures/ ./fixtures/
COPY utils/ ./utils/

# Run tests
CMD ["npx", "playwright", "test"]
```

```yaml
# docker-compose.e2e.yml
# Docker Compose for E2E test environment

version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://test:test@db:5432/test
      - NODE_ENV=test
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=test
      - POSTGRES_PASSWORD=test
      - POSTGRES_DB=test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  e2e:
    build:
      context: .
      dockerfile: Dockerfile.e2e
    environment:
      - BASE_URL=http://app:3000
      - TEST_USER_EMAIL=test@example.com
      - TEST_USER_PASSWORD=testpassword
    depends_on:
      app:
        condition: service_healthy
    volumes:
      - ./test-results:/app/test-results
      - ./playwright-report:/app/playwright-report
```

### Running Tests in Docker

```bash
# Build and run E2E tests
docker-compose -f docker-compose.e2e.yml up --build --exit-code-from e2e

# View results
open playwright-report/index.html
```

## Best Practices Summary

### Do

| Practice | Benefit |
|----------|---------|
| Use data-testid attributes | Stable selectors that survive refactoring |
| Implement page objects | Maintainable, reusable test code |
| Use web-first assertions | Built-in retry logic reduces flakiness |
| Create isolated test data | Tests don't interfere with each other |
| Run tests in parallel | Faster feedback loops |
| Use fixtures for setup | Clean, reusable test configuration |
| Capture traces on failure | Easier debugging in CI |

### Avoid

| Anti-Pattern | Problem |
|--------------|---------|
| Hardcoded waits | Slow and unreliable |
| Shared test data | Test interference and flakiness |
| CSS selectors | Break easily with style changes |
| Skipping cleanup | Data accumulation, test failures |
| Ignoring flaky tests | Technical debt, lost confidence |
| Testing implementation details | Brittle tests that break on refactoring |

## Conclusion

Building reliable E2E tests requires intentional design. Use page objects to encapsulate UI interactions, fixtures for consistent setup, and proper waiting strategies to handle asynchronous behavior. Keep tests isolated with unique test data, and run them in parallel to maintain fast feedback loops.

The investment in proper test infrastructure pays off through fewer production bugs, faster development cycles, and confidence in your deployment process. Start with these patterns, adapt them to your needs, and continuously refine your approach as your application grows.
