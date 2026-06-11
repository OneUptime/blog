# Validation Summary: How to Implement Event Versioning Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Event-driven architecture
- Event sourcing and event stores
- Schema evolution and compatibility
- Zod
- Apache Kafka
- KafkaJS
- Confluent Schema Registry
- Apache Avro

## Sources Consulted
- TypeScript Handbook: Type Compatibility - https://www.typescriptlang.org/docs/handbook/type-compatibility.html
- Zod documentation - https://zod.dev/api
- KafkaJS Confluent Schema Registry documentation - https://kafkajs.github.io/confluent-schema-registry/docs/usage/
- KafkaJS Confluent Schema Registry package types, version 4.1.0 - https://www.npmjs.com/package/@kafkajs/confluent-schema-registry
- KafkaJS package types, version 2.2.4 - https://www.npmjs.com/package/kafkajs
- Confluent Schema Registry API Reference - https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Evolution and Compatibility documentation - https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html

## Issues Found
- The version-aware consumer stored handlers as `EventHandler<unknown>` while assigning handlers that require `OrderPlacedV1` or `OrderPlacedV2`. Under strict TypeScript function parameter checking, those assignments are invalid. I changed the registry to store handlers for the full `VersionedEvent<unknown>` and added explicit version-specific adapter functions.
- The Zod example attempted to support `order_id` by making the `orderId` property itself a union with an object containing `order_id`. That does not parse a payload shaped as `{ order_id: "123" }`. I changed the example to preprocess the raw object into canonical `orderId` and `customerId` fields before validation.
- The Avro `OrderPlacedV3` schema omitted `customerEmail`, even though `OrderPlacedV3` was defined earlier with `customerEmail`. I added the nullable `customerEmail` field with a default to keep the schema consistent with the TypeScript event shape and Avro compatibility rules.
- The `SchemaVersionManager` example interpolated a `SchemaRegistry` client object into REST API URLs, which would produce an invalid URL. I added a separate `registryHost` constructor parameter and used it for the compatibility REST calls.
- The compatibility check endpoint can return detailed failure messages only when requested with `verbose=true`. I added that query parameter because the example reads `result.messages`.
- The KafkaJS Schema Registry `getLatestSchemaId(subject)` method returns a `Promise<number>`, not an object with an `id` property. I updated the producer initialization to assign the returned number directly.
- The `OrderPlacedV5` best-practices example omitted `customerEmail` despite advising not to remove required fields and after defining V3 with that field. I added `customerEmail: string | null`.

## Review Notes
Focused TypeScript checks were run against TypeScript 5.7, Zod 4.4.3, KafkaJS 2.2.4, and `@kafkajs/confluent-schema-registry` 4.1.0 for the corrected snippets. The article remains a conceptual guide; production implementations should add runtime validation before casting versioned event payloads to version-specific TypeScript interfaces.
