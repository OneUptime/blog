# How to Use OpenTelemetry Span Status (Unset, Ok, Error) Correctly for Accurate Error Classification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Status, Error Classification, Best Practices

Description: Understand when to use Unset, Ok, and Error span status codes in OpenTelemetry for accurate error classification in your traces.

OpenTelemetry gives you three span status codes: `UNSET`, `OK`, and `ERROR`. That sounds simple, but teams get it wrong all the time. Setting every failed validation to `ERROR` inflates your error rate. Leaving everything as `UNSET` makes your error tracking useless. This post explains when to use each status code and why getting it right matters for your dashboards and alerts.

## The Three Status Codes

Let us start with what each code means according to the OpenTelemetry specification:

- **UNSET**: The default. The span completed but the instrumentation did not explicitly set a status. This is NOT the same as "success."
- **OK**: The operation completed successfully AND the instrumentation explicitly confirmed it. This is the strongest positive signal.
- **ERROR**: The operation failed in a way that should be tracked as an error.

The key insight: `UNSET` is not a success indicator. It means "I have no opinion about whether this succeeded or failed." This distinction is important for metrics.

## Common Mistakes

### Mistake 1: Setting ERROR for Client Errors (HTTP 4xx)

```python
# WRONG - Do not treat client errors as span errors
@app.route("/api/users/<user_id>")
def get_user(user_id):
    with tracer.start_as_current_span("get-user") as span:
        user = db.find_user(user_id)
        if not user:
            # A 404 is not a server error. The server worked correctly.
            span.set_status(trace.StatusCode.ERROR, "User not found")  # WRONG
            return jsonify({"error": "Not found"}), 404
```

```python
# CORRECT - 404 is a valid response, not an error
@app.route("/api/users/<user_id>")
def get_user(user_id):
    with tracer.start_as_current_span("get-user") as span:
        user = db.find_user(user_id)
        if not user:
            # The server handled this correctly. Leave status as UNSET or OK.
            span.set_attribute("http.status_code", 404)
            span.set_status(trace.StatusCode.OK)
            return jsonify({"error": "Not found"}), 404
```

### Mistake 2: Not Setting Status on Successful Operations

```python
# INCOMPLETE - Status stays UNSET, which is ambiguous
def process_payment(order_id):
    with tracer.start_as_current_span("process-payment") as span:
        result = payment_gateway.charge(order_id)
        return result  # Span ends with UNSET status
```

```python
# BETTER - Explicitly confirm success
def process_payment(order_id):
    with tracer.start_as_current_span("process-payment") as span:
        result = payment_gateway.charge(order_id)
        span.set_status(trace.StatusCode.OK)
        return result
```

### Mistake 3: Setting ERROR for Expected Business Logic Failures

```python
# QUESTIONABLE - Is a declined payment really a system error?
def charge_card(card_id, amount):
    with tracer.start_as_current_span("charge-card") as span:
        result = gateway.charge(card_id, amount)
        if result.declined:
            # This is expected business behavior, not a system error
            span.set_status(trace.StatusCode.ERROR, "Payment declined")  # Debatable
```

```python
# BETTER - Use attributes for business outcomes, reserve ERROR for system failures
def charge_card(card_id, amount):
    with tracer.start_as_current_span("charge-card") as span:
        try:
            result = gateway.charge(card_id, amount)
            if result.declined:
                # Record the business outcome as an attribute
                span.set_attribute("payment.outcome", "declined")
                span.set_attribute("payment.decline_reason", result.reason)
                span.set_status(trace.StatusCode.OK)  # The system worked correctly
            else:
                span.set_attribute("payment.outcome", "approved")
                span.set_status(trace.StatusCode.OK)
            return result
        except GatewayTimeoutError as e:
            # THIS is a real error - the system failed
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Decision Framework

Here is a practical decision tree for choosing the right status:

```python
# status_decision.py - Helper function for consistent status setting

from opentelemetry import trace

def set_span_status(span, http_status_code=None, exception=None, business_failure=False):
    """
    Apply consistent span status logic.

    Rules:
    1. If an exception occurred due to a system failure -> ERROR
    2. If HTTP 5xx -> ERROR
    3. If HTTP 4xx -> OK (client's fault, server worked correctly)
    4. If business logic failure (e.g., validation) -> OK with attributes
    5. If operation succeeded -> OK
    6. If unsure -> leave UNSET
    """
    if exception:
        # System-level failure
        span.record_exception(exception)
        span.set_status(trace.StatusCode.ERROR, str(exception))
        return

    if http_status_code:
        span.set_attribute("http.status_code", http_status_code)

        if 500 <= http_status_code < 600:
            # Server error - this is a real error
            span.set_status(
                trace.StatusCode.ERROR,
                f"HTTP {http_status_code}"
            )
        elif 200 <= http_status_code < 500:
            # Success or client error - server worked correctly
            span.set_status(trace.StatusCode.OK)
        return

    if business_failure:
        # Business logic said "no" but the system worked
        span.set_status(trace.StatusCode.OK)
        return

    # Default: explicit success
    span.set_status(trace.StatusCode.OK)
```

## Impact on Metrics and Dashboards

Getting span status right directly affects your error rate calculations:

```promql
# This query only works correctly when ERROR means "system failure"
sum(rate(spans_total{status_code="ERROR"}[5m]))
/
sum(rate(spans_total[5m]))
```

If you set `ERROR` for 404s, your error rate includes users requesting nonexistent URLs. That is not an error your team can fix. Your SLO burn rate alerts will fire on traffic patterns rather than actual system problems.

## Special Cases

### gRPC Status Codes

For gRPC, the mapping is more nuanced:

```python
# grpc_status_mapping.py
GRPC_STATUS_TO_SPAN_STATUS = {
    0: trace.StatusCode.OK,           # OK
    1: trace.StatusCode.UNSET,        # CANCELLED - client cancelled
    3: trace.StatusCode.UNSET,        # INVALID_ARGUMENT - client's fault
    5: trace.StatusCode.UNSET,        # NOT_FOUND - not a server error
    13: trace.StatusCode.ERROR,       # INTERNAL - server error
    14: trace.StatusCode.ERROR,       # UNAVAILABLE - server error
    4: trace.StatusCode.ERROR,        # DEADLINE_EXCEEDED - could be server issue
}
```

### Database Queries

```python
# Constraint violations are not system errors
def insert_user(user_data):
    with tracer.start_as_current_span("insert-user") as span:
        try:
            db.insert("users", user_data)
            span.set_status(trace.StatusCode.OK)
        except UniqueConstraintError:
            # The database worked correctly - the data was invalid
            span.set_attribute("db.constraint_violation", True)
            span.set_status(trace.StatusCode.OK)
        except ConnectionError as e:
            # The database is actually broken
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Conclusion

Use `ERROR` only for actual system failures that your team needs to investigate. Use `OK` for operations that completed as designed, even if the business outcome was negative. Leave `UNSET` when the instrumentation does not have enough context to decide. This discipline keeps your error rates meaningful and your alerts actionable.
