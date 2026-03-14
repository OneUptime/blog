# How to Migrate Existing Workloads to Calico on Bare Metal with Binaries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Migration

Description: A guide to migrating from a container-based CNI to a binary-installed Calico on bare metal Kubernetes nodes.

---

## Introduction

Migrating to binary-installed Calico from a container-based CNI involves removing the existing CNI's DaemonSet from Kubernetes, installing the Calico binaries directly on each node's filesystem, and configuring the calico-node service. This migration is more manual than switching between container-based CNIs, but it is the right approach for environments where you want Calico to run as a native OS service rather than a container.

The migration order matters: you should install the Calico binaries and configure the service on each node before removing the old CNI's pods from that node. This sequencing ensures there is never a window where a node has no CNI at all.

This guide covers migrating existing workloads to binary-installed Calico on bare metal.

## Prerequisites

- A bare metal Kubernetes cluster running with a container-based CNI
- Root access to all nodes
- `kubectl` with cluster admin access
- The Calico binary package downloaded and verified

## Step 1: Backup Workload State

```bash
kubectl get all -A -o yaml > pre-migration-state.yaml
kubectl get networkpolicies -A -o yaml > pre-migration-policies.yaml
```

## Step 2: Install Calico Binaries on All Nodes (Before Removing Old CNI)

On each node, install the Calico binaries without starting the service yet.

```bash
CALICO_VERSION=v3.27.0
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-node-amd64 \
  -o /usr/local/bin/calico-node
chmod +x /usr/local/bin/calico-node

curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-cni-amd64 \
  -o /opt/cni/bin/calico
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-ipam-amd64 \
  -o /opt/cni/bin/calico-ipam
chmod +x /opt/cni/bin/calico /opt/cni/bin/calico-ipam
```

Create the systemd service unit on each node.

```bash
sudo systemctl enable calico-node.service  # but do not start yet
```

## Step 3: Configure Calico CRDs

With `kubectl` access, pre-configure the Calico datastore.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/crds.yaml

cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  encapsulation: None
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 4: Migrate Node by Node

For each node:

```bash
# Cordon the node
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# On the node: write CNI config
cat > /etc/cni/net.d/10-calico.conflist << 'EOF'
{...calico CNI config...}
EOF

# Remove old CNI config
rm -f /etc/cni/net.d/10-flannel.conflist

# Start calico-node
sudo systemctl start calico-node
sudo systemctl status calico-node

# Uncordon
kubectl uncordon <node-name>
```

## Step 5: Remove Old CNI DaemonSet

After all nodes have been migrated, remove the old CNI from Kubernetes.

```bash
kubectl delete daemonset kube-flannel-ds -n kube-system
```

## Conclusion

Migrating to binary-installed Calico on bare metal requires pre-installing binaries on all nodes before removing the existing CNI, configuring the Calico datastore, and then transitioning nodes one at a time. This sequencing prevents any node from having no CNI plugin and ensures workloads continue to run throughout the migration.
