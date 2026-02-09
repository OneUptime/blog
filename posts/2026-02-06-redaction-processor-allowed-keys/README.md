# How to Use the Redaction Processor allowed_keys List to Whitelist Safe Attributes and Block Everything Else

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Redaction Processor, Attribute Whitelist, Security, Collector

Description: Configure the OpenTelemetry Collector redaction processor with an allowed_keys whitelist to block all unexpected attributes by default.

The default-deny approach to attribute management is one of the strongest security postures you can take with telemetry data. Instead of trying to identify and block every possible PII field (which is a losing game), you define a list of attributes you know are safe and block everything else.

The redaction processor's `allowed_keys` feature makes this straightforward.

## The Problem with Blocklists

When you use blocklists, you are always playing catch-up. A developer adds a new attribute called `customer_ssn` and your blocklist does not have it. The data reaches your backend before anyone notices. With an allowlist, that new attribute gets blocked automatically because it is not on the approved list.

## Basic Allowed Keys Configuration

```yaml
processors:
  redaction/allowlist:
    # Only these attribute keys are allowed through
    allowed_keys:
      # Standard HTTP semantic conventions
      - "http.method"
      - "http.status_code"
      - "http.route"
      - "http.request.method"
      - "http.response.status_code"
      - "url.path"
      - "url.scheme"
      # Standard RPC attributes
      - "rpc.method"
      - "rpc.service"
      - "rpc.system"
      # Database attributes (safe ones)
      - "db.system"
      - "db.name"
      - "db.operation"
      # Span metadata
      - "otel.status_code"
      - "otel.status_description"
      # Custom business attributes (pre-approved)
      - "order.id"
      - "payment.status"
      - "request.type"
    # Do NOT set allow_all_keys: true
    # The default (false) blocks any key not in the list
```

When `allow_all_keys` is not set (or set to false), any attribute key not in the `allowed_keys` list gets removed from the span.

## Using Regex Patterns in Allowed Keys

You can use regex patterns to allow groups of related attributes:

```yaml
processors:
  redaction/allowlist-regex:
    allowed_keys:
      # Allow all standard HTTP attributes
      - "http\\..*"
      # Allow all URL attributes
      - "url\\..*"
      # Allow all RPC attributes
      - "rpc\\..*"
      # Allow all database attributes except db.statement
      - "db\\.(?!statement).*"
      # Allow Kubernetes metadata
      - "k8s\\..*"
      # Allow OpenTelemetry status attributes
      - "otel\\..*"
      # Allow specific custom prefixes
      - "app\\..*"
      - "business\\..*"
```

The regex pattern `db\\.(?!statement).*` uses a negative lookahead to allow all `db.*` attributes except `db.statement`, which might contain sensitive data in SQL queries.

## Complete Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  redaction/strict-allowlist:
    # Allowed attribute keys (regex supported)
    allowed_keys:
      # OpenTelemetry semantic conventions (safe subset)
      - "http\\..*"
      - "url\\..*"
      - "rpc\\..*"
      - "db\\.system"
      - "db\\.name"
      - "db\\.operation"
      - "net\\.peer\\.name"
      - "net\\.peer\\.port"
      - "otel\\..*"
      # Service and resource attributes
      - "service\\..*"
      - "deployment\\..*"
      - "telemetry\\..*"
      # Kubernetes metadata
      - "k8s\\..*"
      - "container\\..*"
      # Error/exception info (type and message, not stack trace)
      - "exception\\.type"
      - "exception\\.message"
      # Custom approved business attributes
      - "order\\.id"
      - "transaction\\.id"
      - "feature\\.flag"
      - "experiment\\.variant"
    # Also scan allowed values for PII patterns
    blocked_values:
      - "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b"
      - "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [redaction/strict-allowlist, batch]
      exporters: [otlp]
```

## Monitoring Blocked Attributes

You want to know what is being blocked so you can update the allowlist when legitimate attributes are added. The redaction processor logs blocked keys at the debug level:

```yaml
service:
  telemetry:
    logs:
      level: debug
    metrics:
      level: detailed
      address: "0.0.0.0:8888"
```

In production, running at debug log level is too noisy. Instead, use a staging environment with debug logging to discover which attributes your services send, then build your allowlist from that inventory.

## Building Your Allowlist Incrementally

Here is a practical workflow for building an allowlist:

1. Start with `allow_all_keys: true` and the debug exporter in staging
2. Collect a representative sample of all attribute keys your services emit
3. Categorize each key as safe, sensitive, or unknown
4. Build your allowlist from the safe keys
5. Deploy with the allowlist and monitor for blocked attributes
6. Add legitimate keys to the allowlist as teams request them

```python
# Script to extract unique attribute keys from debug output
import re
import sys

keys = set()
for line in sys.stdin:
    # Match attribute keys in debug output
    matches = re.findall(r'"([a-zA-Z0-9_.]+)":', line)
    keys.update(matches)

for key in sorted(keys):
    print(f'      - "{key}"')
```

## Combining Allowlist with Team Namespaces

A good convention is to require teams to prefix their custom attributes. This makes the allowlist manageable:

```yaml
processors:
  redaction/team-namespaces:
    allowed_keys:
      # Standard OTel attributes
      - "http\\..*"
      - "rpc\\..*"
      - "db\\.(?!statement).*"
      # Team-prefixed custom attributes
      - "checkout\\..*"      # Checkout team
      - "payments\\..*"      # Payments team
      - "inventory\\..*"     # Inventory team
      - "notifications\\..*" # Notifications team
```

Each team owns their prefix, and the platform team maintains the allowlist. Adding a new team means adding one regex line.

The allowlist approach requires more upfront work than a blocklist, but it provides much stronger guarantees about what data leaves your infrastructure. For organizations subject to GDPR, HIPAA, or PCI DSS, this default-deny posture significantly reduces the risk of accidental PII exposure through telemetry.
