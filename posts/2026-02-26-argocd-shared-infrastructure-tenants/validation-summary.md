# Validation Summary: How to Share Common Infrastructure Across Tenants in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProjects, Applications, hooks, and notifications
- Kubernetes namespaces, Secrets, Jobs, and NetworkPolicies
- Bitnami PostgreSQL HA Helm chart
- Bitnami Kafka Helm chart
- External Secrets Operator
- Strimzi KafkaUser ACLs
- kube-prometheus-stack and Prometheus Operator ServiceMonitor configuration
- Grafana dashboard discovery and access-control considerations

## Sources Consulted
- Argo CD Project specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Notifications triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Bitnami PostgreSQL HA chart values/templates: https://github.com/bitnami/charts/tree/main/bitnami/postgresql-ha
- Bitnami Kafka chart values: https://github.com/bitnami/charts/tree/main/bitnami/kafka
- External Secrets Operator ExternalSecret API: https://external-secrets.io/v0.10.5/api/externalsecret/
- Strimzi KafkaUser and ACL API reference: https://strimzi.io/docs/operators/in-development/full/configuring.html
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The tenant AppProject later asks tenants to create `ServiceMonitor` resources, but the namespace resource whitelist did not allow the `monitoring.coreos.com` API group. Added `ServiceMonitor` to the tenant whitelist.
- The tenant database Job created each database before creating the owner role. PostgreSQL requires the owner role to exist first, so the commands were reordered.
- The database creation Job read tenant passwords from `/secrets/<tenant>/password` without mounting a Secret at that path. Added a Secret volume, mount, and item paths matching the example reads.
- The Bitnami Kafka chart version used in the post expects Kafka node count under `controller.replicaCount`, not a top-level `replicaCount`. Updated the values snippet.
- The Kafka ACL example used a Strimzi `KafkaUser` after deploying Kafka with the Bitnami chart. Clarified that the ACL snippet applies when Kafka users are managed with Strimzi.
- The post claimed `enforcedNamespaceLabel` ensures tenants can only see their own metrics in Grafana. Prometheus Operator uses it to add an origin namespace label to user-created metrics and alerts; it is not Grafana query authorization. Reworded the claim and noted that Grafana organizations, datasource permissions, or a query proxy are needed for query access enforcement.
- The NetworkPolicy selected PostgreSQL pods with `app.kubernetes.io/name: postgresql`, which does not match the Bitnami PostgreSQL HA pod component label. Updated it to `app.kubernetes.io/component: postgresql`.
- The Argo CD Notifications trigger accessed `app.status.operationState.phase` directly. Official examples recommend nil-safe access because `operationState` may be absent. Updated it to `app.status?.operationState.phase`.

## Review Notes
All YAML snippets parse successfully after the fixes. Some examples remain illustrative and would still need production-specific hardening, such as stronger secret handling, idempotent PostgreSQL role/password rotation, Kafka ACL implementation details for the chosen Kafka operator or chart, and explicit Grafana tenant access controls.
