# Validation Summary: How to Deploy Keycloak on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (Kubernetes management platform)
- Keycloak (IAM / SSO server)
- Bitnami Keycloak Helm chart
- Helm
- kubectl
- Kubernetes (StatefulSet, Ingress, Secret, CronJob, HPA)
- cert-manager
- Longhorn (storage)
- Prometheus Operator (ServiceMonitor)
- AWS S3 (backup target)

## Sources Consulted
- Bitnami Keycloak Helm chart documentation: https://github.com/bitnami/charts/tree/main/bitnami/keycloak
- Helm CLI documentation: https://helm.sh/docs/helm/helm_install/
- Kubernetes HorizontalPodAutoscaler API (autoscaling/v2): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Kubernetes CronJob API (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator ServiceMonitor CRD: https://prometheus-operator.dev/docs/operator/api/

## Issues Found
1. **Typo "ukeycloak" replacing "Keycloak"** — appeared 5 times (Introduction, Step 4 install comment, Upgrades comment, two occurrences in Conclusion). Replaced all with "Keycloak".
2. **Invalid `--version latest` flag in `helm install`** — Helm's `--version` flag accepts a specific version or semver constraint, not the literal string "latest". Removed the `--version latest` argument so the command installs the latest available chart version (which is Helm's default behavior when `--version` is omitted).
3. **`kubectl rollout status deployment/keycloak`** — the Bitnami `keycloak` chart deploys Keycloak as a StatefulSet (it requires stable identities for clustering), so the Deployment lookup would fail. Changed to `kubectl rollout status statefulset/keycloak`.
4. **HPA targeting `kind: Deployment`** — the same StatefulSet issue applies to the Horizontal Pod Autoscaler. Changed `scaleTargetRef.kind` from `Deployment` to `StatefulSet`. (HPA supports scaling StatefulSets via the scale subresource.)

## Review Notes
- The `keycloak-credentials` secret created in Step 2 is not actually wired into the Helm values in Step 3. To have the chart consume it, the values would need `auth.existingSecret: keycloak-credentials` (and matching key names like `auth.passwordSecretKey: admin-password`). As written, the chart will auto-generate credentials and the manually created secret is unused. This is a usage gap rather than a syntactic error, so it was left unchanged per the "fix only technical errors" guidance.
- The `password: "${DB_PASSWORD}"` placeholder in the values file will not be expanded by Helm — Helm does not perform shell variable substitution in values files. Users would need to either substitute via `envsubst` before applying, use `--set postgresql.auth.password=...`, or reference an existing secret via `postgresql.auth.existingSecret`. Left as-is since the surrounding prose treats it as a placeholder, but readers should be aware.
- The backup CronJob mounts a PVC named `keycloak-data`, but the actual PVC name created by the Bitnami chart (StatefulSet volumeClaimTemplate) will be of the form `data-keycloak-0` (and one per replica). The job as written will not find the PVC under that name in a real deployment. This is a pattern-level issue beyond a simple typo, so it was not modified.
- ServiceMonitor selector label `app.kubernetes.io/name: keycloak` matches the Bitnami chart's standard service labels; metrics port name `metrics` matches the chart's metrics service.
- Rancher v2.7+, `autoscaling/v2`, and `batch/v1` CronJob are all current and supported on recent Kubernetes (1.21+).
