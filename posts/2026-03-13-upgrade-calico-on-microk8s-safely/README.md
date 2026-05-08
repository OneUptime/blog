# How to Upgrade Calico on MicroK8s Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, MicroK8s, CNI

Description: Step-by-step instructions for safely upgrading Calico on MicroK8s while maintaining cluster stability.

---

## Introduction

Upgrading Calico on MicroK8s differs from other distributions because MicroK8s manages its default CNI manifest under the snap-managed CNI configuration directory. Upgrading MicroK8s does not upgrade the already deployed Calico resources automatically. However, newer MicroK8s snaps include an updated Calico manifest that you can apply after reviewing and preserving any local customizations.

Understanding which upgrade path to use depends on whether you want to upgrade just Calico from the manifest bundled with your current MicroK8s snap or upgrade MicroK8s first and then apply the Calico manifest from the refreshed snap. The safest approach for production environments is to upgrade in stages: first test the MicroK8s channel and Calico manifest on a test cluster, validate Calico functionality, then apply to production.

This guide covers both the MicroK8s channel refresh step and the manual Calico manifest upgrade step, along with pre and post-upgrade validation steps.

## Prerequisites

- MicroK8s with Calico running
- calicoctl and kubectl installed
- Backup of Calico configuration resources

## Step 1: Identify Current Versions

```bash
microk8s version
microk8s kubectl get pods -n kube-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

## Step 2: Back Up Calico Configuration

```bash
calicoctl get ippool -o yaml > ippool-backup.yaml
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get globalnetworkpolicy -o yaml > gnp-backup.yaml
```

## Step 3: Pre-Upgrade Cluster Health Check

```bash
microk8s status
microk8s kubectl get nodes
microk8s kubectl get pods -n kube-system
```

## Step 4a: Upgrade via MicroK8s Channel

To upgrade MicroK8s to a newer channel:

```bash
sudo snap refresh microk8s --channel=1.29/stable
```

Monitor the upgrade:

```bash
microk8s status --wait-ready
```

## Step 4b: Manual Calico Manifest Upgrade

To upgrade Calico using the manifest bundled with the installed MicroK8s snap, first back up the current CNI manifest and copy the newer manifest into the MicroK8s CNI configuration directory. On multi-node clusters, repeat the file update on each node to avoid configuration drift.

```bash
sudo cp /var/snap/microk8s/current/args/cni-network/cni.yaml \
  /var/snap/microk8s/current/args/cni-network/cni.yaml.backup
sudo cp /snap/microk8s/current/upgrade-scripts/000-switch-to-calico/resources/calico.yaml \
  /var/snap/microk8s/current/args/cni-network/cni.yaml
```

Compare `cni.yaml` with `cni.yaml.backup` and carry forward any local customizations, such as IP autodetection settings. Then apply the updated manifest:

```bash
microk8s kubectl apply -f /var/snap/microk8s/current/args/cni-network/cni.yaml
```

## Step 5: Monitor the Rolling Update

```bash
microk8s kubectl rollout status daemonset calico-node -n kube-system --timeout=180s
microk8s kubectl rollout status deployment calico-kube-controllers -n kube-system
```

## Step 6: Post-Upgrade Validation

```bash
microk8s status
microk8s kubectl get nodes
microk8s kubectl get pods -n kube-system | grep calico
calicoctl node status
```

## Step 7: Run Connectivity Smoke Test

```bash
microk8s kubectl run smoke-test --image=busybox --restart=Never -- ping -c 4 8.8.8.8
microk8s kubectl logs smoke-test
microk8s kubectl delete pod smoke-test
```

## Step 8: Update calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o calicoctl
sudo install -m 0755 calicoctl /usr/local/bin/calicoctl
calicoctl version
```

## Conclusion

You have safely upgraded Calico on MicroK8s by backing up resources, choosing the appropriate upgrade path (channel or manual manifest), monitoring the rolling update, and validating post-upgrade health. This process ensures minimal disruption while keeping Calico up to date with security patches and new features.
