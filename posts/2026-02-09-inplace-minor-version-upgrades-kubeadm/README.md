# How to Perform In-Place Kubernetes Minor Version Upgrades with kubeadm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, kubeadm, Cluster Management

Description: Learn how to perform safe in-place minor version upgrades of Kubernetes clusters using kubeadm, including control plane updates, worker node upgrades, and rollback procedures.

---

Kubernetes releases a new minor version approximately every four months. Staying current with minor version upgrades provides security patches, new features, and bug fixes. kubeadm simplifies the upgrade process with built-in commands that handle control plane component updates, addon upgrades, and node reconfiguration while minimizing downtime.

## Preparing for the Upgrade

Before upgrading, verify your cluster's current state and check the upgrade path:

```bash
# Check current cluster version
kubectl version --short
kubectl get nodes

# Check which versions are available
sudo apt update
sudo apt-cache madison kubeadm

# For upgrades, you can only go one minor version at a time
# Example: 1.27.x -> 1.28.x is valid
#          1.27.x -> 1.29.x requires going through 1.28.x first
```

Review the upgrade considerations:

```bash
# Check for deprecated APIs
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis

# Review cluster health
kubectl get nodes
kubectl get pods --all-namespaces
kubectl get componentstatuses

# Back up etcd
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-pre-upgrade.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

## Upgrading the First Control Plane Node

Start with one control plane node to verify the upgrade process:

```bash
# Find the latest patch version for your target minor version
sudo apt update
sudo apt-cache madison kubeadm | grep 1.28

# Upgrade kubeadm on the first control plane node
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.28.5-00
sudo apt-mark hold kubeadm

# Verify kubeadm version
kubeadm version

# Check what changes the upgrade will make
sudo kubeadm upgrade plan

# Review the output carefully, noting:
# - Components that will be upgraded
# - Images that will be pulled
# - Certificate renewal status
# - Deprecated APIs
```

Apply the upgrade to control plane components:

```bash
# Drain the control plane node (move pods elsewhere)
kubectl drain <control-plane-node> --ignore-daemonsets

# Apply the upgrade
sudo kubeadm upgrade apply v1.28.5

# Expected output shows upgrade progress:
# [upgrade/config] Making sure the configuration is correct
# [upgrade/version] You have chosen to upgrade to version "v1.28.5"
# [upgrade/prepull] Pulling images required for setting up a Kubernetes cluster
# [upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.28.5"
# [upgrade/staticpods] Writing new Static Pod manifests
# [upgrade/successful] SUCCESS! Your cluster was upgraded to "v1.28.5"

# Uncordon the node
kubectl uncordon <control-plane-node>
```

Upgrade kubelet and kubectl on the control plane:

```bash
# Upgrade kubelet and kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get update
sudo apt-get install -y kubelet=1.28.5-00 kubectl=1.28.5-00
sudo apt-mark hold kubelet kubectl

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Verify the node version
kubectl get nodes
```

## Upgrading Additional Control Plane Nodes

For high-availability clusters, upgrade remaining control plane nodes one at a time:

```bash
# On each additional control plane node:

# Upgrade kubeadm
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.28.5-00
sudo apt-mark hold kubeadm

# Drain the node
kubectl drain <control-plane-node> --ignore-daemonsets

# Upgrade the node (note: use "upgrade node" not "upgrade apply")
sudo kubeadm upgrade node

# Upgrade kubelet and kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get update
sudo apt-get install -y kubelet=1.28.5-00 kubectl=1.28.5-00
sudo apt-mark hold kubelet kubectl

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Uncordon the node
kubectl uncordon <control-plane-node>

# Wait for node to become ready before proceeding
kubectl get nodes -w
```

## Upgrading Worker Nodes

Upgrade worker nodes one at a time to maintain workload availability:

```bash
# On the control plane, drain the worker node
kubectl drain <worker-node> --ignore-daemonsets --delete-emptydir-data

# SSH to the worker node
ssh user@worker-node

# Upgrade kubeadm
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.28.5-00
sudo apt-mark hold kubeadm

# Upgrade the node configuration
sudo kubeadm upgrade node

# Upgrade kubelet and kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get update
sudo apt-get install -y kubelet=1.28.5-00 kubectl=1.28.5-00
sudo apt-mark hold kubelet kubectl

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Return to control plane and uncordon the node
kubectl uncordon <worker-node>

# Verify the node is ready
kubectl get nodes
```

Automate worker node upgrades:

```bash
#!/bin/bash
# upgrade-worker-nodes.sh

set -e

WORKER_NODES=$(kubectl get nodes -l node-role.kubernetes.io/worker -o jsonpath='{.items[*].metadata.name}')
TARGET_VERSION="1.28.5-00"

for node in $WORKER_NODES; do
  echo "Upgrading worker node: $node"

  # Drain node
  kubectl drain $node --ignore-daemonsets --delete-emptydir-data --timeout=300s

  # Upgrade on the node
  ssh $node "sudo apt-mark unhold kubeadm && \
             sudo apt-get update && \
             sudo apt-get install -y kubeadm=$TARGET_VERSION && \
             sudo apt-mark hold kubeadm && \
             sudo kubeadm upgrade node && \
             sudo apt-mark unhold kubelet kubectl && \
             sudo apt-get install -y kubelet=$TARGET_VERSION kubectl=$TARGET_VERSION && \
             sudo apt-mark hold kubelet kubectl && \
             sudo systemctl daemon-reload && \
             sudo systemctl restart kubelet"

  # Wait for kubelet to restart
  sleep 30

  # Uncordon node
  kubectl uncordon $node

  # Wait for node to be ready
  kubectl wait --for=condition=Ready node/$node --timeout=300s

  echo "Completed upgrade of $node"
  echo "Waiting 60s before next node..."
  sleep 60
done

echo "All worker nodes upgraded successfully!"
```

## Verifying the Upgrade

After upgrading all nodes, verify the cluster is healthy:

```bash
# Check all nodes are at the new version
kubectl get nodes

# Verify control plane components
kubectl get pods -n kube-system

# Check component versions
kubectl get pods -n kube-system \
  -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[*].image

# Test cluster functionality
kubectl run test-upgrade --image=nginx --restart=Never
kubectl wait --for=condition=Ready pod/test-upgrade --timeout=60s
kubectl delete pod test-upgrade

# Check for deprecated API usage
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis

# Verify addons are functioning
kubectl get deployments -n kube-system
kubectl get services -n kube-system
```

## Handling Upgrade Failures

If the upgrade fails, investigate and potentially roll back:

```bash
# Check kubeadm logs
journalctl -u kubelet -f

# View kubeadm upgrade errors
sudo kubeadm upgrade apply v1.28.5 -v=5

# Common issues:

# 1. Pre-flight checks fail
# Solution: Address the specific pre-flight error
# Example: Certificate expiration
sudo kubeadm certs check-expiration
sudo kubeadm certs renew all

# 2. Image pull failures
# Solution: Pre-pull images
sudo kubeadm config images pull --kubernetes-version v1.28.5

# 3. Control plane components not starting
# Check static pod manifests
ls -la /etc/kubernetes/manifests/
# View logs
sudo journalctl -u kubelet -n 100 --no-pager

# Roll back if needed (before upgrading kubelet)
sudo kubeadm upgrade apply v1.27.8  # Previous version
```

## Upgrading Cluster Addons

After upgrading Kubernetes, update cluster addons:

```bash
# Update CoreDNS
kubectl set image deployment/coredns coredns=registry.k8s.io/coredns/coredns:v1.10.1 -n kube-system

# Update CNI plugin (example for Calico)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.3/manifests/calico.yaml

# Update metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.6.4/components.yaml

# Update ingress controller (example for nginx)
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --version 4.8.3
```

## Renewing Certificates During Upgrade

kubeadm automatically renews certificates during upgrades:

```bash
# Check certificate expiration before upgrade
sudo kubeadm certs check-expiration

# Certificates are renewed automatically during "kubeadm upgrade apply"
# To manually renew all certificates:
sudo kubeadm certs renew all

# Restart control plane components after manual renewal
sudo systemctl restart kubelet
```

## Creating an Upgrade Checklist

Use this checklist for consistent upgrades:

```bash
# Pre-upgrade checklist
# - [ ] Review Kubernetes changelog for target version
# - [ ] Check deprecated APIs in cluster
# - [ ] Back up etcd
# - [ ] Verify cluster health
# - [ ] Plan maintenance window
# - [ ] Communicate to stakeholders

# Control plane upgrade
# - [ ] Upgrade kubeadm on first control plane node
# - [ ] Run kubeadm upgrade plan
# - [ ] Run kubeadm upgrade apply
# - [ ] Upgrade kubelet and kubectl
# - [ ] Verify control plane health
# - [ ] Upgrade additional control plane nodes

# Worker node upgrade
# - [ ] Drain worker node
# - [ ] Upgrade kubeadm
# - [ ] Run kubeadm upgrade node
# - [ ] Upgrade kubelet and kubectl
# - [ ] Uncordon node
# - [ ] Verify node ready
# - [ ] Repeat for all workers

# Post-upgrade
# - [ ] Verify all nodes at correct version
# - [ ] Test cluster functionality
# - [ ] Update cluster addons
# - [ ] Monitor for issues
# - [ ] Update documentation
```

## Automating Upgrade Monitoring

Monitor upgrade progress:

```bash
#!/bin/bash
# monitor-upgrade.sh

while true; do
  clear
  echo "=== Cluster Upgrade Status ==="
  echo
  echo "Node Versions:"
  kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
VERSION:.status.nodeInfo.kubeletVersion,\
STATUS:.status.conditions[?(@.type==\"Ready\")].status

  echo
  echo "Control Plane Pods:"
  kubectl get pods -n kube-system \
    -l tier=control-plane \
    -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.phase,\
RESTARTS:.status.containerStatuses[0].restartCount

  echo
  echo "Addon Status:"
  kubectl get deployments -n kube-system

  sleep 10
done
```

## Troubleshooting Common Issues

Fix common upgrade problems:

```bash
# Issue: kubeadm upgrade plan shows wrong version
# Fix: Update kubeadm to correct version first
sudo apt-cache madison kubeadm
sudo apt-get install -y kubeadm=1.28.5-00

# Issue: Control plane pods crashlooping
# Check logs
kubectl logs -n kube-system kube-apiserver-<node>
# Verify manifest syntax
sudo cat /etc/kubernetes/manifests/kube-apiserver.yaml

# Issue: Nodes stay NotReady after upgrade
# Check kubelet status
sudo systemctl status kubelet
sudo journalctl -u kubelet -n 50
# Verify CNI is working
kubectl get pods -n kube-system -l k8s-app=calico-node

# Issue: Pods not scheduling after upgrade
# Check scheduler
kubectl get pods -n kube-system -l component=kube-scheduler
kubectl logs -n kube-system -l component=kube-scheduler
```

In-place minor version upgrades with kubeadm are straightforward when done methodically. Always back up etcd before starting, upgrade one node at a time, verify health after each step, and keep detailed notes of the process for future reference.
