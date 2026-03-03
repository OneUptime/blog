# How to Choose Between Control Plane and Worker Node Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Control Plane, Worker Nodes, Architecture

Description: Understand the differences between control plane and worker node configurations in Talos Linux and when to use each.

---

When you run `talosctl gen config`, it generates two separate machine configuration files: `controlplane.yaml` and `worker.yaml`. These are not just two names for the same thing. They configure fundamentally different roles in your Kubernetes cluster, and applying the wrong one to a node can cause real problems.

This guide explains the differences between control plane and worker configurations, how to decide which role each node should have, and how the configurations differ under the hood.

## What Control Plane Nodes Do

Control plane nodes are the brain of your Kubernetes cluster. They run the components that make cluster-level decisions:

- **etcd** - The distributed key-value store that holds all cluster state. Every piece of information about your cluster (pods, services, secrets, configurations) lives in etcd.
- **kube-apiserver** - The front door to Kubernetes. Every kubectl command, every controller, and every kubelet communicates through the API server.
- **kube-controller-manager** - Runs the control loops that maintain desired state. If a pod dies, the controller manager notices and creates a replacement.
- **kube-scheduler** - Decides which node should run each new pod based on resources, constraints, and policies.

## What Worker Nodes Do

Worker nodes are the muscle. They run your actual workloads:

- **kubelet** - The node agent that manages pods on that node. It communicates with the API server to receive pod assignments and reports back on their status.
- **Container runtime** - Talos uses containerd to actually run containers.
- **kube-proxy** - Manages network rules on the node for service load balancing.

Worker nodes do not run etcd or any control plane components.

## How the Configurations Differ

Let us look at the key differences between the two configuration files.

### Control Plane Configuration Extras

The control plane config includes several sections that the worker config does not:

```yaml
# In controlplane.yaml, you will find these additional sections:

cluster:
  # etcd configuration
  etcd:
    ca:
      crt: <certificate>
      key: <private-key>

  # API server certificates and configuration
  apiServer:
    certSANs:
      - 192.168.1.100

  # Controller manager configuration
  controllerManager: {}

  # Scheduler configuration
  scheduler: {}

  # Certificates for the control plane PKI
  secretboxEncryptionSecret: <encryption-secret>
  ca:
    crt: <cluster-CA-cert>
    key: <cluster-CA-key>
  aggregatorCA:
    crt: <aggregator-CA-cert>
    key: <aggregator-CA-key>
  serviceAccount:
    key: <service-account-key>
```

### Worker Configuration

The worker config is simpler. It does not contain etcd settings, API server certificates, or the cluster CA private key:

```yaml
# In worker.yaml:

cluster:
  # Workers only have the CA certificate (not the key)
  ca:
    crt: <cluster-CA-cert>
    # No key here - workers do not need to sign certificates

  # Workers know where the API server is
  controlPlane:
    endpoint: https://192.168.1.100:6443

  # Token for joining the cluster
  token: <bootstrap-token>
```

The important security distinction: worker nodes receive the cluster CA certificate but not the private key. This means a compromised worker cannot issue new certificates for the cluster.

## Decision Criteria: Control Plane vs Worker

### How Many Control Plane Nodes

The standard recommendations:

- **1 control plane node** - Development and testing only. No fault tolerance.
- **3 control plane nodes** - Standard production setup. Can tolerate one node failure.
- **5 control plane nodes** - Large or critical clusters needing higher fault tolerance. Can tolerate two node failures.

Always use an odd number for control plane nodes because of etcd's quorum requirements. With three nodes, quorum is two. With five, quorum is three. Even numbers (2, 4) do not improve fault tolerance over the next lower odd number.

### How Many Worker Nodes

This depends entirely on your workload. Considerations:

- Total CPU and memory needed by your applications
- Whether you need to spread workloads across failure domains
- Minimum number of replicas for your critical services

For a homelab, zero dedicated workers (with scheduling on control plane enabled) can be fine. For production, plan your worker capacity based on your actual workload requirements.

### Mixed Workloads on Control Plane Nodes

By default, Kubernetes does not schedule regular workloads on control plane nodes. They have a taint that repels normal pods:

```
node-role.kubernetes.io/control-plane:NoSchedule
```

In Talos, you can remove this taint to allow scheduling:

```yaml
# In your cluster configuration patch
cluster:
  allowSchedulingOnControlPlanes: true
```

When this makes sense:

- Small clusters where you do not want dedicated workers
- Development environments where simplicity matters
- Resource-constrained environments where every node counts

When to avoid it:

- Production clusters where control plane stability is critical
- Clusters running resource-intensive workloads that might starve control plane components
- High-security environments where you want workload isolation

## Hardware Considerations

### Control Plane Nodes

Prioritize:

- **Fast storage (SSD/NVMe)** - etcd writes are latency-sensitive. Slow disks directly impact cluster performance.
- **Reliable networking** - etcd requires consistent low-latency communication between peers.
- **Sufficient RAM** - The API server and etcd can use significant memory, especially in large clusters.

Recommended minimums: 4 CPU cores, 8 GB RAM, SSD storage.

### Worker Nodes

Prioritize:

- **CPU and RAM** - Match these to your workload requirements.
- **Storage** - Capacity for container images and ephemeral storage.
- **Specialized hardware** - GPUs, high-speed NICs, or large disks as needed by your applications.

Worker node specs are entirely workload-dependent. A node running machine learning workloads needs very different hardware than one running web servers.

## Applying the Right Configuration

When setting up your cluster, be deliberate about which configuration goes to which node:

```bash
# Apply control plane config to control plane nodes
talosctl apply-config --insecure --nodes 192.168.1.101 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.1.102 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.1.103 --file controlplane.yaml

# Apply worker config to worker nodes
talosctl apply-config --insecure --nodes 192.168.1.110 --file worker.yaml
talosctl apply-config --insecure --nodes 192.168.1.111 --file worker.yaml
```

If you accidentally apply the wrong configuration type, the node will try to fulfill the wrong role. A node with worker config cannot run etcd. A node with control plane config will try to run etcd even if you intended it as a worker.

## Can You Change a Node's Role

Switching a node from worker to control plane (or vice versa) is not a simple configuration change. The node needs to be reset and reconfigured:

```bash
# Reset the node
talosctl reset --nodes 192.168.1.110

# Apply the correct configuration
talosctl apply-config --insecure --nodes 192.168.1.110 --file controlplane.yaml
```

This is by design. Changing roles involves changes to the PKI, etcd membership, and fundamental service topology that cannot be safely done in-place.

## Summary Table

| Aspect | Control Plane | Worker |
|--------|--------------|--------|
| etcd | Yes | No |
| API Server | Yes | No |
| Controller Manager | Yes | No |
| Scheduler | Yes | No |
| kubelet | Yes | Yes |
| kube-proxy | Yes | Yes |
| Cluster CA key | Yes | No |
| Default workload scheduling | No (taint) | Yes |
| Minimum recommended | 3 (HA) | Based on workload |
| Storage priority | SSD required | Workload dependent |

Choosing the right configuration for each node is one of the foundational decisions in your cluster architecture. Get it right from the start, and your cluster will be stable and well-organized. The rule of thumb is simple: use an odd number of control plane nodes for fault tolerance, and scale your workers based on your application needs.
