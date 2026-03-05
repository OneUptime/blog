# How to Verify Talos Linux Installation Was Successful

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Verification, Installation, Troubleshooting, Health Check

Description: A comprehensive checklist for verifying that your Talos Linux cluster installation completed successfully and is fully operational.

---

After installing Talos Linux and bootstrapping your Kubernetes cluster, you should verify that everything is working correctly. Skipping this step can lead to discovering problems later when workloads start failing, etcd loses data, or nodes cannot communicate properly.

This guide provides a systematic approach to verifying every layer of your Talos Linux installation.

## Layer 1: Talos OS Verification

Start at the operating system level. Verify that Talos itself is running correctly on each node.

### Check Node Connectivity

```bash
# Verify talosctl can reach the nodes
talosctl version --nodes 192.168.1.101

# Output shows both client and server versions
# Client:
#     Tag:         v1.9.0
# Server:
#     NODE:        192.168.1.101
#     Tag:         v1.9.0
```

If this fails, the Talos API is not reachable. Check network connectivity and firewall rules on port 50000.

### Verify Talos Services

Every Talos node runs a set of core services. Check that they are all healthy:

```bash
# Check services on a control plane node
talosctl services --nodes 192.168.1.101

# Expected output for a healthy control plane node:
# SERVICE        STATE     HEALTH   LAST EVENT
# apid           Running   OK       Started
# containerd     Running   OK       Started
# cri            Running   OK       Started
# etcd           Running   OK       Started
# kubelet        Running   OK       Started
# machined       Running   OK       Started
# trustd         Running   OK       Started
```

On worker nodes, you will not see `etcd` since workers do not run etcd.

```bash
# Check services on a worker node
talosctl services --nodes 192.168.1.110

# Expected output for a healthy worker node:
# SERVICE        STATE     HEALTH   LAST EVENT
# apid           Running   OK       Started
# containerd     Running   OK       Started
# cri            Running   OK       Started
# kubelet        Running   OK       Started
# machined       Running   OK       Started
# trustd         Running   OK       Started
```

If any service shows `Waiting` or an unhealthy state, investigate with logs:

```bash
# Check logs for a specific service
talosctl logs <service-name> --nodes 192.168.1.101
```

### Check System Time

Time synchronization is critical, especially for etcd. Verify NTP is working:

```bash
# Check time on all nodes
talosctl time --nodes 192.168.1.101,192.168.1.102,192.168.1.103

# The output shows each node's time and the NTP server it is syncing with
```

If time is significantly off (more than a few seconds), etcd will have problems. Verify your NTP servers are reachable.

### Verify the Machine Configuration

Confirm the configuration you intended to apply is actually what the node is running:

```bash
# View the running configuration
talosctl get machineconfig --nodes 192.168.1.101 -o yaml

# Check the Talos version
talosctl version --nodes 192.168.1.101
```

### Check Disk Layout

Verify that Talos installed to the disk correctly:

```bash
# View disk information
talosctl disks --nodes 192.168.1.101

# Check mounts
talosctl mounts --nodes 192.168.1.101
```

You should see the expected partitions: EFI, BOOT, META, STATE, and EPHEMERAL.

## Layer 2: etcd Verification

etcd is the backbone of your Kubernetes cluster. A healthy etcd cluster is non-negotiable.

### Check etcd Membership

```bash
# List etcd members
talosctl etcd members --nodes 192.168.1.101
```

For a three-node control plane, you should see three members. All should be listed and reachable.

### Check etcd Health

```bash
# Check etcd status
talosctl etcd status --nodes 192.168.1.101

# Verify there are no alarms
talosctl etcd alarm list --nodes 192.168.1.101
```

If there are etcd alarms (like NOSPACE), the cluster needs attention before proceeding.

### Test etcd Connectivity Between Nodes

etcd nodes communicate on port 2380. Verify they can reach each other by checking the logs:

```bash
# View etcd logs, looking for peer connection messages
talosctl logs etcd --nodes 192.168.1.101 | head -50

# Check all control plane nodes
talosctl logs etcd --nodes 192.168.1.102 | head -50
```

Healthy logs show successful leader elections and peer connections. Errors about unreachable peers indicate network issues.

## Layer 3: Kubernetes Verification

### Check Node Status

```bash
# All nodes should be Ready
kubectl get nodes

# Example output:
# NAME   STATUS   ROLES           AGE   VERSION
# cp1    Ready    control-plane   10m   v1.29.x
# cp2    Ready    control-plane   9m    v1.29.x
# cp3    Ready    control-plane   9m    v1.29.x
# w1     Ready    <none>          8m    v1.29.x
```

If a node is `NotReady`, check its kubelet logs:

```bash
talosctl logs kubelet --nodes <node-ip>
```

### Verify System Pods

```bash
# Check all pods in kube-system
kubectl get pods -n kube-system

# Every pod should be Running with all containers ready
# Look for:
# - coredns (usually 2 replicas)
# - etcd (one per control plane node)
# - kube-apiserver (one per control plane node)
# - kube-controller-manager (one per control plane node)
# - kube-scheduler (one per control plane node)
# - kube-proxy (one per node)
# - kube-flannel or your CNI (one per node)
```

If any pod is not Running, describe it to see what is wrong:

```bash
kubectl describe pod <pod-name> -n kube-system
```

### Test DNS Resolution

CoreDNS must be working for services to discover each other:

```bash
# Run a DNS test from inside the cluster
kubectl run dns-test --image=busybox:latest --rm -it --restart=Never -- nslookup kubernetes.default.svc.cluster.local

# Expected output:
# Server:    10.96.0.10
# Address:   10.96.0.10:53
# Name:      kubernetes.default.svc.cluster.local
# Address:   10.96.0.1
```

If DNS resolution fails, check the CoreDNS pods and their logs:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns
```

### Test Pod Scheduling

Verify that pods can be scheduled and run:

```bash
# Create a test pod
kubectl run test-pod --image=alpine:latest --rm -it --restart=Never -- echo "Cluster is working"

# If you see "Cluster is working", scheduling and container execution are fine
```

### Test Network Connectivity

Verify pods can communicate across nodes:

```bash
# Create a deployment with multiple replicas
kubectl create deployment net-test --image=nginx:alpine --replicas=3

# Wait for pods to be ready
kubectl rollout status deployment/net-test

# Check which nodes the pods landed on
kubectl get pods -l app=net-test -o wide

# Expose as a ClusterIP service
kubectl expose deployment net-test --port=80

# Test service connectivity from another pod
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- curl -s http://net-test.default.svc.cluster.local

# Clean up
kubectl delete deployment net-test
kubectl delete service net-test
```

## Layer 4: The Comprehensive Health Check

Talos provides a built-in comprehensive health check:

```bash
# Run the full health check
talosctl health --nodes 192.168.1.101 --wait-timeout 5m
```

This single command verifies:

- All nodes are reachable
- etcd is healthy and has the correct number of members
- The Kubernetes API server is responding
- All nodes are in a Ready state
- System pods are running

If this passes, your cluster is in good shape.

## Verification Checklist

Run through this checklist after every installation:

1. talosctl can connect to every node
2. All Talos services are Running and OK on every node
3. Time is synchronized across all nodes
4. etcd has the correct number of members
5. No etcd alarms are present
6. All Kubernetes nodes are Ready
7. All kube-system pods are Running
8. CoreDNS resolves internal names
9. Pods can be scheduled and run
10. Cross-node pod communication works
11. talosctl health passes

If every item on this list checks out, your Talos Linux installation is successful and ready for workloads. If anything fails, the error messages from the verification commands above will point you toward the root cause.
