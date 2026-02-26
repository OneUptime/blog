# How to Use Playwright E2E Tests with ArgoCD Hooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Playwright, E2E Testing

Description: Learn how to run Playwright end-to-end browser tests as ArgoCD PostSync hooks to validate user-facing functionality automatically after every deployment.

---

End-to-end tests catch what API tests miss. Your backend might return perfect JSON responses while the frontend renders a blank page because of a broken asset URL, a missing environment variable, or a JavaScript error. Playwright lets you test your application the way real users experience it - through a browser. Running these tests as ArgoCD PostSync hooks ensures every deployment is validated from the user's perspective.

This guide shows how to integrate Playwright browser tests into your ArgoCD deployment pipeline using PostSync hooks, containerized browsers, and practical test patterns.

## Why Playwright for PostSync Testing

Playwright is well-suited for post-deployment validation because:

- It supports Chromium, Firefox, and WebKit in a single API
- The official Docker images include pre-installed browsers
- Tests run headlessly in containers without display servers
- It handles dynamic content, SPAs, and complex user interactions
- Built-in retry and timeout mechanisms reduce flakiness

## Building a Playwright Test Container

First, create a Docker image with your E2E tests:

```dockerfile
# Dockerfile.e2e
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /tests

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy test files
COPY playwright.config.ts ./
COPY e2e/ ./e2e/

# Default command runs all tests
CMD ["npx", "playwright", "test"]
```

Your `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  reporter: [
    ['list'],
    ['junit', { outputFile: '/tmp/results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://frontend.default.svc:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

## Setting Up the PostSync Hook

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: e2e-tests-playwright
  annotations:
    argocd.argoproj.io/hook: PostSync
    # Run after smoke tests and before load tests
    argocd.argoproj.io/sync-wave: "2"
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 600
  template:
    spec:
      restartPolicy: Never
      initContainers:
        # Wait for frontend to be serving
        - name: wait-for-frontend
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              echo "Waiting for frontend..."
              attempt=0
              until wget -q -O /dev/null http://frontend.default.svc:3000/ 2>/dev/null; do
                attempt=$((attempt + 1))
                if [ $attempt -ge 60 ]; then
                  echo "Frontend not ready after 60 seconds"
                  exit 1
                fi
                sleep 1
              done
              echo "Frontend is ready"
      containers:
        - name: playwright
          image: myregistry.io/e2e-tests:latest
          command:
            - npx
            - playwright
            - test
            - --reporter=list
          env:
            - name: BASE_URL
              value: "http://frontend.default.svc:3000"
            - name: API_URL
              value: "http://api-service.default.svc:8080"
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 2Gi
          volumeMounts:
            - name: test-results
              mountPath: /tmp/results
      volumes:
        - name: test-results
          emptyDir: {}
```

## Writing Effective PostSync E2E Tests

PostSync E2E tests should be focused and fast. Test the critical user paths, not every feature:

```typescript
// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Post-Deployment Smoke Tests', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');

    // Verify the page loaded (not a blank white screen)
    await expect(page.locator('body')).not.toBeEmpty();

    // Check that critical UI elements are present
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // Verify no JavaScript console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Wait for page to fully render
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('login flow works', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'test-password');
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-greeting"]')).toBeVisible();
  });

  test('API data loads in the UI', async ({ page }) => {
    // Navigate to a page that fetches data
    await page.goto('/dashboard');

    // Wait for data to load
    await page.waitForSelector('[data-testid="data-table"]');

    // Verify data rows are present
    const rows = page.locator('[data-testid="data-table"] tr');
    await expect(rows).not.toHaveCount(0);
  });

  test('critical form submission works', async ({ page }) => {
    await page.goto('/create');

    // Fill out form
    await page.fill('[data-testid="name-input"]', 'E2E Test Item');
    await page.fill('[data-testid="description-input"]', 'Created by E2E test');
    await page.click('[data-testid="submit-button"]');

    // Should show success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Should redirect to the created item
    await expect(page).toHaveURL(/.*items\/\d+/);
  });
});
```

## Testing API Integration from the Browser

Verify that the frontend correctly communicates with the backend:

```typescript
// e2e/api-integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Frontend-API Integration', () => {
  test('API calls return valid data', async ({ page }) => {
    // Intercept API calls to verify they work
    const apiResponses: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiResponses.push({ url, status: response.status() });
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify all API calls succeeded
    const failedCalls = apiResponses.filter((r) => r.status >= 400);
    expect(failedCalls).toHaveLength(0);

    // Verify expected API calls were made
    const apiPaths = apiResponses.map((r) => new URL(r.url).pathname);
    expect(apiPaths).toContain('/api/v1/items');
  });

  test('error states render correctly', async ({ page }) => {
    // Test that the UI handles API errors gracefully
    await page.route('**/api/v1/items', (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.goto('/dashboard');

    // Should show an error message, not crash
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
```

## Managing Test Data

E2E tests often need test data. Use API calls in test setup to create it:

```typescript
// e2e/fixtures/test-data.ts
import { APIRequestContext } from '@playwright/test';

export async function createTestUser(request: APIRequestContext) {
  const response = await request.post(
    `${process.env.API_URL}/api/v1/test-users`,
    {
      data: {
        email: `e2e-${Date.now()}@test.com`,
        password: 'test-password',
        role: 'user',
      },
    }
  );

  return response.json();
}

export async function cleanupTestData(request: APIRequestContext) {
  await request.delete(
    `${process.env.API_URL}/api/v1/test-data?prefix=e2e-`
  );
}
```

```typescript
// e2e/with-data.spec.ts
import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestData } from './fixtures/test-data';

test.describe('Data-Dependent Tests', () => {
  let testUser: { email: string; password: string };

  test.beforeAll(async ({ request }) => {
    testUser = await createTestUser(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test('user can view their profile', async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');

    // Navigate to profile
    await page.goto('/profile');
    await expect(page.locator('[data-testid="profile-email"]')).toHaveText(
      testUser.email
    );
  });
});
```

## Collecting Test Artifacts

When E2E tests fail, screenshots and traces are essential for debugging. Upload them to accessible storage:

```yaml
containers:
  - name: playwright
    image: myregistry.io/e2e-tests:latest
    command:
      - sh
      - -c
      - |
        # Run tests
        npx playwright test --reporter=list 2>&1 | tee /tmp/results/output.txt
        TEST_EXIT=$?

        # Upload artifacts on failure
        if [ $TEST_EXIT -ne 0 ]; then
          # Upload screenshots and traces to S3
          if [ -d "test-results" ]; then
            tar czf /tmp/artifacts.tar.gz test-results/
            curl -X PUT "$S3_PRESIGNED_URL" \
              --upload-file /tmp/artifacts.tar.gz
          fi

          # Notify team with failure details
          FAILURES=$(grep "FAIL" /tmp/results/output.txt | head -5)
          curl -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
              \"text\": \"E2E Tests Failed After Deployment\",
              \"attachments\": [{
                \"color\": \"danger\",
                \"text\": \"$FAILURES\n\nArtifacts: $ARTIFACTS_URL\"
              }]
            }"
        fi

        exit $TEST_EXIT
    env:
      - name: BASE_URL
        value: "http://frontend.default.svc:3000"
      - name: SLACK_WEBHOOK
        valueFrom:
          secretKeyRef:
            name: slack-webhook
            key: url
```

## Resource Considerations

Playwright with Chromium needs significant resources. Size your pod accordingly:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    # Chromium needs at least 1 CPU core for stable rendering
    cpu: "2"
    # Chromium can use 1-2GB of memory
    memory: 2Gi
```

If resources are tight, consider running fewer browser instances or using only Chromium (skip Firefox and WebKit for PostSync tests).

## Running E2E Tests Only When Frontend Changes

If your repository contains both frontend and backend code, you can conditionally skip E2E tests when only the backend changed:

```yaml
command:
  - sh
  - -c
  - |
    # Check if frontend deployment was updated
    FRONTEND_GEN=$(kubectl get deployment frontend \
      -o jsonpath='{.metadata.generation}')
    LAST_TESTED_GEN=$(kubectl get configmap e2e-test-state \
      -o jsonpath='{.data.frontend-gen}' 2>/dev/null || echo "0")

    if [ "$FRONTEND_GEN" = "$LAST_TESTED_GEN" ]; then
      echo "Frontend unchanged, skipping E2E tests"
      exit 0
    fi

    # Run E2E tests
    npx playwright test
    result=$?

    # Record tested generation
    if [ $result -eq 0 ]; then
      kubectl create configmap e2e-test-state \
        --from-literal=frontend-gen="$FRONTEND_GEN" \
        --dry-run=client -o yaml | kubectl apply -f -
    fi

    exit $result
```

For more on running different types of tests after ArgoCD deployments, see our guide on [integration tests after ArgoCD deployment](https://oneuptime.com/blog/post/2026-02-26-argocd-integration-tests-after-deployment/view). Use OneUptime to monitor your E2E test pass rates over time and alert when failure rates increase.

## Best Practices

1. **Keep PostSync E2E tests focused** - Test 5 to 10 critical paths, not every feature. Save comprehensive E2E suites for nightly runs.
2. **Use data-testid attributes** - They are stable selectors that do not break with CSS changes.
3. **Set appropriate timeouts** - Give the Job 10 minutes (600s) to account for browser startup and slow network.
4. **Handle test data carefully** - Create unique test data per run and clean it up afterwards.
5. **Collect artifacts on failure** - Screenshots and traces are essential for debugging failed runs.
6. **Size resources correctly** - Chromium needs at least 1GB memory. Under-provisioning causes mysterious failures.
7. **Do not retry too aggressively** - One retry is reasonable for flakiness. More than that hides real issues.

Playwright E2E tests as ArgoCD PostSync hooks give you the ultimate deployment validation - your application tested the way real users experience it. Combined with smoke tests and load tests, you have a comprehensive validation pipeline that catches issues at every level.
