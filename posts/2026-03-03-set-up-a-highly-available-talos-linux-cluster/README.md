# How to Set Up a Highly Available Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, High Availability, Kubernetes, Cluster Setup, Infrastructure

Description: Complete guide to building a highly available Talos Linux cluster with multiple control plane nodes, load balancing, and redundant storage.

---

High availability is a non-negotiable requirement for production Kubernetes clusters. A single control plane node means a single point of failure, and if it goes down, your entire cluster becomes unmanageable. Talos Linux makes HA setup straightforward because its API-driven configuration and lack of SSH simplify bootstrapping and managing multiple control plane nodes. Every node is configured identically through machine configurations, which eliminates the manual steps and potential inconsistencies that plague traditional HA setups.

This guide walks through setting up a fully highly available Talos Linux cluster from scratch, including load balancing, etcd redundancy, and worker node configuration.

## Architecture Overview

A proper HA Talos Linux cluster consists of:

- **3 or 5 control plane nodes** - Running etcd, kube-apiserver, kube-controller-manager, and kube-scheduler
- **A load balancer** - Distributing API server traffic across control plane nodes
- **2+ worker nodes** - Running application workloads
- **Shared or replicated storage** - For stateful workloads

The minimum for HA is 3 control plane nodes, which allows etcd to maintain quorum even if one node fails. Five nodes tolerate two failures simultaneously.

## Setting Up the Load Balancer

The load balancer sits in front of your control plane nodes and distributes traffic to the Kubernetes API server (port 6443). There are several options for this.

### Option 1: HAProxy

If you have a dedicated machine available, HAProxy is a reliable choice:

```
# /etc/haproxy/haproxy.cfg
frontend kubernetes-api
    bind *:6443
    mode tcp
    default_backend kubernetes-api-servers

backend kubernetes-api-servers
    mode tcp
    balance roundrobin
    option tcp-check
    server cp1 192.168.1.10:6443 check fall 3 rise 2
    server cp2 192.168.1.11:6443 check fall 3 rise 2
    server cp3 192.168.1.12:6443 check fall 3 rise 2

frontend talos-api
    bind *:50000
    mode tcp
    default_backend talos-api-servers

backend talos-api-servers
    mode tcp
    balance roundrobin
    option tcp-check
    server cp1 192.168.1.10:50000 check fall 3 rise 2
    server cp2 192.168.1.11:50000 check fall 3 rise 2
    server cp3 192.168.1.12:50000 check fall 3 rise 2
```

### Option 2: Talos Virtual IP

Talos Linux supports a built-in virtual IP (VIP) feature that provides a floating IP address across control plane nodes without any external load balancer:

```yaml
# This goes into the machine configuration for control plane nodes
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.1.100
```

The VIP automatically moves to a healthy control plane node if the current holder fails.

### Option 3: DNS Round-Robin

For cloud environments, you can use DNS round-robin with health checks. Point a DNS record at all control plane node IPs.

## Generating Cluster Configuration

Generate the Talos configuration for your HA cluster:

```bash
# Generate cluster configs with the VIP as the endpoint
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --output-dir _out \
  --with-docs=false \
  --with-examples=false
```

This creates:

- `controlplane.yaml` - Configuration for control plane nodes
- `worker.yaml` - Configuration for worker nodes
- `talosconfig` - Client configuration for talosctl

## Configuring Control Plane Nodes

Edit the control plane configuration to include the VIP and any custom settings:

```yaml
# controlplane-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.1.100
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
  certSANs:
    - 192.168.1.100
    - 192.168.1.10
    - 192.168.1.11
    - 192.168.1.12
cluster:
  controlPlane:
    endpoint: https://192.168.1.100:6443
  etcd:
    advertisedSubnets:
      - 192.168.1.0/24
  allowSchedulingOnControlPlanes: false
```

Apply configurations to each control plane node:

```bash
# Apply config to the first control plane node
talosctl apply-config --insecure \
  --nodes 192.168.1.10 \
  --file _out/controlplane.yaml \
  --config-patch @controlplane-patch.yaml

# Apply to the second control plane node
talosctl apply-config --insecure \
  --nodes 192.168.1.11 \
  --file _out/controlplane.yaml \
  --config-patch @controlplane-patch.yaml

# Apply to the third control plane node
talosctl apply-config --insecure \
  --nodes 192.168.1.12 \
  --file _out/controlplane.yaml \
  --config-patch @controlplane-patch.yaml
```

## Bootstrapping the Cluster

Bootstrap etcd on the first control plane node only:

```bash
# Bootstrap the cluster from the first control plane node
talosctl bootstrap --nodes 192.168.1.10 \
  --talosconfig _out/talosconfig \
  --endpoints 192.168.1.10
```

Wait for the first node to become ready, then the other control plane nodes will automatically join:

```bash
# Check cluster member status
talosctl --talosconfig _out/talosconfig \
  --endpoints 192.168.1.100 \
  --nodes 192.168.1.10 \
  etcd members
```

You should see all three control plane nodes listed as etcd members.

## Adding Worker Nodes

Apply the worker configuration to each worker node:

```bash
# Apply worker config
talosctl apply-config --insecure \
  --nodes 192.168.1.20 \
  --file _out/worker.yaml

talosctl apply-config --insecure \
  --nodes 192.168.1.21 \
  --file _out/worker.yaml
```

## Retrieving the Kubeconfig

```bash
# Get the kubeconfig
talosctl kubeconfig --nodes 192.168.1.100 \
  --talosconfig _out/talosconfig \
  --endpoints 192.168.1.100
```

Verify the cluster:

```bash
# Check all nodes
kubectl get nodes

# Verify etcd health
talosctl --talosconfig _out/talosconfig \
  --endpoints 192.168.1.100 \
  --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  health
```

## Verifying High Availability

Test that the cluster survives a control plane node failure:

```bash
# Check current etcd leader
talosctl etcd members --nodes 192.168.1.10

# Simulate a failure by rebooting one control plane node
talosctl reboot --nodes 192.168.1.11

# Verify the cluster is still accessible
kubectl get nodes
kubectl get pods -A
```

The cluster should remain fully operational during and after the reboot. Kubernetes API requests may briefly fail during leader election but will recover automatically.

## Storage for HA Workloads

For stateful workloads that need HA, deploy a distributed storage solution:

```bash
# Install Longhorn for distributed storage
helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultReplicaCount=3
```

Longhorn replicates data across multiple nodes, so a single node failure does not result in data loss.

## Monitoring Cluster Health

Set up monitoring to track the health of your HA cluster:

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

Key alerts to configure for HA:

- etcd cluster has fewer than 3 members
- Control plane component is down on any node
- Node not ready for more than 5 minutes
- PersistentVolume replication degraded

## Conclusion

A highly available Talos Linux cluster provides the reliability that production workloads demand. With three control plane nodes, a load balancer or VIP, and distributed storage, your cluster can survive individual node failures without any downtime. Talos's API-driven approach makes the setup process consistent and repeatable, and its immutable design means each node in your HA cluster is identical and free from configuration drift.
