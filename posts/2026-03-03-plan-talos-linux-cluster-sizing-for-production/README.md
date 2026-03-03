# How to Plan Talos Linux Cluster Sizing for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Sizing, Production, Kubernetes, Capacity Planning

Description: A practical guide to sizing your Talos Linux cluster for production workloads, covering control plane resources, worker node calculations, and scaling strategies.

---

Getting cluster sizing right for a production Talos Linux deployment saves you from two painful outcomes: under-provisioning that leads to outages and over-provisioning that wastes money. Unlike general Kubernetes sizing guides, Talos Linux has specific characteristics that affect sizing decisions - its immutable OS design means lower overhead, but its etcd requirements and control plane architecture have their own constraints. This guide walks through the sizing process with practical recommendations.

## Control Plane Node Sizing

Control plane nodes run etcd, the Kubernetes API server, the controller manager, the scheduler, and the Talos API. These components have distinct resource requirements.

### Minimum Requirements

For a small production cluster (up to 50 nodes):

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 2 cores | 4 cores     |
| RAM      | 4 GB    | 8 GB        |
| Disk     | 50 GB SSD | 100 GB SSD |
| Network  | 1 Gbps  | 1 Gbps      |

### Medium Clusters (50-200 nodes):

| Resource | Recommended |
|----------|-------------|
| CPU      | 4-8 cores   |
| RAM      | 16 GB       |
| Disk     | 100-200 GB SSD |
| Network  | 10 Gbps     |

### Large Clusters (200+ nodes):

| Resource | Recommended |
|----------|-------------|
| CPU      | 8-16 cores  |
| RAM      | 32 GB       |
| Disk     | 200+ GB NVMe |
| Network  | 10-25 Gbps  |

### Why etcd Drives Disk Requirements

etcd is the most resource-sensitive component on control plane nodes. It requires fast disk I/O for its write-ahead log (WAL). If etcd cannot write to disk quickly enough, it triggers leader elections and the entire cluster becomes unstable.

Key disk requirements for etcd:

- Use SSDs or NVMe drives. Spinning disks are not suitable.
- Target less than 10ms for 99th percentile disk write latency
- etcd database size grows with the number of Kubernetes objects (pods, services, configmaps, secrets)
- Default etcd quota is 2 GB, which is sufficient for most clusters

You can estimate etcd storage needs:

```text
Approximate etcd size = (number of pods x 2 KB) + (number of services x 1 KB)
                      + (number of configmaps/secrets x average size)
```

For a cluster with 5,000 pods, 500 services, and 1,000 configmaps averaging 5 KB:

```text
(5000 x 2 KB) + (500 x 1 KB) + (1000 x 5 KB) = 10 MB + 0.5 MB + 5 MB = ~16 MB
```

This seems small, but etcd also stores historical revisions and needs room for compaction and defragmentation.

## How Many Control Plane Nodes

Always run an odd number of control plane nodes:

- **1 node**: Development and testing only. No fault tolerance.
- **3 nodes**: Standard production. Tolerates 1 node failure.
- **5 nodes**: High availability. Tolerates 2 node failures.
- **7 nodes**: Rarely needed. Only for extremely critical clusters.

Three control plane nodes is the standard for most production deployments. Going to five adds fault tolerance but also increases etcd consensus latency slightly because more nodes need to agree on writes.

```yaml
# Talos configuration for a 3-node control plane
cluster:
  controlPlane:
    endpoint: https://10.0.1.100:6443
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
```

## Worker Node Sizing

Worker node sizing depends entirely on your workloads. The goal is to find the right balance between node size (vertical scaling) and node count (horizontal scaling).

### Calculating Worker Resources

Start by inventorying your workload requirements:

```text
Total CPU needed = Sum of all pod CPU requests + overhead
Total RAM needed = Sum of all pod memory requests + overhead
```

Add overhead for:

- Kubelet and container runtime: ~0.5 CPU, 1 GB RAM per node
- System pods (CNI, monitoring agents): ~0.5 CPU, 1 GB RAM per node
- Talos system services: ~0.2 CPU, 0.5 GB RAM per node
- Buffer for pod scheduling: 10-20% above total requests

### Example Sizing Calculation

Suppose you need to run:

- 100 application pods, each requesting 0.5 CPU and 512 MB RAM
- 10 database pods, each requesting 2 CPU and 4 GB RAM
- DaemonSet pods on every node (monitoring, logging): 0.3 CPU, 256 MB RAM per node

Total workload CPU: (100 x 0.5) + (10 x 2) = 70 cores
Total workload RAM: (100 x 0.512) + (10 x 4) = 91.2 GB

With 20% buffer: 84 CPU cores and ~110 GB RAM

Node sizing options:

| Option | Node Size | Node Count | Total Resources |
|--------|-----------|------------|-----------------|
| A      | 4 CPU, 16 GB | 25 nodes | 100 CPU, 400 GB |
| B      | 8 CPU, 32 GB | 12 nodes | 96 CPU, 384 GB |
| C      | 16 CPU, 64 GB | 7 nodes | 112 CPU, 448 GB |

Option B is often the sweet spot. It provides enough nodes for pod distribution without being so many that DaemonSet overhead becomes significant, and not so few that losing one node is a major impact.

## The Node Size Trade-off

Fewer large nodes vs many small nodes is a fundamental trade-off:

**Fewer large nodes:**
- Lower DaemonSet overhead (fewer copies of monitoring agents, etc.)
- Losing one node impacts more pods
- Better for large pods that need significant resources
- Simpler to manage

**Many small nodes:**
- Better fault isolation (losing one node impacts fewer pods)
- More scheduling flexibility
- Higher DaemonSet overhead
- Better for many small pods

For Talos Linux specifically, the management overhead of more nodes is lower than traditional Linux because there is no SSH access, no package management, and the OS is immutable. The main cost of more nodes is DaemonSet resource consumption and slightly more etcd entries for node objects.

## Storage Sizing

Talos Linux has an ephemeral partition for container images, logs, and kubelet data. Size this based on your workload:

```yaml
# Machine configuration for disk partitioning
machine:
  install:
    disk: /dev/sda
    # The installer automatically partitions the disk
    # Ephemeral partition gets the remaining space after system partitions
```

For the ephemeral partition, plan for:

- Container images: Sum of unique images x average image size
- Container logs: Depends on log volume and rotation settings
- kubelet data: emptyDir volumes, ephemeral storage requests

A typical worker node needs at least 50 GB for the ephemeral partition. Nodes running many distinct containers or containers that produce significant logs may need 100-200 GB.

## Network Bandwidth Sizing

Network requirements depend on your workloads:

- **Standard web applications**: 1 Gbps is usually sufficient
- **Data-intensive workloads**: 10 Gbps or higher
- **Storage clusters (Ceph, Longhorn)**: 10 Gbps minimum for storage traffic, preferably on a dedicated interface

Talos cluster traffic includes:

- etcd replication: Low bandwidth but latency-sensitive
- Kubernetes API traffic: Moderate, scales with pod count
- Pod-to-pod traffic: Depends entirely on applications
- Container image pulls: Can be significant during deployments

## Scaling Strategy

Plan for growth from the start. Here are practical strategies:

### Horizontal Pod Autoscaler Budget

If you use HPA, your cluster needs headroom for pods to scale up:

```text
Cluster capacity = Peak pod count x resource requests per pod x (1 + headroom percentage)
```

A 30% headroom is common for production clusters.

### Cluster Autoscaler Integration

If running in a cloud environment, configure the cluster autoscaler to add Talos worker nodes automatically:

```yaml
# Cluster autoscaler deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
spec:
  template:
    spec:
      containers:
        - name: cluster-autoscaler
          image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0
          args:
            - --cloud-provider=aws
            - --nodes=3:20:talos-workers
            - --scale-down-utilization-threshold=0.5
            - --scale-down-delay-after-add=10m
```

### Manual Scaling Plan

For bare metal, have a scaling plan that answers:

- At what utilization do we add nodes? (Recommended: when average utilization exceeds 70%)
- How long does it take to provision and add a new node?
- Do we have spare hardware available for emergency scaling?

## Resource Reservations

Talos Linux automatically reserves some resources for system components. You can adjust the kubelet's resource reservation:

```yaml
machine:
  kubelet:
    extraArgs:
      system-reserved: "cpu=500m,memory=1Gi"
      kube-reserved: "cpu=500m,memory=1Gi"
      eviction-hard: "memory.available<500Mi,nodefs.available<10%"
```

These reservations prevent workload pods from consuming all resources and starving system components.

## Testing Your Sizing

Before committing to production sizing, validate with load testing:

```bash
# Deploy a test workload at expected scale
kubectl create namespace load-test
kubectl apply -f load-test-deployment.yaml

# Monitor resource usage
kubectl top nodes
kubectl top pods -n load-test

# Check for resource pressure
kubectl describe nodes | grep -A5 "Conditions:"
```

Run the test for at least 24 hours to observe patterns like memory leaks, garbage collection pressure, and log accumulation.

## Conclusion

Sizing a Talos Linux cluster for production requires balancing control plane stability, worker capacity, storage, and network bandwidth. Start with three control plane nodes on fast SSDs, size worker nodes based on actual workload requirements with appropriate headroom, and plan your scaling strategy before you need it. Talos Linux's low system overhead gives you slightly more capacity per node compared to traditional Linux distributions, but do not cut corners on etcd disk performance or control plane memory. Validate your sizing with realistic load tests before going to production, and monitor continuously to catch capacity issues before they become outages.
