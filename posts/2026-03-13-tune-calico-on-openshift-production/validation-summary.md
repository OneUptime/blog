# Validation Summary: How to Tune Calico on OpenShift for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- OpenShift
- Kubernetes
- Tigera Operator
- Calico Felix
- Calico IPAM
- VXLAN
- Prometheus and OpenShift monitoring

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Change IP pool block size, https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Install an OpenShift 4 cluster with Calico, https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- OpenShift documentation: Troubleshooting monitoring issues and ServiceMonitor resources, https://docs.openshift.com/container-platform/4.18/support/troubleshooting/diagnosing-oc-issues.html

## Issues Found
- The post implied VXLAN is typical for all OpenShift Calico installations. Current Calico documentation includes OpenShift eBPF behavior and multiple dataplane options, so the MTU step now applies specifically when VXLAN is in use.
- The MTU patch and verification commands used the ambiguous `installation default` resource, and the patch command used `kubectl`. Calico's MTU documentation uses the fully qualified `installation.operator.tigera.io` resource, and OpenShift examples should use `oc`, so the commands were updated.
- The Felix timer section said the settings improve policy update speed. The documented fields are refresh/reconciliation intervals and status reporting settings, so the wording now describes faster dataplane drift detection with a CPU tradeoff.
- The IPAM section patched `spec.blockSize` on an existing IPPool. Calico documents that `blockSize` cannot be edited directly after installation, so the example was changed to an install-time Tigera Operator `Installation` snippet and the text now calls out migration for existing clusters.
- The Prometheus step applied a generic Calico Prometheus manifest, which does not specifically configure OpenShift's built-in monitoring stack. The example now enables Felix metrics and creates a Service plus ServiceMonitor for OpenShift user workload monitoring.
- The conclusion overstated policy convergence and safe applicability. It now reflects the corrected MTU, Felix, IPAM, and monitoring behavior.

## Review Notes
The examples still require cluster-specific validation, especially the selected IP pool CIDR, encapsulation mode, OpenShift user workload monitoring configuration, and whether the Calico installation is using eBPF, iptables, VXLAN, IP-in-IP, or no overlay.
