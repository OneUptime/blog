# Validation Summary: How to Deploy StarRocks with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- StarRocks
- StarRocks Kubernetes Operator
- Prometheus Operator ServiceMonitor
- NGINX Ingress
- AWS S3, AWS Glue, Hive, and Iceberg external catalogs

## Sources Consulted
- StarRocks Kubernetes Operator documentation: https://docs.starrocks.io/docs/deployment/sr_operator/
- StarRocks Kubernetes Operator API reference: https://starrocks.github.io/starrocks-kubernetes-operator/doc/api.html
- StarRocks Helm quick start and chart documentation: https://docs.starrocks.io/docs/quick_start/helm/
- StarRocks Kubernetes Operator v1.9.0 Helm chart release and templates: https://github.com/StarRocks/starrocks-kubernetes-operator/releases/tag/v1.9.0
- StarRocks Hive catalog documentation: https://docs.starrocks.io/docs/data_source/catalog/hive_catalog/
- StarRocks Iceberg catalog documentation: https://docs.starrocks.io/docs/data_source/catalog/iceberg/iceberg_catalog/
- StarRocks monitoring documentation: https://docs.starrocks.io/docs/administration/management/monitoring/Monitor_and_Alert/
- StarRocks monitoring metric reference: https://docs.starrocks.io/docs/administration/management/monitoring/metrics/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/helm/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/

## Issues Found
- The operator-only Argo CD Application used the parent `kube-starrocks` chart with values that do not disable the StarRocks cluster for chart version 1.9.0. Changed the chart to `operator` and moved resource settings under the `starrocksOperator` value path used by that chart.
- The CN autoscaling example set both `spec.starRocksCnSpec.replicas` and `autoScalingPolicy`. StarRocks Operator documentation says to delete `replicas` when CN autoscaling is configured, so the fixed replica count was removed and the Argo CD note was clarified.
- The external catalog init job used a quoted heredoc, which prevented shell expansion of `${AWS_ACCESS_KEY}` and `${AWS_SECRET_KEY}`. Changed it to an expandable heredoc and added secret-backed environment variables.
- The Iceberg Glue catalog example used only `aws.s3.region`. StarRocks documents Glue catalogs with `aws.glue.*` properties and S3 credential properties, so the missing Glue and S3 authentication fields were added.
- The ingress section claimed to cover SQL and Web UI, but Kubernetes Ingress is HTTP-oriented and the snippet only exposes FE HTTP port 8030. Renamed the section to Web UI.
- The BE ServiceMonitor used the wrong service port name and both ServiceMonitor selectors used labels that do not match the StarRocks chart template. Updated FE and BE selectors to use `app.starrocks.ownerreference/name` plus `app.kubernetes.io/component`, and changed the BE endpoint port to `webserver`.
- The listed metric names were not present in the StarRocks monitoring metric reference. Replaced them with documented metrics for query latency, compaction memory, BE memory pool usage, and disk capacity.

## Review Notes
- The post now validates as a technically relevant deployment guide. The examples still assume a pre-existing Argo CD project, storage classes, NGINX ingress controller, cert-manager issuer, Prometheus Operator, and Kubernetes Secret named `starrocks-aws-credentials`.
