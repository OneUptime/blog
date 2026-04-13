# Validation Summary: How to Use MongoDB with Apache Pulsar

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (change streams, replica sets)
- Apache Pulsar (messaging, Pulsar IO connectors)
- Pulsar IO MongoDB Source Connector
- Pulsar IO MongoDB Sink Connector
- Python (pulsar-client-python library)
- Avro Schema Registry (Pulsar built-in)

## Sources Consulted
- Apache Pulsar IO MongoDB Connector documentation: https://pulsar.apache.org/docs/next/io-mongo-source/ and https://pulsar.apache.org/docs/next/io-mongo-sink/
- Apache Pulsar Admin CLI reference: https://pulsar.apache.org/docs/next/pulsar-admin-api-overview/
- Pulsar Python client schema documentation: https://pulsar.apache.org/docs/next/client-libraries-python/
- Pulsar Python client AvroSchema API: https://pulsar.apache.org/api/python/
- Apache Pulsar connector archive: https://archive.apache.org/dist/pulsar/

## Issues Found
1. **AvroSchema incorrect usage**: The Schema Registry Integration section passed a raw JSON string to `pulsar.schema.AvroSchema()`. The Pulsar Python client's `AvroSchema` constructor expects a Python class that extends `pulsar.schema.Record`, not a JSON string. Passing a string would raise an error at runtime. Fixed by replacing the JSON string approach with a proper `Record` subclass (`OrderEvent`) using `String()` and `Double()` field types, and importing from `pulsar.schema`.

## Review Notes
- The connector download URL references Pulsar 3.0.0 specifically. Users on different Pulsar versions should download the connector NAR matching their Pulsar version.
- The MongoDB Source Connector correctly requires a replica set URI (`?replicaSet=rs0`) since change streams require a replica set or sharded cluster.
- The `builtin://mongo` archive reference is correct for Pulsar distributions that ship with the MongoDB connector bundled. Users of standalone Pulsar may need to use the NAR file path instead.
- All `pulsar-admin` CLI commands use correct syntax and flags.
- The Python consumer and producer code examples use correct `pulsar-client-python` API calls.
