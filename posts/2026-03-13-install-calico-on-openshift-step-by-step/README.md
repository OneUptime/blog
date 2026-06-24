# How to Install Calico on OpenShift Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Installation

Description: A step-by-step guide to replacing OpenShift's default OVN-Kubernetes CNI with Calico on a self-managed OpenShift cluster.

---

## Introduction

OpenShift ships with OVN-Kubernetes as its default CNI plugin, but self-managed OpenShift clusters can be migrated to use Calico. The primary reason to choose Calico on OpenShift is access to Calico's advanced network policy capabilities - GlobalNetworkPolicy, host endpoint policies, and fine-grained egress rules - which go beyond what OpenShift's built-in network policy supports.

Installing Calico on OpenShift requires using the Tigera Operator with OpenShift-specific manifests. OpenShift's Security Context Constraints (SCCs) require that the Calico pods run with elevated privileges, and the OpenShift network operator must be informed of the CNI migration.

This guide covers installing Calico on a self-managed OpenShift 4 cluster. The current Calico migration documentation is tested with OpenShift 4.16 through 4.18.

## Prerequisites

- A self-managed OpenShift 4 cluster; the current Calico migration documentation is tested with OpenShift 4.16 through 4.18
- `oc` CLI with cluster admin access
- A healthy cluster and a backup of etcd and critical cluster configuration
- A maintenance window (CNI changes require cluster-wide pod restarts)

## Step 1: Pause Machine Config Pool Updates

OpenShift's Machine Config Operator manages node operating system configuration. Pause the Machine Config Pools before changing the CNI so node configuration updates do not roll out during the migration.

```bash
oc patch MachineConfigPool master --type='merge' --patch '{ "spec": { "paused": true } }'
oc patch MachineConfigPool worker --type='merge' --patch '{ "spec": { "paused": true } }'
```

## Step 2: Start the Network Migration

OpenShift's network operator manages OVN-Kubernetes. Tell it that the cluster is migrating to Calico before installing Calico components.

```bash
oc get Network.operator.openshift.io cluster -o jsonpath='{.spec.migration}'
oc patch Network.operator.openshift.io cluster --type='merge' --patch '{ "spec": { "migration": null } }'
oc patch Network.operator.openshift.io cluster --type='merge' --patch '{ "spec": { "migration": { "networkType": "Calico" } } }'
```

## Step 3: Install the Tigera Operator for OpenShift

OpenShift requires the OpenShift-specific Calico manifest bundle.

```bash
mkdir calico
wget -qO- https://github.com/projectcalico/calico/releases/download/v3.32.0/ocp.tgz | tar xvz --strip-components=1 -C calico
cd calico

for file in $(ls *.yaml | grep -Ev 'cr-(.*?)\.yaml'); do
  echo "Applying $file"
  oc create -f "$file"
done

oc rollout status -w --timeout=2m -n tigera-operator deployment/tigera-operator
```

## Step 4: Create the Installation CR

The OpenShift manifest bundle includes an Installation CR. The default bundle configures Calico with the eBPF dataplane. If you want the iptables dataplane instead, set `linuxDataplane` to `Iptables` in `03-cr-installation.yaml` and enable kube-proxy in the cluster network operator manifest before creating the CRs.

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    linuxDataplane: BPF
  variant: Calico
```

```bash
oc create -f *cr*.yaml
oc wait --for=condition=Available tigerastatus --all
```

## Step 5: Finalize the Migration

After Calico components are available, update the cluster network type, restart Multus, and clear the migration field.

```bash
oc patch Network.config.openshift.io cluster --type='merge' --patch '{ "spec": { "networkType": "Calico" } }'
oc -n openshift-multus rollout restart daemonset/multus
oc -n openshift-multus -w --timeout=2m rollout status daemonset/multus
oc patch Network.operator.openshift.io cluster --type='merge' --patch '{ "spec": { "migration": null } }'
```

## Step 6: Verify Installation

```bash
oc get tigerastatus
oc get pods -n calico-system
oc get nodes
```

All nodes should reach `Ready` status once `calico-node` pods are running.

Re-enable Machine Config Pool updates after the migration is complete:

```bash
oc patch MachineConfigPool master --type='merge' --patch '{ "spec": { "paused": false } }'
oc patch MachineConfigPool worker --type='merge' --patch '{ "spec": { "paused": false } }'
```

## Conclusion

Installing Calico on OpenShift requires pausing Machine Config Pool updates, telling the OpenShift network operator to migrate to Calico, installing the OpenShift-compatible Tigera Operator manifests, creating the bundled Calico custom resources, and finalizing the migration by setting the cluster network type to `Calico`. These OpenShift-specific steps are in addition to the standard Calico installation workflow.
