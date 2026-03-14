# How to Migrate Existing Workloads to Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Migration

Description: A guide to migrating OpenShift workloads from OVN-Kubernetes to Calico with minimal disruption to running services.

---

## Introduction

Migrating an OpenShift cluster from OVN-Kubernetes to Calico is a significant change that affects all running workloads. OpenShift's default CNI provides tight integration with the cluster network operator, and replacing it requires explicitly disabling that operator and managing the CNI lifecycle manually. All pod IPs will change during the migration, so any service dependencies on specific pod IPs must be updated to use Services or DNS names instead.

The migration is best done during a scheduled maintenance window, as all pods will be restarted. Planning the migration to minimize downtime for critical workloads - such as OpenShift's own router and registry - is essential.

This guide covers the full workload migration from OVN-Kubernetes to Calico on OpenShift.

## Prerequisites

- An OpenShift 4.x cluster running OVN-Kubernetes
- `oc` CLI with cluster admin access
- A scheduled maintenance window
- All workload manifests backed up

## Step 1: Document Pre-Migration State

```bash
oc get all -A -o yaml > pre-migration-all.yaml
oc get networkpolicies -A -o yaml > pre-migration-policies.yaml
oc get network.config cluster -o yaml > pre-migration-network-config.yaml
```

## Step 2: Scale Down Non-Critical Workloads

To reduce the migration surface, scale down non-critical deployments.

```bash
oc get deployments -A -o json | jq -r '.items[] | select(.metadata.namespace | startswith("openshift-") | not) | "\(.metadata.namespace) \(.metadata.name)"' > user-deployments.txt
```

## Step 3: Disable OVN-Kubernetes

```bash
oc patch network.operator cluster \
  --type merge \
  --patch '{"spec":{"managementState":"Unmanaged"}}'
```

Cordon all nodes:

```bash
oc get nodes -o name | xargs oc adm cordon
```

## Step 4: Install Calico

```bash
oc create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml
oc apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml

cat <<EOF | oc apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  variant: Calico
  kubernetesProvider: OpenShift
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.128.0.0/14
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
EOF
```

## Step 5: Restart Workloads Node by Node

```bash
# Uncordon one node at a time
oc adm uncordon <node-name>
# Delete pods on that node to get new Calico IPs
oc get pods -A --field-selector spec.nodeName=<node-name> -o name | xargs oc delete
```

Wait for all pods on the node to stabilize before proceeding.

## Step 6: Verify and Restore User Workloads

After all nodes have been cycled:

```bash
oc get nodes
oc get pods -A | grep -v Running | grep -v Completed
oc get tigerastatus
```

Scale user workloads back up and verify services are reachable.

## Conclusion

Migrating OpenShift workloads from OVN-Kubernetes to Calico requires disabling the cluster network operator, installing Calico with OpenShift-specific configuration, and restarting all workload pods node by node to pick up Calico-assigned IPs. The migration window should cover the full node-by-node restart cycle and include verification of OpenShift system components at each step.
