# How to Write Integration Tests for React Applications with Playwright

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Playwright, Integration Testing, E2E Testing, Testing, Automation

Description: Learn how to write robust integration tests for React applications using Playwright with page object patterns, component testing, and best practices for reliable test automation.

---

Integration tests verify that different parts of your React application work together correctly. Unlike unit tests that test components in isolation, integration tests simulate real user interactions across multiple components, routes, and API calls. Playwright provides a modern, reliable framework for writing these tests with excellent React support.

## Why Playwright for React Testing

| Feature | Benefit |
|---------|---------|
| **Auto-wait** | No manual waits for elements |
| **Cross-browser** | Chrome, Firefox, Safari, Edge |
| **Network interception** | Mock API responses |
| **Component testing** | Test React components directly |
| **Trace viewer** | Debug failed tests visually |
| **Parallel execution** | Fast test runs |

## Setting Up Playwright

Install Playwright in your React project:

```bash
npm init playwright@latest
```

This creates the following structure:

```
project/
  playwright.config.ts
  tests/
    example.spec.ts
  tests-examples/
    demo-todo-app.spec.ts
```

### Configuration for React

Configure Playwright for a typical React application with development server integration. The `webServer` option automatically starts your React dev server before running tests.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory containing all test files
  testDir: './tests',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI to handle flakiness
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI to prevent resource exhaustion
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],  // Console output during test runs
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests - allows using relative URLs
    baseURL: 'http://localhost:3000',

    // Capture screenshot on failure for debugging
    screenshot: 'only-on-failure',

    // Record trace on first retry for debugging flaky tests
    trace: 'on-first-retry',

    // Record video on failure
    video: 'retain-on-failure',
  },

  // Configure multiple browsers for cross-browser testing
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
    // Mobile viewports for responsive testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run start',           // Your React start command
    url: 'http://localhost:3000',       // URL to wait for
    reuseExistingServer: !process.env.CI,  // Reuse dev server locally
    timeout: 120 * 1000,                // Timeout for server startup
  },
});
```

## Writing Your First Integration Test

Start with a simple test that navigates to your app and verifies basic functionality. Playwright's locators automatically wait for elements to be ready before interacting.

```typescript
// tests/home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display welcome message', async ({ page }) => {
    // Navigate to home page (uses baseURL from config)
    await page.goto('/');

    // Verify the page title
    await expect(page).toHaveTitle(/My React App/);

    // Find and verify the welcome heading
    const heading = page.getByRole('heading', { name: 'Welcome' });
    await expect(heading).toBeVisible();
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/');

    // Click the navigation link
    await page.getByRole('link', { name: 'About' }).click();

    // Verify URL changed
    await expect(page).toHaveURL('/about');

    // Verify about page content loaded
    await expect(page.getByRole('heading', { name: 'About Us' })).toBeVisible();
  });
});
```

## Locator Strategies for React

Playwright provides multiple ways to locate elements. Use semantic locators when possible for more resilient tests.

### Recommended Locators

```typescript
// tests/locators.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Locator Strategies', () => {
  test('role-based locators - most resilient', async ({ page }) => {
    await page.goto('/');

    // Buttons - finds by accessible role and name
    await page.getByRole('button', { name: 'Submit' }).click();

    // Links - finds anchor elements
    await page.getByRole('link', { name: 'Home' }).click();

    // Headings - with level specification
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');

    // Form inputs - finds by associated label
    await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');

    // Checkboxes
    await page.getByRole('checkbox', { name: 'Remember me' }).check();

    // Radio buttons
    await page.getByRole('radio', { name: 'Monthly' }).click();

    // Comboboxes (select elements)
    await page.getByRole('combobox', { name: 'Country' }).selectOption('USA');
  });

  test('label-based locators for forms', async ({ page }) => {
    await page.goto('/signup');

    // Find inputs by their label text
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password').fill('securePassword123');
    await page.getByLabel('Confirm password').fill('securePassword123');
  });

  test('placeholder-based locators', async ({ page }) => {
    await page.goto('/search');

    // Find by placeholder text
    await page.getByPlaceholder('Search products...').fill('laptop');
  });

  test('text-based locators', async ({ page }) => {
    await page.goto('/');

    // Find element containing exact text
    await expect(page.getByText('Welcome back!')).toBeVisible();

    // Find element with partial text match
    await expect(page.getByText('items in cart', { exact: false })).toBeVisible();
  });

  test('test ID locators - for complex components', async ({ page }) => {
    await page.goto('/dashboard');

    // Use data-testid for elements without good semantic identifiers
    // Add data-testid="user-profile-card" in your React component
    const profileCard = page.getByTestId('user-profile-card');
    await expect(profileCard).toBeVisible();

    // Chain locators for nested elements
    const userName = profileCard.getByRole('heading');
    await expect(userName).toHaveText('John Doe');
  });
});
```

### Adding Test IDs to React Components

For complex components without good semantic identifiers, add test IDs:

```tsx
// src/components/UserCard.tsx
interface UserCardProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div data-testid="user-card" className="user-card">
      <img
        data-testid="user-avatar"
        src={user.avatar}
        alt={`${user.name}'s avatar`}
      />
      <h3 data-testid="user-name">{user.name}</h3>
      <p data-testid="user-email">{user.email}</p>
    </div>
  );
}
```

## Page Object Pattern

The Page Object Pattern encapsulates page-specific locators and actions in reusable classes. This makes tests more readable and maintainable.

### Base Page Object

```typescript
// tests/pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  // Each page object wraps a Playwright page
  protected readonly page: Page;

  // Common elements shared across pages
  protected readonly header: Locator;
  protected readonly footer: Locator;
  protected readonly loadingSpinner: Locator;
  protected readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize common locators
    this.header = page.getByRole('banner');
    this.footer = page.getByRole('contentinfo');
    this.loadingSpinner = page.getByTestId('loading-spinner');
    this.errorMessage = page.getByRole('alert');
  }

  // Common navigation methods
  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  // Wait for the page to be fully loaded
  async waitForPageLoad(): Promise<void> {
    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
  }

  // Get current URL
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  // Common assertions
  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Login Page Object

```typescript
// tests/pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Page-specific locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly googleLoginButton: Locator;
  readonly githubLoginButton: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators using various strategies
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    this.signUpLink = page.getByRole('link', { name: 'Sign up' });
    this.rememberMeCheckbox = page.getByRole('checkbox', { name: 'Remember me' });
    this.googleLoginButton = page.getByRole('button', { name: /continue with google/i });
    this.githubLoginButton = page.getByRole('button', { name: /continue with github/i });
  }

  // Navigate to login page
  async goto(): Promise<void> {
    await this.navigate('/login');
  }

  // Fill in login credentials
  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  // Submit the login form
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  // Complete login flow - combines fill and submit
  async login(email: string, password: string, rememberMe = false): Promise<void> {
    await this.fillCredentials(email, password);

    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }

    await this.submit();
  }

  // Verify successful login by checking redirect
  async expectLoginSuccess(): Promise<void> {
    // After successful login, user should be redirected to dashboard
    await expect(this.page).toHaveURL('/dashboard');
  }

  // Verify login error is displayed
  async expectLoginError(errorMessage: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(errorMessage);
  }

  // Verify the login page loaded correctly
  async expectPageLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/Sign In/);
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }
}
```

### Dashboard Page Object

```typescript
// tests/pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Navigation elements
  readonly sidebarNav: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly settingsLink: Locator;

  // Dashboard content
  readonly welcomeMessage: Locator;
  readonly statsCards: Locator;
  readonly recentActivityList: Locator;
  readonly quickActionsPanel: Locator;

  // Modal elements
  readonly createProjectButton: Locator;
  readonly projectModal: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation
    this.sidebarNav = page.getByRole('navigation', { name: 'Sidebar' });
    this.userMenu = page.getByTestId('user-menu');
    this.logoutButton = page.getByRole('menuitem', { name: 'Logout' });
    this.settingsLink = page.getByRole('link', { name: 'Settings' });

    // Content
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.statsCards = page.getByTestId('stats-card');
    this.recentActivityList = page.getByRole('list', { name: 'Recent activity' });
    this.quickActionsPanel = page.getByTestId('quick-actions');

    // Modals
    this.createProjectButton = page.getByRole('button', { name: 'Create project' });
    this.projectModal = page.getByRole('dialog', { name: 'Create new project' });
  }

  async goto(): Promise<void> {
    await this.navigate('/dashboard');
  }

  // Get specific stat card by name
  getStatCard(name: string): Locator {
    return this.page.getByTestId('stats-card').filter({ hasText: name });
  }

  // Navigate using sidebar
  async navigateToSection(sectionName: string): Promise<void> {
    await this.sidebarNav.getByRole('link', { name: sectionName }).click();
  }

  // Open user dropdown menu
  async openUserMenu(): Promise<void> {
    await this.userMenu.click();
    // Wait for menu to be visible
    await this.page.getByRole('menu').waitFor({ state: 'visible' });
  }

  // Logout flow
  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutButton.click();
    // Verify redirect to login page
    await expect(this.page).toHaveURL('/login');
  }

  // Create a new project
  async createProject(projectName: string, description: string): Promise<void> {
    await this.createProjectButton.click();
    await expect(this.projectModal).toBeVisible();

    await this.projectModal.getByLabel('Project name').fill(projectName);
    await this.projectModal.getByLabel('Description').fill(description);
    await this.projectModal.getByRole('button', { name: 'Create' }).click();

    // Wait for modal to close
    await expect(this.projectModal).not.toBeVisible();
  }

  // Verify dashboard loaded with user data
  async expectDashboardLoaded(userName: string): Promise<void> {
    await expect(this.welcomeMessage).toContainText(`Welcome, ${userName}`);
    await expect(this.statsCards.first()).toBeVisible();
    await expect(this.sidebarNav).toBeVisible();
  }

  // Get stat value from a specific card
  async getStatValue(statName: string): Promise<string> {
    const card = this.getStatCard(statName);
    const value = card.getByTestId('stat-value');
    return await value.textContent() ?? '';
  }
}
```

### Page Object Manager

Create a manager to handle page object instantiation and provide a clean API:

```typescript
// tests/pages/PageManager.ts
import { Page } from '@playwright/test';
import { LoginPage } from './LoginPage';
import { DashboardPage } from './DashboardPage';
import { SettingsPage } from './SettingsPage';
import { ProjectsPage } from './ProjectsPage';

export class PageManager {
  private readonly page: Page;

  // Lazy-loaded page objects
  private _loginPage: LoginPage | null = null;
  private _dashboardPage: DashboardPage | null = null;
  private _settingsPage: SettingsPage | null = null;
  private _projectsPage: ProjectsPage | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  // Getters that instantiate page objects on first access
  get loginPage(): LoginPage {
    if (!this._loginPage) {
      this._loginPage = new LoginPage(this.page);
    }
    return this._loginPage;
  }

  get dashboardPage(): DashboardPage {
    if (!this._dashboardPage) {
      this._dashboardPage = new DashboardPage(this.page);
    }
    return this._dashboardPage;
  }

  get settingsPage(): SettingsPage {
    if (!this._settingsPage) {
      this._settingsPage = new SettingsPage(this.page);
    }
    return this._settingsPage;
  }

  get projectsPage(): ProjectsPage {
    if (!this._projectsPage) {
      this._projectsPage = new ProjectsPage(this.page);
    }
    return this._projectsPage;
  }
}
```

### Using Page Objects in Tests

```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';
import { PageManager } from './pages/PageManager';

test.describe('Authentication Flow', () => {
  let pm: PageManager;

  test.beforeEach(async ({ page }) => {
    pm = new PageManager(page);
  });

  test('should login with valid credentials', async () => {
    await pm.loginPage.goto();
    await pm.loginPage.expectPageLoaded();

    await pm.loginPage.login('user@example.com', 'password123');

    await pm.loginPage.expectLoginSuccess();
    await pm.dashboardPage.expectDashboardLoaded('John Doe');
  });

  test('should show error for invalid credentials', async () => {
    await pm.loginPage.goto();

    await pm.loginPage.login('user@example.com', 'wrongpassword');

    await pm.loginPage.expectLoginError('Invalid email or password');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await pm.loginPage.goto();
    await pm.loginPage.login('user@example.com', 'password123');
    await pm.dashboardPage.expectDashboardLoaded('John Doe');

    // Then logout
    await pm.dashboardPage.logout();

    // Verify redirected to login
    await expect(page).toHaveURL('/login');
  });
});
```

## Mocking API Responses

Playwright can intercept network requests to mock API responses. This is essential for testing different scenarios without depending on backend state.

### Basic Route Interception

```typescript
// tests/api-mocking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Mocking', () => {
  test('should display user data from mocked API', async ({ page }) => {
    // Intercept API call and return mock data
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
        }),
      });
    });

    await page.goto('/profile');

    // Verify mock data is displayed
    await expect(page.getByTestId('user-name')).toHaveText('John Doe');
    await expect(page.getByTestId('user-email')).toHaveText('john@example.com');
    await expect(page.getByTestId('user-role')).toHaveText('admin');
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock a server error
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      });
    });

    await page.goto('/profile');

    // Verify error state is displayed
    await expect(page.getByRole('alert')).toContainText('Failed to load profile');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('should handle network failure', async ({ page }) => {
    // Abort the request to simulate network failure
    await page.route('**/api/users/me', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/profile');

    // Verify offline/error state
    await expect(page.getByText('Network error')).toBeVisible();
  });
});
```

### API Helper Class

Create a reusable API mocking helper for consistent mock setup:

```typescript
// tests/helpers/ApiMocker.ts
import { Page, Route } from '@playwright/test';

interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  delay?: number;
}

export class ApiMocker {
  private readonly page: Page;
  private readonly baseUrl: string;

  constructor(page: Page, baseUrl = '/api') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  // Generic mock method
  async mock(
    method: string,
    path: string,
    response: MockResponse
  ): Promise<void> {
    const urlPattern = `**${this.baseUrl}${path}`;

    await this.page.route(urlPattern, async (route: Route) => {
      // Only mock matching HTTP methods
      if (route.request().method() !== method.toUpperCase()) {
        await route.continue();
        return;
      }

      // Add optional delay to simulate network latency
      if (response.delay) {
        await new Promise((resolve) => setTimeout(resolve, response.delay));
      }

      await route.fulfill({
        status: response.status ?? 200,
        contentType: 'application/json',
        headers: response.headers,
        body: JSON.stringify(response.body),
      });
    });
  }

  // Convenience methods for common HTTP methods
  async get(path: string, response: MockResponse): Promise<void> {
    await this.mock('GET', path, response);
  }

  async post(path: string, response: MockResponse): Promise<void> {
    await this.mock('POST', path, response);
  }

  async put(path: string, response: MockResponse): Promise<void> {
    await this.mock('PUT', path, response);
  }

  async delete(path: string, response: MockResponse): Promise<void> {
    await this.mock('DELETE', path, response);
  }

  // Mock authentication endpoints
  async mockAuth(user: { id: number; name: string; email: string }): Promise<void> {
    await this.get('/auth/me', { body: user });
    await this.post('/auth/login', {
      body: { token: 'mock-jwt-token', user },
    });
  }

  // Mock paginated list endpoint
  async mockPaginatedList(
    path: string,
    items: unknown[],
    options: { page?: number; perPage?: number; total?: number } = {}
  ): Promise<void> {
    const { page = 1, perPage = 10, total = items.length } = options;

    await this.get(path, {
      body: {
        data: items.slice((page - 1) * perPage, page * perPage),
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      },
    });
  }
}
```

### Using the API Mocker

```typescript
// tests/projects.spec.ts
import { test, expect } from '@playwright/test';
import { ApiMocker } from './helpers/ApiMocker';
import { PageManager } from './pages/PageManager';

test.describe('Projects Page', () => {
  let api: ApiMocker;
  let pm: PageManager;

  test.beforeEach(async ({ page }) => {
    api = new ApiMocker(page);
    pm = new PageManager(page);

    // Mock authentication for all tests
    await api.mockAuth({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  test('should display list of projects', async ({ page }) => {
    // Mock projects API
    await api.get('/projects', {
      body: {
        data: [
          { id: 1, name: 'Project Alpha', status: 'active' },
          { id: 2, name: 'Project Beta', status: 'completed' },
          { id: 3, name: 'Project Gamma', status: 'draft' },
        ],
      },
    });

    await page.goto('/projects');

    // Verify all projects are displayed
    await expect(page.getByTestId('project-card')).toHaveCount(3);
    await expect(page.getByText('Project Alpha')).toBeVisible();
    await expect(page.getByText('Project Beta')).toBeVisible();
    await expect(page.getByText('Project Gamma')).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    // Mock empty projects list initially
    await api.get('/projects', { body: { data: [] } });

    // Mock project creation
    await api.post('/projects', {
      body: {
        id: 1,
        name: 'New Project',
        description: 'A test project',
        status: 'draft',
      },
    });

    await page.goto('/projects');

    // Create new project
    await pm.projectsPage.createProject('New Project', 'A test project');

    // Verify success message
    await expect(page.getByText('Project created successfully')).toBeVisible();
  });

  test('should handle creation failure', async ({ page }) => {
    await api.get('/projects', { body: { data: [] } });

    // Mock validation error
    await api.post('/projects', {
      status: 422,
      body: {
        error: 'Validation failed',
        details: { name: 'Project name already exists' },
      },
    });

    await page.goto('/projects');
    await pm.projectsPage.createProject('Duplicate Name', 'Description');

    // Verify error is displayed
    await expect(page.getByText('Project name already exists')).toBeVisible();
  });
});
```

## Authentication State Management

For tests requiring authentication, Playwright supports storing and reusing authentication state across tests.

### Global Setup for Authentication

```typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Perform login
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for successful login
  await expect(page).toHaveURL('/dashboard');

  // Save authentication state to file
  // This includes cookies, localStorage, and sessionStorage
  await page.context().storageState({ path: authFile });
});
```

### Configure Projects to Use Auth State

```typescript
// playwright.config.ts (partial)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    // Setup project runs first
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Tests that need authentication
    {
      name: 'authenticated',
      use: {
        // Load saved auth state
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],  // Wait for setup to complete
    },

    // Tests that don't need authentication
    {
      name: 'unauthenticated',
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],
});
```

### Tests Using Stored Auth

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test';

// These tests automatically have the authenticated state
test.describe('Dashboard (Authenticated)', () => {
  test('should access dashboard without logging in', async ({ page }) => {
    // User is already authenticated from setup
    await page.goto('/dashboard');

    // Should not redirect to login
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('should access protected settings page', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
```

## Testing Forms and User Input

Forms are a critical part of React applications. Test form validation, submission, and error handling thoroughly.

```typescript
// tests/forms.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Registration Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Create account' }).click();

    // Check for validation errors
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Email').blur();  // Trigger validation

    await expect(page.getByText('Please enter a valid email')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    const passwordInput = page.getByLabel('Password', { exact: true });

    // Weak password
    await passwordInput.fill('123');
    await passwordInput.blur();
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    // Password without special character
    await passwordInput.fill('password123');
    await passwordInput.blur();
    await expect(page.getByText('Password must include a special character')).toBeVisible();

    // Strong password
    await passwordInput.fill('Password123!');
    await passwordInput.blur();
    await expect(page.getByText('Password strength: Strong')).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirm password').fill('DifferentPassword!');
    await page.getByLabel('Confirm password').blur();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should submit form successfully', async ({ page }) => {
    // Mock successful registration
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({ message: 'Registration successful' }),
      });
    });

    // Fill form
    await page.getByLabel('Full name').fill('John Doe');
    await page.getByLabel('Email').fill('john@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirm password').fill('Password123!');
    await page.getByRole('checkbox', { name: 'I agree to the terms' }).check();

    // Submit
    await page.getByRole('button', { name: 'Create account' }).click();

    // Verify success
    await expect(page.getByText('Registration successful')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('should handle server-side validation errors', async ({ page }) => {
    // Mock email already exists error
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        body: JSON.stringify({
          error: 'Email already registered',
          field: 'email',
        }),
      });
    });

    // Fill and submit form
    await page.getByLabel('Full name').fill('John Doe');
    await page.getByLabel('Email').fill('existing@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirm password').fill('Password123!');
    await page.getByRole('checkbox', { name: 'I agree to the terms' }).check();
    await page.getByRole('button', { name: 'Create account' }).click();

    // Verify server error is displayed
    await expect(page.getByText('Email already registered')).toBeVisible();
  });
});
```

## Testing Async Operations and Loading States

React applications often have loading states and async operations. Test these to ensure good UX.

```typescript
// tests/async-operations.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Async Operations', () => {
  test('should display loading state during data fetch', async ({ page }) => {
    // Add delay to mock response
    await page.route('**/api/projects', async (route) => {
      // Simulate slow network
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/projects');

    // Verify loading state appears immediately
    await expect(page.getByTestId('loading-skeleton')).toBeVisible();
    await expect(page.getByText('Loading projects...')).toBeVisible();

    // Wait for loading to complete
    await expect(page.getByTestId('loading-skeleton')).not.toBeVisible({ timeout: 5000 });
  });

  test('should show progress during file upload', async ({ page }) => {
    await page.goto('/upload');

    // Mock file upload endpoint
    await page.route('**/api/upload', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ fileId: '123', url: '/files/123' }),
      });
    });

    // Create a test file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content'),
    });

    // Verify upload progress is shown
    await expect(page.getByTestId('upload-progress')).toBeVisible();

    // Wait for upload completion
    await expect(page.getByText('Upload complete')).toBeVisible({ timeout: 5000 });
  });

  test('should handle infinite scroll loading', async ({ page }) => {
    let pageNum = 1;

    // Mock paginated API
    await page.route('**/api/items*', async (route) => {
      const url = new URL(route.request().url());
      pageNum = parseInt(url.searchParams.get('page') ?? '1');

      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: (pageNum - 1) * 10 + i + 1,
            name: `Item ${(pageNum - 1) * 10 + i + 1}`,
          })),
          hasMore: pageNum < 5,
        }),
      });
    });

    await page.goto('/items');

    // Initial items should be loaded
    await expect(page.getByTestId('item-card')).toHaveCount(10);

    // Scroll to bottom to trigger next page load
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // More items should load
    await expect(page.getByTestId('item-card')).toHaveCount(20);

    // Verify item numbers
    await expect(page.getByText('Item 11')).toBeVisible();
    await expect(page.getByText('Item 20')).toBeVisible();
  });
});
```

## Visual Testing with Screenshots

Playwright can capture screenshots for visual regression testing.

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('home page visual test', async ({ page }) => {
    await page.goto('/');

    // Full page screenshot comparison
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixels: 100,  // Allow small differences
    });
  });

  test('component visual test', async ({ page }) => {
    await page.goto('/components');

    // Screenshot specific element
    const card = page.getByTestId('feature-card').first();
    await expect(card).toHaveScreenshot('feature-card.png');
  });

  test('responsive visual test', async ({ page }) => {
    await page.goto('/');

    // Desktop screenshot
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page).toHaveScreenshot('home-desktop.png');

    // Tablet screenshot
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('home-tablet.png');

    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('home-mobile.png');
  });

  test('dark mode visual test', async ({ page }) => {
    // Enable dark mode through media query emulation
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page).toHaveScreenshot('home-dark-mode.png', {
      fullPage: true,
    });
  });
});
```

## Testing Accessibility

Integrate accessibility testing into your Playwright tests using the @axe-core/playwright package.

```bash
npm install @axe-core/playwright --save-dev
```

```typescript
// tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('home page should have no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login form should be accessible', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .include('#login-form')  // Only scan the form
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should navigate with keyboard only', async ({ page }) => {
    await page.goto('/');

    // Tab through navigation
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Home' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'About' })).toBeFocused();

    // Activate link with Enter
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/about');
  });

  test('modal should trap focus', async ({ page }) => {
    await page.goto('/dashboard');

    // Open modal
    await page.getByRole('button', { name: 'Create project' }).click();

    // First focusable element in modal should be focused
    await expect(page.getByLabel('Project name')).toBeFocused();

    // Tab through all elements
    await page.keyboard.press('Tab');  // Description
    await page.keyboard.press('Tab');  // Cancel button
    await page.keyboard.press('Tab');  // Create button
    await page.keyboard.press('Tab');  // Should wrap back to first element

    await expect(page.getByLabel('Project name')).toBeFocused();

    // Escape should close modal
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
```

## Test Fixtures and Hooks

Create custom fixtures for commonly needed test setup.

```typescript
// tests/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { PageManager } from './pages/PageManager';
import { ApiMocker } from './helpers/ApiMocker';

// Define custom fixture types
type CustomFixtures = {
  pm: PageManager;
  api: ApiMocker;
  authenticatedPage: void;
};

// Extend base test with custom fixtures
export const test = base.extend<CustomFixtures>({
  // Page Manager fixture
  pm: async ({ page }, use) => {
    const pm = new PageManager(page);
    await use(pm);
  },

  // API Mocker fixture
  api: async ({ page }, use) => {
    const api = new ApiMocker(page);
    await use(api);
  },

  // Authenticated page fixture
  authenticatedPage: async ({ page, api }, use) => {
    // Set up authentication mocks
    await api.mockAuth({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    });

    // Add auth token to storage
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-jwt-token');
    });

    await use();
  },
});

export { expect };
```

### Using Custom Fixtures

```typescript
// tests/dashboard.spec.ts
import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  // Use authenticatedPage fixture to automatically set up auth
  test('should display user stats', async ({ page, pm, api, authenticatedPage }) => {
    await api.get('/stats', {
      body: {
        projects: 12,
        tasks: 45,
        completedTasks: 38,
      },
    });

    await pm.dashboardPage.goto();

    await expect(page.getByTestId('stat-projects')).toContainText('12');
    await expect(page.getByTestId('stat-tasks')).toContainText('45');
    await expect(page.getByTestId('stat-completed')).toContainText('38');
  });
});
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests with UI mode for debugging
npx playwright test --ui

# Generate HTML report
npx playwright test --reporter=html

# Update visual snapshots
npx playwright test --update-snapshots

# Run tests in debug mode
npx playwright test --debug
```

## Debugging Failed Tests

### Using Trace Viewer

```bash
# Generate traces on failure (configured in playwright.config.ts)
npx playwright test

# View trace file
npx playwright show-trace test-results/tests-auth-Authentication-Flow-should-login-with-valid-credentials/trace.zip
```

### Using Playwright Inspector

```typescript
// Add pause() to stop test execution and inspect
test('debug example', async ({ page }) => {
  await page.goto('/login');

  // Test execution pauses here - browser stays open
  await page.pause();

  await page.getByLabel('Email').fill('test@example.com');
});
```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

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

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Summary

| Topic | Key Points |
|-------|------------|
| **Setup** | Use `npm init playwright@latest`, configure webServer for React dev server |
| **Locators** | Prefer role-based locators, use test IDs for complex components |
| **Page Objects** | Encapsulate page logic in classes, use PageManager for organization |
| **API Mocking** | Use `page.route()` to intercept and mock API responses |
| **Authentication** | Store auth state with `storageState`, reuse across tests |
| **Forms** | Test validation, submission, and error handling |
| **Async Operations** | Test loading states, progress indicators, infinite scroll |
| **Visual Testing** | Use `toHaveScreenshot()` for visual regression |
| **Accessibility** | Integrate axe-core, test keyboard navigation |
| **Fixtures** | Create custom fixtures for common setup |
| **CI/CD** | Run tests in GitHub Actions, upload reports as artifacts |

Playwright provides a comprehensive testing framework for React applications. By combining page objects, API mocking, and proper test organization, you can build a reliable integration test suite that catches bugs before they reach production.
