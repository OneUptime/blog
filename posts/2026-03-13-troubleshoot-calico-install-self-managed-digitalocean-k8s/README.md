# How to Troubleshoot Calico on DO Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, DigitalOcean, Troubleshooting

Description: A practical guide to diagnosing and resolving common Calico installation problems on self-managed Kubernetes clusters hosted on DigitalOcean Droplets.

---

## Introduction

Installing Calico on self-managed Kubernetes clusters running on DigitalOcean Droplets is straightforward in most cases, but several failure modes can surface during or after installation. Pods may remain in a Pending state, nodes may not become Ready, or Calico components themselves may crash-loop. Diagnosing these issues efficiently requires knowing which logs to check and which configuration values to verify.

DigitalOcean Droplet networking has specific characteristics - private networking, floating IPs, and the Droplet metadata service - that can interact with Calico's auto-detection logic in unexpected ways. Understanding both layers helps you isolate problems quickly.

This guide covers the most common installation issues and how to resolve them on self-managed DigitalOcean Kubernetes clusters.

## Prerequisites

- A self-managed Kubernetes cluster on DigitalOcean Droplets with Calico partially or fully installed
- `kubectl` configured with cluster admin access
- `calicoctl` installed
- SSH access to at least one Droplet node

## Step 1: Check Calico Pod Status

Start by reviewing the state of all Calico pods.

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=calico-kube-controllers
kubectl get pods -n tigera-operator
```

Look for pods in `CrashLoopBackOff`, `Error`, or `Pending` states.

## Step 2: Read Calico Node Logs

The `calico-node` DaemonSet logs contain the most actionable error messages.

```bash
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50
```

Common errors include:
- `Failed to auto-detect IP address` - Calico picked the wrong interface
- `BIRD is not ready` - BGP daemon failed to start
- `Datastore is not ready` - etcd or Kubernetes API connectivity issue

## Step 3: Fix IP Auto-Detection

On DigitalOcean Droplets with multiple network interfaces (public, private, anchor), Calico may select the wrong one. Patch the `calico-node` DaemonSet to force the correct interface.

```bash
kubectl set env daemonset/calico-node -n kube-system \
  IP_AUTODETECTION_METHOD=interface=eth1
```

Replace `eth1` with your private network interface name. Verify it with `ip link` on the Droplet.

## Step 4: Verify IPAM Configuration

Check that pod CIDR assignment is working.

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

If blocks are not allocated, the CNI plugin may not be writing to the datastore. Check CNI logs:

```bash
# On a worker node
journalctl -u kubelet | grep calico
ls /var/log/calico/cni/
```

## Step 5: Inspect Node Readiness

Nodes that are NotReady often have a missing CNI config.

```bash
kubectl describe node <node-name> | grep -A10 "Conditions"
kubectl get node <node-name> -o yaml | grep -A5 "taints"
```

If the node has a `node.kubernetes.io/not-ready` taint, check that the CNI config file exists.

```bash
# On the node
ls /etc/cni/net.d/
cat /etc/cni/net.d/10-calico.conflist
```

## Step 6: Re-apply the Calico Manifest

If configuration drift caused the issue, re-apply the operator or manifest.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Conclusion

Troubleshooting Calico on self-managed DigitalOcean Kubernetes clusters centers on checking pod logs, verifying interface auto-detection, inspecting IPAM state, and confirming CNI configuration files are present on each node. With the right sequence of checks, most installation issues can be diagnosed and resolved in a few minutes.
