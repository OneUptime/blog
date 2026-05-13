# How to Migrate Existing Workloads to Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Migration

Description: A guide to migrating OpenShift workloads from OVN-Kubernetes to Calico with minimal disruption to running services.

---

## Introduction

Migrating an OpenShift cluster from OVN-Kubernetes to Calico is a significant change that affects all running workloads. OpenShift's default CNI provides tight integration with the cluster network operator, and replacing it requires using the OpenShift network migration fields so the operator can coordinate the transition. Pod IPs can change during the migration, so any service dependencies on specific pod IPs must be updated to use Services or DNS names instead.

The migration is best done during a scheduled maintenance window, as networking components and affected pods can be restarted. Planning the migration to minimize downtime for critical workloads - such as OpenShift's own router and registry - is essential.

This guide covers the full workload migration from OVN-Kubernetes to Calico on OpenShift.

## Prerequisites

- An OpenShift 4.x cluster running OVN-Kubernetes on a release supported by Calico's OVN-to-Calico migration procedure
- `oc` CLI with cluster admin access
- A scheduled maintenance window
- All workload manifests backed up

## Step 1: Document Pre-Migration State

```bash
oc get all -A -o yaml > pre-migration-all.yaml
oc get networkpolicies -A -o yaml > pre-migration-policies.yaml
oc get Network.config.openshift.io cluster -o yaml > pre-migration-network-config.yaml
oc get Network.operator.openshift.io cluster -o yaml > pre-migration-network-operator.yaml
```

## Step 2: Scale Down Non-Critical Workloads

To reduce the migration surface, scale down non-critical deployments.

```bash
oc get deployments -A -o json | jq -r '.items[] | select(.metadata.namespace | startswith("openshift-") | not) | "\(.metadata.namespace) \(.metadata.name) \(.spec.replicas // 1)"' > user-deployments.txt

while read namespace name replicas; do
  oc -n "$namespace" scale deployment "$name" --replicas=0
done < user-deployments.txt
```

## Step 3: Prepare OVN-Kubernetes Migration

```bash
oc patch MachineConfigPool master --type='merge' --patch '{ "spec": { "paused": true } }'
oc patch MachineConfigPool worker --type='merge' --patch '{ "spec": { "paused": true } }'
```

Check for an existing migration, clear stale migration state, and enable migration to Calico:

```bash
oc get Network.operator.openshift.io cluster -o jsonpath='{.spec.migration}'
oc patch Network.operator.openshift.io cluster --type='merge' --patch '{ "spec": { "migration": null } }'
oc patch Network.operator.openshift.io cluster --type='merge' --patch '{ "spec": { "migration": { "networkType": "Calico" } } }'
```

## Step 4: Install Calico

```bash
mkdir calico
wget -qO- https://github.com/projectcalico/calico/releases/download/v3.32.0/ocp.tgz | tar xvz --strip-components=1 -C calico
cd calico

for file in $(ls *.yaml | grep -Ev 'cr-(.*?)\.yaml'); do
  oc create -f "$file"
done

oc rollout status -w --timeout=2m -n tigera-operator deployment/tigera-operator
oc patch networks.operator.openshift.io cluster --type merge -p '{"spec":{"deployKubeProxy": true}}'
oc create -f *cr*.yaml
oc wait --for=condition=Available tigerastatus --all
oc patch Network.config.openshift.io cluster --type='merge' --patch '{ "spec": { "networkType": "Calico" } }'
```

## Step 5: Restart Multus and Finish Migration

```bash
oc -n openshift-multus rollout restart daemonset/multus
oc -n openshift-multus rollout status -w --timeout=2m daemonset/multus
oc patch Network.operator.openshift.io cluster --type='merge' --patch '{ "spec": { "migration": null } }'
oc patch Network.operator.openshift.io cluster --type='merge' --patch '{ "spec": { "defaultNetwork": { "ovnKubernetesConfig": null } } }'
```

Wait for Calico and OpenShift networking components to stabilize before proceeding.

## Step 6: Verify and Restore User Workloads

After the migration has completed:

```bash
oc get nodes
oc get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
oc get tigerastatus

while read namespace name replicas; do
  oc -n "$namespace" scale deployment "$name" --replicas="$replicas"
done < user-deployments.txt

oc patch MachineConfigPool master --type='merge' --patch '{ "spec": { "paused": false } }'
oc patch MachineConfigPool worker --type='merge' --patch '{ "spec": { "paused": false } }'
```

Verify services are reachable after user workloads are restored.

## Conclusion

Migrating OpenShift workloads from OVN-Kubernetes to Calico requires preparing the OpenShift network migration, installing Calico with OpenShift-specific manifests, restarting Multus, and restoring user workloads after Calico is available. The migration window should cover the full migration cycle and include verification of OpenShift system components at each step.
