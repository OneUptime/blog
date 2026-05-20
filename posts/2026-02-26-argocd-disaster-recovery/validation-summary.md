# Validation Summary: How to Configure ArgoCD Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes CronJob
- Helm
- AWS Route 53
- Bash

## Sources Consulted
- Argo CD disaster recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_export/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo Helm chart repository documentation: https://argoproj.github.io/argo-helm/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- AWS Route 53 DNS failover documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html

## Issues Found
- The Helm install example used `argo/argo-cd` without first adding and updating the Argo Helm repository. Added `helm repo add argo https://argoproj.github.io/argo-helm` and `helm repo update argo`.
- The warm standby example disabled auto-sync by transforming exported Application manifests with Python and PyYAML inside `bitnami/kubectl:latest`. That image is not guaranteed to include Python/PyYAML, and the script only handled `ApplicationList` while `kubectl get ... -o yaml` commonly emits a generic Kubernetes list. Replaced the manual export/import with Argo CD's documented `argocd admin export` and `argocd admin import` commands.
- The standby design relied on removing auto-sync from Applications, which can change intended application policy and does not reliably cover ApplicationSet-managed Applications. Updated the standby procedure to keep `argocd-application-controller` scaled to zero until DR activation.
- The activation script forced `prune` and `selfHeal` on every Application, which can change user-defined sync policy. Replaced that with scaling the application controller up and then triggering syncs.
- Several `argocd` CLI examples assumed a prior API login. Updated operational scripts to use `argocd --core` where direct Kubernetes access is already being used.
- The DR test treated any non-zero `argocd app diff` exit code as a failure, but Argo CD returns exit code `1` when a diff is found. Added `--exit-code=false` so the test only fails on real command errors.
- The failback example applied raw exported Application YAML with `kubectl apply`, which can include live metadata and only captures part of Argo CD state. Replaced it with `argocd admin export/import` and controller scale-up/scale-down steps.

## Review Notes
The examples are still illustrative and assume the service account and primary kubeconfig have permissions to read and import Argo CD resources. Production environments should pin the Argo CD image and Helm chart versions to match their deployed Argo CD version, then test the DR runbooks in a non-production environment.
