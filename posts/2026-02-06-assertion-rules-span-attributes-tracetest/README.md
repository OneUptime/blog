# How to Write Assertion Rules on Span Attributes and Timing Using Tracetest Test Definitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tracetest, Assertions, Testing

Description: Learn how to write precise assertion rules on span attributes, timing, and structure using Tracetest test definition selectors and comparators.

Tracetest lets you assert on the spans your application produces. But writing good assertions requires understanding the selector syntax, the available comparators, and how to target specific spans in a trace. This post is a practical guide to writing assertion rules that cover the most common testing scenarios: validating attributes, checking timing constraints, verifying span relationships, and testing error handling.

## Understanding Selectors

Selectors are how you pick which spans to assert on. They use a CSS-like syntax:

```yaml
# Select a span by its name
selector: span[name="GET /api/users"]

# Select by span type (set by Tracetest based on span kind)
selector: span[tracetest.span.type="http"]

# Select by attribute value
selector: span[service.name="order-service"]

# Combine multiple conditions
selector: span[tracetest.span.type="database" name="SELECT users" service.name="user-service"]

# Select by span kind
selector: span[tracetest.span.type="http" kind="client"]
```

The `tracetest.span.type` attribute is derived from the span kind and semantic conventions:

- `http` - HTTP client and server spans
- `database` - Database operation spans
- `messaging` - Message broker spans
- `rpc` - gRPC and RPC spans
- `general` - Everything else

## Asserting on Span Attributes

The most common assertions check that span attributes have expected values:

```yaml
# tests/test-user-api.yaml
type: Test
spec:
  name: "User API Assertions"
  trigger:
    type: http
    httpRequest:
      url: http://api:8080/api/v1/users/42
      method: GET

  specs:
    # Exact value match
    - selector: span[tracetest.span.type="http" name="GET /api/v1/users/:id"]
      name: "HTTP response is 200"
      assertions:
        - attr:http.status_code = 200

    # String contains
    - selector: span[tracetest.span.type="http" name="GET /api/v1/users/:id"]
      name: "Content type is JSON"
      assertions:
        - attr:http.response.header.content_type contains "application/json"

    # Numeric comparison
    - selector: span[tracetest.span.type="http" name="GET /api/v1/users/:id"]
      name: "Response size is reasonable"
      assertions:
        - attr:http.response.body.size < 10000

    # Attribute exists (is not empty)
    - selector: span[tracetest.span.type="database"]
      name: "Database spans have operation attribute"
      assertions:
        - attr:db.operation != ""

    # Attribute matches a specific value from a set
    - selector: span[tracetest.span.type="database"]
      name: "Only SELECT queries for GET requests"
      assertions:
        - attr:db.operation = "SELECT"
```

## Asserting on Timing

Timing assertions are crucial for performance testing. Tracetest provides the `tracetest.span.duration` attribute on every span:

```yaml
specs:
  # Total request time
  - selector: span[tracetest.span.type="http" name="GET /api/v1/users/:id"]
    name: "Total response time under 200ms"
    assertions:
      - attr:tracetest.span.duration < 200ms

  # Database query time
  - selector: span[tracetest.span.type="database" name="SELECT users"]
    name: "Database query under 50ms"
    assertions:
      - attr:tracetest.span.duration < 50ms

  # External service call time
  - selector: span[tracetest.span.type="http" kind="client"]
    name: "External calls under 1 second"
    assertions:
      - attr:tracetest.span.duration < 1s

  # Message publish time
  - selector: span[tracetest.span.type="messaging" name="orders.created publish"]
    name: "Message publish under 100ms"
    assertions:
      - attr:tracetest.span.duration < 100ms
```

## Asserting on Span Count

You can assert on how many spans match a selector. This is useful for verifying that certain operations happen (or do not happen):

```yaml
specs:
  # Verify a specific number of database calls
  - selector: span[tracetest.span.type="database"]
    name: "Exactly 2 database calls"
    assertions:
      - attr:tracetest.selected_spans.count = 2

  # Verify no errors in any span
  - selector: span[status.code="ERROR"]
    name: "No error spans in trace"
    assertions:
      - attr:tracetest.selected_spans.count = 0

  # Verify at least one cache hit
  - selector: span[name="cache.get" attr:cache.hit="true"]
    name: "At least one cache hit"
    assertions:
      - attr:tracetest.selected_spans.count >= 1
```

## Asserting on Span Relationships

You can verify the structure of your trace by checking parent-child relationships between spans:

```yaml
# tests/test-order-flow.yaml
type: Test
spec:
  name: "Order Creation Flow"
  trigger:
    type: http
    httpRequest:
      url: http://api:8080/api/v1/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
      body: '{"product_id": "prod-1", "quantity": 1}'

  specs:
    # The API handler span should exist
    - selector: span[name="POST /api/v1/orders"]
      name: "API handler span exists"
      assertions:
        - attr:tracetest.selected_spans.count = 1

    # The database INSERT should be a child of the API handler
    - selector: span[tracetest.span.type="database" name="INSERT orders"]
      name: "Database insert happens"
      assertions:
        - attr:tracetest.selected_spans.count = 1
        - attr:db.system = "postgresql"

    # The payment call should happen after the database insert
    # (based on timing, since Tracetest orders spans chronologically)
    - selector: span[tracetest.span.type="http" name="POST /payments/charge"]
      name: "Payment service is called after persisting order"
      assertions:
        - attr:tracetest.selected_spans.count = 1
        - attr:http.status_code = 200
```

## Testing Error Scenarios

Write assertions that verify your application handles errors correctly:

```yaml
# tests/test-downstream-failure.yaml
type: Test
spec:
  name: "Handle Payment Service Failure"
  description: "When the payment service returns 500, the order should not be confirmed"

  trigger:
    type: http
    httpRequest:
      url: http://api:8080/api/v1/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
        - key: X-Test-Payment-Fail
          value: "true"
      body: '{"product_id": "prod-1", "quantity": 1}'

  specs:
    # The API should return 503
    - selector: span[tracetest.span.type="http" name="POST /api/v1/orders"]
      name: "API returns 503 when payment fails"
      assertions:
        - attr:http.status_code = 503

    # The error should be recorded on the span
    - selector: span[tracetest.span.type="http" name="POST /payments/charge"]
      name: "Payment failure is recorded"
      assertions:
        - attr:http.status_code = 500

    # The order should be rolled back - no INSERT should persist
    - selector: span[tracetest.span.type="database" name="ROLLBACK"]
      name: "Transaction is rolled back"
      assertions:
        - attr:tracetest.selected_spans.count >= 1

    # A compensation event should be published
    - selector: span[tracetest.span.type="messaging" name="orders.failed publish"]
      name: "Failure event is published"
      assertions:
        - attr:tracetest.selected_spans.count = 1
        - attr:messaging.destination.name = "orders.failed"
```

## Using Variables and Outputs

Tracetest supports extracting values from one test step and using them in another:

```yaml
# tests/test-create-and-get-order.yaml
type: Test
spec:
  name: "Create and Retrieve Order"
  trigger:
    type: http
    httpRequest:
      url: http://api:8080/api/v1/orders
      method: POST
      headers:
        - key: Content-Type
          value: application/json
      body: '{"product_id": "prod-1", "quantity": 1}'

  specs:
    - selector: span[tracetest.span.type="http" name="POST /api/v1/orders"]
      name: "Order created successfully"
      assertions:
        - attr:http.status_code = 201

  outputs:
    - name: ORDER_ID
      selector: span[tracetest.span.type="database" name="INSERT orders"]
      value: attr:db.result.order_id
```

## Organizing Test Suites

Group related tests into test suites for organized execution:

```yaml
# tests/suite-order-api.yaml
type: TestSuite
spec:
  name: "Order API Test Suite"
  description: "Complete trace-based test suite for the order API"
  tests:
    - ./test-create-order.yaml
    - ./test-order-validation-error.yaml
    - ./test-downstream-failure.yaml
    - ./test-create-and-get-order.yaml
```

Run the suite:

```bash
tracetest run testsuite --file tests/suite-order-api.yaml --wait-for-result
```

## Summary

Tracetest assertion rules give you fine-grained control over what you verify in your distributed traces. By combining span selectors with attribute assertions, timing checks, span count validation, and error scenario testing, you can build a comprehensive test suite that verifies not just the API response, but the entire internal behavior of your system. The key is to start with the most important invariants (correct status codes, expected database operations, proper error handling) and expand from there as you learn which behaviors are most important to verify.
