# How to Set Up Pub/Sub Schema Validation with Avro or Protocol Buffers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Schema Validation, Avro, Protocol Buffers

Description: Learn how to enforce message schemas on Google Cloud Pub/Sub topics using Avro or Protocol Buffers to prevent malformed data from entering your messaging pipeline.

---

Without schema validation, Pub/Sub is a free-for-all. Any producer can publish any message to a topic, and if the payload is wrong - missing fields, wrong types, completely garbled - you will not find out until a downstream consumer crashes or writes bad data to your database. Schema validation stops this at the source by rejecting messages that do not conform to a defined structure.

Google Cloud Pub/Sub supports schema validation with Avro and Protocol Buffers (protobuf). In this guide, I will show you how to create schemas, attach them to topics, and handle the practical considerations that come up in production.

## How Schema Validation Works in Pub/Sub

The flow is straightforward:

1. You create a schema resource in Pub/Sub (Avro or protobuf definition)
2. You attach the schema to a topic with a specified encoding (JSON or binary)
3. When a message is published to that topic, Pub/Sub validates it against the schema
4. If the message does not match, the publish request is rejected with an error

Validation happens server-side, so it works regardless of which client library or language the publisher uses. Even if someone publishes with a raw REST API call, the schema is enforced.

## Creating an Avro Schema

Avro is a popular choice because it is well-supported across languages and works naturally with JSON encoding. Here is an example of creating an Avro schema for user events:

```bash
# Create an Avro schema for user events
gcloud pubsub schemas create user-event-schema \
  --type=AVRO \
  --definition='{
    "type": "record",
    "name": "UserEvent",
    "fields": [
      {"name": "user_id", "type": "string"},
      {"name": "event_type", "type": {"type": "enum", "name": "EventType", "symbols": ["SIGNUP", "LOGIN", "LOGOUT", "PURCHASE"]}},
      {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
      {"name": "metadata", "type": {"type": "map", "values": "string"}, "default": {}}
    ]
  }'
```

This schema defines four fields: a required user_id string, an event_type enum with specific allowed values, a timestamp, and an optional metadata map.

In Terraform:

```hcl
# Avro schema resource for user events
resource "google_pubsub_schema" "user_event" {
  name       = "user-event-schema"
  type       = "AVRO"
  definition = jsonencode({
    type = "record"
    name = "UserEvent"
    fields = [
      {
        name = "user_id"
        type = "string"
      },
      {
        name = "event_type"
        type = {
          type    = "enum"
          name    = "EventType"
          symbols = ["SIGNUP", "LOGIN", "LOGOUT", "PURCHASE"]
        }
      },
      {
        name = "timestamp"
        type = {
          type        = "long"
          logicalType = "timestamp-millis"
        }
      },
      {
        name    = "metadata"
        type    = { type = "map", values = "string" }
        default = {}
      }
    ]
  })
}
```

## Creating a Protocol Buffer Schema

If your organization already uses protobuf, you can use that instead. Protobuf schemas tend to be stricter and offer better tooling for code generation:

```bash
# Create a Protocol Buffer schema from a proto file
gcloud pubsub schemas create order-event-schema \
  --type=PROTOCOL_BUFFER \
  --definition='
syntax = "proto3";

message OrderEvent {
  string order_id = 1;
  string customer_id = 2;
  double total_amount = 3;
  string currency = 4;

  enum OrderStatus {
    UNKNOWN = 0;
    CREATED = 1;
    PAID = 2;
    SHIPPED = 3;
    DELIVERED = 4;
    CANCELLED = 5;
  }

  OrderStatus status = 5;
  int64 created_at_millis = 6;
}'
```

In Terraform:

```hcl
# Protocol Buffer schema for order events
resource "google_pubsub_schema" "order_event" {
  name       = "order-event-schema"
  type       = "PROTOCOL_BUFFER"
  definition = <<-EOT
    syntax = "proto3";

    message OrderEvent {
      string order_id = 1;
      string customer_id = 2;
      double total_amount = 3;
      string currency = 4;

      enum OrderStatus {
        UNKNOWN = 0;
        CREATED = 1;
        PAID = 2;
        SHIPPED = 3;
        DELIVERED = 4;
        CANCELLED = 5;
      }

      OrderStatus status = 5;
      int64 created_at_millis = 6;
    }
  EOT
}
```

## Attaching a Schema to a Topic

Once you have a schema, attach it to a topic. You also need to specify the encoding - JSON or binary:

```bash
# Create a topic with schema validation (JSON encoding)
gcloud pubsub topics create user-events \
  --schema=user-event-schema \
  --message-encoding=json
```

JSON encoding is human-readable and easier to debug. Binary encoding (Avro binary or protobuf binary) is more compact and faster to serialize. Choose JSON for development and debugging convenience, binary for production performance.

In Terraform:

```hcl
# Topic with schema validation enabled
resource "google_pubsub_topic" "user_events" {
  name = "user-events"

  schema_settings {
    schema   = google_pubsub_schema.user_event.id
    encoding = "JSON"  # or "BINARY"
  }

  message_retention_duration = "604800s"
}
```

## Publishing Messages with Schema Validation

When publishing to a schema-validated topic, messages must conform to the schema. Here is a Python example:

```python
# Publishing a valid message to a schema-validated topic
from google.cloud import pubsub_v1
import json

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path("my-project", "user-events")

# This message conforms to the Avro schema
valid_message = {
    "user_id": "usr_12345",
    "event_type": "PURCHASE",
    "timestamp": 1708100000000,
    "metadata": {
        "item": "premium-plan",
        "amount": "99.99"
    }
}

# Publish the valid message (will succeed)
future = publisher.publish(
    topic_path,
    data=json.dumps(valid_message).encode("utf-8")
)
print(f"Published message ID: {future.result()}")

# This message has an invalid event_type
invalid_message = {
    "user_id": "usr_12345",
    "event_type": "INVALID_TYPE",  # Not in the enum
    "timestamp": 1708100000000,
}

# This will raise an exception because the message fails validation
try:
    future = publisher.publish(
        topic_path,
        data=json.dumps(invalid_message).encode("utf-8")
    )
    future.result()
except Exception as e:
    print(f"Publish failed (expected): {e}")
```

## Validating Schemas Before Deployment

Before attaching a schema to a topic, validate it to catch syntax errors:

```bash
# Validate an Avro schema definition
gcloud pubsub schemas validate-schema \
  --type=AVRO \
  --definition='{
    "type": "record",
    "name": "TestEvent",
    "fields": [
      {"name": "id", "type": "string"}
    ]
  }'
```

You can also validate a message against a schema:

```bash
# Validate a message against an existing schema
gcloud pubsub schemas validate-message \
  --schema-name=user-event-schema \
  --message-encoding=json \
  --message='{
    "user_id": "usr_123",
    "event_type": "LOGIN",
    "timestamp": 1708100000000,
    "metadata": {}
  }'
```

## Schema Evolution and Revisions

Schemas change over time. You can create new revisions of a schema without breaking existing publishers:

```bash
# Create a new revision of an existing schema (add a new optional field)
gcloud pubsub schemas commit user-event-schema \
  --type=AVRO \
  --definition='{
    "type": "record",
    "name": "UserEvent",
    "fields": [
      {"name": "user_id", "type": "string"},
      {"name": "event_type", "type": {"type": "enum", "name": "EventType", "symbols": ["SIGNUP", "LOGIN", "LOGOUT", "PURCHASE", "SETTINGS_CHANGE"]}},
      {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
      {"name": "metadata", "type": {"type": "map", "values": "string"}, "default": {}},
      {"name": "session_id", "type": ["null", "string"], "default": null}
    ]
  }'
```

Adding a new optional field (with a default value) is backward-compatible. Existing publishers continue to work because the new field has a default. Removing a required field or changing a field's type is a breaking change.

When configuring a topic, you can specify which schema revisions to accept:

```hcl
# Topic that accepts messages matching any revision of the schema
resource "google_pubsub_topic" "user_events" {
  name = "user-events"

  schema_settings {
    schema   = google_pubsub_schema.user_event.id
    encoding = "JSON"
    # Accept messages that match the first or last revision
    first_revision_id = "2026-02-01T00:00:00Z"
    last_revision_id  = ""  # Empty means latest
  }
}
```

## Choosing Between Avro and Protocol Buffers

Both work well, but here are some considerations:

**Use Avro when:**
- You primarily use JSON encoding
- You need rich schema evolution support (Avro has well-defined compatibility rules)
- Your consumers include data warehouses like BigQuery (Avro maps well to BigQuery schemas)
- You want self-describing messages

**Use Protocol Buffers when:**
- You already use protobuf in your organization
- You want the smallest possible message size with binary encoding
- You need strong code generation across many languages
- You want strict typing with enums and nested messages

## Common Pitfalls

1. **Default values matter for Avro.** If you add a new field without a default, existing publishers will fail. Always add defaults to new fields.

2. **JSON encoding is case-sensitive.** Field names must match exactly. `user_id` and `User_Id` are different fields.

3. **Enum values must match exactly.** With Avro enums, the published value must be one of the defined symbols. There is no fuzzy matching.

4. **Schema validation adds latency.** For extremely latency-sensitive applications, validation adds a small overhead to publish operations. In most cases it is negligible, but measure if you are concerned.

5. **Binary encoding requires client-side serialization.** With binary encoding, you need to serialize the message using the Avro or protobuf library before publishing. With JSON encoding, you can just publish a JSON string.

## Wrapping Up

Schema validation in Pub/Sub is one of those features that costs almost nothing to set up but saves you from hours of debugging malformed data downstream. Define your schemas in Avro or protobuf, attach them to your topics, and bad messages get rejected at publish time instead of corrupting your pipeline. Use JSON encoding for readability during development and consider binary encoding for production efficiency. Most importantly, plan for schema evolution from the start by always adding optional fields with defaults.
