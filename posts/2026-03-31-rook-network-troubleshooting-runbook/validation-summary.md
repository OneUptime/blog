# Validation Summary: How to Create a Ceph Network Troubleshooting Runbook

## Status
validated

## Post Type
Runbook / Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (kubectl, CNI plugins, DNS)
- Networking tools (ping, nc, iperf3, nslookup)
- Ceph messenger protocol (msgr2)

## Sources Consulted
- Rook CephCluster CRD network configuration source code (`pkg/apis/ceph.rook.io/v1/types.go`) — confirms `selectors` is for Multus NAD names only, and `addressRanges` is for CIDR ranges
- Rook official documentation on network providers (rook.io/docs/rook/latest/CRDs/Cluster/network-providers/)
- Rook GitHub PR #12778 — `addressRanges` introduced in Rook v1.12.4 (September 2023)
- Ceph documentation on `ms_bind_msgr2` configuration option
- Ceph documentation on OSD network port ranges (6800+)

## Issues Found

### 1. Incorrect network configuration YAML in Step 2
**What was wrong:** The example used `selectors` with CIDR values (`"192.168.1.0/24"`) under `provider: host`. The `selectors` field is exclusively for the `multus` provider and accepts NetworkAttachmentDefinition names (e.g., `namespace/nad-name`), not CIDR notation. It is ignored for `provider: host`.

**What was changed:** Replaced `selectors` with `addressRanges` and restructured the values as lists, which is the correct field for specifying public and cluster network CIDRs with host networking (available since Rook v1.12.4).

**Before:**
```yaml
selectors:
  public: "192.168.1.0/24"
  cluster: "10.0.0.0/24"
```

**After:**
```yaml
addressRanges:
  public:
    - "192.168.1.0/24"
  cluster:
    - "10.0.0.0/24"
```

### 2. Inconsistent toolbox pod references in Steps 4, 5, and 7
**What was wrong:** Steps 4, 5, and 7 referenced the toolbox as `rook-ceph-tools` (bare name), while Steps 1 and 6 correctly used `deploy/rook-ceph-tools`. The bare name would fail because the actual pod name includes a random hash suffix (e.g., `rook-ceph-tools-7f8b9c6d4-xk2p9`). Using `deploy/rook-ceph-tools` lets kubectl automatically select the pod from the deployment.

**What was changed:** Updated all three occurrences to use `deploy/rook-ceph-tools` for consistency and correctness.

## Review Notes
- The OSD pod exec commands in Step 3 (`rook-ceph-osd-0-<pod>`) use the correct placeholder pattern. In practice, these minimal OSD containers may not include `ping` or `nc` — users might need to use the toolbox pod or install these utilities. This is a practical consideration rather than a technical error.
- The `iperf3` command in Step 7 assumes the tool is available in the toolbox image. Some Rook toolbox images may not include iperf3 by default; users may need to install it first.
- The MTU test using `-s 8972` correctly accounts for 28 bytes of IP+ICMP overhead to test 9000-byte jumbo frame support.
- The bandwidth recommendations (1 Gbps for HDDs, 10 Gbps for NVMe) align with common Ceph deployment guidance.
