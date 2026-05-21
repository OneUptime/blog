# Validation Summary: How to Set Up Backup and Recovery for Istio Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio custom resources and `istioctl`
- Kubernetes custom resources, CronJobs, RBAC, ConfigMaps, and `kubectl`
- `yq`
- AWS CLI / Amazon S3
- Argo CD
- Flux

## Sources Consulted
- Istio configuration reference: https://istio.io/latest/docs/reference/config/
- Istio `istioctl analyze` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio in-cluster operator deprecation notice: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- `yq` evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- AWS CLI `s3 cp` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Flux `reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The metadata cleanup script only removed single-object `resourceVersion`, leaving other restore-hostile fields such as `uid`, `creationTimestamp`, `generation`, `managedFields`, and `status` on single-object exports. Updated the `yq` expression to clean those fields for both list exports and single-object exports.
- The automated CronJob and S3 backup examples omitted several Istio resources listed earlier in the post, including `WorkloadEntry`, `WorkloadGroup`, `Telemetry`, `IstioOperator`, and the Istio ConfigMaps. Updated those examples so the automated backups match the stated backup scope.
- The RBAC example did not grant access to core `configmaps`, even though the backup examples read Istio ConfigMaps. Added a core API group ConfigMap rule.
- The individual restore example used `kubectl apply -l metadata.name=...`, but `-l` is a label selector and does not filter by object metadata name. Replaced it with a `yq` filter that selects the named VirtualService and pipes it to `kubectl apply`.

## Review Notes
- The post is technically relevant and remains useful. The Istio in-cluster operator is deprecated, but the post's recommendation to back up `IstioOperator` only when that installation method was used remains accurate for existing clusters and `istioctl install` workflows that use an IstioOperator YAML file.
- Production CronJobs should usually pin container image versions rather than use `latest`, but that is an operational hardening recommendation rather than a correctness issue.
