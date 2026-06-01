# Validation Summary: How to Configure AKS with Bring Your Own CNI Plugin

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Bring Your Own CNI (BYO CNI)
- Cilium
- Cilium Helm chart
- Hubble
- Calico
- Kubernetes NetworkPolicy and CiliumNetworkPolicy
- Azure CLI, kubectl, and Helm

## Sources Consulted
- Microsoft Learn: Bring Your Own CNI plugin with AKS - https://learn.microsoft.com/en-us/azure/aks/use-byo-cni
- Cilium documentation: Installation using Helm - https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium documentation: Cilium Quick Installation - https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium documentation: Helm values reference - https://docs.cilium.io/en/stable/helm-values/
- Cilium documentation: Routing concepts - https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium documentation: Layer 7 policies - https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium documentation: Setting up Hubble Observability - https://docs.cilium.io/en/stable/gettingstarted/hubble_setup/
- Tigera documentation: Installing Calico on AKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/aks

## Issues Found
- The opening section described AKS as having only Azure CNI and kubenet built-in options. Updated it to mention current managed options, including Azure CNI Overlay and Azure CNI Powered by Cilium.
- The AKS BYO CNI create command omitted `--pod-cidr`. Microsoft documentation now states a pod CIDR must be specified so the control plane can route to pod IPs when using BYO CNI. Added `--pod-cidr "10.244.0.0/16"`.
- The Cilium Helm values used an invalid `kubeProxyReplacement` YAML shape and an outdated tunnel configuration shape. Replaced these with valid current Helm values: `routingMode: tunnel`, `tunnelProtocol: vxlan`, and `kubeProxyReplacement: false`.
- The Cilium install example used an older chart version. Updated examples to Cilium `1.19.4`, matching the current stable documentation consulted.
- The post implied kube-proxy replacement should be enabled by default for AKS BYO CNI. Adjusted the configuration and text to keep AKS-managed kube-proxy unless kube-proxy-free operation is explicitly planned.
- The Calico example used an older version and skipped the Calico CRD manifest required by the current Tigera operator install flow. Updated it to Calico `v3.32.0`, added the CRD manifest, and aligned the Installation resource with Tigera's AKS BYO CNI guidance.
- The post made overbroad claims about Linkerd CNI and Azure CNI policy capabilities. Reworded them to avoid implying Linkerd's CNI plugin is itself a service mesh and to distinguish Cilium L7 policy from standard Kubernetes NetworkPolicy behavior.

## Review Notes
The commands could not be run against a live AKS cluster in this workspace because `az`, `kubectl`, and `helm` are not installed locally. YAML syntax for the corrected Cilium and Calico configuration snippets was checked with PyYAML.
