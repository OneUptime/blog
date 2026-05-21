# Validation Summary: How to Set Up Active-Passive ArgoCD for DR

## Status
validated

## Post Type
Tutorial / Disaster recovery guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kubernetes CronJob
- Bash
- Python / PyYAML
- AWS Route 53

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD v2.13.0 HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.0/manifests/ha/install.yaml
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD annotations and labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- AWS Route 53 change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The post description claimed "automatic failover", but the procedure shown is manual/scripted failover with a DNS update step. Changed the description to "failover procedures" to match the implementation.
- The "Disable Auto-Sync" section implied only automated sync was disabled, but scaling `argocd-application-controller` to zero disables Argo CD application reconciliation entirely. Renamed the section and clarified the explanation.
- The sync script removed common cluster-specific metadata but left `ownerReferences`, which can contain source-cluster UIDs and should not be copied into the DR cluster. Added `ownerReferences` to the stripped metadata fields.
- The sync script omitted `argocd-secret`, which Argo CD documents as a core declarative setup secret containing server/user/signing/webhook data. Added an explicit sync step for `argocd-secret`.
- The CronJob used `bitnami/kubectl:latest`, but the script requires `bash`, `python3`, and PyYAML in addition to `kubectl`. Changed the example image to a purpose-built placeholder image and added the required runtime dependencies.

## Review Notes
- The Argo CD v2.13.0 HA manifest URL is valid, and it defines `argocd-application-controller` as a StatefulSet, so the scale commands target the correct workload type.
- The Kubernetes CronJob `batch/v1` API, `restartPolicy: OnFailure`, `kubectl wait`, `kubectl scale`, `kubectl rollout status`, and `kubectl patch` examples are consistent with current Kubernetes documentation.
- The post does not cover ApplicationSet synchronization. That is not incorrect for the examples shown, but environments that use ApplicationSets should extend the DR sync process deliberately and test ownership behavior before relying on failover.
