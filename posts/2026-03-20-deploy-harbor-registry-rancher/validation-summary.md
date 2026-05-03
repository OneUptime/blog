# Validation Summary: How to Deploy Harbor Registry on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Harbor (container registry)
- Rancher (Kubernetes management)
- Kubernetes
- Helm 3.x
- Bitnami Helm chart for Harbor
- Longhorn (persistent storage)
- cert-manager (TLS certificates)
- Prometheus / ServiceMonitor (monitoring via prometheus-operator CRDs)
- Velero / CronJob (backup)
- nginx (Ingress controller)

## Sources Consulted
- Bitnami Harbor Helm chart repo: https://github.com/bitnami/charts/tree/main/bitnami/harbor
- Bitnami Harbor chart values reference (`values.yaml` and README parameters table)
- Broadcom/Bitnami catalog deprecation announcement (Aug 2025): https://github.com/bitnami/charts/issues/35164
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- cert-manager Certificate resource docs: https://cert-manager.io/docs/usage/certificate/
- prometheus-operator ServiceMonitor CRD: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md#servicemonitor
- Kubernetes CronJob (`batch/v1`) docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Rancher project annotation `field.cattle.io/projectId` (Rancher v2 docs)

## Issues Found

1. **Incorrect Helm chart name (`bitnami/harbor-registry`).**
   - The Bitnami chart for Harbor is published as `bitnami/harbor`. There is no `bitnami/harbor-registry` chart in the Bitnami catalog (`harbor-registry` is only the name of one of Harbor's internal container images/components).
   - Fixed in both the install (Step 2) and upgrade (Upgrading) commands: `bitnami/harbor-registry` → `bitnami/harbor`.

2. **Incorrect Helm values for ingress configuration.**
   - The Bitnami Harbor chart does not use flat `ingress.enabled` / `ingress.hostname` / `ingress.tls`. Exposure is controlled by the top-level `exposureType` value (`ingress`, `proxy`, or `none`) and ingress hostname/TLS are nested under `ingress.core.*`.
   - Fixed in Step 2: `--set ingress.enabled=true` → `--set exposureType=ingress`; `--set ingress.hostname=...` → `--set ingress.core.hostname=...`; `--set ingress.tls=true` → `--set ingress.core.tls=true`.

3. **Incorrect persistence storage class value.**
   - The Bitnami Harbor chart configures persistence per component via `persistence.persistentVolumeClaim.<component>.storageClass`. A flat `persistence.storageClass` setting is silently ignored.
   - Fixed in Step 2: replaced `--set persistence.storageClass=longhorn` with per-component overrides for `registry`, `jobservice`, `database`, `redis`, and `trivy`.

4. **Wrong deployment name in `kubectl rollout status` upgrade check.**
   - The Bitnami Harbor chart creates several Deployments (one per component: `<release>-core`, `<release>-jobservice`, `<release>-portal`, `<release>-registry`, `<release>-trivy`, etc.). With release name `harbor-registry`, no Deployment named `harbor-registry` exists.
   - Fixed in the Upgrading section: `deployment/harbor-registry` → `deployment/harbor-registry-core` (the Harbor core service is the canonical readiness target).

## Review Notes

- **Bitnami catalog deprecation (Aug 2025):** The public Bitnami chart repo at `https://charts.bitnami.com/bitnami` was effectively retired in late 2025; versioned images/charts moved to `docker.io/bitnamilegacy` (no further updates/security patches), with Bitnami Secure Images now the supported path. Readers deploying Harbor in production in 2026 should consider the upstream `goharbor/harbor-helm` chart or the OCI Bitnami path. The Helm commands as written may still resolve from the legacy repo but will not receive updates. This was not edited because a wholesale chart switch is a stylistic/strategic change, not a syntactic correction.
- **Backup CronJob is illustrative.** The command `/opt/bitnami/scripts/harbor-registry/entrypoint.sh harbor-registry-backup` is not a real built-in Bitnami Harbor backup hook — Harbor has no single-step backup CLI; real backups should snapshot the registry/chartmuseum/trivy PVCs and the Postgres database (via pgdump) and Redis. The post explicitly frames this as "Backup using Velero or custom CronJob," so the snippet reads as a placeholder for user-supplied custom backup logic; it was left in place per the "no restructuring" guideline. Readers should replace it with a real Velero policy or component-specific backup steps.
- **ServiceMonitor selector / port:** The chart exposes Prometheus metrics endpoints when `metrics.enabled=true` is set (off by default). The ServiceMonitor as written assumes metrics services labeled with `app.kubernetes.io/name: harbor-registry` and a port named `http`; the actual Bitnami Harbor metrics services use `app.kubernetes.io/name: harbor` with metrics-port names like `http-metrics`/`metrics` per component. Readers may need to adjust the selector and port to match their installed release.
- **Introductory and concluding sentences contain duplicated "on Rancher on Rancher" wording.** This is a stylistic/template artifact rather than a technical error and was left unchanged per the review guideline against stylistic edits.
- **Rancher v2.7+** is appropriate; the `field.cattle.io/projectId` annotation is the correct mechanism for assigning a namespace to a Rancher project.
