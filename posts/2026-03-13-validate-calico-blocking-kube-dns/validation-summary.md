# Validation Summary: How to Validate Resolution of Calico Blocking kube-dns

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- CoreDNS
- Calico
- calicoctl
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy

## Sources Consulted
- Kubernetes kubectl run reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes DNS debugging guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The DNS validation loop checked for the string `Address`, which can appear in failed BusyBox `nslookup` output because the DNS server address is printed before the lookup result. Changed the loop to use the command exit status and print the failed output only on failure.
- The DNS validation loop used `kubectl run --timeout=10s`, but `--timeout` is the deletion timeout for `kubectl run`, not the wait time for the pod to become runnable. Changed it to `--pod-running-timeout=30s`, which matches the documented kubectl flag for waiting for a pod to run.
- The CoreDNS metrics command used `kubectl exec ... wget` inside a CoreDNS pod. CoreDNS containers are not guaranteed to include `wget`, and kubectl documentation only guarantees execution of commands present in the target container. Changed the example to use `kubectl port-forward` and local `curl` against the documented CoreDNS prometheus endpoint.

## Review Notes
The Calico `calicoctl get globalnetworkpolicy` command and Kubernetes `kubectl get networkpolicy -n kube-system` command are consistent with current Calico and Kubernetes documentation. The CoreDNS `coredns_dns_requests_total` metric and default prometheus endpoint `localhost:9153/metrics` are documented by CoreDNS, but the metric is available only when the CoreDNS prometheus plugin is enabled.
