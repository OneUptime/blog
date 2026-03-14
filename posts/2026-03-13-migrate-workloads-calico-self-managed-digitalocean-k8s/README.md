# How to Migrate Workloads to Calico on DO Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, DigitalOcean, Migration

Description: A guide to migrating existing workloads from another CNI plugin to Calico on a self-managed Kubernetes cluster running on DigitalOcean Droplets.

---

## Introduction

Migrating from an existing CNI plugin - such as Flannel or Weave - to Calico on a self-managed DigitalOcean cluster requires careful planning. The CNI plugin manages pod IP assignment and network routing, so switching it means all existing pod IPs will change and pods must be restarted. The key is to migrate in a controlled, node-by-node sequence to minimize service disruption.

DigitalOcean Droplets allow you to drain, reconfigure, and re-add nodes without replacing the underlying VM, which simplifies the migration process. You can move one node at a time while the rest of the cluster continues to serve traffic on the existing CNI.

This guide covers the full migration workflow from a non-Calico CNI to Calico on a self-managed DigitalOcean Kubernetes cluster.

## Prerequisites

- A running self-managed Kubernetes cluster on DigitalOcean Droplets with a non-Calico CNI
- `kubectl` with cluster admin access
- A backup of current network configuration and running workload manifests
- A maintenance window or canary deployment strategy

## Step 1: Backup Current State

Export all workloads and network policies before making any changes.

```bash
kubectl get all -A -o yaml > all-workloads-backup.yaml
kubectl get networkpolicies -A -o yaml > network-policies-backup.yaml
```

Document your current pod CIDR:

```bash
kubectl cluster-info dump | grep -m1 cluster-cidr
```

## Step 2: Remove the Existing CNI

Remove the current CNI DaemonSet. This will disrupt networking on all nodes once the pods terminate.

```bash
# Example for Flannel
kubectl delete -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# Remove CNI config files on each node
# SSH into each node and run:
rm -f /etc/cni/net.d/10-flannel.conflist
```

## Step 3: Install Calico

Apply the Calico operator and Installation CR.

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
      cidr: 192.168.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
EOF
```

## Step 4: Restart Pods Node by Node

Cordon and drain one node at a time, letting Calico assign new IPs when pods restart.

```bash
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
# Wait for Calico to initialize on the node
kubectl uncordon <node-name>
```

Repeat for each node in sequence.

## Step 5: Verify Connectivity

After all nodes have been cycled, verify that pods have Calico-assigned IPs and can communicate.

```bash
kubectl get pods -A -o wide
calicoctl ipam show
kubectl exec -it <pod-a> -- ping -c3 <pod-b-ip>
```

## Step 6: Apply Calico Network Policies

Re-apply your network policies in Calico format, adding any Calico-specific enhancements.

```bash
kubectl apply -f network-policies-backup.yaml
calicoctl get networkpolicy -A
```

## Conclusion

Migrating existing workloads to Calico on self-managed DigitalOcean Kubernetes requires removing the old CNI, installing Calico, and cycling pods node by node to pick up new Calico-assigned IPs. Taking a methodical, node-at-a-time approach and verifying connectivity at each stage makes this migration manageable and reversible.
