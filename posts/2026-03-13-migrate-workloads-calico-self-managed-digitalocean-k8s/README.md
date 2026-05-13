# How to Migrate Workloads to Calico on DO Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, DigitalOcean, Migration

Description: A guide to migrating existing workloads from another CNI plugin to Calico on a self-managed Kubernetes cluster running on DigitalOcean Droplets.

---

## Introduction

Migrating from Flannel or Canal to Calico on a self-managed DigitalOcean cluster requires careful planning. The CNI plugin manages pod IP assignment and network routing, so switching it means pod IPs can change and pods may be restarted during the migration. The key is to use Calico's supported live migration workflow so nodes move over in a controlled sequence.

DigitalOcean Droplets allow you to operate directly on the underlying nodes, which simplifies self-managed cluster maintenance. For Flannel or Canal clusters that meet the migration requirements, Calico's migration controller can move one node at a time while the rest of the cluster continues to serve traffic.

This guide covers the supported migration workflow from Flannel or Canal to Calico on a self-managed DigitalOcean Kubernetes cluster. If your cluster uses another CNI, such as Weave, the supported approach is to create a new Calico-backed cluster and migrate workloads to it.

## Prerequisites

- A running self-managed Kubernetes cluster on DigitalOcean Droplets with Flannel VXLAN or Canal
- Flannel v0.9.1 or later, or Canal v3.7.0 or later
- Flannel installed as a Kubernetes DaemonSet using the Kubernetes API datastore, with DirectRouting disabled
- `kubectl` with cluster admin access
- `calicoctl` configured for the cluster
- A backup of current network configuration and running workload manifests
- A maintenance window or canary deployment strategy

## Step 1: Backup Current State

Export all workloads and network policies before making any changes.

```bash
kubectl get all -A -o yaml > all-workloads-backup.yaml
kubectl get networkpolicies -A -o yaml > network-policies-backup.yaml
```

Document your current pod CIDR:

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'
```

## Step 2: Confirm the Existing CNI

Do not manually delete the Flannel DaemonSet before starting the migration. Confirm that Flannel is running as a DaemonSet and note its namespace and name.

```bash
kubectl get daemonsets -A | grep -E 'flannel|canal'
kubectl get configmap -A | grep -E 'flannel|canal'
```

## Step 3: Install Calico

Apply the Calico Flannel migration manifest, then start the migration controller.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/flannel-migration/calico.yaml
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/flannel-migration/migration-job.yaml
```

## Step 4: Monitor the Node-by-Node Migration

The migration controller updates nodes one at a time. Monitor the migration job and controller logs until the job reports one completion.

```bash
kubectl get jobs -n kube-system flannel-migration
kubectl get pods -n kube-system -l k8s-app=flannel-migration-controller
kubectl logs -n kube-system -l k8s-app=flannel-migration-controller
```

After the job completes, remove the migration job.

```bash
kubectl delete -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/flannel-migration/migration-job.yaml
```

## Step 5: Verify Connectivity

After the migration completes, verify that pods have Calico-managed IPs and can communicate.

```bash
kubectl get pods -A -o wide
calicoctl ipam show
kubectl exec -it <pod-a> -- ping -c3 <pod-b-ip>
```

## Step 6: Apply Network Policies

Re-apply your Kubernetes NetworkPolicy manifests. If you also use Calico-specific policies, apply those separately.

```bash
kubectl apply -f network-policies-backup.yaml
kubectl get networkpolicy --all-namespaces
calicoctl get networkpolicy --all-namespaces -o wide
```

## Conclusion

Migrating existing workloads from Flannel or Canal to Calico on self-managed DigitalOcean Kubernetes requires using Calico's migration manifest and controller so nodes move over one at a time. Taking a methodical approach and verifying connectivity at each stage makes this migration manageable and reversible.
