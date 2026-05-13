# Validation Summary: How to Set Up Flux on AKS with Azure CNI Powered by Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI powered by Cilium
- Advanced Container Networking Services (ACNS)
- CiliumNetworkPolicy
- Flux CD
- Kubernetes NetworkPolicy concepts
- Hubble CLI and Hubble UI

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS, https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Azure CLI `az aks` reference, https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Use Advanced Container Networking Services on AKS, https://learn.microsoft.com/en-us/azure/aks/use-advanced-container-networking-services
- Microsoft Learn: Set up container network logs, https://learn.microsoft.com/en-us/azure/aks/how-to-configure-container-network-logs
- Microsoft Learn: Container network logs overview, https://learn.microsoft.com/en-us/azure/aks/container-network-observability-logs
- Flux documentation: `flux bootstrap github`, https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux documentation: HelmRelease and Kustomization CRDs, https://fluxcd.io/flux/components/helm/helmreleases/ and https://fluxcd.io/flux/components/kustomize/kustomizations/
- Cilium documentation: DNS-based policies and CiliumNetworkPolicy examples, https://docs.cilium.io/en/latest/security/dns/
- Cilium documentation: Hubble setup and CLI access, https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- The post described Azure CNI powered by Cilium as requiring the `aks-preview` extension and `CiliumDataplanePreview` feature registration. Current AKS documentation exposes `--network-dataplane cilium` through the Azure CLI, so the preview setup step was replaced with Azure CLI login/version verification.
- The prerequisites listed Azure CLI 2.48 or later, which is enough for basic Cilium dataplane creation but not for the ACNS features used by the post. Updated the prerequisite to Azure CLI 2.79 or later.
- The cluster creation command did not enable ACNS or pin a Kubernetes version compatible with the container network log examples, even though the post used FQDN filtering, L7 policies, and Hubble-style observability. Added `--kubernetes-version 1.33`, `--enable-acns`, and `--acns-advanced-networkpolicies L7`.
- The Flux bootstrap command used HTTPS-only network policy examples while the default GitHub bootstrap mode can use deploy-key based Git access. Added `--token-auth` to align the bootstrap mode with the port 443 egress policy shown later.
- The CiliumNetworkPolicy DNS endpoint selectors used unprefixed Kubernetes labels. Updated them to the Cilium `k8s:` label format shown in official Cilium DNS policy examples and changed DNS protocol to `ANY`.
- The Flux egress policy was described as complete least privilege. Adjusted the wording to make clear that the FQDN list is a starter example and must be adapted for the exact Git, registry, Helm, and notification endpoints in use.
- The Hubble enablement section attempted to manage `cilium-config` directly through a ConfigMap. AKS manages Cilium configuration and does not support arbitrary ConfigMap changes, so this was replaced with an ACNS `ContainerNetworkLog` example and Hubble CLI access using the documented Hubble Relay mTLS setup.
- The Hubble UI section installed the upstream Cilium Helm chart, which is inappropriate for managed AKS Cilium because it would attempt to manage Cilium itself. Replaced it with a Flux-manageable Hubble UI manifest using the AKS-specific RBAC, nginx config, relay client certificate mount, and Microsoft-hosted Hubble UI images.
- The verification and troubleshooting commands referenced `cilium status` and claimed Cilium could not be added to existing clusters. Updated these parts to use Kubernetes checks for Hubble Relay and to reflect that eligible existing Azure CNI clusters can be updated to Cilium, with node pool reimaging.

## Review Notes
The post is technically relevant and useful after correction. The Hubble UI manifest follows the AKS container network logs documentation pattern; production use should still review image versions, access controls, and exposure method before publishing the UI.
