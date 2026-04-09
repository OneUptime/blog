# Validation Summary: How to Choose Network Cards and Bandwidth for Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Multus CNI (multi-network plugin for Kubernetes)
- Linux bonding / LACP (NIC redundancy)
- Netplan (Ubuntu network configuration)
- Linux sysctl (kernel network tuning)
- BBR congestion control

## Sources Consulted
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook network configuration documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Ceph documentation on network configuration — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph `osd perf` command documentation — https://docs.ceph.com/en/latest/man/8/ceph/
- Other blog posts in this repo covering Rook host networking, CIDR address ranges, and separate public/cluster networks
- Linux kernel sysctl documentation for TCP tuning parameters
- Netplan bonding configuration reference

## Issues Found

1. **Units confusion in Step 1 (bandwidth calculation)**: The post used GB/s (gigabytes per second) when comparing against GbE (gigabits per second Ethernet) links. For example, "100 clients each doing 1 GB/s" with a recommendation of "minimum 10 GbE" is inconsistent — 10 GbE provides ~1.25 GB/s, not 10 GB/s. Fixed by changing GB/s to Gb/s (gigabits per second) throughout the bandwidth estimation examples so the math is consistent with GbE link speeds.

2. **Units confusion in Step 2 (cluster network calculation)**: Same issue — "clients write 5 GB/s: cluster network needs 10 GB/s" was compared to 10 GbE links. Fixed by changing GB/s to Gb/s for the network bandwidth figures. Note: the disk recovery calculation (200 MB/s per HDD = 2.4 GB/s) correctly uses byte-based units for disk throughput and was left unchanged.

3. **Incorrect Rook host networking configuration in Step 4**: The example used `selectors` with interface names (`"eth0"`, `"eth1"`) under `provider: host`. The `selectors` field is a Multus-only feature that references NetworkAttachmentDefinition resources, not raw interface names. For host networking, Rook uses `addressRanges` with CIDR notation to specify which subnets map to public and cluster networks. Fixed by replacing `selectors` with `addressRanges` using example CIDRs. Also updated the description of the Multus example from "CIDR notation" to "NetworkAttachmentDefinitions" since the Multus selectors reference NAD resources, not CIDRs.

4. **Incorrect `ceph osd perf` usage in Step 7**: The command was described as showing "per-OSD network stats" but `ceph osd perf` outputs commit and apply latency (2 data columns), not network throughput. The awk filter `'{print $1, $6, $7}'` referenced columns 6 and 7 which don't exist in the 3-column output. Fixed by correcting the comment to describe latency monitoring (which can indirectly indicate network issues) and removing the incorrect awk filter since the raw output is already useful.

## Review Notes
- The recovery bandwidth calculation (2.4 GB/s from 12 HDDs at 200 MB/s each = ~19.2 Gb/s) technically exceeds 10 GbE capacity, but the recommendation of "10 GbE sufficient for HDD" is practically correct because Ceph throttles recovery traffic by default via `osd_recovery_max_active` and `osd_recovery_sleep` settings. This was left as-is since it represents a reasonable real-world recommendation.
- The medium cluster NIC recommendation lists `total_ports_per_node: 2`, which is only accurate for the "25 GbE single" option; the alternative "2 x 10 GbE bonded" option for public would require 3 ports. This was left as-is since it represents the minimum configuration.
- The sysctl tuning values are reasonable and commonly recommended for high-throughput Ceph deployments. The BBR congestion control recommendation is appropriate.
- The netplan bonding configuration is syntactically correct for Ubuntu systems using netplan.
