# Validation Summary: How to Handle ApplicationSet Rollout Strategy in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- ApplicationSet
- ApplicationSet Progressive Syncs
- RollingSync and AllAtOnce strategies
- Kubernetes custom resources
- Argo CD CLI
- kubectl
- yq

## Sources Consulted
- Argo CD Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_set/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/

## Issues Found
- The post did not mention that RollingSync is part of ApplicationSet Progressive Syncs and must be explicitly enabled on the ApplicationSet controller. Added a short note before the strategy discussion.
- RollingSync examples used `syncPolicy.automated`, but official Argo CD documentation states RollingSync forces autosync disabled on generated Applications and logs warnings when automated sync is configured. Removed `syncPolicy.automated` from RollingSync examples and added a note explaining the behavior.
- The monitoring command filtered Applications by `app.kubernetes.io/managed-by=applicationset-controller`, which is not a label established by the examples. Changed it to use the `rollout-phase` label that the `global-service` example applies to generated Applications.

## Review Notes
The remaining ApplicationSet strategy fields, `maxUpdate` examples, cluster label commands, Argo CD app commands, and Kubernetes inspection commands match the current official documentation. `maxUpdate` percentages round down with a floor of one Application for non-zero percentages, which could be worth mentioning in a future expanded version.
