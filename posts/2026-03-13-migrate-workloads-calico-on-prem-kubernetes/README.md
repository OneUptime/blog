# How to Migrate Existing Workloads to Calico on On-Prem Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premise, Migration

Description: A guide to migrating workloads from an existing CNI to Calico on an on-premises Kubernetes cluster with minimal downtime.

---

## Introduction

Migrating an on-premises Kubernetes cluster from an existing CNI plugin to Calico is a significant infrastructure change. Pods may receive new IP addresses as they are recreated during the migration, which means any service that depends on pod IPs directly - rather than Service or DNS names - will be disrupted. Careful planning and a phased approach minimize this disruption.

The on-premises advantage is that you can schedule the migration around your own maintenance windows and you can snapshot physical router configurations before making changes. Unlike cloud environments, you also have direct access to the network hardware if BGP sessions need to be manually reset.

This guide covers migrating from Flannel or Canal using the VXLAN backend to Calico on an on-prem cluster.

## Prerequisites

- An on-prem Kubernetes cluster running Flannel v0.9.1 or later, or Canal v3.7.0 or later, with the VXLAN backend
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
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

## Step 2: Prepare the Existing CNI

Confirm that Flannel was installed as a Kubernetes DaemonSet and is using the Kubernetes API for configuration. The Calico migration controller updates one node at a time, so do not manually delete the Flannel DaemonSet or CNI configuration before starting the migration.

```bash
kubectl get daemonsets -A | grep -i flannel
kubectl get configmaps -A | grep -i flannel
```

If your Flannel DaemonSet is named or namespaced differently than the defaults, record those values before starting the migration. They can be supplied to the migration controller as environment variables in the migration job manifest.

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds
```

## Step 3: Install Calico

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/flannel-migration/calico.yaml
```

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/flannel-migration/migration-job.yaml
```

## Step 4: Monitor the Migration Node by Node

The migration controller updates nodes one at a time. Watch the migration job and controller logs before proceeding.

```bash
kubectl get jobs -n kube-system flannel-migration
kubectl get pods -n kube-system -l k8s-app=flannel-migration-controller
kubectl logs -n kube-system -l k8s-app=flannel-migration-controller
```

The migration is complete when the `flannel-migration` job shows `1/1` completions. Then remove the migration controller.

```bash
kubectl delete -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/flannel-migration/migration-job.yaml
```

## Step 5: Verify Connectivity

```bash
kubectl get ippools.crd.projectcalico.org
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -A -o wide
kubectl exec <pod-a> -- ping -c3 <pod-b-ip>
```

## Step 6: Apply Network Policies

Re-apply your network policies. If you were using Kubernetes NetworkPolicy resources, they apply as-is because Calico supports the Kubernetes NetworkPolicy API.

```bash
kubectl apply -f policies-backup.yaml
```

## Conclusion

Migrating to Calico on an on-prem Kubernetes cluster requires backing up the current state, confirming that Flannel meets the migration requirements, installing Calico with the Flannel migration manifest, then monitoring the migration controller as it updates nodes one at a time. The node-by-node approach limits the blast radius of any issues and allows you to verify each node before proceeding.
