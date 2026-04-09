# Validation Summary: How to Optimize Ceph Network Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Linux kernel TCP/network tuning (sysctl)
- ethtool (NIC offload and ring buffer configuration)
- Multus CNI (Kubernetes multi-network plugin)
- iperf3 (network throughput testing)
- Prometheus (metrics and monitoring)
- IRQ affinity / smp_affinity (CPU interrupt binding)
- BBR congestion control

## Sources Consulted
- Ceph documentation on network configuration: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Rook CephCluster CRD network spec: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#network-configuration
- Linux kernel sysctl documentation for net.ipv4 and net.core parameters: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- ethtool man page for offload (-K), ring buffer (-G), and coalescing (-C) options
- Linux kernel IRQ affinity documentation: https://www.kernel.org/doc/Documentation/IRQ-affinity.txt
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph messenger v2 configuration reference: https://docs.ceph.com/en/latest/rados/configuration/msgr2/

## Issues Found

### 1. Incorrect Rook network configuration for host provider
- **What was wrong:** The CephCluster YAML used `selectors` with CIDR values (`"10.0.1.0/24"`, `"192.168.10.0/24"`) under `provider: host`. The `selectors` field is designed for Multus `NetworkAttachmentDefinition` references, not CIDR ranges. With host networking, the correct field is `addressRanges` (introduced in Rook v1.11+), which takes a list of CIDRs for public and cluster networks.
- **What was changed:** Replaced `selectors` with `addressRanges` and restructured the values as list items (e.g., `- "10.0.1.0/24"`) to match the correct CRD schema.
- **Why:** Using `selectors` with CIDRs under host networking would be silently ignored or cause a validation error, meaning the cluster would not actually get separate public/cluster networks.

### 2. Incorrect IRQ affinity hex bitmask and comments
- **What was wrong:** The comment said "Bind to specific CPUs (CPU 4-7 for the NIC)" but the hex bitmask written was `c0`. Hex `c0` = binary `11000000` = CPUs 6 and 7 only. The inline comment also incorrectly stated "CPUs 0-3 in hex bitmask." Both comments contradicted each other and neither matched the actual bitmask value.
- **What was changed:** Changed the bitmask from `c0` to `f0` (binary `11110000` = CPUs 4-7) to match the stated intent. Updated the inline comment to say "CPUs 4-7 in hex bitmask."
- **Why:** The wrong bitmask would bind NIC interrupts to only 2 CPUs instead of the intended 4, reducing parallelism and potentially creating a bottleneck on high-throughput NICs.

### 3. Irrelevant Prometheus metric example
- **What was wrong:** The Prometheus monitoring example suggested grepping for `ceph_osd_numpg`, which is a placement group count metric with no relation to network performance.
- **What was changed:** Replaced `ceph_osd_numpg` with `ceph_osd_recovery_bytes`, which tracks bytes transferred during recovery operations — directly relevant to network performance monitoring.
- **Why:** In a section about network monitoring, the example metric should actually reflect network activity. Recovery bytes is one of the key metrics for understanding inter-OSD network utilization.

## Review Notes
- The post recommends enabling LRO (`lro on`) alongside TSO and GRO. LRO (Large Receive Offload) is generally deprecated in favor of GRO, and can cause issues with IP forwarding or bridged/routed traffic. Many modern NICs don't support hardware LRO. This is not strictly an error (ethtool will report "Cannot change" if unsupported), but readers should be aware that GRO is the preferred receive offload mechanism.
- The `ms_osd_compress_mode` and `ms_compress_secure` config options are part of Ceph's msgr2 compression feature. These are valid but relatively new (Quincy+). Readers on older Ceph releases may not have these options available.
- The description mentions "jumbo frames" but the post does not actually cover MTU configuration (e.g., `ip link set eth0 mtu 9000`). This is a description/content mismatch, not a technical error in the content itself.
- The `netstat -s` command works but is deprecated on many modern Linux distributions in favor of `ss` and `nstat`. Both still work, but `nstat` provides more detailed TCP statistics.
