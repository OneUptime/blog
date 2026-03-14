# How to Upgrade Calico on Bare Metal with Binaries Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Upgrade

Description: A safe procedure for upgrading Calico binary installations on bare metal nodes while maintaining pod networking continuity.

---

## Introduction

Upgrading binary-installed Calico on bare metal is a manual process that cannot rely on the Tigera Operator's automated rolling upgrade. Each node requires manual binary replacement, service restart, and connectivity verification. The manual nature of this process is a disadvantage in terms of automation, but it gives you precise control over the upgrade sequence and the ability to pause at any point.

The key to a safe binary upgrade is to upgrade one node at a time, verify connectivity after each node, and have a rollback plan ready. The rollback plan is simple: replace the new binary with the old one and restart the service. Since you are not using an operator, there are no CRD migrations to undo.

This guide covers a safe binary upgrade procedure for Calico on bare metal.

## Prerequisites

- Calico binary installation running on all bare metal nodes
- The target Calico version's binaries downloaded and verified
- Root access to all nodes
- A maintenance window

## Step 1: Download New Binaries

Download new binaries on a staging location before touching production nodes.

```bash
CALICO_VERSION=v3.27.0
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-node-amd64 \
  -o /tmp/calico-node-new
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-cni-amd64 \
  -o /tmp/calico-cni-new
curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calico-ipam-amd64 \
  -o /tmp/calico-ipam-new
chmod +x /tmp/calico-node-new /tmp/calico-cni-new /tmp/calico-ipam-new
```

## Step 2: Backup Current Binaries

On each node, backup the existing binaries before replacing them.

```bash
sudo cp /usr/local/bin/calico-node /usr/local/bin/calico-node.bak
sudo cp /opt/cni/bin/calico /opt/cni/bin/calico.bak
sudo cp /opt/cni/bin/calico-ipam /opt/cni/bin/calico-ipam.bak
```

## Step 3: Cordon the Node

```bash
kubectl cordon <node-name>
```

## Step 4: Replace Binaries and Restart Service

```bash
sudo systemctl stop calico-node
sudo cp /tmp/calico-node-new /usr/local/bin/calico-node
sudo cp /tmp/calico-cni-new /opt/cni/bin/calico
sudo cp /tmp/calico-ipam-new /opt/cni/bin/calico-ipam
sudo systemctl start calico-node
```

## Step 5: Verify and Uncordon

```bash
sudo systemctl status calico-node
calicoctl node status
kubectl uncordon <node-name>
```

Test pod connectivity on this node before proceeding to the next:

```bash
kubectl run test-upgrade --image=busybox --overrides='{"spec":{"nodeName":"<node-name>"}}' -- sleep 60
kubectl get pod test-upgrade -o wide
kubectl delete pod test-upgrade
```

Repeat Steps 3-5 for each node.

## Step 6: Update calicoctl

```bash
sudo curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl && sudo chmod +x /usr/local/bin/calicoctl
calicoctl version
```

## Conclusion

Upgrading binary-installed Calico on bare metal requires manually replacing binaries and restarting the calico-node service on each node in sequence. Backing up old binaries before each replacement and verifying pod connectivity after each node's upgrade ensures you can roll back immediately if a problem is detected.
