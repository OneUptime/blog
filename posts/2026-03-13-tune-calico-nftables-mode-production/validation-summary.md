# Validation Summary: How to Tune Calico in nftables Mode for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- kube-proxy nftables mode
- Linux nftables
- Linux conntrack sysctls
- Prometheus metrics

## Sources Consulted
- Calico nftables data plane documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico FelixConfiguration CRD from Project Calico v3.32.0: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/operator-crds.yaml
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Linux kernel conntrack sysctl documentation: https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The prerequisites listed Linux 5.2+ only. Current Calico nftables documentation requires Linux 5.13+ with `nft` 1.0.1+, and Calico requires kube-proxy in nftables mode with Kubernetes 1.31+. Updated the prerequisites accordingly.
- The Felix tuning example used `iptablesBackend: "nft"` and `iptablesRefreshInterval` for nftables mode. `iptablesBackend` controls the iptables userspace backend and is not the Calico nftables dataplane switch. Replaced those fields with `nftablesMode: "Enabled"` and `nftablesRefreshInterval`.
- The post claimed nftables set limits could be increased with `net.netfilter.nf_conntrack_expect_max`. That sysctl controls conntrack expectation entries, not nftables set element limits. Replaced the section with set-usage inspection guidance.
- The nftables inspection command assumed a specific `ip calico-filter` table. To avoid depending on an undocumented table name or family, changed the examples to inspect the full ruleset.
- The post stated policy application should complete in under one second. Calico's recommended metric guidance says thresholds vary by cluster size and churn, so the fixed target was replaced with baseline-based guidance.
- The conclusion described nftables-specific kernel parameters for set management. Updated it to standard Linux conntrack capacity checks and nftables ruleset inspection.

## Review Notes
The conntrack sysctl values are syntactically valid Linux sysctls, but production values should still be capacity-tested per node size and workload. `nf_conntrack_buckets` is only writable in the initial network namespace according to the Linux kernel documentation.
