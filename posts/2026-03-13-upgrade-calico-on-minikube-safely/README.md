# How to Upgrade Calico on Minikube Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, Minikube, CNI

Description: Step-by-step instructions for safely upgrading Calico to a newer version on a Minikube cluster.

---

## Introduction

Upgrading Calico on Minikube is a useful practice for testing upgrade procedures before applying them to production. The manifest-based upgrade process replaces Calico components through a rolling update, which on a single-node Minikube cluster happens sequentially without load balancing across nodes.

Understanding the upgrade path is important. Calico supports upgrading one minor version at a time for major version upgrades. For patch version upgrades within the same minor version (e.g., v3.27.0 to v3.27.2), the process is straightforward. This guide focuses on upgrading from v3.26.x to v3.27.0.

Before upgrading, back up your Calico configuration resources. Although the upgrade process does not delete custom resources, having a backup provides a safety net if the upgrade needs to be rolled back.

## Prerequisites

- Minikube running Calico v3.26.x
- kubectl and calicoctl installed
- Sufficient disk space for new container images

## Step 1: Check Current Calico Version

```bash
kubectl get deployment calico-kube-controllers -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
echo ""
kubectl get daemonset calico-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Step 2: Back Up Calico Resources

```bash
calicoctl get ippool -o yaml > ippool-backup.yaml
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get networkpolicy --all-namespaces -o yaml > netpol-backup.yaml
```

## Step 3: Pre-Upgrade Health Check

Ensure the cluster is healthy before starting:

```bash
kubectl get nodes
kubectl get pods -n kube-system | grep calico
calicoctl node status
```

## Step 4: Apply the New Calico Manifest

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

This updates CRDs, the calico-node DaemonSet, and calico-kube-controllers.

## Step 5: Monitor Upgrade Progress

```bash
kubectl rollout status daemonset calico-node -n kube-system --timeout=180s
kubectl rollout status deployment calico-kube-controllers -n kube-system --timeout=60s
```

## Step 6: Verify Post-Upgrade Health

```bash
kubectl get pods -n kube-system | grep calico
kubectl get nodes
calicoctl node status
```

## Step 7: Run Connectivity Tests

```bash
kubectl run post-upgrade-test --image=busybox --restart=Never -- ping -c 4 8.8.8.8
kubectl logs post-upgrade-test
kubectl delete pod post-upgrade-test
```

## Step 8: Update calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl
calicoctl version
```

## Conclusion

You have safely upgraded Calico on Minikube by backing up resources, applying the new manifest, monitoring the rollout, and verifying post-upgrade health. Practicing this process on Minikube builds confidence for executing the same upgrade on production clusters.
