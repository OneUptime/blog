# Validation Summary: How to Diagnose Calico iptables Rules Not Applied

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
- nftables
- Prometheus metrics

## Sources Consulted
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico nftables dataplane guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Local iptables help output: `iptables v1.8.10 (nf_tables)`

## Issues Found
- The readiness check comment said the `wget -qO-` command should show a `200 OK` response. With quiet output, the command validates success through its exit status and response body rather than printing the HTTP status line, so the expected output was changed to "Successful response."
- The FelixConfiguration checklist included `datastoreType`, which is not a FelixConfiguration field to inspect for iptables dataplane behavior. It was removed.
- The configuration discussion said Felix might have iptables programming disabled. Current Calico configuration is more accurately described as using native nftables or eBPF instead of the iptables dataplane, so the wording and fields to inspect were updated to include `nftablesMode` and `bpfEnabled`.
- The Prometheus metric was named `felix_iptables_restore_errors_total`, but the Calico Felix metrics reference documents it as `felix_iptables_restore_errors`. The metric name was corrected in the best practices and conclusion.

## Review Notes
The commands are generally valid for operator-style Calico installations using the `calico-system` namespace and `k8s-app=calico-node` label. Some clusters install Calico in `kube-system` or use different labels, so operators may need to adjust the namespace or selector for their environment.
