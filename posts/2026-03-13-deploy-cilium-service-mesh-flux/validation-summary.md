# Validation Summary: How to Deploy Cilium Service Mesh with Flux

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Cilium CNI and Cilium Service Mesh
- CiliumNetworkPolicy
- Hubble observability
- WireGuard transparent encryption
- eBPF kube-proxy replacement

## Sources Consulted
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.15.19 chart values: https://raw.githubusercontent.com/cilium/cilium/v1.15.19/install/kubernetes/cilium/values.yaml
- Cilium mutual authentication documentation: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium mutual authentication example: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication-example/
- Cilium v1.15.19 CiliumNetworkPolicy CRD schema: https://raw.githubusercontent.com/cilium/cilium/v1.15.19/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumnetworkpolicies.yaml
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Google Cloud GKE Dataplane V2 documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2

## Issues Found
- The post described "sidecarless mutual TLS" in the description. Cilium's documented feature is mutual authentication, and the chart comments clarify that this is not full mTLS support without enabling encryption. Changed the wording to "sidecarless mutual authentication."
- The prerequisites listed GKE Dataplane V2 as a target for this Helm-based Cilium install. GKE Dataplane V2 is a managed Cilium-based dataplane and does not support the CiliumNetworkPolicy CRDs used in the post. Changed the prerequisite to GKE Standard with Cilium installed as a custom CNI.
- The kernel prerequisite allowed Linux 5.4+ while the guide disables WireGuard userspace fallback. Updated the prerequisite to Linux 5.10+ or equivalent distribution kernel with WireGuard kernel support available.
- The Helm values set `authentication.mutual.spire.enabled: false` and placed `mode: required` as a top-level Helm value. Cilium Helm enables SPIRE-backed mutual authentication with `authentication.enabled`, `authentication.mutual.spire.enabled`, and `authentication.mutual.spire.install.enabled`; `authentication.mode: required` belongs in CiliumNetworkPolicy ingress or egress rules. Updated the HelmRelease and policy examples accordingly.
- The Cilium validation commands assumed the default `kube-system` namespace even though the HelmRelease installs into `cilium`. Added `--namespace cilium` to the Cilium CLI commands.
- The WireGuard validation command used `cilium debuginfo`, but current in-agent debug commands are exposed through `cilium-dbg`. Updated the command to use `cilium-dbg debuginfo --output json`.

## Review Notes
The Flux API versions and Cilium Helm values used in the post are valid. Cilium 1.15.x is older than the current stable documentation line, but the Helm repository still publishes 1.15.x patch releases and the corrected values are valid for the referenced 1.15.19 chart.
