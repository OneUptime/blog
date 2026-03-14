# How to Troubleshoot Installation Issues with Calico VPP on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Troubleshooting

Description: A diagnostic guide for resolving Calico VPP installation failures on OpenShift clusters.

---

## Introduction

Troubleshooting Calico VPP on OpenShift combines the VPP-specific failure modes (hugepages, DPDK binding, VPP startup errors) with OpenShift-specific issues (SCC violations, MCO configuration failures, RHCOS-specific kernel parameters). The MCO layer adds diagnostic complexity - MCO configuration failures may not be immediately visible in pod logs, requiring inspection of the MachineConfigPool status.

RHCOS's immutable OS model means you cannot make ad-hoc OS changes to fix issues - all OS-level fixes must go through MCO. This is the correct approach for production reliability, but it adds time to the diagnostic-fix loop compared to mutable Linux distributions.

## Prerequisites

- Calico VPP installation attempted on OpenShift
- `oc` CLI with cluster admin access
- `oc debug` access to worker nodes

## Step 1: Check VPP Manager Pod Status

```bash
oc get pods -n calico-vpp-dataplane
oc describe pod <vpp-manager-pod> -n calico-vpp-dataplane | tail -20
oc logs <vpp-manager-pod> -n calico-vpp-dataplane --tail=60
```

## Step 2: Check MCO Node Readiness

If hugepages are not configured, VPP will fail to start.

```bash
oc get machineconfigpool worker
oc describe machineconfigpool worker | grep -A5 "Conditions:"
```

If the MCP shows `Updating: True`, nodes are still being reconfigured. Wait until `Updated: True`.

## Step 3: Verify Hugepages on Nodes

Use `oc debug` to check RHCOS node hugepage configuration without modifying the node.

```bash
oc debug node/<worker-node> -- chroot /host cat /proc/meminfo | grep Huge
```

If hugepages are not configured, check the MCO MachineConfig:

```bash
oc get machineconfig 99-worker-hugepages
```

## Step 4: Check SCC Violations

```bash
oc describe pod <vpp-manager-pod> -n calico-vpp-dataplane | grep -i "forbidden\|scc"
```

If SCC violations are present:

```bash
oc adm policy add-scc-to-user privileged \
  -z calico-vpp-node -n calico-vpp-dataplane
```

## Step 5: Verify VPP Log on Node

```bash
oc debug node/<worker-node> -- chroot /host cat /var/log/vpp/vpp.log 2>/dev/null | tail -30
```

## Step 6: Check NIC Interface Name

RHCOS worker nodes may have different interface names than expected.

```bash
oc debug node/<worker-node> -- chroot /host ip link show
```

Compare against the interface configured in `CALICOVPP_INTERFACE`. If different, update the ConfigMap.

```bash
oc patch configmap calico-vpp-config -n calico-vpp-dataplane \
  --patch '{"data":{"CALICOVPP_INTERFACE":"<correct-interface-name>"}}'
```

## Conclusion

Troubleshooting Calico VPP on OpenShift requires checking MCO status for hugepage configuration progress, using `oc debug` for node-level inspection on immutable RHCOS nodes, verifying SCC assignments for VPP's privileged requirements, and validating the NIC interface name configuration. The MCO diagnostic steps are unique to OpenShift and are the most common source of delays in VPP installation on RHCOS nodes.
