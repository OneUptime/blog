# Validation Summary: How to Troubleshoot Pod Unable to Reach External Endpoints

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes pods and pod networking
- kubectl exec, debug, logs, and run commands
- Kubernetes DNS and CoreDNS forwarding
- Kubernetes NetworkPolicy egress rules
- Cloud provider egress, NAT gateways, firewalls, and route tables
- TLS certificate validation and CA bundles
- HTTP proxy configuration
- MTU diagnostics and packet capture
- Istio ServiceEntry egress configuration
- kube-proxy masquerading and CNI SNAT behavior

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes NetworkPolicy concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes namespace documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes kube-proxy reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward
- Amazon EKS outbound internet access for Pods: https://docs.aws.amazon.com/eks/latest/userguide/external-snat.html
- Amazon EKS VPC and subnet considerations: https://docs.aws.amazon.com/eks/latest/best-practices/subnets.html
- Google Kubernetes Engine private cluster and Cloud NAT guidance: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/legacy/network-isolation
- Azure Kubernetes Service egress outbound types: https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio external services egress control: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- OpenSSL s_client documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- tcpdump local manual page (`man tcpdump`) for capture filter expression syntax

## Issues Found
- The DNS example described `10.96.0.10` as the typical cluster DNS address. Updated the wording to clarify that this depends on the cluster Service CIDR.
- The NetworkPolicy DNS egress example selected the `kube-system` namespace with `name: kube-system`, which only works if that custom label exists. Changed it to the standard immutable namespace label `kubernetes.io/metadata.name: kube-system`.
- The NAT/source IP section implied all pods use NAT and should always appear as the node public IP. Updated it to describe common IPv4 SNAT behavior and account for NAT gateways or configured egress gateways.
- The internet gateway/NAT gateway section implied NAT or internet gateways are universally required. Updated it to refer more generally to the appropriate egress path for the cluster topology.
- The `openssl s_client` command omitted SNI, which can return the wrong certificate from virtual-hosted TLS endpoints. Added `-servername api.example.com`.
- The CA certificate update example implied `update-ca-certificates` always exists and that changes are durable. Added a note that the tool is image-dependent and `kubectl exec` changes do not persist after replacement.
- The tcpdump filter was focused only on the destination host while the surrounding text said to look for DNS traffic. Updated the filter to include port 53 and added a note to use a resolved IP when DNS itself is failing.
- The CoreDNS pod exec command used a placeholder pod name. Changed it to `deploy/coredns`, which is supported by `kubectl exec` resource targeting when the deployment exists.
- The kube-proxy section overstated kube-proxy's role in direct pod egress. Updated the explanation to distinguish Service traffic masquerading from CNI, ip-masq-agent, and cloud-provider SNAT behavior.

## Review Notes
The remaining examples are valid as troubleshooting patterns, but several commands depend on tools being present in the container image (`ping`, `curl`, `dig`, `nslookup`, `nc`, `openssl`, `tcpdump`) and on provider-specific cluster configuration. The post correctly frames these as diagnostics rather than universally available application-container commands.
