# How to Use the Schema Registry in Azure Event Hubs for Avro Serialization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Event Hubs, Schema Registry, Apache Avro, Serialization, Event Streaming, Data Contracts, Azure Cloud

Description: Learn how to use Azure Event Hubs Schema Registry to manage Avro schemas and enforce data contracts between event producers and consumers.

---

When multiple teams produce and consume events through Azure Event Hubs, schema management becomes a real problem. A producer changes the event format without telling anyone, and suddenly consumers start failing. Or two producers send events to the same topic with slightly different schemas, and the consumer code has to handle both. A schema registry solves this by providing a central place to store, version, and validate event schemas, acting as a contract between producers and consumers.

Azure Event Hubs includes a built-in Schema Registry that works with Apache Avro serialization. In this post, we will set up the Schema Registry, register schemas, integrate it with producers and consumers, and handle schema evolution.

## Why Use a Schema Registry?

Without a schema registry, event schemas are typically embedded in the events themselves (like JSON with self-describing field names) or documented informally (a wiki page that nobody keeps updated). Both approaches have problems:

**Embedded schemas waste bandwidth**: If you send a JSON event with field names like `customerIdentificationNumber` millions of times per hour, those repeated field names consume significant bandwidth. Avro with a schema registry sends only the field values, with the schema stored once in the registry.

**Informal documentation drifts**: Without enforcement, schemas evolve in undocumented ways. The registry provides a source of truth.

**No compatibility checking**: A schema registry can enforce compatibility rules, preventing breaking changes from being deployed.

## Setting Up the Schema Registry

The Schema Registry is part of your Event Hubs namespace. You need a Standard tier or higher namespace.

### Create a Schema Group

Schema groups organize related schemas together. Think of them like namespaces for your schemas:

```bash
# Create a schema group with Avro serialization and forward compatibility
az eventhubs namespace schema-registry create \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --name "user-events-schemas" \
  --schema-compatibility Forward \
  --schema-type Avro
```

The compatibility mode determines what changes are allowed when updating a schema:

- **None**: Any change is allowed (no compatibility checking)
- **Forward**: New schema can read data written by old schema
- **Backward**: Old schema can read data written by new schema
- **Full**: Both forward and backward compatible

For most event streaming scenarios, **Forward** compatibility is the right choice. It means consumers using the new schema can read events produced with the old schema.

### Register a Schema

Define your Avro schema and register it with the Schema Registry:

```python
from azure.schemaregistry import SchemaRegistryClient
from azure.identity import DefaultAzureCredential

# Create a Schema Registry client
credential = DefaultAzureCredential()
schema_registry_client = SchemaRegistryClient(
    fully_qualified_namespace="my-eventhubs-namespace.servicebus.windows.net",
    credential=credential
)

# Define the Avro schema for user events
user_event_schema = """{
    "type": "record",
    "name": "UserEvent",
    "namespace": "com.example.events",
    "fields": [
        {
            "name": "userId",
            "type": "string",
            "doc": "Unique identifier for the user"
        },
        {
            "name": "action",
            "type": "string",
            "doc": "The action performed (login, logout, purchase, etc.)"
        },
        {
            "name": "timestamp",
            "type": "long",
            "doc": "Unix timestamp in milliseconds when the event occurred"
        },
        {
            "name": "metadata",
            "type": {
                "type": "map",
                "values": "string"
            },
            "doc": "Additional key-value metadata about the event",
            "default": {}
        }
    ]
}"""

# Register the schema
# If the schema already exists with the same content, it returns the existing registration
schema_properties = schema_registry_client.register_schema(
    group_name="user-events-schemas",
    name="UserEvent",
    definition=user_event_schema,
    format="Avro"
)

print(f"Schema ID: {schema_properties.id}")
print(f"Schema version: {schema_properties.version}")
```

## Producing Events with Schema Registry

Now let us integrate the schema registry into the producer workflow. The `SchemaRegistryAvroSerializer` handles serialization and schema ID embedding:

```python
from azure.eventhub import EventHubProducerClient, EventData
from azure.schemaregistry import SchemaRegistryClient
from azure.schemaregistry.serializer.avroserializer import AvroSerializer
from azure.identity import DefaultAzureCredential
import time

# Set up credentials and clients
credential = DefaultAzureCredential()

# Create the Avro serializer backed by the Schema Registry
schema_registry_client = SchemaRegistryClient(
    fully_qualified_namespace="my-eventhubs-namespace.servicebus.windows.net",
    credential=credential
)

# The serializer automatically registers or retrieves schemas from the registry
avro_serializer = AvroSerializer(
    client=schema_registry_client,
    group_name="user-events-schemas",
    auto_register=True  # Set to False in production after initial registration
)

# Create the Event Hub producer
producer = EventHubProducerClient.from_connection_string(
    conn_str="your-eventhub-connection-string",
    eventhub_name="user-events"
)

# Create an event dictionary matching the Avro schema
event_data = {
    "userId": "user-12345",
    "action": "purchase",
    "timestamp": int(time.time() * 1000),
    "metadata": {
        "product_id": "prod-789",
        "amount": "49.99",
        "currency": "USD"
    }
}

# Serialize the event using Avro and the Schema Registry
# The serializer embeds the schema ID in the payload so consumers
# can look up the schema without the producer sending it inline
serialized_event = avro_serializer.serialize(
    event_data,
    schema="UserEvent"  # Name of the registered schema
)

# Create an EventData object from the serialized bytes
event = EventData(body=serialized_event)

# Send the event
event_batch = producer.create_batch()
event_batch.add(event)
producer.send_batch(event_batch)

print("Event sent with schema-registered Avro serialization")
producer.close()
avro_serializer.close()
```

## Consuming Events with Schema Registry

On the consumer side, the serializer uses the schema ID embedded in each event to look up the correct schema from the registry:

```python
from azure.eventhub import EventHubConsumerClient
from azure.schemaregistry import SchemaRegistryClient
from azure.schemaregistry.serializer.avroserializer import AvroSerializer
from azure.identity import DefaultAzureCredential

# Set up the Avro deserializer
credential = DefaultAzureCredential()
schema_registry_client = SchemaRegistryClient(
    fully_qualified_namespace="my-eventhubs-namespace.servicebus.windows.net",
    credential=credential
)

avro_serializer = AvroSerializer(
    client=schema_registry_client,
    group_name="user-events-schemas"
)

# Create the consumer
consumer = EventHubConsumerClient.from_connection_string(
    conn_str="your-eventhub-connection-string",
    consumer_group="analytics-pipeline",
    eventhub_name="user-events"
)

def on_event(partition_context, event):
    """Deserialize and process each event using the Schema Registry."""
    # Deserialize the event body using the schema from the registry
    # The schema ID is extracted from the event payload automatically
    deserialized_data = avro_serializer.deserialize(event.body_as_bytes())

    # Now you have a Python dictionary with typed fields
    print(f"User: {deserialized_data['userId']}")
    print(f"Action: {deserialized_data['action']}")
    print(f"Time: {deserialized_data['timestamp']}")
    print(f"Metadata: {deserialized_data['metadata']}")
    print("---")

    partition_context.update_checkpoint(event)

# Start consuming
with consumer:
    consumer.receive(on_event=on_event, starting_position="-1")
```

## Schema Evolution

Over time, your event schemas will need to change. The Schema Registry's compatibility modes control what changes are safe.

### Adding an Optional Field (Forward Compatible)

Adding a new field with a default value is forward compatible - new consumers can read old events (the new field just uses the default):

```python
# Updated schema - added 'sessionId' field with a default value
updated_schema = """{
    "type": "record",
    "name": "UserEvent",
    "namespace": "com.example.events",
    "fields": [
        {"name": "userId", "type": "string"},
        {"name": "action", "type": "string"},
        {"name": "timestamp", "type": "long"},
        {"name": "metadata", "type": {"type": "map", "values": "string"}, "default": {}},
        {
            "name": "sessionId",
            "type": ["null", "string"],
            "default": null,
            "doc": "Browser session ID, added in v2"
        }
    ]
}"""

# Register the updated schema
# If compatibility mode is Forward, this succeeds because new consumers
# can read old events (sessionId defaults to null)
updated_properties = schema_registry_client.register_schema(
    group_name="user-events-schemas",
    name="UserEvent",
    definition=updated_schema,
    format="Avro"
)

print(f"Updated schema version: {updated_properties.version}")
```

### Breaking Changes

Some changes are breaking and will be rejected by the Schema Registry if compatibility mode is enabled:

- Removing a field without a default value
- Changing a field's type (e.g., string to int)
- Renaming a field

If the registry rejects a schema update, you will get an error explaining the incompatibility. This prevents producers from accidentally breaking consumers.

## Listing and Retrieving Schemas

```python
# Get a schema by its ID
schema = schema_registry_client.get_schema(schema_id="your-schema-id")
print(f"Schema name: {schema.properties.name}")
print(f"Schema version: {schema.properties.version}")
print(f"Schema definition:\n{schema.definition}")

# Get a specific version of a schema
schema_v1 = schema_registry_client.get_schema(
    group_name="user-events-schemas",
    name="UserEvent",
    version=1
)
```

## Performance Considerations

The Schema Registry adds a network call for schema lookup. To minimize the impact:

**Schema caching**: The SDK caches schema lookups by default. Once a schema is retrieved, subsequent events using the same schema ID are deserialized without an additional registry call.

**Pre-registration**: Register schemas during deployment rather than using `auto_register=True` in production. This avoids the first-event latency penalty and prevents accidental schema creation.

**Schema ID in events**: The serialized payload includes only the schema ID (a GUID), not the full schema. This keeps event sizes small - you save bandwidth compared to self-describing formats like JSON.

## Integration with Event Hubs Capture

When you combine Schema Registry with Event Hubs Capture, the captured Avro files contain the schema-registered events. To read these captured files, you need to deserialize them using the same Schema Registry:

```python
# Read captured Avro files and deserialize using the Schema Registry
import fastavro
from io import BytesIO

# Read the captured file
# The Body field contains your schema-registered serialized payload
reader = fastavro.reader(avro_file_bytes)
for record in reader:
    body_bytes = record.get("Body")
    if body_bytes:
        # Deserialize using the Schema Registry
        event = avro_serializer.deserialize(body_bytes)
        print(event)
```

## Best Practices

**Use one schema group per domain or team**: This keeps schemas organized and allows different compatibility modes per group.

**Disable auto-registration in production**: Register schemas as part of your deployment pipeline, not at runtime. This gives you control over when schema changes go live.

**Version schemas intentionally**: Treat schema changes like API versioning. Review them, test compatibility, and deploy in a coordinated way.

**Monitor schema usage**: Track which schema versions are in use across your producers and consumers. This helps you know when it is safe to deprecate old versions.

## Summary

The Azure Event Hubs Schema Registry provides centralized schema management for your event streaming pipelines. By using Avro serialization with registered schemas, you get compact event payloads, enforced data contracts through compatibility checking, and a clear audit trail of schema evolution. Integrate the schema registry into your producer and consumer code using the Azure SDK, use forward compatibility mode to safely evolve schemas over time, and treat schema management as a first-class part of your data platform operations.
