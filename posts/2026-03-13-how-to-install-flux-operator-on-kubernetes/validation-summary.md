# Validation Summary: How to Install Flux Operator on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux Operator
- Flux CD
- Kubernetes
- Helm
- kubectl
- Kubernetes RBAC
- GitOps

## Sources Consulted
- Flux Operator installation guide: https://fluxoperator.dev/docs/guides/install/
- Flux Operator Helm chart reference: https://fluxoperator.dev/docs/charts/flux-operator/
- FluxInstance CRD reference: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux installation guide and Kubernetes support notes: https://fluxcd.io/flux/installation/
- controlplaneio-fluxcd/flux-operator GitHub README: https://github.com/controlplaneio-fluxcd/flux-operator

## Issues Found
- The Helm install example used an older chart repository flow. Updated it to the documented OCI chart URL, `oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator`.
- The prerequisites specified Kubernetes 1.25 or later, but a `2.x` FluxInstance tracks current Flux 2.x releases and Kubernetes support changes by Flux release. Updated the prerequisite to require a Kubernetes version supported by the selected Flux distribution version.
- The prerequisites only said Helm 3, but the corrected OCI chart install path requires Helm's OCI chart support. Updated the prerequisite to Helm 3.8 or later.
- The custom values file included unsupported or incorrect chart values: `replicaCount`, `leaderElection.enabled`, and `image.pullPolicy`. Removed unsupported keys and changed the image pull policy field to `image.imagePullPolicy`, matching the chart values.
- The custom values Helm command still referenced the old chart repository. Updated it to the OCI chart URL.
- The pod verification text implied an exact pod name of `flux-operator`, but Kubernetes Deployment pods include generated suffixes. Updated the wording to say a `flux-operator` pod should be running.
- The RBAC section showed a wildcard ClusterRole as the required operator role. Updated it to a ClusterRoleBinding to the built-in `cluster-admin` ClusterRole, matching the Helm chart documentation that this binding is required for FluxInstance deployment.

## Review Notes
- The `kubectl apply` release manifest URL is documented, but upstream labels that method as intended for development and testing and recommends Helm or Terraform for production environments.
- The basic FluxInstance is valid, and omitting optional fields such as `cluster.size`, `networkPolicy`, annotations, and the distribution artifact is acceptable for a minimal example.
