# Validation Summary: How to Set Up Kafka Connect Workers with IPv4 REST Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Kafka Connect REST API
- IPv4 network binding
- Java properties configuration
- `curl`
- `ss`

## Sources Consulted
- Apache Kafka 4.2 Kafka Connect User Guide: https://kafka.apache.org/42/kafka-connect/user-guide/
- Apache Kafka 4.2 Kafka Connect worker configuration reference: https://kafka.apache.org/42/configuration/kafka-connect-configs/
- Apache Kafka upgrade notes documenting removed Connect worker configs: https://kafka.apache.org/34/getting-started/upgrade/
- Oracle JavaDoc Guide note on properties-file comment syntax: https://docs.oracle.com/en/java/javase/25/javadoc/javadoc-guide.pdf

## Issues Found
- The post used `rest.host.name` and `rest.port` to bind the REST API. These worker properties were removed from Kafka Connect; the post was updated to use `listeners=http://10.0.0.20:8083`, which is the current supported configuration.
- The post said Kafka Connect listens on `localhost:8083` by default. Current Kafka Connect documentation describes the default as listening on port `8083` over HTTP, configured via `listeners`, so the wording was corrected.
- The post implied `rest.advertised.host.name` should always be set to the same IP. Current documentation says `rest.advertised.host.name`, `rest.advertised.port`, and `rest.advertised.listener` are needed only when the address other workers must use differs from the bind address, so the explanation and examples were corrected.
- The `group.id` line used an inline `#` comment inside a `.properties` assignment. In Java properties files, comments are line comments, so the inline text would be parsed as part of the property value. The comment was moved to its own line.
- The `FileStreamSource` REST example omitted that the `connect-file` plugin is not on the default classpath/plugin path in current Kafka releases. A note was added so the example matches current Apache Kafka guidance.
- The storage-topic note was softened from a requirement to a recommendation, which matches Apache Kafka documentation that recommends creating the topics ahead of time but also notes they may be auto-created.
- The multi-worker routing explanation was tightened to match the official behavior: requests can be sent to any worker, and follower workers may forward some requests to the leader.

## Review Notes
- The post is now technically accurate for current Kafka Connect worker configuration and REST behavior.
- For production deployments, storage topics should still be created with the correct partition counts, replication, and compaction settings even though this post is focused on REST endpoint binding.
- Kafka Connect can terminate TLS directly via HTTPS listeners; a reverse proxy is optional rather than required.
