# How to Use the Redaction Processor allowed_keys List to Whitelist Safe

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
      - "http.route"
      - "http.request.method"
      - "http.response.status_code"
      - "url.path"
      - "url.scheme"
      - "server.address"
      - "server.port"
      # Standard RPC attributes
      - "rpc.method"
      - "rpc.service"
      - "rpc.system"
      # Database attributes (safe ones)
      - "db.system.name"
      - "db.namespace"
      - "db.operation.name"
      # Custom business attributes (pre-approved)
      - "order.id"
      - "payment.status"
      - "request.type"
    # Do NOT set allow_all_keys: true
    # The default (false) blocks any key not in the list
```

When `allow_all_keys` is not set (or set to false), any attribute key not in the `allowed_keys` list gets removed from the span.

## Using Explicit Keys in Allowed Keys

The `allowed_keys` list matches exact attribute keys. If you want a strict allowlist, list the specific keys you have approved:

```yaml
processors:
  redaction/allowlist-http-db:
    allowed_keys:
      # HTTP attributes
      - "http.request.method"
      - "http.response.status_code"
      - "http.route"
      - "url.path"
      - "url.scheme"
      - "server.address"
      - "server.port"
      # RPC attributes
      - "rpc.method"
      - "rpc.service"
      - "rpc.system"
      # Database attributes, excluding query text
      - "db.system.name"
      - "db.namespace"
      - "db.operation.name"
      # Kubernetes metadata
      - "k8s.namespace.name"
      - "k8s.pod.name"
      - "k8s.container.name"
      # Specific custom attributes
      - "app.version"
      - "business.unit"
```

Do not use regex patterns such as `http\\..*` in `allowed_keys`; they will be treated as literal key names. If you need regex-based key handling, the redaction processor provides `ignored_key_patterns`, but ignored keys pass through without their values being checked or modified.

## Complete Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  redaction/strict-allowlist:
    # Allowed attribute keys (exact key names)
    allow_all_keys: false
    allowed_keys:
      # OpenTelemetry semantic conventions (safe subset)
      - "http.request.method"
      - "http.response.status_code"
      - "http.route"
      - "url.path"
      - "url.scheme"
      - "server.address"
      - "server.port"
      - "rpc.method"
      - "rpc.service"
      - "rpc.system"
      - "db.system.name"
      - "db.namespace"
      - "db.operation.name"
      # Service and resource attributes
      - "service.name"
      - "service.namespace"
      - "service.version"
      - "service.instance.id"
      - "deployment.environment.name"
      - "telemetry.sdk.language"
      - "telemetry.sdk.name"
      - "telemetry.sdk.version"
      # Kubernetes metadata
      - "k8s.namespace.name"
      - "k8s.pod.name"
      - "k8s.container.name"
      - "container.name"
      - "container.id"
      # Error/exception info (type and message, not stack trace)
      - "error.type"
      - "exception.type"
      - "exception.message"
      # Custom approved business attributes
      - "order.id"
      - "transaction.id"
      - "feature.flag"
      - "experiment.variant"
    # Also scan allowed values for PII patterns
    blocked_values:
      - "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b"
      - "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"
    summary: debug

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

You want to know what is being blocked so you can update the allowlist when legitimate attributes are added. Set the redaction processor `summary` option to `debug` in staging so it appends diagnostic attributes such as `redaction.redacted.keys` and `redaction.redacted.count`:

```yaml
processors:
  redaction/strict-allowlist:
    allow_all_keys: false
    allowed_keys:
      - "http.request.method"
      - "http.response.status_code"
    summary: debug
```

In production, `summary: debug` can expose blocked attribute names in telemetry. Use `summary: info` if you only want counts, or `summary: silent` if you do not want the processor to add diagnostic attributes. Use a staging environment with the debug exporter to discover which attributes your services send, then build your allowlist from that inventory.

## Building Your Allowlist Incrementally

Here is a practical workflow for building an allowlist:

1. Start with `allow_all_keys: true`, `blocked_values`, and the debug exporter in staging
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
      - "http.request.method"
      - "http.response.status_code"
      - "http.route"
      - "rpc.method"
      - "rpc.service"
      - "rpc.system"
      - "db.system.name"
      - "db.namespace"
      - "db.operation.name"
    ignored_key_patterns:
      # Team-prefixed custom attributes
      - "^checkout\\..*"      # Checkout team
      - "^payments\\..*"      # Payments team
      - "^inventory\\..*"     # Inventory team
      - "^notifications\\..*" # Notifications team
```

Each team owns their prefix, and the platform team maintains the allowlist. Adding a new team means adding one regex line to `ignored_key_patterns`, but only do this for prefixes you trust because ignored keys are not checked against `blocked_values`.

The allowlist approach requires more upfront work than a blocklist, but it provides much stronger guarantees about what data leaves your infrastructure. For organizations subject to GDPR, HIPAA, or PCI DSS, this default-deny posture significantly reduces the risk of accidental PII exposure through telemetry.
