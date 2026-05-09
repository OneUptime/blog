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

## Step 1: Check VPP Node Pod Status

```bash
oc get pods -n calico-vpp-dataplane
oc describe pod <calico-vpp-node-pod> -n calico-vpp-dataplane | tail -20
oc logs <calico-vpp-node-pod> -n calico-vpp-dataplane -c vpp --tail=60
```

## Step 2: Check MCO Node Readiness

If you installed a hugepage-enabled VPP manifest or configured a VPP driver that requires hugepages, VPP can fail to start until the node configuration has rolled out.

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
oc get machineconfig | grep -i huge
```

## Step 4: Check SCC Violations

```bash
oc describe pod <calico-vpp-node-pod> -n calico-vpp-dataplane | grep -i "forbidden\|scc"
```

If SCC violations are present:

```bash
oc adm policy add-scc-to-user privileged \
  -z calico-vpp-node-sa -n calico-vpp-dataplane
```

## Step 5: Verify VPP Container Log

```bash
oc logs <calico-vpp-node-pod> -n calico-vpp-dataplane -c vpp --tail=60
```

## Step 6: Check NIC Interface Name

RHCOS worker nodes may have different interface names than expected.

```bash
oc debug node/<worker-node> -- chroot /host ip link show
```

Compare against the uplink interface configured in `CALICOVPP_INTERFACES`. If different, update the ConfigMap.

```bash
oc patch configmap calico-vpp-config -n calico-vpp-dataplane \
  --type=merge \
  --patch '{"data":{"CALICOVPP_INTERFACES":"{\n  \"maxPodIfSpec\": {\"rx\": 10, \"tx\": 10, \"rxqsz\": 1024, \"txqsz\": 1024},\n  \"defaultPodIfSpec\": {\"rx\": 1, \"tx\": 1, \"isl3\": true},\n  \"vppHostTapSpec\": {\"rx\": 1, \"tx\": 1, \"rxqsz\": 1024, \"txqsz\": 1024, \"isl3\": false},\n  \"uplinkInterfaces\": [\n    {\"interfaceName\": \"<correct-interface-name>\", \"vppDriver\": \"af_packet\"}\n  ]\n}"}}'
```

## Conclusion

Troubleshooting Calico VPP on OpenShift requires checking MCO status for hugepage configuration progress, using `oc debug` for node-level inspection on immutable RHCOS nodes, verifying SCC assignments for VPP's privileged requirements, and validating the NIC interface name configuration. The MCO diagnostic steps are unique to OpenShift and are the most common source of delays in VPP installation on RHCOS nodes.
