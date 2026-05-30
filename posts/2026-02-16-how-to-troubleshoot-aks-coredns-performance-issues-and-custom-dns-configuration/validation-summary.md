# Validation Summary: How to Troubleshoot AKS CoreDNS Performance Issues and Custom DNS Configuration

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes DNS and Pod DNS configuration
- CoreDNS
- NodeLocal DNSCache and AKS LocalDNS
- Kubernetes cluster-proportional-autoscaler
- Prometheus metrics and PromQL
- kubectl and Azure CLI

## Sources Consulted
- Microsoft Learn: Customize CoreDNS for Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/coredns-custom
- Microsoft Learn: Configure LocalDNS in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/localdns-custom
- Microsoft Learn: Autoscaling CoreDNS in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/coredns-autoscale
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes documentation: DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes SIGs: cluster-proportional-autoscaler: https://github.com/kubernetes-sigs/cluster-proportional-autoscaler
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/

## Issues Found
- The post listed pods stuck in `ContainerCreating` while resolving image registry names as a CoreDNS symptom. Image registry access is handled by the node runtime/kubelet path, not by the pod's in-cluster DNS configuration, so this was changed to application or init container startup delays caused by DNS lookups.
- The NodeLocal DNSCache section implied AKS exposes upstream NodeLocal DNSCache through a node configuration profile and showed applying the upstream manifest URL directly. Current AKS documentation describes the managed LocalDNS feature configured at node-pool level with `az aks nodepool update --localdns-config`, while upstream NodeLocal DNSCache manifests require placeholder substitution before applying. The section was corrected to distinguish AKS LocalDNS from upstream NodeLocal DNSCache.
- The pod `dnsConfig` example used `169.254.20.10` as if it were universally correct for AKS. The example was clarified as an upstream NodeLocal DNSCache address, with AKS LocalDNS commonly using `169.254.10.10` or `169.254.10.11`.
- The `single-request-reopen` explanation overstated it as the key fix for the 5-second timeout. It was revised to describe it as a glibc client-side workaround, with NodeLocal DNSCache or AKS LocalDNS as the cluster-level mitigation.
- The CoreDNS autoscaler formula was written as multiplication by `coresPerReplica` and `nodesPerReplica`. The documented formula divides by those values, so the text was corrected to `ceil(cores / coresPerReplica)` and `ceil(nodes / nodesPerReplica)`.
- The post said the AKS CoreDNS autoscaler uses linear scaling. AKS supports both `linear` and `ladder` modes, and current default examples use `ladder`, so the text now says the formula applies when `linear` mode is configured.
- The CoreDNS metrics example used a hard-coded IP address for `:9153`, which might not be the CoreDNS metrics endpoint in a given cluster. The command was replaced with `kubectl port-forward` to the CoreDNS deployment followed by a local `curl`.

## Review Notes
The post is technically relevant and salvageable. Future improvements could add explicit AKS LocalDNS prerequisites, such as Kubernetes 1.31+, Azure CLI 2.80.0+, supported node OS versions, and the node-pool reimage impact when enabling LocalDNS.
