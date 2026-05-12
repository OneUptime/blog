# Validation Summary: How to Prevent Calico iptables Rules Not Being Applied

## Status
validated

## Post Type
Tutorial / Prevention Guide

## Technologies Covered
- Calico (CNI)
- Felix (Calico dataplane agent)
- Kubernetes
- iptables (legacy & nftables backends)
- Linux kernel modules (xt_conntrack, ip_tables, ip6_tables, iptable_filter, iptable_nat)
- Prometheus / prometheus-operator (PrometheusRule CRD)
- calicoctl CLI
- cloud-init

## Sources Consulted
- Calico Project Felix documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration API reference (iptablesBackend values: `Legacy`, `NFT`, `Auto`)
- Calico Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- prometheus-operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/
- Kubernetes priority class documentation (`system-node-critical`)
- Linux kernel iptables module documentation

## Issues Found
No technical issues found. Verified items:
- `iptablesBackend` values (`Auto`, `Legacy`, `NFT`) are valid FelixConfiguration spec field values.
- `prometheusMetricsEnabled` is the correct FelixConfiguration field for enabling Felix Prometheus metrics.
- `felix_iptables_restore_errors_total` is a real Felix-exposed Prometheus metric.
- `calicoctl patch felixconfiguration default --patch '{...}'` syntax is valid.
- Listed kernel modules (`xt_conntrack`, `ip_tables`, `ip6_tables`, `iptable_filter`, `iptable_nat`) are correct module names for iptables-based Calico operation.
- `calico-system` is the correct namespace for operator-installed Calico (Tigera operator default).
- `system-node-critical` is a valid built-in Kubernetes PriorityClass.
- The PrometheusRule manifest uses correct `monitoring.coreos.com/v1` apiVersion and CRD structure.
- The bash script logic (lsmod/modinfo/modprobe combinations) is correct.

## Review Notes
- The post mentions `4.14+` for eBPF kernel support. While eBPF features have existed since 4.14, current Calico documentation recommends 5.3+ for the eBPF dataplane to access full feature support. The 4.14+ claim is not wrong (minimum eBPF availability) but readers using eBPF should consult current Calico docs for the dataplane mode they intend to use.
- The cloud-init snippet uses `/etc/modules` (Debian/Ubuntu style) for module persistence. RHEL/CentOS/Fedora typically uses `/etc/modules-load.d/*.conf` instead. The accompanying `apt-get || yum` fallback makes the snippet partially cross-distro, but the module-persistence line is Debian-specific. Not a technical error, but worth noting for RHEL users adapting the snippet.
- The script requires root privileges for `modprobe` and `lsmod` reading some details — not a correctness issue, but readers should run with sudo.
- The default namespace assumption (`calico-system`) only applies to operator-based installs; manifest-based installs use `kube-system`. The post does not call this out.
