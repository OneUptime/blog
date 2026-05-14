# Validation Summary: How to Implement Load Testing Automation with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- Flux HelmRelease, HelmRepository, Kustomization, and Alert resources
- Grafana k6 and k6-operator
- Kubernetes ConfigMaps, CronJobs, RBAC, Namespaces, and ResourceQuotas
- Prometheus remote write
- JavaScript k6 test scripts

## Sources Consulted
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Grafana k6 Operator installation documentation: https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/install-k6-operator/
- Grafana k6 Operator TestRun CRD documentation: https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/usage/configure-testrun-crd/
- Grafana k6 Operator generated CRD reference: https://raw.githubusercontent.com/grafana/k6-operator/main/docs/crd-generated.md
- Grafana k6 Prometheus remote write documentation: https://grafana.com/docs/k6/latest/results-output/real-time/prometheus-remote-write/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The Flux HelmRelease example placed the HelmRelease in `k6-operator-system` while relying on `install.createNamespace: true`. Flux can create the Helm target namespace, but the HelmRelease object namespace itself must already exist. Changed the HelmRelease namespace to `flux-system` and added `spec.targetNamespace: k6-operator-system`.
- The k6 Operator chart version range used `3.x`, which is outdated relative to the current Grafana Helm chart major version. Updated it to `4.x`.
- The basic k6 script repeated the `http_req_duration` threshold key, so JavaScript would keep only the later threshold. Combined the p95 and p99 checks into one threshold array.
- The advanced k6 script imported `group` but never used it. Removed the unused import.
- The Prometheus remote write example described `K6_PROMETHEUS_RW_TREND_STATS` as a metric prefix. That variable controls exported trend statistics, not the metric prefix. Corrected the comment.
- The Flux Kustomization example said it waited for a TestRun to complete but only listed the custom resource under `healthChecks`. Added `healthCheckExprs` for the k6 Operator `status.stage` values `finished` and `error`.
- The namespace example said the Pod Security label prevented pod disruption. It actually enforces the Kubernetes Pod Security Standards baseline profile. Corrected the comment.
- The scheduled CronJob referenced a `daily-test-run-config` ConfigMap that was not defined and used `kubectl apply` despite RBAC granting only create/delete for TestRuns. Added the ConfigMap and changed the command to `kubectl create` after deletion.
- The introduction and conclusion overstated that Flux would validate every deployment before reaching users. Adjusted the wording to reflect that this setup runs reproducible checks after deployments or on a schedule, but does not inherently gate user traffic.

## Review Notes
The examples are technically valid as illustrative manifests, but a production setup should define an explicit trigger strategy if load tests must run once per application release. A static Flux-managed TestRun resource represents one k6 Operator test run; teams commonly pair this with scheduled recreation, unique TestRun names per release, or a controlled promotion workflow.
