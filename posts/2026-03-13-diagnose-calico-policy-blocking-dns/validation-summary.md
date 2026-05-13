# Validation Summary: How to Diagnose Calico Policy Blocking DNS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes NetworkPolicy
- Kubernetes DNS and CoreDNS
- kubectl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy

## Issues Found
- The introduction said a default-deny egress policy without UDP port 53 allows would affect all pods in the namespace. Kubernetes NetworkPolicy egress isolation applies to pods selected by a policy, so this was changed to "all selected pods" and UDP/TCP port 53.
- The symptom list included `NXDOMAIN` as a typical sign of policy blocking. NXDOMAIN is a DNS response indicating the queried name does not exist, not evidence that Calico blocked access to DNS. This was changed to DNS resolution failures and timeouts.
- The CoreDNS reachability test used `nc -zuv` against UDP port 53. UDP netcat probes are not a reliable DNS reachability test because UDP has no connection handshake and the command does not issue a DNS query. This was changed to run `nslookup` directly against the CoreDNS service IP.
- The test pod cleanup and exec commands omitted `-n default`, which could run against the wrong namespace if the user's kubectl context has a different default namespace. The namespace flag was added.
- The Mermaid flowchart grouped `SERVFAIL` and `NXDOMAIN` as the key branch. This was adjusted to distinguish timeouts/refusals from DNS error responses.

## Review Notes
- The post remains intentionally high level and points to a companion fix post for exact YAML. A future improvement could include a note that Calico policy syntax differs between Kubernetes `networking.k8s.io/v1` NetworkPolicy and Calico `projectcalico.org/v3` NetworkPolicy.
