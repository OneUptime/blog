# How to Migrate Existing Workloads to Calico on On-Prem Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premises, Migration

Description: A guide to migrating workloads from an existing CNI to Calico on an on-premises Kubernetes cluster with minimal downtime.

---

## Introduction

Migrating an on-premises Kubernetes cluster from an existing CNI plugin to Calico is a significant infrastructure change. All pods will receive new IP addresses after the migration, which means any service that depends on pod IPs directly — rather than Service or DNS names — will be disrupted. Careful planning and a phased approach minimize this disruption.

The on-premises advantage is that you can schedule the migration around your own maintenance windows and you can snapshot physical router configurations before making changes. Unlike cloud environments, you also have direct access to the network hardware if BGP sessions need to be manually reset.

This guide covers migrating from Flannel or similar CNI plugins to Calico on an on-prem cluster.

## Prerequisites

- An on-prem Kubernetes cluster running with a non-Calico CNI
- `kubectl` with cluster admin access
- SSH access to all nodes
- Backup of all workload manifests and network configurations
- A maintenance window

## Step 1: Document Current State

```bash
kubectl get all -A -o yaml > workloads-backup.yaml
kubectl get networkpolicies -A -o yaml > policies-backup.yaml
kubectl get nodes -o wide > node-ips.txt
```

Record the current pod CIDR:

```bash
kubectl cluster-info dump | grep -i cidr
```

## Step 2: Gracefully Remove the Existing CNI

Cordon all nodes first to prevent new pod scheduling during the transition.

```bash
kubectl get nodes -o name | xargs kubectl cordon
```

Delete the existing CNI DaemonSet:

```bash
# For Flannel
kubectl delete -f kube-flannel.yml

# Clean up CNI config on each node (run on all nodes)
rm -f /etc/cni/net.d/10-flannel.conflist /run/flannel/subnet.env
```

## Step 3: Install Calico

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
```

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: None
      natOutgoing: true
      nodeSelector: all()
```

```bash
kubectl apply -f calico-installation.yaml
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s
```

## Step 4: Restart Workloads Node by Node

Uncordon nodes one at a time and restart pods to get Calico-assigned IPs.

```bash
kubectl uncordon <node-1>
kubectl delete pods -A --field-selector spec.nodeName=<node-1> --grace-period=30
```

Wait for pods to restart and stabilize before proceeding to the next node.

## Step 5: Verify Connectivity

```bash
calicoctl ipam show
kubectl get pods -A -o wide
kubectl exec -it <pod-a> -- ping -c3 <pod-b-ip>
```

## Step 6: Apply Network Policies

Re-apply your network policies. If you were using Kubernetes NetworkPolicy resources, they apply as-is. If you want to add Calico-specific policies:

```bash
kubectl apply -f policies-backup.yaml
```

## Conclusion

Migrating to Calico on an on-prem Kubernetes cluster requires cordoning all nodes before removing the old CNI, installing Calico, then uncordoning and restarting pods node by node to pick up new Calico-assigned IPs. The node-by-node approach limits the blast radius of any issues and allows you to verify each node before proceeding.
