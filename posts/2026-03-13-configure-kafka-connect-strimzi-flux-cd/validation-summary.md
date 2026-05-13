# Validation Summary: How to Configure Kafka Connect with Strimzi via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka Connect
- Strimzi Kafka Operator
- KafkaConnect and KafkaConnector custom resources
- Flux CD Kustomizations
- Debezium PostgreSQL connector
- Confluent Elasticsearch Sink Connector
- Kubernetes Secrets and ConfigProviders

## Sources Consulted
- Strimzi 0.42.0 KafkaConnect and KafkaConnector API reference: https://strimzi.io/docs/operators/0.42.0/configuring.html
- Strimzi deploying and managing KafkaConnector resources: https://strimzi.io/docs/operators/0.42.0/deploying.html
- Strimzi external configuration and mounted volume path documentation: https://strimzi.io/docs/operators/0.34.0/configuring
- Apache Kafka configuration providers documentation: https://kafka.apache.org/42/configuration/configuration-providers/
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Confluent Elasticsearch Sink Connector documentation: https://docs.confluent.io/kafka-connectors/elasticsearch/current/overview.html
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post said Strimzi loads Kafka Connect plugins through an init container. Strimzi documents custom images and its `spec.build` mechanism for connector plugins, so I changed the wording to those supported approaches.
- The Dockerfile downloaded only the Elasticsearch connector JAR. Confluent documents installing the connector plugin package, and the single JAR would miss connector dependencies. I changed the example to install the Confluent Hub plugin package with the Confluent Hub client.
- The Debezium connector referenced `${file:/opt/kafka/external-configuration/db-credentials/password}` without configuring a Kafka Connect config provider or mounting that secret. I added the `DirectoryConfigProvider`, mounted the `db-credentials` secret, and changed the placeholder to the documented directory-provider syntax.
- The Debezium PostgreSQL example included `database.server.name`, which is not part of current Debezium PostgreSQL connector configuration; `topic.prefix` is the documented topic namespace property. I removed `database.server.name`.
- The Debezium transform chain declared `route` as a `ReplaceField$Value` transform without any fields to replace and while describing only timestamp enrichment. I removed the no-op transform and kept the `InsertField$Value` timestamp SMT.
- The Elasticsearch sink example used `index.name`, which is not a documented Confluent Elasticsearch Sink Connector property. I removed it and added the documented behavior: topic names are used as index names unless external resource mapping is configured.
- The KafkaConnect comment said `externalConfiguration` exposed the REST API, but that block only mounts external configuration. I corrected the comment.

## Review Notes
- The post is version-pinned to Strimzi 0.42.0 and Kafka 3.7.1. Those examples match the Strimzi 0.42 API, but newer Strimzi releases use `kafka.strimzi.io/v1` examples and deprecate some older external configuration patterns.
- The Elasticsearch sink connector versions should be aligned with the Kafka Connect runtime in real deployments; current Confluent connector documentation has newer Kafka/Connect prerequisites than the version pinned in this post.
