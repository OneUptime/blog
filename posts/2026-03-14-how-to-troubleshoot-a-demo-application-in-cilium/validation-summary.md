# Validation Summary: Troubleshooting a Demo Application Secured with Cilium

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumEndpoint
- Kubernetes
- kubectl
- Hubble CLI
- Mermaid
- jq

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium policy enforcement documentation: https://docs.cilium.io/en/stable/security/network/policyenforcement.html
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium DNS policy documentation: https://docs.cilium.io/en/stable/security/dns.html
- Cilium Kubernetes constructs in policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Hubble setup and CLI access documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
No technical issues found.

## Review Notes
The DNS policy example is valid for the common kube-dns/CoreDNS label pattern in Kubernetes clusters using Cilium. Clusters with different DNS namespaces, ports, or labels, such as some OpenShift installations, would need to adjust the selector and port. The Hubble examples assume Hubble Relay/API access is configured for the local Hubble CLI, as stated in the prerequisites.
