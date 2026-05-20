# Validation Summary: How to Handle Resources with Finalizers Blocking Deletion in ArgoCD

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes finalizers
- Kubernetes namespaces and namespace finalization
- Kubernetes garbage collection and pruning
- kubectl
- Argo CD Applications
- Argo CD application deletion finalizer
- Argo CD sync waves
- Helm
- jq

## Sources Consulted
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Namespace API reference: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/namespace-v1/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- Argo CD app delete command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_delete/
- Argo CD app resources command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_resources/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/

## Issues Found
- The opening described finalizers as "pre-delete hooks" and said they are almost always the culprit. Kubernetes documents finalizers as metadata keys that alert controllers to perform cleanup, so the wording was corrected and softened.
- The Namespace example placed the `kubernetes` finalizer under `metadata.finalizers`. Namespace finalizers are represented in `spec.finalizers`, so the YAML example was corrected.
- The custom finalizer example was not in the publicly qualified form recommended and enforced for custom finalizer names. It was changed to `databases.example.com/finalizer`.
- The Argo CD finalizer removal section said a merge patch with `finalizers: null` removed only the Argo CD finalizer while leaving others intact. That patch removes the whole finalizer list, so the text and comment were corrected.
- The sync wave deletion ordering was backwards. Argo CD prunes higher waves first, so the wave values and explanation were corrected.
- The post claimed `argocd app delete --timeout` force-removes resources after a timeout. Current Argo CD command documentation does not include that flag for `app delete`; it supports `--wait`, and does not automatically force-remove stuck resources. The section was corrected.
- The monitoring command used `kubectl get all`, which does not include all Kubernetes resource types. It was replaced with an `api-resources` loop.
- The debugging script parsed `argocd app resources` table output using incorrect column assumptions. It was replaced with a manual check pattern after listing managed resources.

## Review Notes
Manual finalizer removal remains a last-resort operation because it can orphan dependent infrastructure or skip controller cleanup. The post now reflects that Argo CD and Kubernetes support waiting and ordered deletion, but stuck finalizers still require diagnosis before forceful removal.
