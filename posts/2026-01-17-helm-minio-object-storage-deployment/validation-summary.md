# Validation Summary: How to Deploy MinIO Object Storage with Helm on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Helm
- Kubernetes
- MinIO
- MinIO Operator
- Bitnami MinIO Helm chart
- cert-manager
- Prometheus / ServiceMonitor
- Grafana
- MinIO Client (mc)
- AWS SDK for Python / boto3

## Sources Consulted
- Bitnami MinIO Helm chart values and templates: https://github.com/bitnami/charts/tree/main/bitnami/minio
- MinIO Operator Tenant CRD documentation: https://github.com/minio/operator/blob/master/docs/tenant_crd.adoc
- MinIO Operator Tenant API types: https://github.com/minio/operator/blob/master/pkg/apis/minio.min.io/v2/types.go
- MinIO Prometheus metrics list: https://github.com/minio/minio/blob/master/docs/metrics/prometheus/list.md
- Helm CLI documentation: https://helm.sh/docs/helm/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Boto3 configuration documentation: https://docs.aws.amazon.com/boto3/latest/guide/configuration.html

## Issues Found
- The Bitnami distributed-mode note said replicas must be a multiple of 4. Updated it to match the chart requirement: distributed replicas should be even and at least 4.
- The Bitnami values placed the Console port under `service.ports.console` and used a non-existent `apiIngress` key. Updated API ingress to use `ingress` and Console ingress/service configuration to use `console.ingress` and `console.service.ports.http`.
- The ServiceMonitor examples scraped only cluster/node metrics while later examples used bucket and resource metrics. Added `/minio/v2/metrics/bucket` and `/minio/v2/metrics/resource` to the configured paths.
- The MinIO Operator Tenant example used an invalid `spec.console` block for the current CRD. Replaced it with `exposeServices` and `features.domains`.
- The Tenant pool omitted the required `name` field. Added `name: pool-0`.
- The MinIO image tag was a placeholder-style timestamp that does not correspond to a verified release tag. Replaced it with a valid release tag.
- The `defaultBuckets` example did not mention the Bitnami standalone-mode limitation. Added a short clarification and pointed distributed deployments to provisioning.
- The provisioning user example used unsupported per-user `existingSecret` fields. Replaced it with `provisioning.usersExistingSecrets` and a Kubernetes Secret manifest using the chart's expected data format.
- The Kubernetes Deployment example lacked the required `spec.selector` and matching pod template labels for `apps/v1`. Added both.
- The Prometheus metric names for request latency and disk usage used outdated or incorrect names. Updated them to current MinIO metric names.
- The `kubectl run` troubleshooting command passed the command ambiguously for the `minio/mc` image. Updated it to run through `/bin/sh -c`.

## Review Notes
Helm was not installed in the local environment, so chart validation was performed against the official Bitnami chart source and MinIO Operator CRD source rather than local `helm show values` output.
