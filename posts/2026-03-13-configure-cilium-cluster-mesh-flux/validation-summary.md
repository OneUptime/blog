# Validation Summary: How to Configure Cilium Cluster Mesh with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium Cluster Mesh
- Cilium Helm chart and Cilium CLI
- Kubernetes Services and CiliumNetworkPolicy
- Flux CD HelmRelease and Kustomization resources
- SOPS-encrypted Kubernetes Secrets

## Sources Consulted
- Cilium Cluster Mesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium global services documentation: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium Cluster Mesh service affinity documentation: https://docs.cilium.io/en/stable/network/clustermesh/affinity/
- Cilium Cluster Mesh network policy documentation: https://docs.cilium.io/en/stable/network/clustermesh/policy/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference for `cilium clustermesh connect`: https://docs.cilium.io/en/latest/cmdref/cilium_clustermesh_connect/
- Cilium agent debug command reference for `cilium-dbg node list` and `cilium-dbg service list`: https://docs.cilium.io/en/stable/cmdref/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/

## Issues Found
- The Cluster Mesh HelmRelease example used a separate `cilium-clustermesh` HelmRelease for the same Cilium chart. This would create a second Helm release and can conflict with resources managed by the existing Cilium release. Updated the example to show adding Cluster Mesh values to the existing `cilium` HelmRelease.
- The Cilium chart version example used `1.15.*`, which is outdated for a 2026 guide. Updated it to `1.19.*`, matching the current stable documentation reviewed.
- The `cilium clustermesh connect` command used `--source-context`, which is not a valid flag. Updated it to use `--context` for the source cluster and `--destination-context` for the destination cluster.
- The Cluster Mesh connection comment and expected status text were too specific for the current CLI output. Updated them to match the source/destination contexts and describe the expected connected state without relying on an obsolete exact string.
- The Cilium CLI commands omitted `--namespace cilium` even though the examples deploy Cilium into the `cilium` namespace. Added the namespace flag where needed.
- The SOPS example exported only the Secret `.data` map to JSON and encrypted it as a YAML file, which would not produce a Kubernetes Secret manifest that Flux can apply. Updated it to export the full Secret YAML and encrypt it in place.
- The global Service example described `service.cilium.io/shared: "true"` as local-preference behavior. That annotation controls backend sharing; local preference is configured with `service.cilium.io/affinity: "local"`. Added the affinity annotation and corrected the comment.
- The validation commands used `cilium node list` and `cilium service list` inside the Cilium agent pod. Current Cilium agent debug commands use `cilium-dbg node list` and `cilium-dbg service list`. Updated both commands.
- The best-practices note for active-passive behavior was imprecise. Updated it to describe `service.cilium.io/shared: "false"` as the control for consuming remote backends without exporting local backends.

## Review Notes
The article assumes Cilium is installed in the `cilium` namespace; the official default is often `kube-system`, but using `cilium` is valid if the installation was configured that way. Cluster Mesh behavior is version-sensitive, especially around KVStoreMesh defaults and policy endpoint selection, so future updates should re-check the Cilium version used in the HelmRelease example.
