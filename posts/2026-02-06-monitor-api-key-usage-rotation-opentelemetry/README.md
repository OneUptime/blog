# How to Monitor API Key Usage and Rotation Events with OpenTelemetry Custom Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, API Keys, Metrics, Security

Description: Track API key usage patterns, detect anomalies, and monitor key rotation events using OpenTelemetry custom metrics and span attributes.

API keys are a common authentication mechanism for service-to-service and third-party integrations. But once you issue an API key, do you actually know how it gets used? Which keys are active, which are stale, which are being used from unexpected locations? And when you rotate keys, can you verify that the old key stops being used and the new one takes over?

This post shows how to build comprehensive API key monitoring using OpenTelemetry custom metrics and traces.

## Defining the Metrics

Start by defining the metrics instruments that will capture API key usage patterns:

```python
from opentelemetry import metrics, trace

meter = metrics.get_meter("api-key-monitor")
tracer = trace.get_tracer("api-key-monitor")

# Track each API key usage
key_usage_counter = meter.create_counter(
    "api.key.requests",
    description="Number of requests per API key",
    unit="requests",
)

# Track API key age when used
key_age_histogram = meter.create_histogram(
    "api.key.age_days",
    description="Age of the API key in days when it was used",
    unit="days",
)

# Track keys that are close to expiration
keys_near_expiry = meter.create_observable_gauge(
    "api.key.near_expiry_count",
    description="Number of active API keys expiring within 7 days",
    callbacks=[lambda options: count_keys_near_expiry()],
)

# Track rotation events
key_rotation_counter = meter.create_counter(
    "api.key.rotations",
    description="Number of API key rotation events",
)

# Track old key usage after rotation
stale_key_usage = meter.create_counter(
    "api.key.stale_usage",
    description="Requests using an API key that has been rotated out",
)
```

## Instrumenting the API Key Validation Middleware

Here is a Flask middleware that validates API keys and records telemetry:

```python
from flask import Flask, request, g
from functools import wraps
from datetime import datetime, timezone
import hashlib

app = Flask(__name__)

def get_key_prefix(api_key):
    """
    Return a safe identifier for the key (first 8 chars).
    Never log the full key.
    """
    return api_key[:8] if len(api_key) >= 8 else api_key

def get_key_hash(api_key):
    """Hash the key for safe storage in telemetry."""
    return hashlib.sha256(api_key.encode()).hexdigest()[:16]

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        with tracer.start_as_current_span("api_key.validation") as span:
            api_key = request.headers.get("X-API-Key")

            if not api_key:
                span.set_attribute("api_key.result", "missing")
                key_usage_counter.add(1, {"result": "missing"})
                return {"error": "API key required"}, 401

            # Look up the key in your database
            key_record = db.find_api_key(get_key_hash(api_key))

            if not key_record:
                span.set_attribute("api_key.result", "invalid")
                span.set_attribute("api_key.prefix", get_key_prefix(api_key))
                key_usage_counter.add(1, {"result": "invalid"})
                return {"error": "Invalid API key"}, 401

            # Check if this key has been rotated out
            if key_record.get("rotated_at"):
                span.set_attribute("api_key.result", "rotated")
                span.set_attribute("api_key.owner", key_record["owner"])
                span.set_attribute("api_key.rotated_at",
                                   key_record["rotated_at"].isoformat())

                stale_key_usage.add(1, {
                    "owner": key_record["owner"],
                    "key_prefix": get_key_prefix(api_key),
                })

                span.add_event("stale_key_used", {
                    "owner": key_record["owner"],
                    "rotated_at": key_record["rotated_at"].isoformat(),
                    "client_ip": request.remote_addr,
                })

                return {"error": "API key has been rotated"}, 401

            # Check expiration
            if key_record.get("expires_at"):
                now = datetime.now(timezone.utc)
                if now > key_record["expires_at"]:
                    span.set_attribute("api_key.result", "expired")
                    key_usage_counter.add(1, {
                        "result": "expired",
                        "owner": key_record["owner"],
                    })
                    return {"error": "API key expired"}, 401

            # Key is valid - record usage metrics
            key_age = (datetime.now(timezone.utc) - key_record["created_at"]).days

            span.set_attribute("api_key.result", "valid")
            span.set_attribute("api_key.owner", key_record["owner"])
            span.set_attribute("api_key.prefix", get_key_prefix(api_key))
            span.set_attribute("api_key.age_days", key_age)
            span.set_attribute("api_key.scopes",
                             ",".join(key_record.get("scopes", [])))

            key_usage_counter.add(1, {
                "result": "valid",
                "owner": key_record["owner"],
                "key_prefix": get_key_prefix(api_key),
            })

            key_age_histogram.record(key_age, {
                "owner": key_record["owner"],
            })

            g.api_key_record = key_record
            return f(*args, **kwargs)

    return decorated
```

## Instrumenting Key Rotation

When an API key is rotated, record the event with full context:

```python
def rotate_api_key(owner, old_key_prefix):
    """
    Rotate an API key: mark the old one as rotated,
    generate a new one, and record the event.
    """
    with tracer.start_as_current_span("api_key.rotate") as span:
        # Mark the old key as rotated
        old_key = db.mark_key_rotated(owner, old_key_prefix)

        # Generate a new key
        new_key = generate_api_key()
        new_key_record = db.create_api_key(
            owner=owner,
            key_hash=get_key_hash(new_key),
            scopes=old_key["scopes"],
            expires_at=calculate_expiry(),
        )

        # Record the rotation event
        span.set_attribute("api_key.rotation.owner", owner)
        span.set_attribute("api_key.rotation.old_prefix", old_key_prefix)
        span.set_attribute("api_key.rotation.new_prefix",
                         get_key_prefix(new_key))

        key_rotation_counter.add(1, {
            "owner": owner,
            "reason": "scheduled",
        })

        span.add_event("key_rotated", {
            "owner": owner,
            "old_key_age_days": str(
                (datetime.now(timezone.utc) - old_key["created_at"]).days
            ),
        })

        return new_key
```

## Monitoring Stale Keys After Rotation

One of the most valuable things to monitor is whether old keys continue to be used after rotation. Set up an alert for this:

```yaml
groups:
  - name: api-key-alerts
    rules:
      # Alert when a rotated key is still being used
      - alert: StaleApiKeyUsage
        expr: rate(api_key_stale_usage_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Rotated API key is still being used"
          description: "A client is still using an API key that was rotated. Check if the client needs to be updated."

      # Alert when a key is very old
      - alert: OldApiKeyInUse
        expr: histogram_quantile(0.95, api_key_age_days_bucket) > 90
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "API keys older than 90 days are still in active use"

      # Alert on spike in invalid key attempts
      - alert: InvalidKeySpike
        expr: rate(api_key_requests_total{result="invalid"}[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High rate of invalid API key attempts"
```

## Dashboard Panels

Build a dashboard with these panels:

- **Active keys by owner** showing which keys are in use and how frequently.
- **Key age distribution** as a histogram, highlighting keys that are overdue for rotation.
- **Stale key usage** showing any attempts to use rotated keys.
- **Invalid key attempts** showing potential brute force or leaked key scenarios.
- **Rotation timeline** showing when keys were last rotated per owner.

## Summary

API key monitoring is a blind spot for many organizations. You issue keys, but you do not track how they are used, how old they get, or whether rotation actually completes successfully. OpenTelemetry custom metrics and span attributes give you the building blocks to monitor the full key lifecycle: creation, usage patterns, rotation, and retirement. The combination of counters, histograms, and span events provides both the aggregate view (dashboards) and the detailed view (individual traces) you need to keep your API keys secure.
