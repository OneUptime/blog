# How to Upgrade Calico on Self-Managed DigitalOcean Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, DigitalOcean, Upgrade

Description: A safe, step-by-step process for upgrading Calico to a newer version on a self-managed Kubernetes cluster running on DigitalOcean Droplets.

---

## Introduction

Upgrading Calico on a production cluster requires care. The CNI plugin is in the critical path for all pod networking - an upgrade that goes wrong can take down inter-pod communication across entire nodes. On self-managed clusters running on DigitalOcean Droplets, you have full control over the upgrade process, which allows you to move methodically and roll back if necessary.

Calico's upgrade path depends on whether you installed with the Tigera Operator or directly with manifests. Both paths are covered here. In either case, the goal is to upgrade the control plane components first, verify stability, then let the DaemonSet roll out across nodes with zero downtime.

This guide covers a safe upgrade procedure with checkpoints at each stage.

## Prerequisites

- A self-managed Kubernetes cluster on DigitalOcean Droplets running Calico
- `kubectl` and `calicoctl` installed and matching your current Calico version
- A snapshot or backup of your current Calico configuration
- A maintenance window or low-traffic period

## Step 1: Record Current State

Document your current Calico version and configuration before touching anything.

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -o jsonpath='{.items[0].spec.containers[0].image}'
calicoctl version
calicoctl get felixconfiguration default -o yaml > felix-config-backup.yaml
calicoctl get bgpConfiguration default -o yaml > bgp-config-backup.yaml
```

## Step 2: Review the Release Notes

Check the Calico release notes for the target version. Pay attention to:
- Breaking changes in CRD schemas
- Required node restarts
- New required environment variables

```bash
# Check current version
kubectl get ds calico-node -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Step 3: Upgrade with the Tigera Operator

If you installed via the operator, update the operator first, then update the Installation CR.

```bash
# Upgrade the operator
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Patch the Installation CR with the new version
kubectl patch installation default --type merge \
  --patch '{"spec":{"variant":"Calico","calicoNetwork":{"ipPools":[{"cidr":"192.168.0.0/16","encapsulation":"VXLANCrossSubnet"}]}}}'
```

## Step 4: Upgrade with Manifests

If you installed directly with manifests, apply the new manifest.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

Monitor the rollout across nodes.

```bash
kubectl rollout status daemonset/calico-node -n kube-system
```

## Step 5: Verify Post-Upgrade Health

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get nodes
calicoctl node status
```

Test pod-to-pod connectivity across nodes to confirm the data plane is intact.

```bash
kubectl run ping-test --image=busybox --rm -it -- ping -c3 <pod-ip-on-another-node>
```

## Step 6: Update calicoctl

Match the `calicoctl` binary to the new Calico version.

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/
calicoctl version
```

## Conclusion

Safely upgrading Calico on self-managed DigitalOcean Kubernetes clusters requires backing up configuration, reviewing release notes, applying the upgrade through the operator or manifest, and verifying connectivity after each node rolls over. Taking these steps methodically ensures your pod networking remains intact throughout the upgrade.
