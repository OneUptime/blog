# Validation Summary: How to Handle Conflicts Between Multiple Sources in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD multi-source Applications
- Argo CD CLI
- Argo CD AppProjects
- Kubernetes manifests and resource identity
- Kubernetes NetworkPolicy, ConfigMap, ResourceQuota, LimitRange, Ingress, and Pod Security Admission
- Bash, jq, and kubectl

## Sources Consulted
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes deprecated API migration guide for PodSecurityPolicy removal: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post described duplicate multi-source resources as being silently overridden and said the last-source behavior was undocumented. Official Argo CD documentation says the last source takes precedence and Argo CD produces a `RepeatedResourceWarning`. Updated the wording throughout.
- The duplicate-detection examples used `argocd app manifests -o json`, but the official `argocd app manifests` command does not support an output flag. Replaced those examples with `argocd app get -o json` and `kubectl get application ... -o json` checks for `RepeatedResourceWarning`.
- The CI script attempted to detect duplicate resources from rendered manifests using the invalid `argocd app manifests -o json` command. Updated it to fail when the Application status contains `RepeatedResourceWarning`.
- The conflict identity was described as same API version, kind, name, and namespace. Argo CD documents this as same group, kind, name, and namespace. Updated the description.
- The AppProject example listed `NetworkPolicy` under `clusterResourceWhitelist`, but NetworkPolicy is namespaced. Moved it to `namespaceResourceWhitelist` and added `metadata.namespace: argocd` to the AppProject snippets.
- The ownership diagram referenced PodSecurityPolicies, which were removed from Kubernetes v1.25. Replaced that item with Pod Security Admission namespace labels.

## Review Notes
The corrected post now matches current Argo CD documentation for multi-source resource precedence and warning behavior. The CI example relies on Argo CD having refreshed/reconciled the Application status; a future improvement could add a pre-merge rendering workflow for each source when teams need to catch conflicts before an Application exists in Argo CD.
