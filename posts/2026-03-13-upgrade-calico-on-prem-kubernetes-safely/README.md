# How to Upgrade Calico on On-Prem Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premise, Upgrade

Description: A safe upgrade procedure for moving Calico to a newer version on an on-premises Kubernetes cluster with minimal disruption.

---

## Introduction

Upgrading Calico on an on-premises cluster is a high-stakes operation. The CNI plugin is in the critical path for all pod networking, and a failed upgrade can break inter-pod communication across the cluster. On-prem environments add additional considerations: BGP sessions with physical routers must remain stable throughout the upgrade, and there is no cloud provider rollback mechanism if something goes wrong.

Calico supports rolling upgrades when using the Tigera Operator - the operator manages the DaemonSet rollout node by node, ensuring only one node is transitioning at a time. This means existing pods on other nodes continue to function normally while the upgrade proceeds.

This guide covers a safe, operator-managed Calico upgrade on an on-premises Kubernetes cluster.

## Prerequisites

- Calico installed via the Tigera Operator on an on-prem cluster
- Current Calico version documented
- Backup of all Calico CRDs and custom resources
- Maintenance window scheduled

## Step 1: Backup Current Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get bgpconfiguration -o yaml > bgp-backup.yaml
calicoctl get bgppeer -o yaml > bgppeer-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
kubectl get installation default -o yaml > installation-backup.yaml
```

## Step 2: Check Current Version

```bash
kubectl get installation default -o jsonpath='{.status.calicoVersion}'
calicoctl version
```

## Step 3: Upgrade the Tigera Operator

Apply the new operator manifest. The operator itself will be upgraded before it upgrades Calico components.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
```

Wait for the operator to be ready:

```bash
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 4: Monitor the Calico Upgrade

The operator automatically upgrades calico-node and calico-kube-controllers after it upgrades itself.

```bash
watch kubectl get pods -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

Monitor BGP sessions during the rollout:

```bash
watch calicoctl node status
```

## Step 5: Verify Post-Upgrade State

```bash
kubectl get tigerastatus
kubectl get nodes
calicoctl version
```

Test pod connectivity across nodes:

```bash
kubectl run verify-a --image=busybox -- sleep 300
kubectl run verify-b --image=busybox -- sleep 300
kubectl exec verify-a -- ping -c3 $(kubectl get pod verify-b -o jsonpath='{.status.podIP}')
kubectl delete pod verify-a verify-b
```

## Step 6: Upgrade calicoctl

```bash
sudo curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
sudo chmod +x /usr/local/bin/calicoctl
calicoctl version
```

## Conclusion

Safely upgrading Calico on an on-prem Kubernetes cluster requires backing up all CRDs, upgrading the Tigera Operator first, monitoring the rolling DaemonSet update, keeping an eye on BGP session stability, and validating pod connectivity after the upgrade completes. The operator-managed rolling upgrade minimizes disruption by updating one node at a time.
