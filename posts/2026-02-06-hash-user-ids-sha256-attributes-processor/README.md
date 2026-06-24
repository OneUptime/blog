# How to Configure the Attributes Processor to Hash Sensitive User IDs with

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Attributes Processor, Hashing, SHA-256, Privacy

Description: Configure the OpenTelemetry Collector attributes processor to hash sensitive user IDs with SHA-256 so you can correlate without exposing PII.

Hashing user IDs before they leave your infrastructure gives you the best of both worlds: you can still correlate traces and logs for a specific user across services, but you never expose the actual user identity to your observability backend. SHA-1 hashing is deterministic, meaning the same user ID always produces the same hash, preserving your ability to group and filter data.

## Why Hash Instead of Redact

If you redact a user ID entirely (replacing it with "REDACTED"), you lose the ability to search for all traces belonging to a specific user. Hashing preserves that correlation:

```text
# Original

user.id: "john.doe@company.com"

# After hashing
user.id: "3d7ee2b6070db641abc879e7ec1c7eae26a20b48"
```

Two different requests from john.doe@company.com will produce the same hash, so you can still find all their traces. But the hash does not directly expose the original email.

## Using the Attributes Processor Hash Action

The attributes processor supports a `hash` action that applies SHA-1 to the attribute value:

```yaml
processors:
  attributes/hash-user:
    actions:
      # Hash the user.id attribute using SHA-1
      - key: user.id
        action: hash
      # Hash other sensitive identifiers
      - key: enduser.id
        action: hash
      - key: user.email
        action: hash
```

That is all it takes. The `hash` action automatically uses SHA-1 and replaces the original value with the hex-encoded hash.

## Complete Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  attributes/hash-pii:
    actions:
      # Hash user identification attributes
      - key: user.id
        action: hash
      - key: enduser.id
        action: hash
      - key: user.email
        action: hash
      - key: customer.id
        action: hash
      # Hash network identifiers
      - key: client.address
        action: hash
      - key: net.peer.ip
        action: hash

  batch:
    timeout: 5s
    send_batch_size: 512

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/hash-pii, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [attributes/hash-pii, batch]
      exporters: [otlp]
```

## Applying Hash to Specific Signal Types

You might want to hash user IDs in traces but keep them intact in logs (for example, if your log storage is more tightly controlled). Create separate pipeline configurations:

```yaml
processors:
  # Hashing for traces - aggressive
  attributes/hash-traces:
    actions:
      - key: user.id
        action: hash
      - key: enduser.id
        action: hash
      - key: user.email
        action: hash
      - key: client.address
        action: hash

  # Hashing for logs - only user identifiers
  attributes/hash-logs:
    actions:
      - key: user.id
        action: hash
      - key: enduser.id
        action: hash

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/hash-traces, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [attributes/hash-logs, batch]
      exporters: [otlp]
```

## Combining Hash with Other Actions

You can chain multiple attribute actions in sequence. A common pattern is to copy the original value to a new key, hash it, and then delete the original:

```yaml
processors:
  attributes/hash-with-prefix:
    actions:
      # First, copy the user.id to a new key
      - key: user.id.hashed
        from_attribute: user.id
        action: upsert
      # Hash the new key
      - key: user.id.hashed
        action: hash
      # Delete the original
      - key: user.id
        action: delete
```

This gives you a clearly named `user.id.hashed` attribute and removes the original. Your dashboards and queries can reference the hashed key explicitly.

## Building a Lookup Table

If you need to reverse-lookup a hash during incident response, maintain a mapping table outside the observability pipeline:

```python
import hashlib

def hash_user_id(user_id: str) -> str:
    """
    Produce the same SHA-1 hash that the OTel Collector
    attributes processor generates.
    """
    return hashlib.sha1(user_id.encode('utf-8')).hexdigest()

# Build a lookup from your user database
user_ids = ["john.doe@company.com", "jane.smith@company.com"]
lookup = {hash_user_id(uid): uid for uid in user_ids}

# During incident response, look up the original
hashed = "3d7ee2b6070db641abc879e7ec1c7eae26a20b48"
original = lookup.get(hashed, "unknown")
print(f"Hash {hashed[:16]}... belongs to {original}")
```

Store this lookup in a secure, access-controlled system. The whole point of hashing is to limit who can see the original values.

## Using Transform Processor for Conditional Hashing

If you only want to hash user IDs for certain services or environments, or if you require SHA-256 instead of the attributes processor's SHA-1 hash action, use the transform processor with OTTL conditions:

```yaml
processors:
  transform/conditional-hash:
    trace_statements:
      - context: span
        statements:
          # Only hash user IDs for production services
          - set(attributes["user.id"], SHA256(attributes["user.id"])) where resource.attributes["deployment.environment"] == "production" and attributes["user.id"] != nil
```

Note that the OTTL `SHA256` function does not produce the same output as the attributes processor hash action. Use OTTL `SHA1` when you need consistency with the attributes processor, or `SHA256` when you specifically need SHA-256.

## Verifying the Hash Output

Test your configuration by sending a known value and checking the output:

```bash
# Expected SHA-1 of "test-user-123"
printf '%s' "test-user-123" | sha1sum
# Should output: e43ff8d002f2ba99a5057f5643d968cca0226065
```

Compare this with the value you see in your backend after the Collector processes a span with `user.id: "test-user-123"`.

Hashing at the Collector level provides a consistent privacy layer across all your services without requiring any application code changes. Every service that sets a `user.id` attribute gets automatic hashing before the data reaches your backend.
