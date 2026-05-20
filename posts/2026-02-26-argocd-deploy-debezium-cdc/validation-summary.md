# Validation Summary: How to Deploy Debezium CDC Platform with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Strimzi Kafka Operator
- Kafka Connect
- Debezium PostgreSQL, MySQL, and MongoDB connectors
- Prometheus Operator monitoring resources

## Sources Consulted
- Strimzi Deploying and Managing documentation: https://strimzi.io/docs/operators/latest/full/deploying.html
- Strimzi Kafka Connect metrics example: https://raw.githubusercontent.com/strimzi/strimzi-kafka-operator/main/examples/metrics/kafka-connect-metrics.yaml
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html
- Debezium installation documentation: https://debezium.io/documentation/reference/stable/install.html
- Apache Kafka configuration providers documentation: https://kafka.apache.org/42/configuration/configuration-providers/
- Apache Kafka DirectoryConfigProvider API documentation: https://kafka.apache.org/39/javadoc/org/apache/kafka/common/config/provider/DirectoryConfigProvider.html
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Maven Central Debezium connector artifacts: https://repo1.maven.org/maven2/io/debezium/
- Maven Central Apicurio converter artifacts: https://repo1.maven.org/maven2/io/apicurio/apicurio-registry-distro-connect-converter/

## Issues Found
- The Strimzi examples used `kafka.strimzi.io/v1beta2` and configured Connect internal topic names through `.spec.config`. Updated the examples to `kafka.strimzi.io/v1` and moved `groupId`, `offsetStorageTopic`, `configStorageTopic`, and `statusStorageTopic` to top-level `KafkaConnect.spec` fields, as required by the current Strimzi v1 API.
- The Strimzi build example used `type: maven`, `group`, `artifact`, and `version` fields that are not shown in the current Strimzi build documentation. Replaced them with verified `tgz` plugin archive URLs for Debezium 3.5.1.Final and Apicurio Registry converter 3.2.4.
- The credential examples used `${file:/opt/kafka/external-configuration/...}` without enabling a config provider and referenced the removed `externalConfiguration` pattern. Updated the Kafka Connect configuration to enable Kafka's `DirectoryConfigProvider`, mount the Secret through `template`, and reference secret keys with `${directory:/mnt/db-credentials:<key>}`.
- The PostgreSQL heartbeat query used `ON CONFLICT (id)` without inserting an `id` value. Updated the query to insert a fixed heartbeat row ID.
- The anti-affinity selector used the KafkaConnect resource name as the `strimzi.io/name` value. Updated it to the generated Kafka Connect pod label value, `debezium-connect-connect`.
- The monitoring example used a `ServiceMonitor`, while current Strimzi monitoring examples use `PodMonitor` resources to scrape Strimzi component pods. Updated the resource kind and endpoint field names accordingly.
- The Kafka Connect task health metric name was listed as `kafka_connect_task_status`. Updated it to `kafka_connect_connector_task_status`, matching the Strimzi Kafka Connect metrics rules.

## Review Notes
- YAML snippets were syntax-checked with PyYAML after editing.
- The plugin archive URLs were checked with HTTP HEAD requests and returned `200`.
- For production, add SHA-512 checksums to Strimzi build artifacts after selecting exact plugin archives.
