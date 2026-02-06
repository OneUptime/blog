# How to Build Your First Custom Span in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Spans, Custom Instrumentation, Tracing, Tutorial

Description: A practical guide to creating your first custom span in OpenTelemetry with real code examples across multiple languages.

Auto-instrumentation gets you started with OpenTelemetry quickly. Install a library, add a few lines of configuration, and suddenly your HTTP requests, database calls, and message queue operations generate traces automatically. But auto-instrumentation only sees generic operations. It doesn't understand your business logic.

Custom spans fill this gap. They let you instrument the specific operations that matter to your application: processing an order, calculating recommendations, validating business rules, or generating reports. These spans make traces tell your application's story, not just the framework's story.

Building your first custom span takes about five minutes. Understanding when and how to use custom spans effectively takes longer. This guide covers both.

## What Makes a Span

Before writing code, understand what you're creating. A span represents a single operation within a trace. It captures when the operation started, when it ended, what happened during execution, and how it relates to other operations.

Every span contains:

- **Name**: A concise description of the operation (like "process_payment" or "validate_order")
- **Start time**: When the operation began
- **End time**: When the operation completed
- **Status**: Whether the operation succeeded or failed
- **Attributes**: Key-value pairs describing the operation (like order_id, user_id, or payment_amount)
- **Events**: Timestamped messages recording significant moments during execution
- **Links**: References to related spans in other traces

The name and attributes are particularly important because they determine how useful your spans will be. Good names follow patterns and enable aggregation. Good attributes provide the context needed for debugging.

For detailed guidance on naming spans effectively, see our guide on [How to Name Spans in OpenTelemetry](https://oneuptime.com/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/view).

## Your First Span in Python

Start with the simplest possible custom span. You'll instrument a function that processes an order.

```python
from opentelemetry import trace

# Get a tracer instance
# The name should be your module or library name
tracer = trace.get_tracer(__name__)

def process_order(order_id, items, user_id):
    # Create a span for this operation
    with tracer.start_as_current_span("process_order") as span:
        # Add attributes that describe this specific execution
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.item_count", len(items))
        span.set_attribute("user.id", user_id)

        # Your actual business logic
        total = calculate_total(items)
        payment_result = charge_payment(user_id, total)
        inventory_result = reserve_inventory(items)

        # Add the result as an attribute
        span.set_attribute("order.total", total)
        span.set_attribute("payment.status", payment_result.status)

        return {
            "order_id": order_id,
            "total": total,
            "status": "completed"
        }
```

This code creates a span when `process_order` executes. The `with` statement ensures the span ends automatically when the function completes, even if an exception occurs.

The span name "process_order" describes the operation. The attributes provide context: which order, how many items, which user, what was the total. When debugging a failed order, these attributes let you filter traces to find relevant examples.

## Your First Span in JavaScript

JavaScript's async nature requires slightly different patterns.

```javascript
const opentelemetry = require('@opentelemetry/api');

// Get a tracer instance
const tracer = opentelemetry.trace.getTracer('order-service');

async function processOrder(orderId, items, userId) {
  // Start a span
  const span = tracer.startSpan('process_order');

  // Set attributes
  span.setAttribute('order.id', orderId);
  span.setAttribute('order.item_count', items.length);
  span.setAttribute('user.id', userId);

  try {
    // Business logic
    const total = calculateTotal(items);
    const paymentResult = await chargePayment(userId, total);
    const inventoryResult = await reserveInventory(items);

    // Add result attributes
    span.setAttribute('order.total', total);
    span.setAttribute('payment.status', paymentResult.status);

    // Mark span as successful
    span.setStatus({ code: opentelemetry.SpanStatusCode.OK });

    return {
      orderId: orderId,
      total: total,
      status: 'completed'
    };
  } catch (error) {
    // Record the error
    span.recordException(error);
    span.setStatus({
      code: opentelemetry.SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;
  } finally {
    // Always end the span
    span.end();
  }
}
```

JavaScript requires explicit span ending with `span.end()`. The try-catch-finally pattern ensures spans end even when errors occur. The `recordException` method captures error details.

## Your First Span in Go

Go's explicit error handling and defer keyword create a different pattern.

```go
package main

import (
    "context"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
)

// Get a tracer instance
var tracer = otel.Tracer("order-service")

func processOrder(ctx context.Context, orderID string, items []Item, userID string) error {
    // Create span with parent context
    ctx, span := tracer.Start(ctx, "process_order")
    defer span.End() // Ensure span ends when function returns

    // Set attributes
    span.SetAttributes(
        attribute.String("order.id", orderID),
        attribute.Int("order.item_count", len(items)),
        attribute.String("user.id", userID),
    )

    // Business logic
    total, err := calculateTotal(items)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return fmt.Errorf("failed to calculate total: %w", err)
    }

    paymentResult, err := chargePayment(ctx, userID, total)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return fmt.Errorf("payment failed: %w", err)
    }

    inventoryResult, err := reserveInventory(ctx, items)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return fmt.Errorf("inventory reservation failed: %w", err)
    }

    // Add result attributes
    span.SetAttributes(
        attribute.Float64("order.total", total),
        attribute.String("payment.status", paymentResult.Status),
    )

    span.SetStatus(codes.Ok, "order processed successfully")
    return nil
}
```

Go requires passing context through the call chain. The `ctx` returned by `tracer.Start()` contains the span context. Pass this to downstream functions so their spans become children of this span.

The `defer span.End()` pattern ensures the span ends when the function returns, regardless of the return path.

## Your First Span in Java

Java uses try-with-resources for automatic span lifecycle management.

```java
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;

public class OrderService {
    private final Tracer tracer;

    public OrderService(OpenTelemetry openTelemetry) {
        this.tracer = openTelemetry.getTracer("order-service");
    }

    public OrderResult processOrder(String orderId, List<Item> items, String userId) {
        // Create span
        Span span = tracer.spanBuilder("process_order")
                .startSpan();

        // Make span active in current context
        try (Scope scope = span.makeCurrent()) {
            // Set attributes
            span.setAttribute("order.id", orderId);
            span.setAttribute("order.item_count", items.size());
            span.setAttribute("user.id", userId);

            // Business logic
            double total = calculateTotal(items);
            PaymentResult paymentResult = chargePayment(userId, total);
            InventoryResult inventoryResult = reserveInventory(items);

            // Add result attributes
            span.setAttribute("order.total", total);
            span.setAttribute("payment.status", paymentResult.getStatus());

            span.setStatus(StatusCode.OK);

            return new OrderResult(orderId, total, "completed");
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

The `makeCurrent()` method makes the span active in the current thread. This ensures any auto-instrumented operations (like HTTP calls or database queries) become children of this span.

## Adding Context with Attributes

Attributes transform generic spans into specific, debuggable information. Choose attributes that help answer questions you'll have during debugging.

```python
# Bad: too few attributes
with tracer.start_as_current_span("process_payment") as span:
    result = payment_gateway.charge(amount)
    return result

# Good: useful debugging context
with tracer.start_as_current_span("process_payment") as span:
    span.set_attribute("payment.amount", amount)
    span.set_attribute("payment.currency", currency)
    span.set_attribute("payment.method", payment_method)
    span.set_attribute("user.id", user_id)
    span.set_attribute("user.tier", user_tier)

    result = payment_gateway.charge(amount)

    span.set_attribute("payment.transaction_id", result.transaction_id)
    span.set_attribute("payment.status", result.status)
    span.set_attribute("payment.gateway", "stripe")

    return result
```

The good example lets you query for failed payments, filter by payment method, identify patterns by user tier, or track specific transactions. The bad example just shows that a payment was processed.

Follow semantic conventions when they exist. OpenTelemetry defines standard attribute names for common concepts:

```go
import "go.opentelemetry.io/otel/semconv/v1.21.0/httpconv"

span.SetAttributes(
    // Semantic conventions for HTTP
    httpconv.ServerRequest("order-api", req)...,

    // Custom business attributes
    attribute.String("order.id", orderID),
    attribute.String("order.type", orderType),
)
```

Semantic conventions ensure consistency across services. When every service uses `http.method` instead of inventing their own names, queries work across your entire system.

## Recording Events Within Spans

Events capture significant moments during span execution. They're like log messages but structured and attached to the span.

```javascript
async function processLargeOrder(orderId, items) {
  const span = tracer.startSpan('process_large_order');

  try {
    span.addEvent('validation_started');

    const validationResult = await validateItems(items);

    span.addEvent('validation_completed', {
      'validation.items_checked': items.length,
      'validation.errors': validationResult.errors.length
    });

    if (validationResult.errors.length > 0) {
      span.addEvent('validation_failed', {
        'validation.error_types': validationResult.errors.map(e => e.type)
      });
      throw new Error('Validation failed');
    }

    span.addEvent('inventory_check_started');
    const inventoryResult = await checkInventory(items);

    span.addEvent('inventory_check_completed', {
      'inventory.available': inventoryResult.allAvailable,
      'inventory.partial': inventoryResult.partialItems.length
    });

    span.addEvent('payment_processing_started');
    const paymentResult = await processPayment(orderId);

    span.addEvent('payment_completed', {
      'payment.amount': paymentResult.amount,
      'payment.method': paymentResult.method
    });

    span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
    return { orderId, status: 'completed' };
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: opentelemetry.SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;
  } finally {
    span.end();
  }
}
```

Events show the execution timeline. When debugging why an order took 30 seconds to process, events show that inventory check took 25 seconds. Without events, you'd just see the total duration.

## Handling Errors Correctly

Proper error handling makes spans useful for debugging failures.

```python
def process_refund(order_id, amount, reason):
    with tracer.start_as_current_span("process_refund") as span:
        span.set_attribute("refund.order_id", order_id)
        span.set_attribute("refund.amount", amount)
        span.set_attribute("refund.reason", reason)

        try:
            # Attempt refund
            result = payment_gateway.refund(order_id, amount)

            span.set_attribute("refund.transaction_id", result.transaction_id)
            span.set_attribute("refund.status", "success")

            # Mark span as successful
            span.set_status(StatusCode.OK)

            return result

        except InsufficientFundsError as e:
            # Record specific error details
            span.record_exception(e)
            span.set_status(StatusCode.ERROR, "Insufficient funds for refund")
            span.set_attribute("refund.error_type", "insufficient_funds")
            span.set_attribute("refund.available_balance", e.available_balance)
            raise

        except PaymentGatewayError as e:
            # Record gateway errors differently
            span.record_exception(e)
            span.set_status(StatusCode.ERROR, "Payment gateway error")
            span.set_attribute("refund.error_type", "gateway_error")
            span.set_attribute("refund.gateway_code", e.error_code)
            raise

        except Exception as e:
            # Catch-all for unexpected errors
            span.record_exception(e)
            span.set_status(StatusCode.ERROR, "Unexpected error during refund")
            span.set_attribute("refund.error_type", "unknown")
            raise
```

This pattern records the exception details, sets appropriate status, adds error context as attributes, and re-raises the exception. Your observability backend can then filter for failed refunds, categorize by error type, or alert on specific failure modes.

## Creating Child Spans

Complex operations consist of multiple steps. Model this with parent and child spans.

```go
func processCheckout(ctx context.Context, cartID string) error {
    // Parent span for entire checkout
    ctx, parentSpan := tracer.Start(ctx, "process_checkout")
    defer parentSpan.End()

    parentSpan.SetAttributes(
        attribute.String("cart.id", cartID),
    )

    // Load cart (child span)
    cart, err := loadCart(ctx, cartID)
    if err != nil {
        parentSpan.RecordError(err)
        parentSpan.SetStatus(codes.Error, "Failed to load cart")
        return err
    }

    parentSpan.SetAttribute("cart.item_count", len(cart.Items))

    // Validate inventory (child span)
    if err := validateInventory(ctx, cart.Items); err != nil {
        parentSpan.RecordError(err)
        parentSpan.SetStatus(codes.Error, "Inventory validation failed")
        return err
    }

    // Process payment (child span)
    paymentResult, err := processPayment(ctx, cart.Total, cart.UserID)
    if err != nil {
        parentSpan.RecordError(err)
        parentSpan.SetStatus(codes.Error, "Payment processing failed")
        return err
    }

    parentSpan.SetAttribute("payment.amount", cart.Total)
    parentSpan.SetAttribute("payment.transaction_id", paymentResult.TransactionID)

    // Reserve inventory (child span)
    if err := reserveInventory(ctx, cart.Items); err != nil {
        parentSpan.RecordError(err)
        parentSpan.SetStatus(codes.Error, "Inventory reservation failed")
        return err
    }

    parentSpan.SetStatus(codes.Ok, "Checkout completed successfully")
    return nil
}

func loadCart(ctx context.Context, cartID string) (*Cart, error) {
    // This creates a child span automatically
    ctx, span := tracer.Start(ctx, "load_cart")
    defer span.End()

    span.SetAttribute("cart.id", cartID)

    cart, err := database.LoadCart(ctx, cartID)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Database error")
        return nil, err
    }

    span.SetAttribute("cart.item_count", len(cart.Items))
    span.SetStatus(codes.Ok, "")
    return cart, nil
}

func validateInventory(ctx context.Context, items []Item) error {
    ctx, span := tracer.Start(ctx, "validate_inventory")
    defer span.End()

    span.SetAttribute("items.count", len(items))

    for _, item := range items {
        available, err := inventory.CheckAvailability(ctx, item.SKU, item.Quantity)
        if err != nil {
            span.RecordError(err)
            span.SetStatus(codes.Error, "Failed to check inventory")
            return err
        }

        if !available {
            err := fmt.Errorf("insufficient inventory for SKU: %s", item.SKU)
            span.RecordError(err)
            span.SetStatus(codes.Error, "Insufficient inventory")
            span.SetAttribute("inventory.insufficient_sku", item.SKU)
            return err
        }
    }

    span.SetStatus(codes.Ok, "All items available")
    return nil
}
```

The trace shows a hierarchy: the parent "process_checkout" span contains children "load_cart", "validate_inventory", "process_payment", and "reserve_inventory". Each child shows its own duration. You can see which step took longest or which step failed.

## Practical Patterns for Custom Spans

Different scenarios call for different instrumentation patterns.

### Database Operations

Instrument specific queries when auto-instrumentation doesn't provide enough detail.

```python
def get_user_orders(user_id, status_filter=None, limit=100):
    with tracer.start_as_current_span("get_user_orders") as span:
        span.set_attribute("db.operation", "query")
        span.set_attribute("user.id", user_id)
        span.set_attribute("query.limit", limit)

        if status_filter:
            span.set_attribute("query.status_filter", status_filter)

        query = """
            SELECT order_id, created_at, total, status
            FROM orders
            WHERE user_id = %s
        """
        params = [user_id]

        if status_filter:
            query += " AND status = %s"
            params.append(status_filter)

        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)

        span.set_attribute("db.statement", query)

        results = database.execute(query, params)

        span.set_attribute("query.result_count", len(results))

        return results
```

### External API Calls

Instrument third-party API interactions to track their performance and failures.

```javascript
async function fetchUserProfile(userId, apiKey) {
  const span = tracer.startSpan('fetch_user_profile');
  span.setAttribute('user.id', userId);
  span.setAttribute('api.service', 'user-profile-api');

  const startTime = Date.now();

  try {
    const response = await fetch(`https://api.example.com/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const duration = Date.now() - startTime;

    span.setAttribute('http.status_code', response.status);
    span.setAttribute('http.duration_ms', duration);

    if (!response.ok) {
      const error = new Error(`API returned status ${response.status}`);
      span.recordException(error);
      span.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: `HTTP ${response.status}`
      });
      throw error;
    }

    const data = await response.json();

    span.setAttribute('user.account_type', data.accountType);
    span.setStatus({ code: opentelemetry.SpanStatusCode.OK });

    return data;
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: opentelemetry.SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;
  } finally {
    span.end();
  }
}
```

### Background Jobs

Instrument background tasks to understand their performance characteristics.

```ruby
require 'opentelemetry/api'

class OrderReportJob
  def perform(start_date, end_date)
    tracer = OpenTelemetry.tracer_provider.tracer('background-jobs')

    tracer.in_span('generate_order_report') do |span|
      span.set_attribute('report.start_date', start_date.to_s)
      span.set_attribute('report.end_date', end_date.to_s)
      span.set_attribute('job.type', 'order_report')

      span.add_event('fetching_orders')
      orders = fetch_orders(start_date, end_date)

      span.set_attribute('report.order_count', orders.length)
      span.add_event('orders_fetched', {
        'orders.count' => orders.length
      })

      span.add_event('calculating_metrics')
      metrics = calculate_metrics(orders)

      span.add_event('generating_pdf')
      pdf = generate_pdf(metrics)

      span.set_attribute('report.size_bytes', pdf.bytesize)
      span.add_event('uploading_to_storage')

      upload_to_storage(pdf, "report-#{start_date}-#{end_date}.pdf")

      span.add_event('report_completed')
      span.status = OpenTelemetry::Trace::Status.ok('Report generated successfully')
    end
  rescue StandardError => e
    span&.record_exception(e)
    span&.status = OpenTelemetry::Trace::Status.error(e.message)
    raise
  end
end
```

## Common Mistakes to Avoid

Several patterns create problematic spans. Avoid these pitfalls.

### High-Cardinality Span Names

Don't include variable data in span names.

```python
# Bad: span name includes user ID
with tracer.start_as_current_span(f"process_order_for_user_{user_id}"):
    process_order(user_id, order_data)

# Good: user ID is an attribute
with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("user.id", user_id)
    process_order(user_id, order_data)
```

Span names with high cardinality prevent aggregation. You can't calculate average duration for "process_order" if every execution has a different span name.

### Forgetting to End Spans

Always ensure spans end, even when errors occur.

```javascript
// Bad: span might not end if error occurs
function processData(data) {
  const span = tracer.startSpan('process_data');
  const result = expensiveOperation(data); // Might throw
  span.end();
  return result;
}

// Good: span ends via finally block
function processData(data) {
  const span = tracer.startSpan('process_data');
  try {
    const result = expensiveOperation(data);
    return result;
  } finally {
    span.end();
  }
}
```

Spans that don't end leak memory and create incomplete traces.

### Too Many Attributes

More attributes aren't always better. Each attribute increases cardinality and storage costs.

```go
// Bad: unnecessary attributes
span.SetAttributes(
    attribute.String("function.name", "processOrder"),
    attribute.String("file.name", "order_service.go"),
    attribute.Int("line.number", 42),
    attribute.String("go.version", runtime.Version()),
    attribute.String("hostname", hostname),
)

// Good: relevant business attributes
span.SetAttributes(
    attribute.String("order.id", orderID),
    attribute.String("order.type", orderType),
    attribute.Float64("order.total", total),
)
```

Focus on attributes that help debugging specific issues. Metadata about the runtime or source code location isn't usually useful.

## Testing Your Spans

Verify custom spans work correctly before deploying to production.

```python
import unittest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

class TestOrderProcessing(unittest.TestCase):
    def setUp(self):
        # Set up in-memory span exporter for testing
        self.span_exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(self.span_exporter))
        trace.set_tracer_provider(provider)

    def tearDown(self):
        # Clear spans after each test
        self.span_exporter.clear()

    def test_process_order_creates_span_with_attributes(self):
        # Execute function that creates span
        result = process_order("order-123", [{"sku": "WIDGET", "qty": 2}], "user-456")

        # Get exported spans
        spans = self.span_exporter.get_finished_spans()

        # Verify span was created
        self.assertEqual(len(spans), 1)

        span = spans[0]

        # Verify span name
        self.assertEqual(span.name, "process_order")

        # Verify attributes
        attributes = span.attributes
        self.assertEqual(attributes["order.id"], "order-123")
        self.assertEqual(attributes["user.id"], "user-456")
        self.assertEqual(attributes["order.item_count"], 1)

        # Verify status
        self.assertEqual(span.status.status_code, StatusCode.OK)
```

Testing spans ensures they contain expected data and helps catch instrumentation bugs before they reach production.

## When to Create Custom Spans

Not every function needs a span. Create custom spans when:

- The operation represents a meaningful business action (processing payment, generating report)
- The operation is slow or might become slow (complex calculations, external API calls)
- The operation frequently fails and needs debugging (third-party integrations, database queries)
- You need to measure performance for this specific operation (SLA tracking, optimization targets)

Don't create spans for:

- Simple getters/setters
- Pure functions that just transform data
- Operations that take microseconds
- Utility functions that run thousands of times per request

Start with coarse-grained spans for major operations. Add finer-grained spans when you need more detail for debugging or optimization.

## Moving Forward

Custom spans transform OpenTelemetry from a framework monitoring tool into an application monitoring tool. They make traces tell your application's story: what business operations happened, how long they took, what data they processed, and whether they succeeded.

Start by instrumenting one critical path through your application. Add spans for the major operations. Include relevant attributes. Handle errors properly. Then expand to other code paths as needed.

Your traces will evolve from "the API received a request" to "user 123 purchased items X, Y, Z for $45.99, payment succeeded, inventory was reserved, and confirmation email was sent." That's the difference custom spans make.
