# How to Configure CPU Manager Static Policy for Guaranteed CPU Pinning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CPU Management, Performance

Description: Configure Kubernetes CPU Manager with static policy to pin pods to specific CPU cores for guaranteed performance, reduced latency, and elimination of CPU throttling in latency-sensitive workloads.

---

CPU throttling and context switching kill performance for latency-sensitive applications. Kubernetes CPU Manager's static policy solves this by pinning guaranteed pods to dedicated CPU cores. This guide shows you how to configure CPU pinning for predictable performance.

## Why CPU Pinning Matters

Without CPU pinning, the kernel scheduler moves processes between CPU cores freely. This causes:

- CPU cache misses when processes migrate
- Context switching overhead
- Unpredictable latency spikes
- Poor performance for real-time workloads

CPU pinning (also called CPU affinity or core isolation) dedicates specific cores to specific containers, eliminating these issues.

## How CPU Manager Works

The kubelet's CPU Manager has two policies:

- **none** (default): No CPU affinity, kernel schedules freely
- **static**: Pins guaranteed pods to exclusive CPU cores

With the static policy, pods in the Guaranteed QoS class with whole CPU requests get dedicated cores. The kubelet tracks CPU allocation and updates the container's cgroup cpuset.

## Enabling CPU Manager Static Policy

Configure the kubelet with the static policy. Edit `/var/lib/kubelet/config.yaml`:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cpuManagerPolicy: static
cpuManagerReconcilePeriod: 10s
```

Or pass flags to the kubelet:

```bash
kubelet \
  --cpu-manager-policy=static \
  --cpu-manager-reconcile-period=10s
```

Restart the kubelet after making changes.

## Removing the CPU Manager State File

When switching from `none` to `static`, remove the CPU Manager state file:

```bash
# Stop kubelet first
systemctl stop kubelet

# Remove state file
rm /var/lib/kubelet/cpu_manager_state

# Start kubelet
systemctl start kubelet
```

The kubelet rebuilds the state file based on running containers.

## Creating Pods with CPU Pinning

Only Guaranteed QoS pods with whole CPU requests get pinned. A pod is Guaranteed when:

- All containers have CPU and memory requests and limits
- Requests equal limits

Here's a pod that gets 2 dedicated CPUs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pinned-app
spec:
  containers:
  - name: app
    image: high-performance-app:latest
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

The kubelet pins this container to 2 specific CPU cores.

## Verifying CPU Pinning

Check which cores are assigned by inspecting the container's cgroup:

```bash
# Get container ID
CONTAINER_ID=$(crictl ps | grep pinned-app | awk '{print $1}')

# Check cpuset
cat /sys/fs/cgroup/cpuset/kubepods/pod*/*/cpuset.cpus
```

You'll see output like `2-3`, meaning cores 2 and 3 are assigned exclusively.

Or use the kubelet API:

```bash
kubectl get --raw /api/v1/nodes/worker-1/proxy/configz | jq '.kubeletconfig.cpuManagerPolicy'
```

## Reserving CPUs for System Processes

Reserve CPUs for kubelet and system daemons to prevent starvation:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cpuManagerPolicy: static
systemReserved:
  cpu: "1"
kubeReserved:
  cpu: "1"
```

This reserves 2 CPUs (1 for system, 1 for Kubernetes) out of the allocatable pool. On an 8-core node, 6 cores are available for pinning.

## Handling Fractional CPU Requests

Fractional requests like `cpu: "1.5"` don't get pinned. Only whole numbers (1, 2, 4) qualify:

```yaml
# This gets pinned
resources:
  requests:
    cpu: "4"
  limits:
    cpu: "4"

# This does NOT get pinned
resources:
  requests:
    cpu: "3.5"
  limits:
    cpu: "3.5"
```

Fractional requests fall back to the shared CPU pool.

## Shared CPU Pool

CPUs not allocated to pinned pods form the shared pool. Non-Guaranteed pods and pods with fractional requests share these cores. The shared pool includes:

- Cores reserved via `systemReserved` and `kubeReserved`
- Cores not allocated to any Guaranteed pod

## CPU Pinning for Multi-Container Pods

Each container's CPU request is pinned independently:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pinned
spec:
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        cpu: "2"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "2Gi"
  - name: sidecar
    image: sidecar:latest
    resources:
      requests:
        cpu: "1"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "1Gi"
```

The app container gets 2 cores, the sidecar gets 1 core. All 3 cores are exclusive to this pod.

## CPU Manager and NUMA Awareness

CPU Manager works with Topology Manager to align CPU, memory, and device allocations on NUMA nodes. When both are enabled, pinned CPUs come from the same NUMA node as the pod's memory:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cpuManagerPolicy: static
topologyManagerPolicy: single-numa-node
```

This eliminates cross-NUMA traffic for maximum performance.

## Troubleshooting CPU Pinning

**Pod Stays Pending**: Check if enough free CPUs are available. Use `kubectl describe node` to see allocatable vs allocated CPUs.

**Pinning Not Applied**: Verify the pod is Guaranteed QoS and requests whole CPUs. Check kubelet logs:

```bash
journalctl -u kubelet | grep -i "cpu manager"
```

**State File Corruption**: If CPU Manager behaves incorrectly, drain the node and remove the state file:

```bash
kubectl drain worker-1 --ignore-daemonsets
systemctl stop kubelet
rm /var/lib/kubelet/cpu_manager_state
systemctl start kubelet
kubectl uncordon worker-1
```

## CPU Pinning for High-Performance Computing

HPC workloads benefit massively from CPU pinning. Example MPI job:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mpi-job
spec:
  containers:
  - name: mpi
    image: openmpi:latest
    command: ["mpirun", "-np", "8", "./compute"]
    resources:
      requests:
        cpu: "8"
        memory: "32Gi"
      limits:
        cpu: "8"
        memory: "32Gi"
```

All 8 MPI ranks run on dedicated cores with no context switching.

## Monitoring CPU Pinning Effectiveness

Use node exporter and Prometheus to track CPU metrics:

```yaml
# Prometheus query
node_cpu_seconds_total{mode="system"} by (cpu)
```

Compare CPU utilization across cores. Pinned cores should show consistent load from their assigned containers.

## Best Practices

- Reserve CPUs for system and kubelet
- Use whole CPU requests for critical workloads
- Combine with Topology Manager for NUMA awareness
- Monitor CPU allocation per node
- Test pinning with CPU-bound benchmarks
- Document which workloads need pinning
- Use node labels to schedule pinned workloads
- Drain nodes before changing CPU Manager policy

## Real-World Example: Database with CPU Pinning

PostgreSQL benefits from CPU pinning for consistent query performance:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres-pinned
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "secret"
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
      limits:
        cpu: "4"
        memory: "16Gi"
```

Configure PostgreSQL to use 4 worker processes matching the pinned cores:

```sql
-- postgresql.conf
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
```

## CPU Pinning vs CPU Quotas

CPU Manager pinning is different from CPU quotas:

- **CPU Quota** (default): CFS enforces CPU limits, but processes can migrate
- **CPU Pinning** (static policy): Processes are bound to specific cores

Pinning provides better performance isolation and lower latency.

## Limitations

- Only works for Guaranteed pods with whole CPU requests
- Requires restarting kubelet to enable/disable
- Can reduce overall CPU utilization if workloads are idle
- Doesn't work with CPU burstable pods

## Advanced Configuration

Set CPU Manager policy options:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cpuManagerPolicy: static
cpuManagerPolicyOptions:
  full-pcpus-only: "true"
```

The `full-pcpus-only` option requires pods to request multiples of the physical CPU count (for hyperthreading-aware allocation).

## Conclusion

CPU Manager's static policy provides deterministic CPU allocation for latency-sensitive workloads. Enable it on nodes running high-performance applications that need guaranteed CPU access. Combine with Topology Manager for NUMA-aware scheduling and reserve CPUs for system processes to maintain node stability. CPU pinning trades flexibility for performance - use it where consistent low latency matters more than efficient packing.
