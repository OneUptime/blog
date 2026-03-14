# How to Upgrade Calico VPP on OpenShift Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Upgrade

Description: A safe upgrade procedure for Calico VPP on OpenShift, coordinating MCO-managed OS updates with VPP data plane upgrades.

---

## Introduction

Upgrading Calico VPP on OpenShift involves coordinating three separate upgrade operations: the Calico control plane (via the Tigera Operator), the VPP data plane components (via updated manifests), and any required OS-level changes (via MCO). When the new VPP version requires different kernel parameters or a newer hugepage configuration, an MCO update must precede the VPP component update, which extends the overall upgrade timeline.

The MCO update path is particularly important: MCO updates cause nodes to drain, reboot with the new configuration, and then return to service. This is a more disruptive process than a standard pod restart, and it must be completed before the VPP component upgrade begins on each node.

## Prerequisites

- Calico VPP running on OpenShift
- `oc` CLI with cluster admin access
- Maintenance window that accounts for MCO-induced node reboots

## Step 1: Review Release Notes for OS Requirements

Check whether the new Calico VPP version requires any OS-level changes.

```bash
# Review the VPP dataplane changelog
cat vpp-dataplane/CHANGELOG.md | head -50
```

If new kernel parameters or hugepage values are required, update the MCO first.

## Step 2: Update MCO If Needed

```bash
oc edit machineconfig 99-worker-hugepages
# Update hugepages value if required
oc get machineconfigpool worker -w
# Wait for all workers to complete the MCO update
```

## Step 3: Backup Current Configuration

```bash
oc get configmap calico-vpp-config -n calico-vpp-dataplane -o yaml > vpp-config-backup.yaml
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
oc get installation default -o yaml > installation-backup.yaml
```

## Step 4: Upgrade Calico Control Plane

```bash
oc apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml
oc rollout status deployment/tigera-operator -n tigera-operator
```

## Step 5: Upgrade VPP Components

```bash
cd vpp-dataplane
git fetch && git checkout v3.27.0

oc apply -f yaml/calico-vpp.yaml
oc rollout status daemonset/calico-vpp-node -n calico-vpp-dataplane
```

## Step 6: Verify Post-Upgrade State

```bash
oc get tigerastatus
oc get pods -n calico-vpp-dataplane
oc get pods -n openshift-ingress
oc exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show version
oc exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
```

## Conclusion

Safely upgrading Calico VPP on OpenShift requires reviewing whether OS-level changes are needed (and applying them via MCO if so), then upgrading the Calico control plane and VPP components in sequence. The MCO update step - which may cause node reboots - is the most time-consuming part and must be accounted for in the maintenance window planning.
