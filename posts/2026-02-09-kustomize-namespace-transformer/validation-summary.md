# Validation Summary: How to use Kustomize namespace transformer for multi-namespace deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes namespaces and namespaced resources
- Kustomize kustomization files and namespace transformer
- Kubernetes RBAC resources
- Kustomize Helm chart inflation
- Kubernetes manifest validation tools
- Bash-based CI/CD deployment scripting

## Sources Consulted
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize API type documentation: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Kustomize namespace transformer documentation: https://pkg.go.dev/sigs.k8s.io/kustomize/api/filters/namespace
- Kustomize transformer configuration examples: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/transformerconfigs/README.md
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes RoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubeconform documentation: https://kubeconform.mandragor.org/
- Kubeval README: https://github.com/instrumenta/kubeval

## Issues Found
- Replaced deprecated `bases` fields with `resources` in Kustomization examples. Current Kustomize documentation and API types indicate that `bases` is deprecated in favor of `resources`.
- Replaced deprecated `commonLabels` examples with the current `labels` field using `pairs` and `includeSelectors: true`, preserving the original selector-including behavior.
- Updated the Helm chart example to set the chart namespace as well as the top-level Kustomize namespace, and clarified that Helm support must be enabled. This avoids implying that Kustomize's top-level namespace also changes Helm's `.Release.Namespace` during template rendering.
- Changed the ClusterRoleBinding JSON patch operation from `replace` to `add`, because the example subject initially has no `namespace` field.
- Corrected the validation-tool explanation. Kubeval and kubeconform validate rendered manifests against schemas; they do not verify that referenced resources exist in a target namespace.
- Sanitized the CI/CD feature-branch namespace generation so branch names are lowercased and invalid namespace characters are replaced before calling `kustomize edit set namespace`.

## Review Notes
Kustomize v5.8.1 render checks confirmed that namespaced RoleBinding ServiceAccount subjects are updated by the namespace transformer, while ClusterRoleBinding ServiceAccount subject namespaces are not automatically added and require an explicit patch or transformer configuration.
