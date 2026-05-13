# Validation Summary: How to Diagnose Calico Blocking kube-dns

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- CoreDNS / kube-dns
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- calicoctl
- iptables

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Debugging DNS Resolution documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post stated that every pod or no pod in the cluster would be affected. I changed this to pods using the cluster DNS service, because pods with custom DNS configuration may not depend on CoreDNS.
- The post described CoreDNS pods as responding with errors and logs showing incoming connection errors. I changed this to query failures/timeouts and logs that may show errors or no matching queries, because dropped ingress traffic may never reach CoreDNS.
- The post only mentioned UDP 53 for DNS policy allow rules. I updated the relevant claims to UDP and TCP 53, matching the kube-dns Service exposure documented by Kubernetes.
- The first `kubectl run` example used `--timeout=10s` as if it limited the DNS test. I removed it because the kubectl reference defines `--timeout` there as a deletion timeout, not a command runtime timeout.
- The direct CoreDNS connectivity test used `nc -zuv`, which is not consistently supported by BusyBox netcat and is not a reliable DNS query test. I changed it to run `nslookup` against the CoreDNS pod IP from a temporary BusyBox pod.

## Review Notes
The commands are generally valid for standard Kubernetes clusters where CoreDNS is exposed through the `kube-dns` Service and pods carry the `k8s-app=kube-dns` label. The example namespace list in Step 1 assumes those namespaces exist; readers should substitute namespaces from their own cluster.
