# How to Upgrade Calico on Single-Node Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, Single-Node, CNI

Description: Safely upgrade Calico on a single-node Kubernetes cluster with minimal networking disruption.

---

## Introduction

Upgrading Calico on a single-node Kubernetes cluster is a common maintenance task for development and CI/CD environments. Unlike multi-node clusters where DaemonSet rolling updates minimize disruption, on a single-node cluster the calico-node pod restart briefly interrupts pod networking. Planning for this brief outage is important for single-node clusters serving continuous workloads.

The upgrade process follows the same manifest-based approach as multi-node clusters. You apply the new Calico manifest, which updates CRDs, the calico-node DaemonSet, and calico-kube-controllers. The key difference on a single-node cluster is that there are no other nodes to maintain networking while the upgrade occurs.

This guide provides a safe Calico upgrade procedure for single-node Kubernetes, including timing recommendations and post-upgrade validation steps.

## Prerequisites

- Single-node Kubernetes running Calico
- kubectl and calicoctl configured
- Brief maintenance window available

## Step 1: Document Current State

```bash
kubectl get nodes
kubectl get pods -n kube-system | grep calico
kubectl get daemonset calico-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
calicoctl version
```

## Step 2: Back Up Calico Resources

```bash
calicoctl get ippool -o yaml > backup-ippool.yaml
calicoctl get felixconfiguration -o yaml > backup-felix.yaml
calicoctl get bgpconfiguration -o yaml > backup-bgp.yaml
kubectl get networkpolicy --all-namespaces -o yaml > backup-netpol.yaml
```

## Step 3: Drain Non-Critical Workloads (Optional)

For single-node clusters, the upgrade will briefly interrupt networking. You may want to scale down non-critical workloads:

```bash
kubectl scale deployment --all --replicas=0 --all-namespaces
```

## Step 4: Apply the New Calico Manifest

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Step 5: Monitor the Upgrade

```bash
kubectl rollout status daemonset calico-node -n kube-system --timeout=180s
kubectl rollout status deployment calico-kube-controllers -n kube-system
```

## Step 6: Restore Workloads

```bash
kubectl scale deployment --all --replicas=1 --all-namespaces
```

## Step 7: Post-Upgrade Validation

```bash
kubectl get nodes
kubectl get pods -n kube-system | grep calico
calicoctl node status
```

Run a connectivity test:

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

You have safely upgraded Calico on a single-node Kubernetes cluster. The brief networking interruption during the calico-node pod restart is the main consideration for single-node clusters, which can be mitigated by scaling down workloads during the maintenance window. Post-upgrade validation confirms that all networking and policies are operational.
