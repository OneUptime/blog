# Validation Summary: How to install Gateway API CRDs in Kubernetes cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Gateway API
- CustomResourceDefinition
- kubectl
- Helm
- Argo CD
- Prometheus Operator

## Sources Consulted
- Gateway API Getting Started documentation: https://gateway-api.sigs.k8s.io/guides/
- Gateway API Versioning documentation: https://gateway-api.sigs.k8s.io/concepts/versioning/
- Gateway API API Overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Gateway API v1.0.0 release artifacts: https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.0.0
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes CustomResourceDefinition versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Helm chart and CRD documentation: https://helm.sh/docs/v3/topics/charts/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/

## Issues Found
- The standard install example called the pinned v1.0.0 URL "latest stable". Changed the comment to say it installs Gateway API v1.0.0 standard CRDs.
- Gateway API's official install guidance uses `kubectl apply --server-side` for the release bundles. Updated install, version-pinned install, upgrade, and reinstall commands to use server-side apply.
- The resource overview omitted several Gateway API resource kinds that are relevant to the v1.0.0 standard and experimental bundles. Added GRPCRoute, ReferenceGrant, and BackendTLSPolicy to the description.
- The experimental channel description omitted v1.0.0 experimental resources GRPCRoute and BackendTLSPolicy. Updated the list.
- The "Check installed version" command printed served API versions, not the Gateway API bundle version. Changed it to read the `gateway.networking.k8s.io/bundle-version` CRD annotation.
- The Helm example placed a templated CRD manifest under `templates/`, but Helm 3 CRDs should be placed under `crds/` as plain YAML and are not templated. Updated the example accordingly.
- The upgrade guidance said CRD upgrades typically preserve resources through conversion webhooks. Gateway API v1.0.0 CRD installation does not bundle the validating webhook, and CRD preservation depends on served/storage version compatibility. Reworded the guidance.
- The compatibility section used `kubectl version --short`, which is not present in current official kubectl documentation. Changed it to `kubectl version -o yaml`.
- The compatibility section suggested checking conversion webhook support through `APIService`, which is not a valid check for Gateway API CRD compatibility. Replaced it with the official v1.0.0 CEL validation caveat for Kubernetes 1.23 and 1.24.

## Review Notes
The post intentionally pins v1.0.0 examples. That version remains a valid historical Gateway API release, but newer Gateway API releases are available and have different Standard channel contents, such as later GRPCRoute and TLSRoute graduation.
