# How to Correlate Customer Support Tickets with Specific OpenTelemetry Traces Using User ID Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Customer Support, Trace Correlation, User Experience

Description: Correlate customer support tickets with specific OpenTelemetry traces using user ID attributes to diagnose individual user issues in minutes.

A customer submits a support ticket: "I tried to place an order at 2:15 PM and it just showed an error." Without telemetry correlation, your support team escalates to engineering, an engineer spends 30 minutes trying to reproduce the issue locally, and the customer waits hours for a response. With user ID attributes on your traces, you can find the exact trace for that failed request in under a minute.

## Setting Up User ID Attributes

The foundation is adding user identity information to your spans. Do this at the request entry point so that all child spans inherit the context:

```typescript
// Express middleware that adds user context to the current span
import { trace } from '@opentelemetry/api';

function userContextMiddleware(req, res, next) {
  const span = trace.getActiveSpan();
  if (span && req.user) {
    // Set user identification attributes
    // Use your internal user ID, not PII like email
    span.setAttribute('user.id', req.user.id);
    span.setAttribute('user.account_id', req.user.accountId);

    // Optional: add the user's plan tier for filtering
    span.setAttribute('user.tier', req.user.tier);

    // Optional: add session ID for correlating multiple requests
    span.setAttribute('session.id', req.sessionId);
  }
  next();
}

// Register the middleware early in the chain
app.use(userContextMiddleware);
```

For Python with Flask:

```python
from opentelemetry import trace
from flask import g, request

@app.before_request
def add_user_context():
    """Add user identity to the active span for every request."""
    span = trace.get_current_span()
    if hasattr(g, 'current_user') and g.current_user:
        span.set_attribute("user.id", g.current_user.id)
        span.set_attribute("user.account_id", g.current_user.account_id)
        span.set_attribute("user.tier", g.current_user.tier)

    # Also add the request ID if your infrastructure generates one
    request_id = request.headers.get("X-Request-ID")
    if request_id:
        span.set_attribute("request.id", request_id)
```

## Propagating User Context Downstream

When your service calls another service, the trace context propagates automatically. But the user attributes only live on the span where you set them. For downstream services to also have user context, you have two options:

**Option 1: Pass user ID in headers and set it in each service**

```python
# In the calling service, add user ID to outgoing headers
import requests
from opentelemetry.propagate import inject

def call_downstream(url, user_id):
    headers = {"X-User-ID": user_id}
    inject(headers)  # Adds trace context headers
    return requests.get(url, headers=headers)

# In the downstream service, read the header and set the attribute
@app.before_request
def extract_user_context():
    span = trace.get_current_span()
    user_id = request.headers.get("X-User-ID")
    if user_id:
        span.set_attribute("user.id", user_id)
```

**Option 2: Use Baggage to propagate user context automatically**

```python
from opentelemetry import baggage, context
from opentelemetry.propagate import inject

# At the entry point, set user ID as baggage
ctx = baggage.set_baggage("user.id", user.id)
context.attach(ctx)

# Baggage propagates automatically with trace context
# Downstream services can read it:
user_id = baggage.get_baggage("user.id")
```

## Building the Support Workflow

### Step 1: Support Agent Collects Information

Train your support team to collect these data points from the customer:

- User ID (usually available from the support tool's customer profile)
- Approximate time of the issue
- What action they were trying to perform
- Any error messages they saw

Create a template in your support tool:

```markdown
## Trace Lookup Information
- User ID: [from customer profile]
- Time of issue: [customer reported time, convert to UTC]
- Action: [checkout, login, search, etc.]
- Error message: [if any]
```

### Step 2: Query for the User's Traces

With the user ID and approximate time, query your trace backend:

```
# Tempo/Grafana TraceQL
{
  span.user.id = "usr_k8x9m2"
  && resource.service.name = "frontend"
  && status = error
} | select(name, status)

# Time range: 14:00 to 14:30 UTC (giving a window around 14:15)
```

```bash
# Jaeger API query
curl "http://jaeger:16686/api/traces?\
service=frontend&\
tags=user.id%3Dusr_k8x9m2&\
start=$(date -d '2026-02-06T14:00:00Z' +%s)000000&\
end=$(date -d '2026-02-06T14:30:00Z' +%s)000000&\
limit=20" | jq '.data[] | {traceID, spans: [.spans[] | {operation: .operationName, duration: .duration, tags: [.tags[] | select(.key == "http.response.status_code" or .key == "error")]}]}'
```

### Step 3: Analyze the Trace

Open the trace in your UI. Look for:

- Error spans with exception events (these contain the stack trace)
- The specific HTTP status code returned to the user
- Which downstream service caused the failure

```python
# Example of what you might find in the trace:
#
# Trace: def456 (2026-02-06 14:17:23 UTC)
# [ERROR] HTTP POST /api/v1/orders           -> 500 Internal Server Error
#   [OK]  order.validate                      -> success
#   [OK]  inventory.check_stock               -> success
#   [ERROR] payment.process_charge            -> failed
#     [ERROR] HTTP POST payment-svc/charge    -> 502 Bad Gateway
#       Exception: ConnectionRefusedError - payment gateway timeout
#
# Root cause: payment gateway was unreachable at 14:17 UTC
# This matches a known incident (INC-4521) resolved at 14:25 UTC
```

### Step 4: Respond to the Customer

With the trace data, you can give the customer a specific, honest answer:

```markdown
Hi [Customer],

We identified the issue with your order attempt at 2:15 PM. Our payment
processing system experienced a brief connectivity issue between 2:12 PM
and 2:25 PM that prevented some transactions from completing. This has
been resolved.

You should be able to place your order now. If you encounter any further
issues, please let us know and reference ticket #12345.
```

## Building a Self-Service Lookup Tool

For frequent lookups, build a simple internal tool that support agents can use directly:

```python
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)
TEMPO_URL = "http://tempo.internal:3200"

@app.route("/lookup")
def lookup_user_traces():
    """Look up traces for a specific user in a time window."""
    user_id = request.args.get("user_id")
    start_time = request.args.get("start")  # ISO format
    end_time = request.args.get("end")      # ISO format

    if not user_id or not start_time:
        return jsonify({"error": "user_id and start are required"}), 400

    # Query Tempo for traces matching this user
    query = f'{{ span.user.id = "{user_id}" }}'
    response = requests.get(f"{TEMPO_URL}/api/search", params={
        "q": query,
        "start": start_time,
        "end": end_time,
        "limit": 50,
    })

    traces = response.json().get("traces", [])

    # Return a simplified view for support agents
    results = []
    for t in traces:
        results.append({
            "trace_id": t["traceID"],
            "timestamp": t["startTimeUnixNano"],
            "duration_ms": t["durationMs"],
            "has_error": any(s.get("status") == "error" for s in t.get("spans", [])),
            "jaeger_url": f"http://jaeger.internal:16686/trace/{t['traceID']}",
        })

    return jsonify({"user_id": user_id, "traces": results})
```

## Privacy Considerations

Be thoughtful about what user data you put in traces:

- Use internal user IDs, not email addresses or names
- Do not store passwords, tokens, or payment card numbers in span attributes
- Consider using hashed identifiers if your compliance requirements demand it
- Document your data retention policies and ensure trace retention aligns with them

User ID correlation turns support tickets from guessing games into forensic investigations. The time from "customer reported an issue" to "we know exactly what happened" drops from hours to minutes. Set up the attributes, build the query workflow, and your support and engineering teams will both be more effective.
