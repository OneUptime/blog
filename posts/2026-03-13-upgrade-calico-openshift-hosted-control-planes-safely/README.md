# How to Upgrade Calico on OpenShift Hosted Control Planes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Upgrade

Description: A safe upgrade procedure for Calico on OpenShift Hosted Control Plane worker nodes.

---

## Introduction

Upgrading Calico on OpenShift Hosted Control Planes follows the standard operator-managed rolling upgrade process, but with one additional consideration: during the upgrade, worker nodes will be rolling through calico-node pod replacements, and their connectivity to the remote API server must be maintained throughout. If the management cluster has any network disruptions during the Calico upgrade window, the upgrade may stall or fail.

Coordinating the Calico upgrade with the management cluster team - ensuring no maintenance is scheduled on the management cluster during the upgrade window - is an important planning step that does not apply to non-HCP deployments.

This guide covers a safe Calico upgrade on OpenShift Hosted Control Plane worker nodes.

## Prerequisites

- Calico running on an OpenShift Hosted Control Plane cluster
- `kubectl` configured with hosted cluster kubeconfig
- Coordination confirmed with management cluster team
- Maintenance window scheduled

## Step 1: Pre-Upgrade Verification

```bash
export KUBECONFIG=hosted-kubeconfig.yaml
kubectl get tigerastatus
kubectl get pods -n calico-system
kubectl get nodes
calicoctl version
```

All must be healthy before upgrading.

## Step 2: Verify API Server Connectivity

Confirm worker nodes can reach the management cluster API server.

```bash
# From a pod on the worker nodes
kubectl exec -n calico-system -it <calico-node-pod> -- curl -sk \
  https://kubernetes.default.svc.cluster.local/healthz
```

## Step 3: Backup Calico Configuration

```bash
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
kubectl get installation default -o yaml > installation-backup.yaml
```

## Step 4: Upgrade the Tigera Operator

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 5: Monitor the Rolling Upgrade

```bash
watch kubectl get pods -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

Monitor API server connectivity during the upgrade:

```bash
watch kubectl get nodes
```

## Step 6: Post-Upgrade Verification

```bash
kubectl get tigerastatus
kubectl get nodes
calicoctl version
kubectl get pods -A | grep -v Running | grep -v Completed
```

Test pod connectivity:

```bash
kubectl run verify --image=busybox -- sleep 60
kubectl exec verify -- ping -c3 kubernetes.default.svc.cluster.local
kubectl delete pod verify
```

## Conclusion

Safely upgrading Calico on OpenShift Hosted Control Planes requires coordination with the management cluster team to prevent concurrent maintenance, continuous monitoring of API server connectivity during the rolling upgrade, and post-upgrade verification of both Calico component health and pod networking. The remote API server dependency is the unique risk in HCP upgrades compared to standard cluster upgrades.
