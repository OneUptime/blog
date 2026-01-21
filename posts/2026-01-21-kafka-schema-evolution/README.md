# How to Handle Schema Evolution in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Schema Evolution, Schema Registry, Compatibility, Avro, Protobuf

Description: A comprehensive guide to handling schema evolution in Apache Kafka, covering backward, forward, and full compatibility modes with practical migration strategies.

---

Schema evolution is the process of modifying message schemas over time while maintaining compatibility between producers and consumers. This guide covers how to evolve schemas safely in Kafka.

## Understanding Compatibility Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| BACKWARD | New schema can read old data | Consumer upgrades first |
| FORWARD | Old schema can read new data | Producer upgrades first |
| FULL | Both backward and forward | Any upgrade order |
| NONE | No compatibility checking | Development only |

## Backward Compatible Changes

```json
// Original schema (v1)
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "name", "type": "string"}
  ]
}

// Evolved schema (v2) - BACKWARD compatible
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": "string", "default": ""}
  ]
}
```

## Forward Compatible Changes

```json
// Remove optional field for FORWARD compatibility
// v1 - has optional field
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "name", "type": "string"},
    {"name": "nickname", "type": ["null", "string"], "default": null}
  ]
}

// v2 - removed optional field (forward compatible)
{
  "type": "record",
  "name": "User",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "name", "type": "string"}
  ]
}
```

## Java Schema Evolution Handler

```java
import io.confluent.kafka.schemaregistry.client.CachedSchemaRegistryClient;
import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient;
import io.confluent.kafka.schemaregistry.avro.AvroSchema;

public class SchemaEvolutionManager {

    private final SchemaRegistryClient schemaRegistry;

    public SchemaEvolutionManager(String registryUrl) {
        this.schemaRegistry = new CachedSchemaRegistryClient(registryUrl, 100);
    }

    public boolean isCompatible(String subject, String newSchemaStr) throws Exception {
        AvroSchema newSchema = new AvroSchema(newSchemaStr);
        return schemaRegistry.testCompatibility(subject, newSchema);
    }

    public void setCompatibilityLevel(String subject, String level) throws Exception {
        schemaRegistry.updateCompatibility(subject, level);
        System.out.println("Set " + subject + " compatibility to " + level);
    }

    public int registerSchema(String subject, String schemaStr) throws Exception {
        AvroSchema schema = new AvroSchema(schemaStr);
        int id = schemaRegistry.register(subject, schema);
        System.out.println("Registered schema with id: " + id);
        return id;
    }

    public static void main(String[] args) throws Exception {
        SchemaEvolutionManager manager = new SchemaEvolutionManager("http://localhost:8081");

        // Set compatibility mode
        manager.setCompatibilityLevel("users-value", "BACKWARD");

        // Test new schema compatibility
        String newSchema = """
            {"type":"record","name":"User","fields":[
                {"name":"id","type":"string"},
                {"name":"name","type":"string"},
                {"name":"email","type":"string","default":""}
            ]}
            """;

        if (manager.isCompatible("users-value", newSchema)) {
            manager.registerSchema("users-value", newSchema);
        } else {
            System.out.println("Schema is not compatible!");
        }
    }
}
```

## Python Schema Evolution

```python
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSchema

class SchemaEvolutionManager:
    def __init__(self, registry_url: str):
        self.client = SchemaRegistryClient({'url': registry_url})

    def check_compatibility(self, subject: str, schema_str: str) -> bool:
        schema = AvroSchema(schema_str)
        return self.client.test_compatibility(subject, schema)

    def set_compatibility(self, subject: str, level: str):
        self.client.set_compatibility(subject, level)
        print(f"Set {subject} compatibility to {level}")

    def evolve_schema(self, subject: str, new_schema_str: str) -> int:
        if self.check_compatibility(subject, new_schema_str):
            schema = AvroSchema(new_schema_str)
            schema_id = self.client.register_schema(subject, schema)
            print(f"Registered new schema version with id: {schema_id}")
            return schema_id
        else:
            raise ValueError("New schema is not compatible")

def main():
    manager = SchemaEvolutionManager("http://localhost:8081")
    manager.set_compatibility("users-value", "BACKWARD")

    new_schema = '''
    {"type":"record","name":"User","fields":[
        {"name":"id","type":"string"},
        {"name":"name","type":"string"},
        {"name":"email","type":"string","default":""}
    ]}
    '''

    try:
        manager.evolve_schema("users-value", new_schema)
    except ValueError as e:
        print(f"Evolution failed: {e}")

if __name__ == '__main__':
    main()
```

## Safe Evolution Rules

### Adding Fields
- Always provide default values for BACKWARD compatibility

### Removing Fields
- Only remove fields that have defaults for FORWARD compatibility

### Renaming Fields
- Use aliases instead of direct renames

```json
{
  "name": "fullName",
  "type": "string",
  "aliases": ["name"]
}
```

## Best Practices

1. **Start with BACKWARD**: Most common and safest mode
2. **Always use defaults**: For new optional fields
3. **Never change field types**: Create new fields instead
4. **Test compatibility**: Before deploying schema changes
5. **Version your schemas**: Track changes over time

## Conclusion

Schema evolution is essential for long-lived Kafka applications. By understanding compatibility modes and following safe evolution patterns, you can modify schemas without breaking existing producers and consumers.
