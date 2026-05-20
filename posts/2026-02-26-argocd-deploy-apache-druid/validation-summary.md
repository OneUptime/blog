# Validation Summary: How to Deploy Apache Druid with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Druid
- Argo CD
- Kubernetes
- Kustomize-style repository layout
- PostgreSQL metadata storage
- Amazon S3 deep storage and indexing log storage
- Apache Kafka supervisor ingestion

## Sources Consulted
- Apache Druid Kubernetes documentation: https://druid.apache.org/docs/latest/operations/kubernetes
- Apache Druid Docker documentation: https://druid.apache.org/docs/latest/tutorials/docker/
- Apache Druid clustered deployment documentation: https://druid.apache.org/docs/latest/tutorials/cluster/
- Apache Druid configuration reference: https://druid.apache.org/docs/latest/configuration/
- Apache Druid extensions documentation: https://druid.apache.org/docs/latest/configuration/extensions/
- Apache Druid S3 extension documentation: https://druid.apache.org/docs/latest/development/extensions-core/s3/
- Apache Druid Kafka ingestion documentation: https://druid.apache.org/docs/latest/ingestion/kafka-ingestion
- Apache Druid Supervisor API documentation: https://druid.apache.org/docs/latest/api-reference/supervisor-api/
- Apache Druid downloads page: https://druid.apache.org/downloads/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/resource_hooks/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes ConfigMap volume documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/

## Issues Found
- The Druid container image examples used `apache/druid:28.0.1`, which is outdated for a 2026 post. Updated the snippets to `apache/druid:36.0.0`, matching the latest stable release listed by the official Apache Druid downloads page at review time.
- The extension load list included `druid-histogram`. Apache Druid documents the approximate histogram extension as deprecated and recommends DataSketches Quantiles instead. Removed `druid-histogram` while keeping `druid-datasketches`.
- The S3 configuration omitted an explicit region. Apache Druid's S3 extension documentation states that AWS SDK calls require a target region. Added `druid.s3.endpoint.signingRegion=us-east-1` to the common configuration example.

## Review Notes
- The YAML snippets parse successfully, and the embedded Kafka supervisor spec is valid JSON.
- The post remains a representative deployment guide rather than a complete production manifest set; it references Router, MiddleManager, ZooKeeper, PostgreSQL, Services, and Kustomize files but only shows selected snippets.
- Credentials are shown inline for simplicity. In a production-ready version, the PostgreSQL password and S3 credentials should be moved to Kubernetes Secrets or cloud-native workload identity.
