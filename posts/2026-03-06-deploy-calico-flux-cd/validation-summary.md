# Validation Summary: How to Deploy Calico with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Project Calico
- Tigera Operator
- Flux CD HelmRelease and Kustomization
- Kubernetes
- Helm
- Calico network policy resources
- calicoctl

## Sources Consulted
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico resource requests and limits documentation: https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The HelmRelease placed the object in `tigera-operator` while relying on `install.createNamespace`. Flux requires the HelmRelease namespace to already exist; `createNamespace` creates the release target namespace. Changed the HelmRelease namespace to `flux-system` and added `targetNamespace: tigera-operator`.
- The chart version used `3.28.x`, which is outdated for a 2026 post. Updated the example to the current documented Calico chart version `v3.32.0`.
- The Helm chart values enabled creation of the `Installation` resource while the post also defined an `Installation` separately. Changed the Helm values to install only the operator and disabled chart-managed Calico CRs that are defined separately in the guide.
- The Installation example used deprecated `componentResources`. Replaced it with the current `calicoNodeDaemonSet` and `calicoKubeControllersDeployment` resource configuration fields.
- The Flux policy Kustomization used `dependsOn` to refer to a HelmRelease name. Flux Kustomization `dependsOn` references other Kustomization objects, so the example now defines a `calico-config` Kustomization and makes `calico-policies` depend on it.
- The Calico status commands used `kubectl calico node status`, but the official command is `calicoctl node status`. Updated the verification and troubleshooting commands.
- Some `kubectl get` examples used ambiguous resource names. Updated them to explicit API-qualified resources for Installation, IP pools, and Felix configuration.

## Review Notes
- The example CIDRs, node names, and DNS labels are illustrative and may need adjustment for a real cluster.
- Calico's `calicoctl node status` is most useful when BGP is enabled and must be run from an environment with calicoctl configured for the cluster.
