# Validation Summary: How to Install and Configure Apache Kafka Connect on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Apache Kafka 3.7.0
- Kafka Connect distributed mode
- Java 17
- systemd
- Confluent JDBC Source Connector
- Confluent Elasticsearch Sink Connector
- Kafka Connect REST API
- firewalld

## Sources Consulted
- Apache Kafka downloads: https://kafka.apache.org/downloads.html
- Apache Kafka 3.7.0 archive: https://archive.apache.org/dist/kafka/3.7.0/
- Apache Kafka 3.7 Kafka Connect configuration reference: https://kafka.apache.org/37/configuration/kafka-connect-configs/
- Confluent Kafka Connect configuration reference: https://docs.confluent.io/platform/current/installation/configuration/connect/index.html
- Confluent self-managed connector installation guide: https://docs.confluent.io/platform/current/connect/install.html
- Confluent CLI installation guide for YUM/RHEL: https://docs.confluent.io/confluent-cli/current/install.html
- Confluent `confluent connect plugin install` command reference: https://docs.confluent.io/confluent-cli/current/command-reference/connect/plugin/confluent_connect_plugin_install.html
- Confluent JDBC Source Connector configuration reference: https://docs.confluent.io/kafka-connectors/jdbc/current/source-connector/source_config_options.html
- Confluent JDBC driver installation guide: https://docs.confluent.io/kafka-connectors/jdbc/current/jdbc-drivers.html
- Confluent Elasticsearch Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/elasticsearch/current/configuration_options.html
- Confluent Kafka Connect REST API reference: https://docs.confluent.io/platform/current/connect/references/restapi.html
- Confluent Maven repository for Elasticsearch connector versions: https://packages.confluent.io/maven/io/confluent/kafka-connect-elasticsearch/

## Issues Found
- The Apache Kafka 3.7.0 download command used `downloads.apache.org`, but that release has moved to the Apache archive. Updated the URL to `https://archive.apache.org/dist/kafka/3.7.0/kafka_2.13-3.7.0.tgz`.
- The connector installation commands downloaded individual connector JARs. Kafka Connect plugins need the connector plus required dependencies on the plugin path. Replaced the direct JAR downloads with Confluent CLI plugin installation commands.
- The Elasticsearch connector version `14.0.12` does not exist in Confluent's Maven repository. Updated the installation command to use an available current version, `15.0.0`.
- The Elasticsearch sink example included `type.name`, which is not present in the current Confluent Elasticsearch Sink Connector configuration reference and is obsolete for Elasticsearch 7.x and later. Removed it.
- The REST API connector configuration examples used numeric and boolean JSON values for connector config fields. Kafka Connect connector configs are string-key/string-value maps in the REST examples and connector references, so those values were changed to strings.

## Review Notes
- Kafka 3.7.0 is an older Kafka release. The article remains technically valid for the version it installs, but future maintenance should consider updating to the latest supported Kafka version.
- The article uses JSON converters for simplicity. The production recommendation to use Avro with Schema Registry is technically sound.
