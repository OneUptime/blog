# How to Implement Synthetic Monitoring Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Synthetic Monitoring, Testing, Playwright, Observability, DevOps

Description: Build synthetic monitoring tests that simulate real user journeys, catch issues before customers do, and provide consistent baseline metrics for your web applications.

---

Synthetic monitoring proactively tests your applications by simulating user interactions at regular intervals. Unlike real user monitoring that waits for problems to affect customers, synthetic tests catch issues immediately and provide consistent performance baselines. This guide shows how to implement comprehensive synthetic monitoring using Playwright.

## Why Synthetic Monitoring?

| Monitoring Type | Detects Issues | Coverage |
|-----------------|----------------|----------|
| **Real User Monitoring** | After users experience them | Only active paths |
| **Synthetic Monitoring** | Before users see them | All critical paths |
| **Combined approach** | Fastest possible detection | Complete coverage |

Synthetic tests run continuously from multiple locations, testing critical user journeys even during low-traffic periods.

## Project Setup

Initialize a synthetic monitoring project with Playwright:

```bash
# Create project directory
mkdir synthetic-monitoring && cd synthetic-monitoring

# Initialize npm project
npm init -y

# Install dependencies
npm install playwright @playwright/test
npm install prom-client express dotenv

# Install browsers
npx playwright install chromium
```

## Test Configuration

Configure Playwright for synthetic monitoring with appropriate timeouts and retry settings:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    // Test directory
    testDir: './tests',

    // Run tests in parallel for faster execution
    fullyParallel: true,

    // Fail the build if tests accidentally left test.only
    forbidOnly: !!process.env.CI,

    // Retry failed tests to handle flaky network conditions
    retries: 2,

    // Reporter for metrics collection
    reporter: [
        ['html', { outputFolder: 'reports' }],
        ['json', { outputFile: 'results/results.json' }],
        ['./metrics-reporter.ts'],
    ],

    // Global timeout for each test
    timeout: 60000,

    use: {
        // Base URL for your application
        baseURL: process.env.TARGET_URL || 'https://app.example.com',

        // Record traces for failed tests
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video recording for debugging
        video: 'on-first-retry',

        // Viewport size
        viewport: { width: 1280, height: 720 },

        // Browser timeout
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },

    // Test against multiple browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile',
            use: { ...devices['iPhone 13'] },
        },
    ],
});
```

## User Journey Tests

Write tests that simulate complete user journeys:

```typescript
// tests/checkout-flow.spec.ts
import { test, expect } from '@playwright/test';

// Test critical e-commerce checkout flow
test.describe('Checkout Flow', () => {
    test('complete purchase flow', async ({ page }) => {
        // Step 1: Navigate to product page
        const startTime = Date.now();
        await page.goto('/products/featured-item');

        // Verify product page loaded correctly
        await expect(page.locator('[data-testid="product-title"]'))
            .toBeVisible();
        await expect(page.locator('[data-testid="add-to-cart"]'))
            .toBeEnabled();

        // Step 2: Add item to cart
        await page.click('[data-testid="add-to-cart"]');

        // Wait for cart confirmation
        await expect(page.locator('[data-testid="cart-notification"]'))
            .toContainText('Added to cart');

        // Step 3: Navigate to cart
        await page.click('[data-testid="cart-icon"]');
        await expect(page.locator('[data-testid="cart-items"]'))
            .toBeVisible();

        // Verify cart contains the item
        const cartItems = page.locator('[data-testid="cart-item"]');
        await expect(cartItems).toHaveCount(1);

        // Step 4: Proceed to checkout
        await page.click('[data-testid="checkout-button"]');

        // Verify checkout page loads
        await expect(page.locator('[data-testid="checkout-form"]'))
            .toBeVisible();

        // Step 5: Fill shipping information
        await page.fill('[data-testid="shipping-name"]', 'Test User');
        await page.fill('[data-testid="shipping-address"]', '123 Test St');
        await page.fill('[data-testid="shipping-city"]', 'Test City');
        await page.fill('[data-testid="shipping-zip"]', '12345');

        // Step 6: Fill payment information (test card)
        await page.fill('[data-testid="card-number"]', '4242424242424242');
        await page.fill('[data-testid="card-expiry"]', '12/25');
        await page.fill('[data-testid="card-cvc"]', '123');

        // Step 7: Place order
        await page.click('[data-testid="place-order"]');

        // Verify order confirmation
        await expect(page.locator('[data-testid="order-confirmation"]'))
            .toBeVisible({ timeout: 30000 });
        await expect(page.locator('[data-testid="order-number"]'))
            .toBeVisible();

        // Record total journey time
        const totalTime = Date.now() - startTime;
        console.log(`Checkout flow completed in ${totalTime}ms`);
    });
});
```

## API Health Checks

Test backend APIs alongside UI tests:

```typescript
// tests/api-health.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
    test('authentication service responds', async ({ request }) => {
        const response = await request.get('/api/auth/health');

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.status).toBe('healthy');
    });

    test('product service returns catalog', async ({ request }) => {
        const startTime = Date.now();

        const response = await request.get('/api/products', {
            params: { limit: 10 },
        });

        const latency = Date.now() - startTime;

        expect(response.status()).toBe(200);
        expect(latency).toBeLessThan(500); // SLA: 500ms

        const products = await response.json();
        expect(products.items).toHaveLength(10);
    });

    test('search service handles queries', async ({ request }) => {
        const response = await request.get('/api/search', {
            params: { q: 'test product' },
        });

        expect(response.status()).toBe(200);
        const results = await response.json();
        expect(results).toHaveProperty('items');
        expect(results).toHaveProperty('total');
    });

    test('payment service accepts test transactions', async ({ request }) => {
        const response = await request.post('/api/payments/validate', {
            data: {
                cardNumber: '4242424242424242',
                expiry: '12/25',
                cvc: '123',
            },
        });

        expect(response.status()).toBe(200);
        const validation = await response.json();
        expect(validation.valid).toBe(true);
    });
});
```

## Metrics Collection

Create a custom reporter to export metrics to Prometheus:

```typescript
// metrics-reporter.ts
import {
    Reporter,
    TestCase,
    TestResult,
    FullResult,
} from '@playwright/test/reporter';
import { Registry, Gauge, Histogram, Counter } from 'prom-client';

class MetricsReporter implements Reporter {
    private registry: Registry;
    private testDuration: Histogram;
    private testStatus: Counter;
    private lastRunTimestamp: Gauge;

    constructor() {
        this.registry = new Registry();

        // Histogram for test duration
        this.testDuration = new Histogram({
            name: 'synthetic_test_duration_seconds',
            help: 'Duration of synthetic tests in seconds',
            labelNames: ['test_name', 'project', 'status'],
            buckets: [0.5, 1, 2, 5, 10, 30, 60],
            registers: [this.registry],
        });

        // Counter for test results
        this.testStatus = new Counter({
            name: 'synthetic_test_results_total',
            help: 'Total count of synthetic test results',
            labelNames: ['test_name', 'project', 'status'],
            registers: [this.registry],
        });

        // Gauge for last successful run
        this.lastRunTimestamp = new Gauge({
            name: 'synthetic_test_last_success_timestamp',
            help: 'Timestamp of last successful test run',
            labelNames: ['test_name', 'project'],
            registers: [this.registry],
        });
    }

    onTestEnd(test: TestCase, result: TestResult) {
        const testName = test.title.replace(/\s+/g, '_').toLowerCase();
        const project = test.parent.project()?.name || 'default';
        const status = result.status;

        // Record duration
        this.testDuration.observe(
            { test_name: testName, project, status },
            result.duration / 1000
        );

        // Increment result counter
        this.testStatus.inc({ test_name: testName, project, status });

        // Update last success timestamp
        if (status === 'passed') {
            this.lastRunTimestamp.set(
                { test_name: testName, project },
                Date.now() / 1000
            );
        }
    }

    async onEnd(result: FullResult) {
        // Push metrics to Prometheus Pushgateway
        const pushgateway = process.env.PUSHGATEWAY_URL;
        if (pushgateway) {
            await this.pushMetrics(pushgateway);
        }
    }

    private async pushMetrics(gatewayUrl: string) {
        const metrics = await this.registry.metrics();

        await fetch(`${gatewayUrl}/metrics/job/synthetic_monitoring`, {
            method: 'POST',
            body: metrics,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

export default MetricsReporter;
```

## Scheduling with Kubernetes

Run synthetic tests on a schedule using Kubernetes CronJobs:

```yaml
# synthetic-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: synthetic-monitoring
  namespace: monitoring
spec:
  # Run every 5 minutes
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: synthetic-tests
              image: myregistry/synthetic-tests:latest
              env:
                - name: TARGET_URL
                  value: "https://app.example.com"
                - name: PUSHGATEWAY_URL
                  value: "http://prometheus-pushgateway:9091"
              resources:
                requests:
                  cpu: 500m
                  memory: 1Gi
                limits:
                  cpu: 1000m
                  memory: 2Gi
          restartPolicy: Never
      backoffLimit: 1
```

## Multi-Region Testing

Test from multiple geographic locations to catch regional issues:

```typescript
// tests/multi-region.spec.ts
import { test, expect } from '@playwright/test';

// Define regional endpoints
const regions = [
    { name: 'us-east', url: 'https://us-east.app.example.com' },
    { name: 'us-west', url: 'https://us-west.app.example.com' },
    { name: 'eu-west', url: 'https://eu-west.app.example.com' },
    { name: 'ap-south', url: 'https://ap-south.app.example.com' },
];

for (const region of regions) {
    test.describe(`Region: ${region.name}`, () => {
        test('homepage loads within SLA', async ({ page }) => {
            const startTime = Date.now();

            await page.goto(region.url);

            const loadTime = Date.now() - startTime;

            // Assert page loaded
            await expect(page.locator('h1')).toBeVisible();

            // Check against regional SLA
            expect(loadTime).toBeLessThan(3000);

            console.log(`${region.name} homepage: ${loadTime}ms`);
        });

        test('API responds from region', async ({ request }) => {
            const startTime = Date.now();

            const response = await request.get(`${region.url}/api/health`);

            const latency = Date.now() - startTime;

            expect(response.status()).toBe(200);
            expect(latency).toBeLessThan(500);
        });
    });
}
```

## Alerting Configuration

Set up Prometheus alerts for synthetic test failures:

```yaml
# prometheus-rules.yaml
groups:
  - name: synthetic-monitoring
    rules:
      # Alert when tests fail
      - alert: SyntheticTestFailing
        expr: |
          increase(synthetic_test_results_total{status="failed"}[15m]) > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Synthetic test {{ $labels.test_name }} failing"
          description: "Test {{ $labels.test_name }} has failed multiple times"

      # Alert when tests take too long
      - alert: SyntheticTestSlow
        expr: |
          histogram_quantile(0.95, rate(synthetic_test_duration_seconds_bucket[30m])) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Synthetic test {{ $labels.test_name }} is slow"
          description: "P95 duration exceeds 30 seconds"

      # Alert when tests stop running
      - alert: SyntheticTestStale
        expr: |
          time() - synthetic_test_last_success_timestamp > 900
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Synthetic test {{ $labels.test_name }} not running"
          description: "No successful run in the last 15 minutes"
```

## Dashboard Visualization

Create a Grafana dashboard query:

```promql
# Success rate over time
sum(rate(synthetic_test_results_total{status="passed"}[1h])) /
sum(rate(synthetic_test_results_total[1h])) * 100

# P95 test duration by test name
histogram_quantile(0.95,
  sum(rate(synthetic_test_duration_seconds_bucket[1h])) by (le, test_name)
)

# Failed tests in last hour
sum(increase(synthetic_test_results_total{status="failed"}[1h])) by (test_name)
```

## Summary

Synthetic monitoring provides proactive issue detection:

| Capability | Benefit |
|------------|---------|
| **Scheduled execution** | Catch issues 24/7 |
| **User journey simulation** | Test real workflows |
| **Multi-region testing** | Detect geographic issues |
| **Metric collection** | Track performance trends |
| **Alert integration** | Fast incident response |

Start with your most critical user journeys, then expand coverage based on incident patterns and customer feedback.
