# Validation Summary: How to Fix Felix Not Starting in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Felix
- Kubernetes
- kubectl
- calicoctl
- iptables
- Linux kernel modules
- etcd

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl overview and in-cluster service account configuration notes: https://kubernetes.io/docs/reference/kubectl/
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico system requirements for Kubernetes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico on-premises install and etcd datastore configuration: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico installation customization options for calico-config: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico calicoctl etcd datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd

## Issues Found
- The Kubernetes datastore connectivity check used `wget` with `curl`-only flags (`-w` and the output-file behavior of `-o`) and evaluated the service-account token on the local machine rather than inside the pod. I replaced it with a `kubectl exec ... sh -c` command that reads the token and CA certificate inside the container and uses either `curl` or `wget` correctly.
- The ConfigMap patch claimed to update a datastore endpoint but patched `cluster_type`, which is not the etcd endpoint field documented for `calico-config`. I changed the example to patch `etcd_endpoints` for etcd datastore deployments.
- The iptables-legacy note stated that legacy iptables is required for some kernel versions. Calico documentation says both legacy and nft variants are supported, so I changed the wording to use `iptables-legacy` only when the cluster is configured for it.
- The kernel module section claimed Felix requires a fixed list of specific modules. Calico documentation notes that module names vary and describes broader requirements: iptables/netfilter modules, IP sets, and conntrack support. I updated the wording and added `ip_set` to the common example list.

## Review Notes
The post is technically relevant and remains a valid troubleshooting guide. Some operational details are environment-specific, especially package manager commands, Calico namespace naming, and exact kernel module names across Linux distributions.
