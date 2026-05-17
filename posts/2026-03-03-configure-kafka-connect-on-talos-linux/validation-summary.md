# Validation Summary: How to Configure Kafka Connect on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka Connect (distributed mode)
- Confluent Platform (`confluentinc/cp-kafka-connect:7.6.0`) and Confluent Hub
- Debezium PostgreSQL source connector (2.5.0)
- Confluent Elasticsearch sink connector (14.0.0)
- Confluent JDBC connector (10.7.0)
- Confluent S3 sink connector (10.5.0)
- Strimzi Kafka operator (`KafkaConnect` and `KafkaConnector` CRDs, `v1beta2`)
- Kubernetes (Deployment, Service, ConfigMap, Namespace)
- Talos Linux (target host OS)

## Sources Consulted
- Apache Kafka Connect documentation — https://kafka.apache.org/documentation/#connect
- Kafka Connect REST API reference — https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Platform 7.6.0 release notes / image registry — https://hub.docker.com/r/confluentinc/cp-kafka-connect
- Confluent Hub component pages (kafka-connect-elasticsearch 14.0.0, kafka-connect-jdbc 10.7.0, kafka-connect-s3 10.5.0)
- Debezium PostgreSQL connector docs (2.5) — https://debezium.io/documentation/reference/2.5/connectors/postgresql.html
- Debezium Maven artifact layout (`debezium-connector-postgres-<version>.Final-plugin.tar.gz`)
- Strimzi `KafkaConnect`/`KafkaConnector` CRD reference — https://strimzi.io/docs/operators/latest/configuring.html
- Strimzi build artifact types (jar, tgz, zip, maven, other, image)
- Kubernetes `apps/v1` Deployment and `v1` ConfigMap / Service / Namespace API references

## Issues Found
No technical issues found.

Verified specifically:
- `confluent-hub install --no-prompt <component>` is the correct CLI syntax in the cp-kafka-connect image.
- Debezium PostgreSQL connector class is `io.debezium.connector.postgresql.PostgresConnector` (Java package uses `postgresql`, but the Maven artifact ID is `debezium-connector-postgres` — both spellings in the post are correct in their respective contexts).
- Debezium 2.x configuration keys used (`topic.prefix`, `schema.include.list`, `plugin.name=pgoutput`, `slot.name`, `publication.name`) match the 2.5 docs (note: `topic.prefix` is the 2.x replacement for the older `database.server.name`).
- Elasticsearch sink class `io.confluent.connect.elasticsearch.ElasticsearchSinkConnector` and its config keys (`connection.url`, `topics`, `type.name`, `key.ignore`, `schema.ignore`, `behavior.on.null.values`) are correct.
- Kafka Connect distributed config keys (`bootstrap.servers`, `group.id`, `key.converter`, `value.converter`, `config.storage.topic`, `offset.storage.topic`, `status.storage.topic`, replication-factor/partition settings, `rest.port`, `rest.advertised.host.name`, `plugin.path`) are all valid Apache Kafka Connect properties.
- `CONNECT_*` environment variables in the Deployment correctly map to the underlying properties via the cp-kafka-connect image's standard env-to-properties translation.
- REST API endpoints used in Step 6 (`GET /connectors`, `GET /connectors/{name}/status`, `PUT /connectors/{name}/pause`, `PUT /connectors/{name}/resume`, `POST /connectors/{name}/tasks/{taskId}/restart`, `DELETE /connectors/{name}`, `GET /connector-plugins`) all match the Apache Kafka Connect REST API spec.
- Strimzi `KafkaConnect` v1beta2 with `build` (artifact types `tgz` and `zip`), `tls.trustedCertificates`, and the `strimzi.io/use-connector-resources: "true"` annotation are valid.
- Kafka 3.7.0 is a valid Strimzi-supported Kafka version.
- Bootstrap port 9093 with TLS in the Strimzi example is the standard Strimzi TLS listener.

## Review Notes
- The Strimzi project has introduced `kafka.strimzi.io/v1` as the new API version, with a migration path away from `v1beta2`. `v1beta2` is still served by current Strimzi releases, so the examples remain functional, but readers on the latest operator versions may want to update to `v1` long-term.
- The ConfigMap created in Step 2 is not actually mounted by the Deployment in Step 3 — the Deployment relies entirely on `CONNECT_*` environment variables, which the cp-kafka-connect entrypoint translates into properties. The ConfigMap is effectively informational/reference in this guide. This is an architectural inconsistency rather than a technical error.
- `rest.advertised.host.name=${HOSTNAME}` in the ConfigMap relies on shell-style interpolation, which a Kubernetes ConfigMap does not perform on its own. Since the Deployment doesn't mount the ConfigMap, this only matters if a reader switches to mounting the properties file. In that case they would need an init container or entrypoint script to perform substitution. Worth flagging in a future revision.
- The readiness/liveness probes hit `/connectors`, which returns `200 OK` with an empty array when no connectors are configured — this works but `/` (root) is the more common health-check endpoint and returns Kafka Connect version info.
- Connector versions referenced (Debezium 2.5.0, Confluent Elasticsearch 14.0.0, JDBC 10.7.0, S3 10.5.0, cp-kafka-connect 7.6.0) were current at time of writing; readers building production pipelines should check for newer patch releases.
