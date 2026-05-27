# Validation Summary: How to Troubleshoot MetalLB Service IP Not Reachable from Outside the Cluster

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes kube-proxy
- MetalLB layer 2 mode
- MetalLB BGP mode
- ARP and NDP
- iptables, nftables, and IPVS
- tcpdump, arping, curl, ufw, and firewalld

## Sources Consulted
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB API reference for ServiceL2Status and ServiceBGPStatus: https://metallb.io/apis/
- MetalLB FAQ for advertisement status resources: https://metallb.io/faq/
- MetalLB official installation manifest CRD and speaker labels: https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/manifests/metallb-native.yaml
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Service documentation, including deprecated Endpoints guidance: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Local command help for iptables.

## Issues Found
- The post used `kubectl get endpoints` for service backend checks. The Kubernetes Endpoints API is deprecated in v1.33+, and Kubernetes recommends EndpointSlices for current endpoint state. Changed the examples and diagnostic script to use `kubectl get endpointslices -l kubernetes.io/service-name=...`.
- The post said kube-proxy creates only iptables or IPVS rules. Current Kubernetes also has nftables proxy mode, and IPVS is deprecated in current Kubernetes documentation. Updated the text and command examples to include nftables and mark IPVS as older/deprecated.
- The iptables comment said to look for DNAT rules directly in `KUBE-SERVICES`. In iptables mode, that chain may show rules matching the LoadBalancer IP and jumping to service-specific chains rather than direct pod DNAT rules. Updated the comment to describe what the command actually verifies.
- The pod readiness `custom-columns` command was not valid bash because the JSONPath filter contained unquoted parentheses. Quoted the output argument so the shell parses it correctly.
- The MetalLB diagnostic script looked for `ServiceL2Status` resources in the service namespace. MetalLB status resources are created in the MetalLB namespace, commonly `metallb-system`, and are labeled with the service namespace. Updated the script to query `metallb-system` and filter by both `metallb.io/service-name` and `metallb.io/service-namespace`.
- The MetalLB status examples used singular resource names. The singular names are valid CRD aliases, but the official MetalLB examples use `servicel2statuses` and `servicebgpstatuses`. Updated the examples to the documented plural resource names.

## Review Notes
The remaining commands are general troubleshooting commands and depend on the cluster configuration, installed node tools, and container image contents. For example, `netstat` may not be installed in minimal application containers, and the `jq` dependency in the diagnostic script must be available wherever the script is run.
