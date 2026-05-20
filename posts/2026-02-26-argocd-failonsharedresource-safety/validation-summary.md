# Validation Summary: How to Use FailOnSharedResource for Safety in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet CRDs
- Argo CD sync options
- Kubernetes manifests and resource tracking metadata
- Kyverno admission policies
- Prometheus alerting

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_tracking/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/commands/argocd_app_set/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/metrics/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/

## Issues Found
- The post claimed `FailOnSharedResource=true` could be configured globally through `resource.customizations.syncOptions.all` in `argocd-cm`. Official Argo CD documentation describes sync options as Application-level settings or resource annotations, and this global default key is not documented. I replaced the invalid ConfigMap example with guidance to enforce the option through policy.
- The Kyverno policy used the deprecated top-level `spec.validationFailureAction` field and older match formatting. I updated it to use `validate.failureAction: Enforce` and `match.any`, matching current Kyverno documentation.
- The post used `argocd app sync --sync-option FailOnSharedResource=false`, but the official `argocd app sync` command does not expose a `--sync-option` flag. I changed those examples to temporarily remove the Application sync option with `argocd app set --sync-option '!FailOnSharedResource=true'`, sync, and then add the option back.

## Review Notes
The Prometheus alert is a broad heuristic for Argo CD sync errors and does not identify FailOnSharedResource conflicts directly. The post already describes it as an alert that may indicate a shared resource conflict, so no technical correction was required.
