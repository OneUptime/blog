# How to Upgrade Calico on OpenShift Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Upgrade

Description: A safe procedure for upgrading Calico to a newer version on an OpenShift cluster while maintaining workload connectivity and OpenShift system pod health.

---

## Introduction

Upgrading Calico on OpenShift requires the same care as any production CNI upgrade, plus additional attention to OpenShift's system namespaces. OpenShift's router, DNS, monitoring, and registry pods are in the critical path for cluster operations, and a Calico upgrade that disrupts these components can have cascading effects on cluster usability.

The Tigera Operator's rolling upgrade on OpenShift works node by node, the same as on standard Kubernetes. However, you should monitor OpenShift system namespaces more closely during the upgrade to catch any early signs of disruption.

This guide covers a safe Calico upgrade procedure for OpenShift.

## Prerequisites

- Calico running on OpenShift via the Tigera Operator
- `oc` CLI with cluster admin access
- All OpenShift system pods healthy before the upgrade
- A maintenance window

## Step 1: Verify Pre-Upgrade Health

```bash
oc get pods -n openshift-ingress
oc get pods -n openshift-dns
oc get pods -n openshift-monitoring
oc get nodes
oc get tigerastatus
calicoctl version
```

All must be healthy before proceeding.

## Step 2: Backup Calico Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get bgpconfiguration -o yaml > bgp-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
oc get installation default -o yaml > installation-backup.yaml
```

## Step 3: Upgrade the Tigera Operator

```bash
oc apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml
oc rollout status deployment/tigera-operator -n tigera-operator
```

## Step 4: Monitor the Rolling Upgrade

```bash
watch oc get pods -n calico-system
oc rollout status daemonset/calico-node -n calico-system
```

Monitor OpenShift system pods in parallel:

```bash
watch oc get pods -n openshift-ingress -n openshift-dns -n openshift-monitoring
```

## Step 5: Verify After Each Node

As each node's calico-node pod is updated, verify:

```bash
oc get nodes
oc get pods -n openshift-ingress -o wide
```

If any OpenShift system pods on the upgraded node are not Ready, investigate before continuing.

## Step 6: Final Verification

```bash
oc get tigerastatus
oc get nodes
calicoctl version
oc get pods -A | grep -v Running | grep -v Completed
```

Any non-Running pods after the upgrade indicate a problem that needs investigation.

## Conclusion

Safely upgrading Calico on OpenShift requires monitoring both Calico component health and OpenShift system namespace pod health throughout the rolling upgrade. Pre-upgrade health verification, configuration backup, and post-upgrade pod status checks are the key gates that prevent the upgrade from causing extended disruption to OpenShift cluster operations.
