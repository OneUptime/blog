# How to Upgrade Calico on Bare Metal with Containers Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Upgrade

Description: A guide to safely upgrading Calico on a bare metal Kubernetes cluster running containers while maintaining BGP session stability and pod connectivity.

---

## Introduction

Upgrading Calico on a bare metal cluster with containers requires extra caution because the failure modes are more severe than in cloud environments. BGP sessions with physical switches may be disrupted if calico-node restarts ungracefully on a node that is the designated route reflector. Pods scheduled on nodes mid-upgrade may experience brief connectivity loss as iptables or eBPF rules are reprogrammed.

The Tigera Operator's rolling upgrade mechanism mitigates these risks by updating one node at a time, but you should still monitor BGP session state and pod connectivity throughout the upgrade. On bare metal, you also have the option to perform maintenance on physical switch configurations in parallel.

This guide covers a safe Calico upgrade on bare metal with containers using the Tigera Operator.

## Prerequisites

- Calico installed via the Tigera Operator on a bare metal cluster
- A documented current Calico version
- Backup of all CRDs and custom resources
- Access to switch management console (if BGP peering is configured)
- A maintenance window

## Step 1: Backup Calico Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get bgpconfiguration -o yaml > bgp-backup.yaml
calicoctl get bgppeer -o yaml > bgppeer-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
kubectl get installation default -o yaml > installation-backup.yaml
```

## Step 2: Verify Current State

Confirm all components are healthy before upgrading.

```bash
kubectl get pods -n calico-system
kubectl get tigerastatus
calicoctl node status
```

All BGP sessions should be `Established` before proceeding.

## Step 3: Upgrade the Tigera Operator

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 4: Monitor the Rolling Upgrade

The operator will begin rolling out updated calico-node pods one at a time.

```bash
watch kubectl get pods -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

Monitor BGP sessions in parallel:

```bash
watch calicoctl node status
```

## Step 5: Verify Node-by-Node

As each node's calico-node pod upgrades, verify that:
1. The pod reaches `Running` state
2. BGP sessions re-establish on that node
3. Pods on that node retain connectivity

```bash
kubectl get pods -A -o wide --field-selector spec.nodeName=<node-name>
kubectl exec -n <namespace> <pod-on-node> -- ping -c3 <remote-pod-ip>
```

## Step 6: Complete Post-Upgrade Checks

```bash
kubectl get tigerastatus
calicoctl version
kubectl get nodes
calicoctl ipam show
```

Update `calicoctl` to match:

```bash
sudo curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl && sudo chmod +x /usr/local/bin/calicoctl
```

## Conclusion

Safely upgrading Calico on bare metal with containers requires monitoring BGP session state throughout the operator-managed rolling upgrade, verifying pod connectivity on each node as it transitions, and confirming TigeraStatus shows Available after completion. The node-by-node upgrade approach ensures that at most one node's networking is in transition at any given time.
