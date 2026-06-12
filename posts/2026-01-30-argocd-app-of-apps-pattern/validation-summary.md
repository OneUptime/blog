# Validation Summary: How to Build ArgoCD App of Apps Pattern

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Argo CD Applications and App of Apps pattern
- Argo CD ApplicationSet cluster generator
- Argo CD sync waves, sync policies, sync options, and AppProjects
- Kubernetes manifests and kubectl commands
- Helm chart sources in Argo CD
- Kustomize overlays and patches
- External Secrets Operator
- Bitnami Sealed Secrets

## Sources Consulted
- Argo CD Cluster Bootstrapping / App of Apps documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/cluster-bootstrapping/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Directory source documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/directory/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD CLI command references for `argocd app get` and `argocd app sync`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/ and https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator Helm chart information: https://artifacthub.io/packages/helm/external-secrets-operator/external-secrets
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/

## Issues Found
- The introduction and benefits described App of Apps as if one sync atomically deploys every child workload. Updated the wording to avoid implying atomic deployment and to clarify that the root declares child Applications.
- The root Application example recursively scanned `apps/`, which included `apps/root/application.yaml` and conflicted with the later warning not to let the root manage itself. Added `directory.exclude: 'root/*'` and documented why.
- The sync-wave section implied that waves directly order child workload deployments across Applications. Updated the explanation to clarify that the parent sync orders child `Application` resources, while each child Application reconciles its own workloads according to its sync policy.
- The sync-wave Mermaid diagram used invalid subgraph identifiers such as `Wave -3`. Replaced them with valid Mermaid node IDs and labels.
- The bootstrapping explanation said Argo CD discovers child apps and deploys them in sync-wave order. Updated it to state that child Applications reconcile their workloads after creation when automated sync is enabled.
- The ApplicationSet example used older templating syntax. Updated it to current Go template syntax with `goTemplate: true`, `{{.server}}`, and `{{.nameNormalized}}`.
- The Kustomize JSON patch targeted every `Application` and attempted to add Helm values under a Git/Kustomize source path where `/spec/source/helm` did not exist. Narrowed the patch to `name: api-service` and removed the invalid Helm-values patch.
- The External Secrets Operator example used the older `external-secrets.io/v1beta1` API. Updated it to `external-secrets.io/v1` based on current official examples.
- The External Secrets Application snippet was incomplete and would not be a valid Argo CD Application. Added `namespace`, `project`, `targetRevision`, `destination`, and `syncPolicy`.
- The circular dependency pitfall said self-management creates an infinite loop. Reworded it to the more precise risk: self-referential ownership and confusing prune/delete behavior.

## Review Notes
- The cert-manager and ingress-nginx chart versions shown are older examples but still valid as pinned chart versions. Future updates could refresh them to newer chart versions if the post wants to recommend current production defaults.
- For strict dependency ordering across child Applications, teams may need custom Argo CD Application health checks or ApplicationSet progressive syncs; sync waves alone order the parent application's resources.
