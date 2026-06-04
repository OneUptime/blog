# Validation Summary: How to Configure Pulsar Geo-Replication for Multi-Region Message Delivery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar geo-replication
- Pulsar Admin CLI
- Pulsar Python client
- Kubernetes
- Helm
- PrometheusRule / Prometheus metrics

## Sources Consulted
- Apache Pulsar 4.0.x geo-replication documentation: https://pulsar.apache.org/docs/4.0.x/administration-geo/
- Apache Pulsar cluster administration documentation: https://pulsar.apache.org/docs/4.0.x/admin-api-clusters/
- Apache Pulsar metrics reference: https://pulsar.apache.org/docs/4.0.x/reference-metrics/
- Apache Pulsar Python client API documentation: https://pulsar.apache.org/api/python/3.6.x/pulsar.Client.html
- Apache Pulsar Python Producer API documentation: https://pulsar.apache.org/api/python/3.7.x/pulsar.Producer.html
- Apache Pulsar Helm chart values: https://github.com/apache/pulsar-helm-chart/blob/master/charts/pulsar/values.yaml
- Apache Pulsar broker configuration defaults: https://github.com/apache/pulsar/blob/master/conf/broker.conf

## Issues Found
- The post described geo-replication as globally consistent and claimed built-in conflict resolution. Pulsar geo-replication is asynchronous and provides eventual cross-region consistency; it does not solve application-level concurrent write conflicts. Updated the description, overview, local-read wording, and conflict-handling section.
- The Helm values snippet used `persistence.enabled`, which does not match the current Apache Pulsar Helm chart. Updated it to `volumes.persistence: true`.
- The Helm values snippet included `replicationEnabled: true`, which is not a current Pulsar broker configuration key. Replaced it with `systemTopicEnabled` and `topicLevelPoliciesEnabled`, which are relevant for topic-level replication policies.
- The `pulsar-admin clusters create` examples had `--url` and `--broker-url` reversed. Updated `--url` to use the HTTP admin URL and `--broker-url` to use the Pulsar binary protocol URL.
- The namespace setup only created tenant and namespace policy in one cluster. Added a note that independent configuration stores require matching tenant and namespace policies on every participating cluster.
- The topic-level replication command used a less canonical argument order. Updated it to the official `topics set-replication-clusters --clusters ... <topic>` form.
- The Prometheus alert used `pulsar_replication_delay_seconds`, but the official metric is `pulsar_replication_delay_in_seconds`. Updated the metric name.
- The Python failover example used an unsupported `service_urls` keyword argument for `pulsar.Client`. Replaced it with application-level failover using repeated `pulsar.Client(region, connection_timeout_ms=...)` attempts.
- The disaster recovery backup command used `namespaces get-replication-clusters`, but the Pulsar Admin CLI command is `namespaces get-clusters`. Updated the command.

## Review Notes
The tutorial assumes externally reachable broker/admin endpoints from Kubernetes services. In a production deployment, the exact service names, service types, advertised listeners, TLS, authentication, and proxy configuration should be adjusted for the selected Pulsar Helm chart values and cloud provider.
