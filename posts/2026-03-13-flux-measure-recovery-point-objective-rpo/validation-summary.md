# Validation Summary: How to Measure Recovery Point Objective (RPO) with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- etcd
- AWS S3 and AWS CLI
- Prometheus and Prometheus Operator
- kube-state-metrics
- Bash and jq

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux generic metadata API reference: https://pkg.go.dev/github.com/fluxcd/pkg/apis/meta
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes etcd operations documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- etcd snapshot documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- AWS CLI s3 ls documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The post described uncommitted Git work as having an RPO equal to time since last commit. Changed this to state that unpushed or uncommitted work is not recoverable from Git, because Git can only recover state that exists in a repository.
- The post stated that Flux image tags are tracked in etcd. Clarified that Flux status and automation state are stored in Kubernetes objects in etcd, while image tag caches can be rebuilt by the image-reflector-controller on its next scan.
- The Flux-specific RPO script used `.status.lastHandledReconcileAt` as the last reconciliation time. That field records the last handled manual `reconcile.fluxcd.io/requestedAt` value, not every reconciliation. Updated the command to prefer `.status.history[0].lastReconciled` and fall back to the Ready condition transition time.
- The etcd backup CronJob used `bitnami/etcd:latest` while also running `aws s3`, but that image is not a documented AWS CLI image. Updated the example to require an image containing both `etcdctl` and the AWS CLI, and added the etcd certificate hostPath mount needed by the shown TLS flags.
- The etcd backup command used an unquoted `basename` command substitution and `xargs` without an empty-input guard. Quoted the `basename` call and added `xargs -r` for the Linux container example.
- The PrometheusRule attempted to calculate staleness by subtracting Flux duration histogram/counter metrics from `time()`. Replaced those expressions with `gotk_resource_info` readiness alerts, which match Flux's documented kube-state-metrics custom resource metrics.

## Review Notes
- Exact RPO alerting for etcd backup age or ImageRepository scan age requires exporting timestamp metrics from the backup process or from custom kube-state-metrics configuration; Flux controller duration metrics alone do not provide last-success timestamps.
- The etcd backup CronJob remains an example that depends on cluster layout, certificate paths, and cloud credential setup. Managed Kubernetes offerings may require provider-specific backup mechanisms instead of a direct hostNetwork etcd snapshot job.
