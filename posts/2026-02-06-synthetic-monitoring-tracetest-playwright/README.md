# How to Build Synthetic Monitoring Tests with Tracetest and Playwright for Continuous Performance Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tracetest, Playwright, Synthetic Monitoring, Performance Validation

Description: Build synthetic monitoring tests using Tracetest and Playwright to continuously validate your application's performance with trace-based assertions.

Traditional synthetic monitoring tells you if a page loaded and how long it took. But it cannot tell you why something was slow. Was it the database query? The payment API? The cache miss? By combining Playwright for browser automation with Tracetest for trace-based assertions, you get synthetic monitoring that validates not just the user experience, but every step of the backend processing chain.

## What is Tracetest?

Tracetest is a testing tool that lets you write assertions against OpenTelemetry traces. You trigger a transaction, Tracetest captures the resulting distributed trace, and then you assert on span attributes, durations, and relationships. It turns your traces into a testable contract.

## Setting Up Playwright for Synthetic Tests

Start with a Playwright test that simulates a real user flow:

```typescript
// tests/synthetic/checkout-flow.spec.ts
import { test, expect } from '@playwright/test';

test('checkout flow completes within performance budget', async ({ page }) => {
  // Navigate to the product page
  await page.goto('https://staging.myapp.com/products/widget-pro');

  // Add item to cart
  await page.click('[data-testid="add-to-cart"]');
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

  // Go to checkout
  await page.click('[data-testid="checkout-button"]');
  await expect(page).toHaveURL(/.*\/checkout/);

  // Fill in payment details
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.fill('[data-testid="card-expiry"]', '12/28');
  await page.fill('[data-testid="card-cvc"]', '123');

  // Submit order and capture the trace ID from response headers
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/orders') && resp.status() === 201),
    page.click('[data-testid="place-order"]'),
  ]);

  // Extract the trace ID from the response for Tracetest to use
  const traceId = response.headers()['x-trace-id'];
  expect(traceId).toBeDefined();

  // Store trace ID for Tracetest validation
  console.log(`TRACE_ID=${traceId}`);

  // Verify the confirmation page loaded
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

## Propagating Trace IDs to the Browser

Your backend needs to return the trace ID so Playwright can hand it off to Tracetest:

```javascript
// middleware/trace-header.js
const { trace } = require('@opentelemetry/api');

function traceIdMiddleware(req, res, next) {
  const span = trace.getActiveSpan();
  if (span) {
    const traceId = span.spanContext().traceId;
    // Send the trace ID back to the browser in a response header
    res.setHeader('X-Trace-Id', traceId);
  }
  next();
}

module.exports = traceIdMiddleware;
```

## Writing Tracetest Assertions

Create a Tracetest definition that validates the trace captured during the Playwright test:

```yaml
# tracetest/checkout-assertions.yaml
type: Test
spec:
  name: Checkout Flow Trace Validation
  description: Validates performance of the checkout trace
  trigger:
    type: traceid
    traceid:
      id: ${TRACE_ID}
  specs:
    # The total checkout operation should be under 2 seconds
    - selector: span[name="POST /api/orders"]
      name: Total checkout duration
      assertions:
        - attr:tracetest.span.duration < 2000ms

    # Database operations should not dominate the request
    - selector: span[name="db.query" type="database"]
      name: Database query performance
      assertions:
        - attr:tracetest.span.duration < 100ms

    # Payment processing has its own budget
    - selector: span[name="process_payment"]
      name: Payment processing
      assertions:
        - attr:tracetest.span.duration < 1000ms
        - attr:payment.status = "success"

    # Inventory check should be fast since it should hit cache
    - selector: span[name="check_inventory"]
      name: Inventory check performance
      assertions:
        - attr:tracetest.span.duration < 50ms
        - attr:cache.hit exists

    # No span should have errors
    - selector: span[status.code="ERROR"]
      name: No errors in trace
      assertions:
        - attr:tracetest.selected_spans.count = 0
```

## Gluing It All Together

A shell script orchestrates Playwright and Tracetest:

```bash
#!/bin/bash
# run-synthetic-test.sh

# Run the Playwright test and capture the trace ID from output
OUTPUT=$(npx playwright test tests/synthetic/checkout-flow.spec.ts 2>&1)
PLAYWRIGHT_EXIT=$?

if [ $PLAYWRIGHT_EXIT -ne 0 ]; then
  echo "Playwright test failed"
  echo "$OUTPUT"
  exit 1
fi

# Extract the trace ID from Playwright output
TRACE_ID=$(echo "$OUTPUT" | grep "TRACE_ID=" | sed 's/TRACE_ID=//')

if [ -z "$TRACE_ID" ]; then
  echo "Could not extract trace ID from Playwright output"
  exit 1
fi

echo "Captured trace ID: $TRACE_ID"

# Wait a few seconds for the trace to be fully collected
sleep 5

# Run Tracetest assertions against the captured trace
tracetest run test \
  --file tracetest/checkout-assertions.yaml \
  --vars "TRACE_ID=$TRACE_ID" \
  --output pretty

TRACETEST_EXIT=$?

if [ $TRACETEST_EXIT -ne 0 ]; then
  echo "Trace-based assertions failed!"
  exit 1
fi

echo "All synthetic test assertions passed."
```

## Scheduling Continuous Runs

Set up a cron-based CI job to run these synthetic tests regularly:

```yaml
# .github/workflows/synthetic-monitoring.yml
name: Synthetic Performance Monitoring
on:
  schedule:
    - cron: '*/15 * * * *'  # every 15 minutes
  workflow_dispatch: {}

jobs:
  synthetic-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          npm ci
          npx playwright install chromium

      - name: Run synthetic tests
        run: bash run-synthetic-test.sh
        env:
          TRACETEST_SERVER_URL: https://tracetest.myapp.com

      - name: Alert on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: 'C01234PERF'
          slack-message: 'Synthetic performance test failed! Check the trace at ${{ env.TRACE_URL }}'
```

## Why Trace-Based Synthetic Testing Wins

Regular synthetic tests only tell you the symptoms. "The page took 4 seconds to load" is useful, but not actionable. Trace-based synthetic tests tell you the cause. "The page took 4 seconds because the inventory check span was 3.2 seconds instead of the expected 50ms" gives you something to work with immediately.

## Wrapping Up

Combining Playwright and Tracetest gives you synthetic monitoring with real diagnostic power. You simulate user flows, capture the distributed traces those flows produce, and assert on individual span performance. When something breaks, you know exactly where in the chain the problem occurred without having to dig through dashboards manually.
