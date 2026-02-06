# How to Use Cypress with Tracetest to Verify Backend Trace Behavior from Frontend Test Suites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cypress, Tracetest, Frontend Testing, Backend Traces

Description: Integrate Cypress frontend tests with Tracetest to validate that backend services produce the expected distributed traces.

Cypress tests verify what the user sees. But between the browser and the database, there are often five or more services involved in handling a single request. Tracetest bridges this gap by letting you assert on backend trace behavior directly from your Cypress test suite. If the frontend shows "Order Placed" but the payment service never processed it, this approach will catch that.

## The Architecture

The flow works like this:

1. Cypress drives the browser and interacts with your application
2. Your application makes API calls that generate OpenTelemetry traces
3. Tracetest captures those traces from your trace backend
4. Your Cypress test triggers Tracetest to validate the trace against assertions

## Setting Up Tracetest

First, get Tracetest running alongside your application:

```yaml
# docker-compose.yaml
version: '3.8'
services:
  tracetest:
    image: kubeshop/tracetest:latest
    ports:
      - "11633:11633"
    volumes:
      - ./tracetest-config.yaml:/app/config.yaml
    environment:
      TRACETEST_DEV: "true"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4317:4317"
      - "4318:4318"
    volumes:
      - ./otel-collector.yaml:/etc/otel/config.yaml
    command: ["--config", "/etc/otel/config.yaml"]
```

Configure Tracetest to read traces from your collector:

```yaml
# tracetest-config.yaml
postgres:
  host: postgres
  port: 5432
  dbname: tracetest

telemetry:
  exporters:
    collector:
      exporter:
        collector:
          endpoint: otel-collector:4317
```

## Writing a Cypress Custom Command for Tracetest

Create a custom Cypress command that triggers a Tracetest run and waits for the result:

```javascript
// cypress/support/commands.js

Cypress.Commands.add('verifyTrace', (testId, options = {}) => {
  const tracetestUrl = Cypress.env('TRACETEST_URL') || 'http://localhost:11633';
  const timeout = options.timeout || 30000;

  // Trigger a test run in Tracetest
  cy.request({
    method: 'POST',
    url: `${tracetestUrl}/api/tests/${testId}/run`,
    body: {},
    timeout: 10000,
  }).then((response) => {
    const runId = response.body.id;

    // Poll for the result
    const pollForResult = (attempts = 0) => {
      if (attempts > timeout / 1000) {
        throw new Error(`Tracetest run ${runId} did not complete within ${timeout}ms`);
      }

      return cy.request({
        method: 'GET',
        url: `${tracetestUrl}/api/tests/${testId}/run/${runId}`,
        failOnStatusCode: false,
      }).then((res) => {
        if (res.body.state === 'FINISHED') {
          // Check if all assertions passed
          const allPassed = res.body.result.allPassed;
          if (!allPassed) {
            const failures = res.body.result.results
              .filter(r => !r.passed)
              .map(r => `${r.selector}: ${r.assertion}`)
              .join('\n');
            throw new Error(`Trace assertions failed:\n${failures}`);
          }
          return res.body;
        }
        // Not finished yet, wait and retry
        cy.wait(1000);
        return pollForResult(attempts + 1);
      });
    };

    return pollForResult();
  });
});
```

## Defining Trace Test Specifications

Create Tracetest test definitions for each user flow you want to validate:

```yaml
# tracetest/order-placement.yaml
type: Test
spec:
  id: order-placement-test
  name: Order Placement Backend Validation
  trigger:
    type: traceid
  specs:
    # Verify the order service created an order
    - selector: span[name="POST /api/orders" service.name="order-service"]
      assertions:
        - attr:http.response.status_code = 201

    # Verify the database insert happened
    - selector: span[name="INSERT INTO orders" service.name="order-service"]
      assertions:
        - attr:db.system = "postgresql"
        - attr:db.operation.name = "INSERT"

    # Verify the payment was processed
    - selector: span[name="process_payment" service.name="payment-service"]
      assertions:
        - attr:payment.status = "success"
        - attr:payment.provider = "stripe"

    # Verify notification was sent
    - selector: span[name="send_confirmation" service.name="notification-service"]
      assertions:
        - attr:notification.channel = "email"
        - attr:notification.template = "order_confirmation"
```

Apply this test definition to Tracetest:

```bash
tracetest apply test --file tracetest/order-placement.yaml
```

## Writing the Cypress Test

Now write a Cypress test that exercises the UI and then validates the backend trace:

```javascript
// cypress/e2e/checkout.cy.js

describe('Checkout Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('places an order and verifies backend trace', () => {
    // Step 1: Navigate to products
    cy.get('[data-cy="products-link"]').click();
    cy.url().should('include', '/products');

    // Step 2: Add a product to cart
    cy.get('[data-cy="product-card"]').first().within(() => {
      cy.get('[data-cy="add-to-cart"]').click();
    });

    // Step 3: Go to checkout
    cy.get('[data-cy="cart-icon"]').click();
    cy.get('[data-cy="checkout-button"]').click();

    // Step 4: Fill in shipping info
    cy.get('#shipping-name').type('John Doe');
    cy.get('#shipping-address').type('123 Main St');
    cy.get('#shipping-city').type('Portland');
    cy.get('#shipping-zip').type('97201');

    // Step 5: Fill in payment info
    cy.get('#card-number').type('4242424242424242');
    cy.get('#card-expiry').type('12/27');
    cy.get('#card-cvv').type('123');

    // Step 6: Submit the order
    cy.get('[data-cy="place-order"]').click();

    // Step 7: Verify the UI shows success
    cy.get('[data-cy="order-confirmation"]').should('be.visible');
    cy.get('[data-cy="order-id"]').invoke('text').as('orderId');

    // Step 8: Verify backend traces via Tracetest
    // This checks that the payment was processed, DB was written to, etc.
    cy.verifyTrace('order-placement-test', { timeout: 30000 });
  });

  it('handles payment failure gracefully', () => {
    // Use a test card that triggers a failure
    cy.get('[data-cy="products-link"]').click();
    cy.get('[data-cy="product-card"]').first().find('[data-cy="add-to-cart"]').click();
    cy.get('[data-cy="cart-icon"]').click();
    cy.get('[data-cy="checkout-button"]').click();

    cy.get('#shipping-name').type('Jane Doe');
    cy.get('#shipping-address').type('456 Elm St');
    cy.get('#card-number').type('4000000000000002'); // Decline card

    cy.get('[data-cy="place-order"]').click();

    // UI should show error
    cy.get('[data-cy="payment-error"]').should('be.visible');

    // Backend trace should show the payment failure was handled correctly
    cy.verifyTrace('payment-failure-test', { timeout: 30000 });
  });
});
```

## Running in CI

```yaml
# .github/workflows/cypress-traces.yaml
name: Cypress + Tracetest
on: [push]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start services
        run: docker compose up -d --wait

      - name: Apply Tracetest definitions
        run: |
          tracetest apply test --file tracetest/order-placement.yaml
          tracetest apply test --file tracetest/payment-failure.yaml

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        env:
          CYPRESS_TRACETEST_URL: http://localhost:11633

      - name: Upload Cypress screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

This approach gives you full-stack test coverage from a single test suite. Cypress handles the browser, Tracetest handles the backend, and OpenTelemetry ties them together with distributed traces. When a test fails, you know exactly where in the stack the problem is.
