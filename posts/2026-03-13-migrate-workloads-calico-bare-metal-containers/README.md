# How to Migrate Existing Workloads to Calico on Bare Metal with Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Migration

Description: A guide to migrating containerized workloads from another CNI to Calico on a bare metal Kubernetes cluster with minimal disruption.

---

## Introduction

Migrating containerized workloads to Calico on a bare metal cluster replaces not just the CNI plugin but potentially the entire routing model. If you are moving from an overlay-based CNI like Flannel or Weave to Calico with native BGP routing, the change in IP addressing and routing means all pods will receive new IPs and all routes in your physical network will change. Planning this migration carefully prevents extended downtime.

Bare metal environments offer a distinct advantage for migration: you can schedule the change entirely around your own maintenance windows and coordinate directly with your network team to update physical switch configurations in concert with the Calico installation. This coordination is not possible in cloud environments where the network is managed externally.

This guide covers a full CNI migration to Calico on a bare metal cluster with containers.

## Prerequisites

- A bare metal Kubernetes cluster with a non-Calico CNI
- Cluster admin `kubectl` access
- SSH access to all nodes
- Coordination with your network team if BGP is in scope
- A documented maintenance window

## Step 1: Document Current Workload State

```bash
kubectl get all -A -o yaml > pre-migration-workloads.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
kubectl get nodes -o wide > pre-migration-nodes.txt
```

## Step 2: Cordon All Nodes

Prevent new pod scheduling during the CNI transition.

```bash
kubectl get nodes -o name | xargs kubectl cordon
```

## Step 3: Remove Existing CNI

```bash
# For Flannel
kubectl delete -f kube-flannel.yml

# On each node, clean up CNI config files
rm -f /etc/cni/net.d/10-flannel.conflist
rm -f /run/flannel/subnet.env
ip link delete flannel.1 2>/dev/null || true
```

## Step 4: Coordinate Physical Network Changes

If you are switching from overlay to native BGP routing, notify your network team to prepare BGP peer configuration on physical switches. They should be ready to accept BGP sessions from your node IPs on your chosen AS number.

## Step 5: Install Calico

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

cat <<EOF | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: None
      natOutgoing: true
      nodeSelector: all()
EOF
```

## Step 6: Restart Pods Node by Node

```bash
kubectl uncordon <node-1>
kubectl delete pods -A --field-selector spec.nodeName=<node-1>
# Wait for pods to restart, then verify
kubectl get pods -A --field-selector spec.nodeName=<node-1>
calicoctl node status
```

Proceed through remaining nodes sequentially.

## Conclusion

Migrating containerized workloads to Calico on bare metal requires coordinating the CNI swap with your physical network team, removing the old CNI cleanly, installing Calico with the correct IP pool configuration, and cycling pods node by node. The physical network coordination — especially for BGP peering — is the key additional step compared to cloud-based migrations.
