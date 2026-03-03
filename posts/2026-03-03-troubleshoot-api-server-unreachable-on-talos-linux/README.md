# How to Troubleshoot API Server Unreachable on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, API Server, Troubleshooting, Control Plane

Description: Step-by-step guide to diagnosing and resolving Kubernetes API server connectivity issues on Talos Linux clusters.

---

When the Kubernetes API server becomes unreachable on a Talos Linux cluster, everything grinds to a halt. You cannot run `kubectl` commands, workloads cannot be scheduled, and the cluster is essentially unusable. The API server is the central hub through which all Kubernetes components communicate, so getting it back online is always the top priority.

This guide walks through the systematic process of finding and fixing API server reachability problems on Talos Linux.

## Symptoms of an Unreachable API Server

You will typically notice the problem when `kubectl` commands fail:

```bash
# This is what you see when the API server is unreachable
kubectl get nodes
# Error: Unable to connect to the server: dial tcp 10.0.0.10:6443: connect: connection refused
```

Or you might see a timeout:

```bash
kubectl get nodes
# Error: Unable to connect to the server: dial tcp 10.0.0.10:6443: i/o timeout
```

These two error messages actually point to different problems. "Connection refused" means something is listening at that IP but not on that port, or the service is down. "I/O timeout" means you cannot even reach the IP address.

## Step 1: Verify the Control Plane Endpoint

First, confirm what endpoint you are trying to reach. Check your kubeconfig:

```bash
# Check the server endpoint in your kubeconfig
kubectl config view --minify | grep server
```

This should show you the control plane endpoint URL. Make sure this matches what you configured when you generated the Talos cluster configuration.

## Step 2: Check if the API Server Process Is Running

Use `talosctl` to check the kube-apiserver status on your control plane nodes:

```bash
# Check the API server service status
talosctl -n <cp-ip> service kube-apiserver

# If it shows as not running, check the logs
talosctl -n <cp-ip> logs kube-apiserver --tail 100
```

If the API server is not running, the logs will tell you why. Common reasons include etcd being unavailable, certificate errors, or bind address conflicts.

## Step 3: Check etcd Health

The API server depends entirely on etcd. If etcd is down, the API server will either not start or will return errors. Check etcd:

```bash
# Check etcd service status
talosctl -n <cp-ip> service etcd

# Check etcd health
talosctl -n <cp-ip> etcd status
```

If etcd is not healthy, fix that first before troubleshooting the API server further. The API server cannot function without a healthy etcd cluster.

## Step 4: Verify Network Path to the Endpoint

If you are using a load balancer (which is recommended for multi-node control planes), the problem might be in the load balancer configuration rather than the API server itself.

```bash
# Test direct connectivity to each control plane node
curl -k https://<cp-1-ip>:6443/healthz
curl -k https://<cp-2-ip>:6443/healthz
curl -k https://<cp-3-ip>:6443/healthz

# Test the load balancer endpoint
curl -k https://<load-balancer-ip>:6443/healthz
```

If individual nodes respond but the load balancer does not, the issue is with your load balancer setup. Check that it is configured to forward traffic to port 6443 on all control plane nodes.

If you are using Talos's built-in VIP (Virtual IP) feature:

```bash
# Check if the VIP is assigned to one of the control plane nodes
talosctl -n <cp-1-ip> get addresses | grep <vip>
talosctl -n <cp-2-ip> get addresses | grep <vip>
talosctl -n <cp-3-ip> get addresses | grep <vip>
```

The VIP should be assigned to exactly one node. If it is not assigned to any node, there may be a configuration issue or a conflict with your network.

## Step 5: Check Firewall Rules

Port 6443 must be open on all control plane nodes for incoming connections from both worker nodes and external clients. Check your firewall rules:

```bash
# For cloud environments, check security groups
# For bare metal, check iptables on the host network
# Talos does not have iptables CLI, so check from outside

# Try connecting from a worker node
talosctl -n <worker-ip> read /proc/net/tcp
```

Make sure that no network policy or security group is blocking traffic to port 6443.

## Step 6: Certificate Validation Failures

If the API server is running but clients cannot connect due to TLS errors, you might see messages like:

```
Unable to connect to the server: x509: certificate signed by unknown authority
```

This means your kubeconfig contains a CA certificate that does not match the one used by the API server. This happens when you regenerate cluster configurations without updating your kubeconfig.

Regenerate your kubeconfig:

```bash
# Generate a fresh kubeconfig from the Talos cluster
talosctl -n <cp-ip> kubeconfig --force
```

## Step 7: API Server Audit and Admission Webhook Failures

If you have configured audit logging or admission webhooks that are unreachable, the API server may fail to start or become extremely slow:

```bash
# Check API server logs for webhook-related errors
talosctl -n <cp-ip> logs kube-apiserver | grep -i webhook
talosctl -n <cp-ip> logs kube-apiserver | grep -i admission
```

If a webhook is causing the API server to hang, you may need to update your machine configuration to remove the problematic admission plugin configuration.

## Step 8: Resource Exhaustion on Control Plane Nodes

The API server is a memory-intensive process. On control plane nodes with limited RAM, the API server may be OOM-killed by the kernel:

```bash
# Check for OOM kills in the kernel log
talosctl -n <cp-ip> dmesg | grep -i oom

# Check memory usage
talosctl -n <cp-ip> memory
```

If memory is the issue, either add more RAM to your control plane nodes or reduce the workload on the cluster.

## Step 9: Check Static Pod Manifest

On Talos, the API server runs as a static pod. Check if the manifest is being generated correctly:

```bash
# Check static pod status
talosctl -n <cp-ip> get staticpodstatus

# View the generated manifest
talosctl -n <cp-ip> get staticpod kube-apiserver -o yaml
```

If the static pod manifest has errors, there may be a problem with your machine configuration. Review the control plane configuration carefully.

## Step 10: DNS Resolution for the Endpoint

If your control plane endpoint uses a hostname instead of an IP address, make sure DNS is resolving correctly:

```bash
# From your workstation
nslookup <endpoint-hostname>
dig <endpoint-hostname>
```

DNS failures can make the endpoint unreachable even when the API server is running fine. Consider using IP addresses for the control plane endpoint to eliminate DNS as a variable.

## Recovery Procedure

If the API server is completely down and you cannot recover it through the steps above, here is the nuclear option:

```bash
# 1. Make sure etcd is healthy on at least one control plane node
talosctl -n <cp-ip> etcd status

# 2. Reset the problematic control plane node
talosctl -n <broken-cp-ip> reset --graceful=false

# 3. Re-apply the control plane configuration
talosctl apply-config --insecure -n <broken-cp-ip> --file controlplane.yaml

# 4. Wait for the node to bootstrap and rejoin
talosctl -n <broken-cp-ip> health
```

If all control plane nodes are down simultaneously, you will need to perform a disaster recovery using an etcd snapshot backup. This is why regular etcd backups are critical.

## Summary

API server reachability issues on Talos Linux fall into a few broad categories: the process is not running, the network path is broken, certificates do not match, or the node is out of resources. Start by checking if the API server process is up and if etcd is healthy - these two checks will quickly narrow down your investigation. Always keep your kubeconfig up to date and make sure your firewall rules allow traffic on port 6443.
