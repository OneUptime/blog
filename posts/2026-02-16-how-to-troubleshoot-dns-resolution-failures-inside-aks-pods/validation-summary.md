# Validation Summary: How to Troubleshoot DNS Resolution Failures Inside AKS Pods

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes DNS for Services and Pods
- CoreDNS
- Kubernetes NetworkPolicy
- kubectl
- Azure CLI
- Azure-provided DNS resolver
- AKS LocalDNS and Kubernetes NodeLocal DNSCache

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Microsoft Learn, Customize CoreDNS for AKS: https://learn.microsoft.com/en-us/azure/aks/coredns-custom
- Microsoft Learn, Autoscaling CoreDNS in AKS: https://learn.microsoft.com/en-us/azure/aks/coredns-autoscale
- Microsoft Learn, Configure LocalDNS in AKS: https://learn.microsoft.com/en-us/azure/aks/localdns-custom
- Microsoft Learn, Azure IP address 168.63.129.16 overview: https://learn.microsoft.com/en-in/azure/virtual-network/what-is-ip-address-168-63-129-16
- Microsoft Learn, Azure CLI az network vnet reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet
- Microsoft Learn, Azure subscription and service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits

## Issues Found
- Clarified that Kubernetes DNS returns the Service ClusterIP for normal Services but returns selected Pod IPs for headless Services. The original wording implied all Services resolve to a ClusterIP.
- Replaced the `kubectl get events --field-selector reason=OOMKilling` example with a pod status inspection command, because `OOMKilled` is normally observed as a container termination reason rather than a reliable Event reason.
- Updated CoreDNS customization guidance for AKS. AKS manages the main CoreDNS Corefile, and supported customizations should use the `coredns-custom` ConfigMap naming convention.
- Reworded the CoreDNS scaling/resource guidance to match AKS documentation for CoreDNS autoscaling and managed add-on resource customization.
- Updated local DNS cache guidance to mention AKS LocalDNS as the AKS-native option and Kubernetes NodeLocal DNSCache as another option, with the note that both should not be enabled together.

## Review Notes
The commands and YAML examples are otherwise syntactically valid. `kubectl` and `az` were not installed in the local environment, so command verification was performed against official Kubernetes and Azure CLI references rather than local `--help` output.
