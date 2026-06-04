# Validation Summary: How to use ArgoCD ApplicationSet progressive sync for canary deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet Progressive Syncs / RollingSync
- Argo CD CLI
- Argo CD health checks
- Argo Rollouts
- Kubernetes YAML manifests
- Prometheus alerting

## Sources Consulted
- Argo CD Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/health/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/commands/argocd_app_list/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo Rollouts Canary documentation: https://argo-rollouts.readthedocs.io/en/stable/features/canary/

## Issues Found
- Added the missing requirement to enable Progressive Syncs on the ApplicationSet controller. Official Argo CD docs state this feature must be explicitly enabled.
- Removed `syncPolicy.automated` from RollingSync examples. RollingSync forces generated Applications to have autosync disabled, so the original examples were misleading.
- Changed `destination.server: '{{cluster}}'` to `destination.name: '{{cluster}}'` where the examples used cluster names rather than API server URLs.
- Reworked the multi-cluster example. The original matrix generator produced duplicate region Applications per cluster and described Application sync order as traffic weighting. The corrected version uses one Application per production cluster and describes it as a regional rollout.
- Fixed RollingSync step selectors that reselected previous stages. The corrected examples select each stage independently and use `maxUpdate` only to control batching within that stage.
- Removed invalid `minReadySeconds` fields from RollingSync steps. ApplicationSet RollingSync supports `matchExpressions` and `maxUpdate`; it waits for generated Applications to become `Healthy`.
- Removed invalid Application-level `health` configuration. Argo CD health customization is configured through built-in checks, custom Lua health checks in `argocd-cm`, hooks, or Rollout analysis, not `spec.health` on an Application.
- Fixed the manual approval example to use `maxUpdate: 0`, which is the documented RollingSync pattern for a manually synced stage.
- Replaced the Prometheus examples that used unsupported labels on `argocd_app_sync_total`. The corrected examples use documented `argocd_app_info` and `argocd_app_labels` metrics and note that Application label export is disabled by default.
- Updated rollback wording. ApplicationSet RollingSync blocks promotion when a stage does not become healthy, but it does not perform automatic rollback by itself.

## Review Notes
Progressive Syncs are documented as a beta feature in current stable Argo CD docs, with potential edge cases. The post now avoids claiming direct traffic shaping from ApplicationSet alone; actual traffic canary behavior requires a rollout controller or traffic manager such as Argo Rollouts.
