# How to Configure CPU Pinning on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CPU Pinning, Performance, Kubernetes, Resource Management

Description: A detailed guide to configuring CPU pinning on Talos Linux for predictable performance in latency-sensitive Kubernetes workloads

---

CPU pinning, also known as processor affinity, is the practice of binding a process or thread to a specific CPU core. When done correctly, it eliminates the performance overhead of the kernel moving processes between cores, which causes cache misses, cache line bouncing, and unpredictable latency spikes. On Talos Linux, CPU pinning is achieved through a combination of kernel boot parameters and Kubernetes CPU management policies.

This guide walks through the complete setup process for CPU pinning on Talos Linux.

## Why CPU Pinning Matters

Modern CPUs have multiple levels of cache. L1 and L2 caches are private to each core, while L3 is shared across cores in a socket. When the Linux scheduler moves a process from one core to another, all the data in L1 and L2 must be reloaded on the new core. This cache migration takes thousands of CPU cycles and shows up as latency spikes.

For general-purpose workloads, the scheduler does a good job of balancing load across cores. But for latency-sensitive applications like financial trading systems, real-time data processing, or telecommunications workloads, these migration-induced spikes are unacceptable. CPU pinning keeps your application on the same core, maintaining warm caches and predictable performance.

## Step 1: Isolate CPUs at the Kernel Level

The first step is telling the Linux kernel to keep certain CPUs free from general-purpose scheduling. This is done through kernel boot parameters in the Talos machine configuration:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Isolate CPUs 4-15 from the general scheduler
      - isolcpus=4-15

      # Disable timer interrupts on isolated CPUs
      - nohz_full=4-15

      # Offload RCU callbacks from isolated CPUs
      - rcu_nocbs=4-15

      # Disable NMI watchdog to reduce jitter
      - nmi_watchdog=0
```

Let me explain each parameter:

- `isolcpus` removes the specified CPUs from the scheduler's pool. No process will be scheduled on these cores unless explicitly requested.
- `nohz_full` disables periodic timer interrupts on the isolated cores. Normally, the kernel sends a timer tick to every core at a fixed interval (usually 250Hz or 1000Hz). These ticks interrupt your application and add jitter.
- `rcu_nocbs` moves Read-Copy-Update callbacks off the isolated cores. RCU is a kernel synchronization mechanism that occasionally needs to run callbacks, which would otherwise interrupt your pinned workload.
- `nmi_watchdog=0` disables the NMI (Non-Maskable Interrupt) watchdog, which periodically interrupts every core to check for lockups.

## Step 2: Configure the Kubernetes CPU Manager

Kubernetes has a built-in CPU manager that can enforce CPU pinning for pods in the Guaranteed QoS class. You need to enable the static CPU management policy on your Talos nodes:

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraArgs:
      cpu-manager-policy: static
      cpu-manager-reconcile-period: 5s
      reserved-cpus: "0-3"          # Reserve CPUs 0-3 for system processes
    extraConfig:
      cpuManagerPolicy: static
      topologyManagerPolicy: single-numa-node
      reservedSystemCPUs: "0-3"
```

The `static` CPU manager policy allocates exclusive CPUs to pods that request integer CPU quantities and have their requests equal to their limits. The `reservedSystemCPUs` ensures that kubelet, containerd, and other system services stay on cores 0-3, leaving cores 4-15 free for your workloads.

## Step 3: Deploy Pods with CPU Pinning

To get a pod pinned to specific CPUs, it must be in the Guaranteed QoS class. This means requests must equal limits for both CPU and memory, and the CPU request must be a whole number:

```yaml
# pinned-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: latency-sensitive-app
spec:
  containers:
  - name: app
    image: my-trading-app:latest
    resources:
      requests:
        cpu: "4"                   # Request exactly 4 CPUs (integer)
        memory: "8Gi"
      limits:
        cpu: "4"                   # Limits must match requests
        memory: "8Gi"
```

When this pod is scheduled, the CPU manager will allocate 4 exclusive CPU cores to it. No other pod will share those cores. The pod cannot use `500m` or `2.5` as CPU values for pinning to work. It must be a whole integer.

## Step 4: Verify CPU Pinning

After deploying your pod, verify that CPU pinning is active:

```bash
# Check the CPU manager state on the node
talosctl read /var/lib/kubelet/cpu_manager_state --nodes 10.0.0.1

# The output shows which CPUs are assigned to which containers
# Example:
# {
#   "policyName": "static",
#   "defaultCpuSet": "0-3",
#   "entries": {
#     "container-id-1": "4-7",
#     "container-id-2": "8-11"
#   }
# }
```

You can also verify from inside the pod (if it has the tools):

```bash
# Check the cpuset cgroup
kubectl exec latency-sensitive-app -- cat /sys/fs/cgroup/cpuset.cpus
# Output: 4-7
```

## Understanding the CPU Layout

Before deciding which CPUs to isolate, understand your node's CPU topology. On Talos, you can inspect the topology:

```bash
# Check CPU topology
talosctl read /proc/cpuinfo --nodes 10.0.0.1

# Check NUMA topology
talosctl read /sys/devices/system/node/node0/cpulist --nodes 10.0.0.1
talosctl read /sys/devices/system/node/node1/cpulist --nodes 10.0.0.1
```

On a dual-socket system, you want to keep your pinned workload on CPUs within the same NUMA node. Crossing NUMA boundaries adds significant memory access latency.

A typical server might have this layout:
- Node 0: CPUs 0-15, 32-47 (physical cores + hyperthreads)
- Node 1: CPUs 16-31, 48-63

In this case, isolating CPUs 4-15 and 36-47 keeps all isolated cores on NUMA node 0, along with their hyperthreads.

## Handling Hyperthreading

Hyperthreading (or SMT) means each physical core presents two logical CPUs. These sibling threads share L1 and L2 caches and execution resources. For maximum isolation, you should either disable hyperthreading entirely or isolate both siblings of a core.

```yaml
# Disable hyperthreading at boot
machine:
  install:
    extraKernelArgs:
      - nosmt                    # Disable symmetric multithreading
```

If you prefer to keep hyperthreading enabled but want to avoid interference, make sure both siblings of each isolated core are in the isolated set:

```yaml
# Isolate physical cores 4-7 including their hyperthreads
# (assuming core N has sibling N+16 on a 16-core CPU)
machine:
  install:
    extraKernelArgs:
      - isolcpus=4-7,20-23      # Physical cores and their HT siblings
      - nohz_full=4-7,20-23
      - rcu_nocbs=4-7,20-23
```

## Topology Manager Integration

The Kubernetes Topology Manager works with the CPU Manager to ensure that all resources requested by a pod come from the same NUMA node. This is important when combining CPU pinning with device plugins (like GPUs or SR-IOV network devices):

```yaml
# talos-machine-config.yaml
machine:
  kubelet:
    extraConfig:
      topologyManagerPolicy: single-numa-node
      topologyManagerScope: container
```

The `single-numa-node` policy ensures that the CPU manager only allocates CPUs from the same NUMA node as other requested resources. If the allocation cannot satisfy this constraint, the pod is rejected.

## Monitoring CPU Pinning Performance

Track the performance benefit of CPU pinning by monitoring these metrics:

```yaml
# prometheus-rules.yaml
groups:
- name: cpu-pinning-metrics
  rules:
  - record: node:cpu_context_switches:rate5m
    expr: rate(node_context_switches_total[5m])
  - record: node:cpu_migrations:rate5m
    expr: rate(node_cpu_guest_seconds_total[5m])
```

Look for reduced context switch rates and CPU migration rates on the isolated cores. Your application-level latency metrics should show tighter distributions with fewer outliers.

## Applying the Configuration

Apply the configuration and reboot since kernel args changes require it:

```bash
# Apply the machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Reboot the node (kernel args need reboot)
talosctl reboot --nodes 10.0.0.1

# Wait for the node to come back
talosctl health --nodes 10.0.0.1

# Verify isolated CPUs
talosctl read /proc/cmdline --nodes 10.0.0.1
```

## Conclusion

CPU pinning on Talos Linux is a powerful technique for achieving predictable, low-latency performance. The combination of kernel-level CPU isolation and Kubernetes CPU manager static policy gives you fine-grained control over which cores run your application code. Remember to account for NUMA topology, handle hyperthreading appropriately, and always verify that pinning is active after deployment. The overhead of setting this up pays dividends in reduced tail latency and more consistent application performance.
