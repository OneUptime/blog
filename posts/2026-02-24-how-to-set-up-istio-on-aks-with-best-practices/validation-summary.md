# Validation Summary: How to Set Up Istio on AKS with Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Istio and istioctl
- Kubernetes manifests
- Azure CNI and Azure CNI Overlay
- AKS load balancer annotations
- Microsoft Entra Workload ID
- Azure Key Vault Secrets Store CSI Driver
- Istio Gateway TLS and mTLS
- Azure Monitor / Container Insights

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio canary and revision-based upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- AKS public Standard Load Balancer configuration and annotations: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- AKS Azure CNI Overlay documentation: https://learn.microsoft.com/en-in/azure/aks/azure-cni-overlay
- AKS CNI networking concepts: https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview
- AKS network policies: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Entra Workload ID on AKS overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Entra Workload ID deployment on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Azure Key Vault provider for Secrets Store CSI Driver on AKS: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- AKS Key Vault CSI TLS example: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-nginx-tls
- Secrets Store CSI Driver sync-as-Kubernetes-secret documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret.html
- Azure CLI AKS command reference: https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
- The Workload Identity manifest put `azure.workload.identity/use: "true"` on the ServiceAccount. Microsoft documentation requires that label on the application pod template for webhook mutation. I removed it from the ServiceAccount snippet and added a pod template label snippet.
- The Istio Gateway selector used Kubernetes `matchLabels` syntax. Istio's `Gateway.spec.selector` is a `map<string,string>`, so I changed it to `istio: ingressgateway`.
- The Key Vault CSI section implied that creating a `SecretProviderClass` alone syncs the Kubernetes TLS secret. Secrets Store CSI only syncs `secretObjects` after a pod mounts the `SecretProviderClass`, so I added that requirement before the Gateway manifest.
- The Azure CNI section said to size the subnet for pods plus sidecars and that each pod with a sidecar consumes one IP. A sidecar is a container inside the same pod and does not consume an additional pod IP, so I corrected the wording.

## Review Notes
- The AKS and Istio commands are broadly current and align with official documentation.
- AKS documentation currently recommends Cilium for network policy where it fits, but `--network-policy calico` remains documented and valid.
- The Istio sample addons are useful for evaluation and basic mesh telemetry, but production monitoring usually needs hardened, persistent, and upgraded observability components.
