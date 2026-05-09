# Validation Summary: How to Test Network Policies with Calico on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Calico
- Kubernetes NetworkPolicy
- Kubernetes Services
- kubectl
- Azure CNI
- Azure Load Balancer

## Sources Consulted
- Microsoft Learn: Secure Pod Traffic with Network Policies in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Best practices for network policies in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl expose: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico documentation: Felix configuration: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig

## Issues Found
- The original deployment created `db-sim` as an nginx pod with container port 5432 and then tested `http://db-sim.aks-policy-test.svc.cluster.local:5432`, but no `db-sim` Service was created and nginx does not listen on port 5432 by default. I changed `db-sim` to expose port 80 and added a `kubectl expose pod db-sim` command so the negative connectivity test targets a real Service.
- The original `wget --timeout` examples relied on a long option that is not portable for the BusyBox image used by the test pod. I changed them to BusyBox-compatible `wget -T` commands.
- The post stated that AKS uses Azure CNI for routing and that policies are enforced entirely at the Linux iptables level by Felix. I changed the wording to scope the claim to AKS clusters using Azure CNI with Calico, where Azure CNI handles pod networking and Calico handles policy enforcement. This avoids overstating the dataplane detail and aligns with AKS documentation.
- The post said AKS-specific testing should verify Azure Private Link traffic behavior, but the tutorial does not configure or test Private Link. I removed that claim and kept the LoadBalancer-specific guidance.
- The post said LoadBalancer traffic is subject to Calico policies without qualification. Kubernetes documents that source IP handling for external Service traffic can vary depending on the network plugin, cloud provider, and Service implementation, so I updated the wording to focus on allowed backend reachability and note the source IP caveat.

## Review Notes
AKS documentation currently recommends Cilium for AKS network policy and describes Calico as an open-source third-party solution with limited Microsoft support focused on AKS integration. The Calico-based tutorial remains technically relevant for clusters that use Calico, but future revisions should consider noting Cilium as the recommended AKS option.
