# Validation Summary: How to Troubleshoot DNS Resolution Failures for IPv4 in Kubernetes Pods

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- CoreDNS
- DNS resolution
- Pod DNS configuration
- NetworkPolicy
- kubectl

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Linux resolv.conf manual: https://man7.org/linux/man-pages/man5/resolver.5.html

## Issues Found
- The original network connectivity check used `wget` against `http://10.96.0.10`, which tests HTTP on TCP port 80 rather than DNS on port 53. Replaced it with a Kubernetes service check that verifies `kube-dns` exposes `53/UDP` and `53/TCP`, and clarified that a direct `nslookup` timeout points to possible DNS traffic blocking.
- The original `ndots:5` explanation said `google.com` triggers 5 search domain queries before the bare name. Corrected this to say that names with fewer than 5 dots are tried with the configured search domains before the bare name; the number of extra queries depends on the search list.
- The NetworkPolicy guidance only called out UDP port 53. Updated it to mention DNS egress on both UDP and TCP port 53, matching the Kubernetes DNS service ports.

## Review Notes
The guide assumes the common CoreDNS deployment and service conventions: CoreDNS pods labeled `k8s-app=kube-dns`, a service named `kube-dns`, and a cluster DNS service IP such as `10.96.0.10`. Those conventions are consistent with Kubernetes documentation, but actual service IPs and cluster domains vary by cluster.
