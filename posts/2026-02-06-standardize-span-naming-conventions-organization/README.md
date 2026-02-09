# How to Standardize Span Naming Conventions Across an Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Naming, Conventions, Standardization, Distributed Tracing, Best Practices

Description: Learn how to define and enforce consistent span naming conventions across all teams and services in your organization for better trace analysis.

---

Span names are the primary way you identify operations in a trace. When you search for slow requests, filter error spans, or build dashboards, span names are how you specify what you are looking for. Inconsistent span names make this painful. If your Java service names HTTP spans "GET /api/users" while your Python service uses "http_request" and your Node.js service uses "fetchUsers", you cannot write a single query that finds all HTTP operations across services.

Standardizing span names across an organization requires a combination of published guidelines, automated enforcement, and collector-level normalization for cases where the guidelines are not followed. This post provides a complete approach to achieving consistent span naming.

## Why Span Names Matter

Consider a trace search for all database operations. With standardized names, you can search for spans matching `SELECT *` or `INSERT *` and get results from every service. With inconsistent names, you need to know that the Java service uses "SELECT users", the Python service uses "db.query", and the Go service uses "postgresql.query". Every team invents their own convention, and your trace search becomes a guessing game.

Good span names are:
- Low cardinality (no user IDs, request IDs, or other high-cardinality values)
- Descriptive of the operation type
- Consistent across languages and frameworks
- Following the OpenTelemetry semantic conventions where applicable

## The Naming Standard

Base your naming standard on OpenTelemetry semantic conventions and extend them for your organization:

```yaml
# span-naming-standard.yaml
# Organization-wide span naming conventions.
# All teams must follow these patterns.

# HTTP server spans (incoming requests)
http_server:
  pattern: "{method} {route}"
  examples:
    - "GET /api/users"
    - "POST /api/orders"
    - "PUT /api/users/:id"
  rules:
    - Use the route template, not the actual URL with parameters
    - Use uppercase HTTP methods
    - Do not include query parameters

# HTTP client spans (outgoing requests)
http_client:
  pattern: "HTTP {method}"
  examples:
    - "HTTP GET"
    - "HTTP POST"
  rules:
    - Do not include the target URL in the span name
    - Store the full URL in the http.url attribute instead

# Database spans
database:
  pattern: "{operation} {table}"
  examples:
    - "SELECT users"
    - "INSERT orders"
    - "UPDATE inventory"
  rules:
    - Use uppercase SQL operation names
    - Use the table name, not the full query
    - For complex queries with joins, use the primary table

# Message queue spans
messaging:
  pattern: "{destination} {operation}"
  examples:
    - "orders.queue send"
    - "notifications.topic publish"
    - "user-events.queue receive"
  rules:
    - Use the queue or topic name
    - Use lowercase operation (send, receive, publish, consume)

# RPC spans
rpc:
  pattern: "{service}/{method}"
  examples:
    - "UserService/GetUser"
    - "OrderService/CreateOrder"
  rules:
    - Use the service name and method name from the RPC definition
    - Match the casing of the protobuf or IDL definition

# Custom business logic spans
custom:
  pattern: "{component}.{operation}"
  examples:
    - "PaymentProcessor.chargeCard"
    - "RecommendationEngine.computeScore"
    - "InventoryManager.reserveStock"
  rules:
    - Use PascalCase for the component name
    - Use camelCase for the operation name
    - Keep names concise but descriptive
```

## Enforcing Conventions in Code

### Span Name Validator Library

Create a shared library that validates span names at creation time:

```python
# shared/span_validator.py
# Library that validates span names against the organization standard.
# Import and use this in your service code or as a SpanProcessor.
import re
from opentelemetry.sdk.trace import SpanProcessor

# Patterns that span names must match
VALID_PATTERNS = [
    # HTTP server: "GET /api/users"
    re.compile(r'^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) /'),
    # HTTP client: "HTTP GET"
    re.compile(r'^HTTP (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$'),
    # Database: "SELECT users"
    re.compile(r'^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER) \w+'),
    # Messaging: "orders.queue send"
    re.compile(r'^[\w.-]+ (send|receive|publish|consume|process)$'),
    # RPC: "UserService/GetUser"
    re.compile(r'^\w+/\w+$'),
    # Custom: "Component.operation"
    re.compile(r'^[A-Z]\w+\.\w+$'),
]

class SpanNameValidator(SpanProcessor):
    """SpanProcessor that warns when span names do not match conventions."""

    def on_start(self, span, parent_context=None):
        name = span.name
        if not any(pattern.match(name) for pattern in VALID_PATTERNS):
            # Log a warning but do not reject the span
            import logging
            logging.getLogger("otel.naming").warning(
                f"Span name '{name}' does not match any known convention. "
                f"See https://wiki.company.com/otel/span-naming for guidelines."
            )

    def on_end(self, span):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

Register this processor alongside your regular span processor:

```python
# Register the validator as a span processor.
# It runs on every span and warns about non-conforming names.
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from shared.span_validator import SpanNameValidator

provider = TracerProvider()
provider.add_span_processor(SpanNameValidator())
provider.add_span_processor(BatchSpanProcessor(exporter))
```

### Linting in CI

Add a linting step that scans code for hardcoded span names:

```javascript
// scripts/lint-span-names.js
// CI script that finds span name strings in source code
// and validates them against the naming convention.
const fs = require('fs');
const path = require('path');

// Regex to find span name definitions in code
const SPAN_NAME_PATTERNS = [
  // Python: tracer.start_span("name")
  /start_span\(["']([^"']+)["']\)/g,
  // Java: tracer.spanBuilder("name")
  /spanBuilder\(["']([^"']+)["']\)/g,
  // Go: tracer.Start(ctx, "name")
  /\.Start\(ctx,\s*["']([^"']+)["']\)/g,
  // JS: tracer.startSpan("name")
  /startSpan\(["']([^"']+)["']\)/g,
];

const VALID_NAME = /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) \//
  || /^HTTP (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/
  || /^(SELECT|INSERT|UPDATE|DELETE) \w+/
  || /^[\w.-]+ (send|receive|publish|consume)$/
  || /^\w+\/\w+$/
  || /^[A-Z]\w+\.\w+$/;

function isValidSpanName(name) {
  const patterns = [
    /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) \//,
    /^HTTP (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/,
    /^(SELECT|INSERT|UPDATE|DELETE) \w+/,
    /^[\w.-]+ (send|receive|publish|consume)$/,
    /^\w+\/\w+$/,
    /^[A-Z]\w+\.\w+$/,
  ];
  return patterns.some(p => p.test(name));
}

// Scan source files and report violations
let errors = 0;
// ... scanning logic ...

process.exit(errors > 0 ? 1 : 0);
```

## Collector-Level Normalization

Even with guidelines and linting, some non-conforming span names will slip through. Use the collector's transform processor to normalize them:

```yaml
# Collector processor that normalizes common span naming issues.
# This acts as a safety net for spans that bypass code-level validation.
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Normalize "get /api/users" to "GET /api/users"
          - replace_pattern(name, "^(get|post|put|delete|patch) ", "$$1 ")

          # Remove query parameters from HTTP span names
          - replace_pattern(name, "\\?.*$", "")

          # Replace URL path parameters with placeholders
          # /api/users/12345 -> /api/users/:id
          - replace_pattern(name, "/\\d+", "/:id")

          # Replace UUIDs in span names with placeholders
          - replace_pattern(name, "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/:uuid")
```

## Measuring Compliance

Track span naming compliance as a metric:

```yaml
# Collector configuration to count conforming and non-conforming spans.
# This feeds a compliance dashboard.
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Tag spans as conforming or non-conforming
          - set(attributes["span.naming.conforming"], true)
            where name matches "^(GET|POST|PUT|DELETE|PATCH) /"
          - set(attributes["span.naming.conforming"], true)
            where name matches "^HTTP (GET|POST|PUT|DELETE|PATCH)$"
          - set(attributes["span.naming.conforming"], true)
            where name matches "^(SELECT|INSERT|UPDATE|DELETE) \\w+"
          - set(attributes["span.naming.conforming"], true)
            where name matches "^[A-Z]\\w+\\.\\w+$"
```

Build a dashboard that shows compliance percentage per team and per service. Set a target (for example, 95% compliance) and track progress over time.

## Common Anti-Patterns

Here are span naming patterns to specifically avoid:

```
Bad:  "processRequest"          (too generic)
Good: "POST /api/orders"         (specific HTTP operation)

Bad:  "GET /api/users/12345"     (includes user ID, high cardinality)
Good: "GET /api/users/:id"       (parameterized route)

Bad:  "database query"           (no operation or table info)
Good: "SELECT orders"            (specific operation and table)

Bad:  "handle_message_abc123"    (includes message ID)
Good: "orders.queue receive"     (queue name and operation)

Bad:  "doStuff"                  (meaningless)
Good: "PaymentProcessor.chargeCard" (component and operation)
```

## Conclusion

Standardizing span names is one of the highest-leverage activities for improving your organization's observability. It makes traces searchable, dashboards reusable, and alerts portable across services. The approach is straightforward: publish a naming standard based on OpenTelemetry semantic conventions, enforce it with code validators and CI linting, normalize at the collector level as a safety net, and measure compliance as a metric. The effort is modest compared to the ongoing pain of inconsistent naming.
