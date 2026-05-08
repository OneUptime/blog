# Validation Summary: How to Validate Calico ClusterIP Service Policies Before Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes Services and ClusterIP
- Kubernetes service networking
- calicoctl
- kubectl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico policy for externally exposed ClusterIPs: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico overview of Kubernetes Services and policy enforcement: https://docs.tigera.io/calico-enterprise/latest/network-policy/get-started/about-kubernetes-services
- Kubernetes Service ClusterIP allocation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/

## Issues Found
- The first egress rule defined `destination` twice. In YAML, the later key would override the earlier one, so the intended `app == 'database'` selector would be lost. I merged the selector and port under a single `destination` block.
- The DNS egress example only allowed UDP port 53 manually. I changed it to use Calico's `destination.services` match for the `kube-dns` service in `kube-system`, which lets Calico derive the service endpoints and ports from Kubernetes.
- The introduction referred to "ClusterIP Service Policies" as though they were a distinct Calico resource and implied all ClusterIP services are externally reachable. I changed the wording to describe Calico NetworkPolicies protecting pods backing Services and clarified the externally advertised ClusterIP case.
- The architecture diagram said denied traffic was "Blocked at Node." For the shown namespaced NetworkPolicy, enforcement is policy-based on the selected endpoints rather than necessarily a host endpoint rule. I changed the label to "Blocked by Policy."
- The conclusion repeated "policies" and used the same imprecise "ClusterIP Service Policies" wording. I changed it to "Calico NetworkPolicies."

## Review Notes
The post is now technically valid as a concise guide. In a future expansion, it could distinguish standard in-cluster ClusterIP access from Calico's documented pattern for ClusterIPs advertised outside the cluster with BGP, where host endpoint, `preDNAT`, and `applyOnForward` policy can be required depending on traffic mode.
