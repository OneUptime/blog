# Validation Summary: Conflicting Node CIDRs in Cilium IPAM

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium IPAM
- Kubernetes networking
- Kubernetes ServiceCIDR and PodCIDR allocation
- kubectl
- Helm
- Hubble
- jq
- Python ipaddress

## Sources Consulted
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium Cluster-Pool IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-cluster-pool/
- Cilium Kubernetes Host Scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup.html
- Cilium troubleshooting documentation for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Kubernetes `kubectl debug` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes ServiceCIDR documentation: https://kubernetes.io/docs/tasks/network/reconfigure-default-service-ip-ranges/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The service CIDR discovery command used `kubectl cluster-info dump`, `grep -P`, and `service-cluster-ip-range` scraping. This is fragile and misses the current Kubernetes ServiceCIDR API introduced in newer clusters. I changed the examples to prefer `kubectl get servicecidr kubernetes` and fall back to kube-apiserver flag inspection.
- The routing and tcpdump examples used the `ubuntu` image, which is not a reliable debugging image for tools like `tcpdump` and `traceroute`. I changed those node debug examples to use `nicolaka/netshoot`, matching the rest of the post's networking-tool usage.
- The "comprehensive" CIDR audit script collected node IPs but did not use them, and it only counted pod CIDR overlaps. I updated it to check pod CIDR overlaps against other pod CIDRs, node InternalIPs, and ServiceCIDRs when the ServiceCIDR API is available.
- The Hubble `jq` pipeline ended with `-f`, which makes jq look for a filter file and breaks the command. I removed `-f` and made the filter null-safe for flows without `drop_reason_desc`.
- The Cilium monitor command used `cilium monitor --type drop -f`. Current Cilium documentation uses `cilium-dbg monitor --type drop`, so I updated the command accordingly.
- The CronJob example only collected CiliumNode JSON rather than performing an overlap audit. I renamed the comment from "Weekly CIDR audit" to "Weekly CIDR inventory" so the example accurately describes what it does.

## Review Notes
The post is technically relevant and the main Cilium IPAM claims are consistent with current Cilium documentation. Some commands remain environment-dependent, especially service CIDR discovery on managed Kubernetes clusters where control-plane pods may not be visible and ServiceCIDR may not be available on older clusters.
