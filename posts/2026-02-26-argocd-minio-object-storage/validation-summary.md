# Validation Summary: How to Deploy MinIO Object Storage with ArgoCD

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- Argo CD Applications, automated sync, sync options, and resource hooks
- MinIO Operator and MinIO Tenant custom resources
- Kubernetes Secrets, Jobs, Ingress, Services, StatefulSets, and PersistentVolumeClaims
- Bitnami Sealed Secrets
- MinIO Client (`mc`)
- Prometheus Operator ServiceMonitor
- ingress-nginx annotations

## Sources Consulted
- MinIO Operator Helm deployment documentation: https://min.io/docs/minio/kubernetes/upstream/operations/install-deploy-manage/deploy-operator-helm.html
- MinIO Tenant deployment documentation: https://min.io/docs/minio/kubernetes/upstream/operations/install-deploy-manage/deploy-minio-tenant.html
- MinIO Operator v5.0.15 CRDs, Helm values, and examples: https://github.com/minio/operator/tree/v5.0.15
- MinIO metrics documentation: https://docs.min.io/community/minio-object-store/operations/monitoring/collect-minio-metrics-using-prometheus.html
- MinIO Client `mc mb`, `mc ilm rule add`, `mc version`, and bucket quota documentation: https://docs.min.io/community/minio-object-store/reference/minio-mc/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD automated sync and sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/ and https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes Ingress API documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The MinIO Client bucket setup Job configured `--insecure` only while creating the alias. Because the tenant enables operator-generated TLS with `requestAutoCert: true`, subsequent `mc` commands can also encounter an untrusted internal certificate. Added `--insecure` to the bucket, lifecycle, versioning, and quota commands.
- The quota example used `mc quota set --size`, which is not the current documented MinIO Client command for bucket quotas. Replaced it with `mc admin bucket quota myminio/backups --hard 500GiB`.
- The Ingress targeted the tenant's HTTPS service port but did not tell ingress-nginx to use HTTPS to the backend. Added `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` and changed the backend to use the MinIO service port name `https-minio`.
- The ServiceMonitor used `http-minio` and a `bearerTokenSecret` pointing at the MinIO access key, but the tenant is configured for TLS and a MinIO access key is not a Prometheus bearer token. Added `MINIO_PROMETHEUS_AUTH_TYPE="public"` to the tenant config, changed the ServiceMonitor to `https-minio` with `scheme: https`, and removed the incorrect bearer token configuration.

## Review Notes
- The post pins MinIO Operator chart version `5.0.15`, while newer Operator releases exist. The examples were checked against the pinned v5.0.15 CRD and chart behavior where version-specific fields such as the Operator Console are still valid.
- The metrics example intentionally uses public metrics inside the cluster. For stricter environments, generate a Prometheus bearer token with `mc admin prometheus generate` and reference that token through the ServiceMonitor `authorization` field instead.
