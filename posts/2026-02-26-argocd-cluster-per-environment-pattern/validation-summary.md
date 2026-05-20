# Validation Summary: How to Implement the Cluster-per-Environment Pattern

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Argo CD AppProjects and sync windows
- Kubernetes
- Kustomize
- GitOps

## Sources Consulted
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD cluster management guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/application-specification/
- Argo CD AppProject declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The ApplicationSet selected `development`, `staging`, and `production` clusters by the `env` label, but the registration example only labelled staging and production. Added a development cluster registration example with `--in-cluster` and `--label env=development`, because Argo CD's default local cluster is not matched by a label selector unless it is represented by a cluster Secret.
- The ApplicationSet example used the older default fasttemplate syntax. Updated it to `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and Go template parameter references, matching current Argo CD recommendations.
- The production AppProject resource whitelist omitted `StatefulSet` and `HorizontalPodAutoscaler`, even though the production overlay includes a database StatefulSet and HPA. Added both resource kinds so the example can sync as described.
- The production AppProject used `CreateNamespace=true` while denying all cluster-scoped resources. Added `Namespace` to `clusterResourceWhitelist`, so Argo CD can create the destination namespace while other cluster-scoped resources remain denied.
- The sync-window example used a separate always-active allow window for emergency manual syncs. Replaced it with `manualSync: true` on the relevant allow and deny windows, matching the documented manual override mechanism.

## Review Notes
The remaining examples are version-agnostic and use current Argo CD/Kubernetes APIs. The `https://production-cluster.example.com` server URL is illustrative; in a real setup it must match the registered cluster server URL or use `destination.name`.
