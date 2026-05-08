# How to Upgrade Calico on K3s Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, k3s, CNI

Description: A safe process for upgrading Calico on K3s clusters while maintaining edge workload availability.

---

## Introduction

Upgrading Calico on K3s follows the standard manifest-based approach used for other self-managed Kubernetes distributions. Because K3s clusters are often deployed at the edge with limited redundancy, the upgrade process must be executed carefully to avoid prolonged networking disruptions.

Kubernetes' rolling update mechanism for DaemonSets updates calico-node pods in a controlled sequence. With the default DaemonSet rolling update settings, one calico-node pod can be unavailable at a time, minimizing the window during which any single node is without networking. For single-node K3s clusters, the upgrade briefly interrupts networking while the calico-node pod restarts.

This guide provides a safe Calico upgrade procedure for K3s, including pre-upgrade preparation, the upgrade itself, and post-upgrade validation with rollback instructions if needed.

## Prerequisites

- K3s cluster running Calico
- kubectl configured and calicoctl installed
- Backup of Calico resources

## Step 1: Record Current State

```bash
kubectl get daemonset calico-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
calicoctl version
kubectl get nodes
```

## Step 2: Back Up Calico Configuration

```bash
calicoctl get ippool -o yaml > backup-ippool.yaml
calicoctl get felixconfiguration -o yaml > backup-felix.yaml
calicoctl get globalnetworkpolicy -o yaml > backup-gnp.yaml
calicoctl get networkpolicy --all-namespaces -o yaml > backup-netpol.yaml
```

## Step 3: Run Pre-Upgrade Connectivity Test

```bash
kubectl run pre-upgrade-test --image=busybox --restart=Never -- ping -c 4 8.8.8.8
kubectl logs pre-upgrade-test
kubectl delete pod pre-upgrade-test
```

## Step 4: Apply New Calico Manifest

```bash
curl https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml -o upgrade.yaml
# Reapply any local changes from your existing manifest, including K3s CNI settings
# such as container_settings.allow_ip_forwarding when required.
kubectl apply --server-side --force-conflicts -f upgrade.yaml
```

## Step 5: Monitor the Upgrade

```bash
kubectl rollout status daemonset calico-node -n kube-system --timeout=300s
kubectl rollout status deployment calico-kube-controllers -n kube-system --timeout=120s
```

Watch individual pod updates:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -w
```

## Step 6: Post-Upgrade Validation

```bash
kubectl get nodes
kubectl get pods -n kube-system | grep calico
calicoctl node status
```

## Step 7: Run Post-Upgrade Connectivity Test

```bash
kubectl run post-upgrade-test --image=busybox --restart=Never -- ping -c 4 8.8.8.8
kubectl logs post-upgrade-test
kubectl delete pod post-upgrade-test
```

## Step 8: Rollback if Needed

If the upgrade causes issues, rollback:

```bash
kubectl rollout undo daemonset calico-node -n kube-system
kubectl rollout undo deployment calico-kube-controllers -n kube-system
```

Restore backed-up resources:

```bash
calicoctl apply -f backup-ippool.yaml
calicoctl apply -f backup-felix.yaml
```

## Conclusion

You have safely upgraded Calico on K3s by preparing backups, applying the new manifest, monitoring the rolling update, and validating post-upgrade connectivity. The rollback procedure provides a safety net for edge deployments where availability is critical.
