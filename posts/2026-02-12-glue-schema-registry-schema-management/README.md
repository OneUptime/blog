# How to Use Glue Schema Registry for Schema Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Glue, Schema Registry, Data Engineering, Streaming

Description: Learn how to use AWS Glue Schema Registry to manage, validate, and evolve schemas for your streaming and batch data pipelines.

---

If you've ever dealt with a breaking schema change in production, you know the pain. One team adds a field, another team renames one, and suddenly your entire data pipeline grinds to a halt. AWS Glue Schema Registry exists to prevent exactly this kind of chaos.

In this post, we'll walk through what Glue Schema Registry does, how to set it up, and how to integrate it with your Kafka or Kinesis-based pipelines so that schema evolution doesn't catch you off guard.

## What Is Glue Schema Registry?

Glue Schema Registry is a centralized repository for managing and enforcing schemas. It supports both Apache Avro and JSON Schema formats. The registry lets you version your schemas, enforce compatibility rules, and automatically serialize/deserialize records in your producers and consumers.

Think of it as a contract between data producers and consumers. When a producer writes data, the registry validates that the data matches the expected schema. When a consumer reads data, it can fetch the correct schema version to deserialize the payload.

Here's what it gives you out of the box:

- Centralized schema storage and versioning
- Compatibility enforcement (backward, forward, full, none)
- Integration with Kafka, Kinesis, and Glue ETL
- Auto-registration of new schemas
- Schema compression for reduced payload sizes

## Setting Up a Schema Registry

Before you can register schemas, you need to create a registry. You can do this through the AWS Console, CLI, or SDK. Let's use the CLI.

This command creates a new registry called "my-data-registry" with a description.

```bash
aws glue create-registry \
  --registry-name my-data-registry \
  --description "Central registry for all streaming schemas"
```

Now let's create a schema within that registry. We'll use an Avro schema for a user event.

This registers a new Avro schema for user events with backward compatibility enforced.

```bash
aws glue create-schema \
  --registry-id RegistryName=my-data-registry \
  --schema-name user-events \
  --data-format AVRO \
  --compatibility BACKWARD \
  --schema-definition '{
    "type": "record",
    "name": "UserEvent",
    "namespace": "com.example.events",
    "fields": [
      {"name": "userId", "type": "string"},
      {"name": "eventType", "type": "string"},
      {"name": "timestamp", "type": "long"}
    ]
  }'
```

## Understanding Compatibility Modes

Choosing the right compatibility mode matters a lot. Here's the breakdown:

- **BACKWARD** - New schema can read data written with the old schema. You can add fields with defaults or remove optional fields.
- **FORWARD** - Old schema can read data written with the new schema. You can remove fields with defaults or add optional fields.
- **FULL** - Both backward and forward compatible. The safest option but also the most restrictive.
- **NONE** - No compatibility checks. Use this only if you really know what you're doing.

For most streaming pipelines, BACKWARD compatibility is the sweet spot. It lets consumers upgrade at their own pace while producers can start writing new fields immediately.

## Evolving Your Schema

Say your team wants to add an "email" field to the user event. With backward compatibility, you just need to provide a default value.

This registers a new version of the schema with an added email field that has a default value.

```bash
aws glue register-schema-version \
  --schema-id SchemaName=user-events,RegistryName=my-data-registry \
  --schema-definition '{
    "type": "record",
    "name": "UserEvent",
    "namespace": "com.example.events",
    "fields": [
      {"name": "userId", "type": "string"},
      {"name": "eventType", "type": "string"},
      {"name": "timestamp", "type": "long"},
      {"name": "email", "type": ["null", "string"], "default": null}
    ]
  }'
```

The registry will validate this against the compatibility rules before accepting it. If you tried to add a required field without a default, it would reject the change - saving you from a production incident.

## Integrating with Kafka Producers

The real power comes from integrating the schema registry with your data pipelines. Here's how you'd set up a Kafka producer in Java that uses Glue Schema Registry for serialization.

This Java snippet configures a Kafka producer to use the Glue Schema Registry serializer with auto-registration enabled.

```java
import software.amazon.awssdk.services.glue.model.Compatibility;
import com.amazonaws.services.schemaregistry.serializers.GlueSchemaRegistryKafkaSerializer;
import com.amazonaws.services.schemaregistry.utils.AWSSchemaRegistryConstants;
import org.apache.kafka.clients.producer.ProducerConfig;

Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker1:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, GlueSchemaRegistryKafkaSerializer.class.getName());

// Schema Registry configuration
props.put(AWSSchemaRegistryConstants.AWS_REGION, "us-east-1");
props.put(AWSSchemaRegistryConstants.REGISTRY_NAME, "my-data-registry");
props.put(AWSSchemaRegistryConstants.SCHEMA_NAME, "user-events");
props.put(AWSSchemaRegistryConstants.DATA_FORMAT, "AVRO");
props.put(AWSSchemaRegistryConstants.SCHEMA_AUTO_REGISTRATION_SETTING, "true");
props.put(AWSSchemaRegistryConstants.COMPATIBILITY_SETTING, Compatibility.BACKWARD.toString());

KafkaProducer<String, UserEvent> producer = new KafkaProducer<>(props);
```

## Integrating with Kafka Consumers

On the consumer side, you'll use the Glue Schema Registry deserializer.

This configures a Kafka consumer to automatically fetch and apply the correct schema version when deserializing messages.

```java
import com.amazonaws.services.schemaregistry.deserializers.GlueSchemaRegistryKafkaDeserializer;

Properties consumerProps = new Properties();
consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker1:9092");
consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "my-consumer-group");
consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, GlueSchemaRegistryKafkaDeserializer.class.getName());
consumerProps.put(AWSSchemaRegistryConstants.AWS_REGION, "us-east-1");
consumerProps.put(AWSSchemaRegistryConstants.AVRO_RECORD_TYPE, "GENERIC_RECORD");

KafkaConsumer<String, GenericRecord> consumer = new KafkaConsumer<>(consumerProps);
```

The deserializer automatically fetches the correct schema version based on the schema version ID embedded in each record. No manual schema management required.

## Using with Kinesis Data Streams

If you're using Kinesis instead of Kafka, the integration works similarly. You'll use the `GlueSchemaRegistrySerializer` and `GlueSchemaRegistryDeserializer` classes directly.

This Python example shows how to serialize a record using the Glue Schema Registry before putting it into Kinesis.

```python
import boto3
from aws_schema_registry import SchemaRegistryClient, DataAndSchema
from aws_schema_registry.avro import AvroSchema

# Initialize the schema registry client
glue_client = boto3.client('glue', region_name='us-east-1')
registry_client = SchemaRegistryClient(
    glue_client,
    registry_name='my-data-registry'
)

# Define your schema
schema = AvroSchema({
    "type": "record",
    "name": "UserEvent",
    "fields": [
        {"name": "userId", "type": "string"},
        {"name": "eventType", "type": "string"},
        {"name": "timestamp", "type": "long"}
    ]
})

# Serialize a record
data = {"userId": "user-123", "eventType": "login", "timestamp": 1707753600}
encoded = registry_client.encode("user-events", DataAndSchema(data, schema))

# Put it into Kinesis
kinesis = boto3.client('kinesis', region_name='us-east-1')
kinesis.put_record(
    StreamName='user-events-stream',
    Data=encoded,
    PartitionKey=data['userId']
)
```

## Schema Discovery and Governance

Beyond just validation, the registry gives you visibility into your data landscape. You can list all schemas, check their versions, and see which compatibility mode each one uses.

This retrieves the latest version of a schema and its metadata.

```bash
# List all schemas in a registry
aws glue list-schemas --registry-id RegistryName=my-data-registry

# Get schema details including all versions
aws glue get-schema --schema-id SchemaName=user-events,RegistryName=my-data-registry

# Get a specific schema version
aws glue get-schema-version \
  --schema-id SchemaName=user-events,RegistryName=my-data-registry \
  --schema-version-number LatestVersion=true
```

## Monitoring Schema Registry

You should monitor schema registration failures and compatibility check rejections. These are signs that teams are trying to make breaking changes. Set up CloudWatch alarms on the `SchemaVersionFailure` metric, and pipe notifications into your monitoring stack. If you're running OneUptime for observability, you can create alerts that trigger when schema validation failures spike - check out how to [set up custom monitoring](https://oneuptime.com/blog/post/2026-02-12-configure-amazon-kinesis-data-streams/view) for your streaming pipeline.

## Best Practices

After running schema registries in production for a while, here's what I'd recommend:

1. **Start with BACKWARD compatibility.** It gives you the most flexibility while still preventing breaking changes.
2. **Always provide defaults for new fields.** This is the key to smooth schema evolution.
3. **Use separate registries for different environments.** Don't share a registry between dev and prod.
4. **Enable auto-registration in dev, disable it in prod.** You don't want accidental schema changes in production.
5. **Version your schemas in source control too.** The registry is great for runtime enforcement, but you should also track schema changes in git.

Schema management isn't glamorous work, but getting it right saves you from countless late-night debugging sessions. Glue Schema Registry makes it straightforward - set it up once, enforce your rules, and let your teams evolve their data contracts safely.
