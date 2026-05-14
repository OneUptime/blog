# Validation Summary: How to Run Kubernetes Jobs Before Deployments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomizations
- Flux CD HelmReleases
- Flux notification Alerts
- Kubernetes Jobs
- Kubernetes Deployments and Services
- Kustomize
- Helm hooks
- kubectl and Flux CLI

## Sources Consulted
- Flux documentation: Running pre and post-deployment jobs with Flux - https://fluxcd.io/flux/use-cases/running-jobs/
- Flux documentation: Kustomization API - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation: flux get kustomizations - https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI documentation: flux reconcile kustomization - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux documentation: Alerts - https://fluxcd.io/flux/components/notification/alerts/
- Flux documentation: HelmRelease API - https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes documentation: Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes documentation: Automatic cleanup for finished Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Helm documentation: Chart hooks - https://helm.sh/docs/topics/charts_hooks/

## Issues Found
- Corrected the Flux `force: true` explanation. The post said Flux recreates the Job on each reconciliation, but Flux recreates resources when immutable fields change, such as a Job Pod template image update.
- Corrected the rerun guidance for pre-deployment Jobs. The post now explains that each deployment must change the Job manifest, such as by updating the image tag or Job name, for the Job to rerun.
- Corrected the "CronJob-like pattern with suspend" option. The example was a per-resource Flux force annotation on a Job, not a CronJob or suspend-based pattern.
- Removed redundant `healthChecks` entries from Flux Kustomizations that also set `wait: true`. Flux documents that `healthChecks` is ignored when `wait: true` is enabled because Flux waits for all reconciled resources.
- Updated Flux status commands from the undocumented singular form to the documented `flux get kustomizations` command.

## Review Notes
- The remaining Kubernetes Job fields, TTL cleanup field, Flux dependency configuration, Flux Alert structure, HelmRelease API version, and Helm hook annotations are consistent with current official documentation.
- The example assumes the `production` namespace, referenced Secrets, ServiceAccount, GitRepository, HelmRepository, and Slack Provider already exist.
