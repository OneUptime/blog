# How to Upgrade Kubernetes Control Plane Components with kubeadm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, kubeadm

Description: Upgrade Kubernetes control plane components using kubeadm with minimal downtime, including etcd backup, component version verification, and rollback procedures for self-managed clusters.

---

kubeadm simplifies control plane upgrades by automating component version updates, certificate renewals, and configuration migrations. For self-managed clusters, understanding the kubeadm upgrade process ensures control plane updates complete successfully while maintaining API availability throughout the process.

This guide walks through upgrading control plane nodes from one minor version to the next, handling multi-master scenarios, backing up critical state, and recovering from failed upgrades.

## Prerequisites and Pre-Upgrade Checks

Before upgrading, verify cluster health and backup critical data.

```bash
# Check current cluster version
kubectl version --short
kubectl get nodes

# Verify control plane health
kubectl get pods -n kube-system
kubectl get componentstatuses  # Deprecated but still useful

# Check for deprecated APIs
pluto detect-all-in-cluster --target-versions k8s=v1.28.0

# Review release notes
# https://kubernetes.io/docs/setup/release/notes/

# Backup etcd
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify backup
ETCDCTL_API=3 etcdctl snapshot status /backup/etcd-snapshot-*.db --write-out=table
```

## Upgrading kubeadm on First Control Plane Node

Start by upgrading kubeadm itself.

```bash
# On Ubuntu/Debian - check available versions
apt-cache madison kubeadm | grep 1.28

# Upgrade kubeadm to target version
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.28.4-00
sudo apt-mark hold kubeadm

# Verify kubeadm version
kubeadm version

# Check upgrade plan
sudo kubeadm upgrade plan
```

The upgrade plan shows:

```
Components that must be upgraded manually after you have upgraded the control plane with 'kubeadm upgrade apply':
COMPONENT   CURRENT       TARGET
kubelet     1.27.8        1.28.4

Upgrade to the latest stable version:

COMPONENT                 CURRENT   TARGET
kube-apiserver            v1.27.8   v1.28.4
kube-controller-manager   v1.27.8   v1.28.4
kube-scheduler            v1.27.8   v1.28.4
kube-proxy                v1.27.8   v1.28.4
CoreDNS                   v1.10.1   v1.11.1
etcd                      3.5.9-0   3.5.9-0
```

## Applying Control Plane Upgrade

Execute the upgrade on the first control plane node.

```bash
# Apply upgrade (run only on first control plane node)
sudo kubeadm upgrade apply v1.28.4

# The upgrade will:
# 1. Preflight checks
# 2. Download new component images
# 3. Upgrade static pod manifests
# 4. Upgrade etcd (if managed by kubeadm)
# 5. Upload new configuration
# 6. Mark node as upgraded
```

Monitor the upgrade progress. You'll see output like:

```
[upgrade/config] Making sure the configuration is correct:
[upgrade/config] Reading configuration from the cluster...
[upgrade/config] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
[upgrade/apply] Respecting the --config flag that is set with higher priority than other flags
[upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.28.4"...
```

## Draining and Upgrading Control Plane Node

Prepare the node for kubelet upgrade.

```bash
# Drain the node (excluding daemonsets)
kubectl drain <control-plane-node-name> --ignore-daemonsets --delete-emptydir-data

# Upgrade kubelet and kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get update
sudo apt-get install -y kubelet=1.28.4-00 kubectl=1.28.4-00
sudo apt-mark hold kubelet kubectl

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Verify kubelet version
systemctl status kubelet
kubectl get nodes

# Uncordon the node
kubectl uncordon <control-plane-node-name>
```

## Upgrading Additional Control Plane Nodes

For high-availability clusters with multiple control plane nodes, upgrade remaining nodes.

```bash
# On second and third control plane nodes

# SSH to next control plane node
ssh control-plane-02

# Upgrade kubeadm
sudo apt-mark unhold kubeadm
sudo apt-get update
sudo apt-get install -y kubeadm=1.28.4-00
sudo apt-mark hold kubeadm

# Apply upgrade (different command for additional nodes)
sudo kubeadm upgrade node

# Drain node from first control plane
kubectl drain control-plane-02 --ignore-daemonsets --delete-emptydir-data

# Upgrade kubelet and kubectl
sudo apt-mark unhold kubelet kubectl
sudo apt-get update
sudo apt-get install -y kubelet=1.28.4-00 kubectl=1.28.4-00
sudo apt-mark hold kubelet kubectl

# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# Uncordon from first control plane
kubectl uncordon control-plane-02

# Repeat for remaining control plane nodes
```

## Verifying Control Plane Upgrade

Confirm all control plane components upgraded successfully.

```bash
# Check node versions
kubectl get nodes -o wide

# Verify control plane pods
kubectl get pods -n kube-system -o wide

# Check component versions
kubectl get pods -n kube-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}' | grep kube

# Check API server version
kubectl version

# Verify etcd health
kubectl exec -n kube-system etcd-<node-name> -- etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/peer.crt \
  --key=/etc/kubernetes/pki/etcd/peer.key \
  endpoint health

# Test cluster functionality
kubectl run test-pod --image=nginx:1.25 --rm -it -- /bin/bash
```

## Handling Upgrade Failures

If upgrade fails, troubleshoot and potentially rollback.

```bash
# Check kubeadm upgrade logs
sudo journalctl -xeu kubelet | tail -100

# Review control plane pod logs
kubectl logs -n kube-system kube-apiserver-<node-name>
kubectl logs -n kube-system kube-controller-manager-<node-name>
kubectl logs -n kube-system kube-scheduler-<node-name>

# Check for issues in upgrade preflight
sudo kubeadm upgrade apply v1.28.4 --dry-run

# If needed, restore etcd backup
sudo systemctl stop kubelet
sudo systemctl stop etcd

# Restore etcd snapshot
ETCDCTL_API=3 etcdctl snapshot restore /backup/etcd-snapshot-20260209.db \
  --data-dir=/var/lib/etcd-restore

# Update etcd manifest to use restored data
sudo sed -i 's|/var/lib/etcd|/var/lib/etcd-restore|' /etc/kubernetes/manifests/etcd.yaml

sudo systemctl start kubelet
```

## Post-Upgrade Tasks

Complete the upgrade process.

```bash
# Update kubeconfig if needed
kubectl cluster-info

# Verify RBAC still works
kubectl auth can-i create pods --as=system:serviceaccount:default:default

# Check admission controllers
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# Verify custom resources
kubectl get crds
kubectl get <your-custom-resources>

# Update any operators or controllers
helm upgrade <release-name> <chart> --reuse-values

# Document upgrade completion
cat >> /var/log/cluster-upgrades.log <<EOF
$(date): Control plane upgraded to v1.28.4
- Nodes upgraded: control-plane-01, control-plane-02, control-plane-03
- Downtime: None
- Issues: None
- Completed by: $(whoami)
EOF
```

## Automating Control Plane Upgrades

Create a script for repeatable upgrades.

```bash
#!/bin/bash
# upgrade-control-plane.sh

set -e

TARGET_VERSION="${1:-1.28.4}"
BACKUP_DIR="/backup/kubernetes"

mkdir -p $BACKUP_DIR

echo "=== Kubernetes Control Plane Upgrade to v${TARGET_VERSION} ==="
echo "Started: $(date)"

# Backup etcd
echo "Backing up etcd..."
ETCDCTL_API=3 etcdctl snapshot save ${BACKUP_DIR}/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Upgrade kubeadm
echo "Upgrading kubeadm..."
sudo apt-mark unhold kubeadm
sudo apt-get update -qq
sudo apt-get install -y kubeadm=${TARGET_VERSION}-00
sudo apt-mark hold kubeadm

# Check upgrade plan
echo "Upgrade plan:"
sudo kubeadm upgrade plan

read -p "Continue with upgrade? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Upgrade cancelled"
  exit 1
fi

# Apply upgrade
echo "Applying control plane upgrade..."
sudo kubeadm upgrade apply v${TARGET_VERSION} -y

# Upgrade kubelet and kubectl
echo "Upgrading kubelet and kubectl..."
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=${TARGET_VERSION}-00 kubectl=${TARGET_VERSION}-00
sudo apt-mark hold kubelet kubectl

sudo systemctl daemon-reload
sudo systemctl restart kubelet

echo "Control plane upgrade complete!"
echo "Completed: $(date)"

# Verify
kubectl get nodes
kubectl get pods -n kube-system
```

Make it executable and run:

```bash
chmod +x upgrade-control-plane.sh
sudo ./upgrade-control-plane.sh 1.28.4
```

kubeadm streamlines control plane upgrades by automating manifest updates, component version bumps, and configuration migrations. By following the systematic process of backing up etcd, upgrading kubeadm first, applying the control plane upgrade, and then upgrading kubelet, you ensure safe upgrades with rollback capability. For high-availability clusters, upgrading one control plane node at a time maintains API availability throughout the upgrade process.
