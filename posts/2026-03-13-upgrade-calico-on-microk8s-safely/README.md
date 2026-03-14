# How to Upgrade Calico on MicroK8s Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, MicroK8s, CNI

Description: Step-by-step instructions for safely upgrading Calico on MicroK8s while maintaining cluster stability.

---

## Introduction

Upgrading Calico on MicroK8s differs from other distributions because MicroK8s manages Calico through its add-on system. Calico upgrades on MicroK8s are typically tied to MicroK8s channel upgrades. However, you can also apply Calico upgrades independently by manually applying newer manifests while keeping MicroK8s version pinned.

Understanding which upgrade path to use depends on whether you want to upgrade just Calico or upgrade both MicroK8s and Calico together. The safest approach for production environments is to upgrade in stages: first upgrade MicroK8s to a new channel on a test cluster, validate Calico functionality, then apply to production.

This guide covers both the MicroK8s channel upgrade approach and the manual Calico manifest upgrade approach, along with pre and post-upgrade validation steps.

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

To upgrade MicroK8s (which includes a newer Calico version):

```bash
sudo snap refresh microk8s --channel=1.29/stable
```

Monitor the upgrade:

```bash
microk8s status --wait-ready
```

## Step 4b: Manual Calico Manifest Upgrade

To upgrade only Calico while keeping MicroK8s version:

```bash
microk8s kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
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
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl
calicoctl version
```

## Conclusion

You have safely upgraded Calico on MicroK8s by backing up resources, choosing the appropriate upgrade path (channel or manual manifest), monitoring the rolling update, and validating post-upgrade health. This process ensures minimal disruption while keeping Calico up to date with security patches and new features.
