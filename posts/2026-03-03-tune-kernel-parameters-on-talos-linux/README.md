# How to Tune Kernel Parameters on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Tuning, Sysctl, Performance, Linux Kernel

Description: Learn how to tune kernel parameters on Talos Linux using machine configuration for better performance and stability

---

Kernel parameter tuning is one of the most effective ways to optimize your Talos Linux nodes for specific workloads. Unlike traditional Linux distributions where you would edit `/etc/sysctl.conf` or use the `sysctl` command directly, Talos Linux requires a different approach. Since there is no shell access, all kernel tuning happens through the machine configuration API.

This guide covers the most important kernel parameters you should consider tuning and how to apply them properly on Talos Linux.

## How Kernel Parameters Work in Talos Linux

Talos Linux provides two mechanisms for setting kernel parameters. The first is through sysctl values in the machine configuration, which correspond to runtime-tunable parameters under `/proc/sys/`. The second is through extra kernel arguments, which are passed at boot time through the kernel command line.

The key distinction matters. Sysctl parameters can be changed without rebooting the node. Kernel command line arguments require a reboot to take effect. Understanding which parameters fall into which category saves you from unnecessary downtime.

```yaml
# talos-machine-config.yaml - Two ways to set kernel parameters
machine:
  # Runtime sysctl parameters (no reboot needed)
  sysctls:
    net.core.somaxconn: "65535"
    vm.swappiness: "10"

  # Boot-time kernel arguments (reboot required)
  install:
    extraKernelArgs:
      - mitigations=off
      - numa_balancing=enable
```

## Network Stack Parameters

The default Linux network stack settings are designed for broad compatibility, not peak performance. If you are running network-intensive workloads, tuning these parameters can make a significant difference.

```yaml
# Network buffer and connection tuning
machine:
  sysctls:
    # Increase socket buffer sizes
    net.core.rmem_max: "16777216"           # Max receive buffer: 16MB
    net.core.wmem_max: "16777216"           # Max send buffer: 16MB
    net.core.rmem_default: "1048576"        # Default receive buffer: 1MB
    net.core.wmem_default: "1048576"        # Default send buffer: 1MB

    # TCP buffer auto-tuning ranges (min, default, max)
    net.ipv4.tcp_rmem: "4096 1048576 16777216"
    net.ipv4.tcp_wmem: "4096 1048576 16777216"

    # Connection handling
    net.core.somaxconn: "65535"             # Max listen backlog
    net.core.netdev_max_backlog: "5000"     # Max packets queued on input
    net.ipv4.tcp_max_syn_backlog: "65535"   # Max SYN queue length

    # Connection reuse
    net.ipv4.tcp_tw_reuse: "1"             # Reuse TIME_WAIT connections
    net.ipv4.tcp_fin_timeout: "30"         # Reduce FIN timeout
```

These settings are particularly important for Kubernetes nodes running services that handle many concurrent connections. Load balancers, API gateways, and ingress controllers all benefit from larger buffers and higher connection limits.

## Memory Management Parameters

Memory management tuning affects everything from application performance to overall node stability. The defaults are conservative and work for general-purpose systems, but Kubernetes workloads often benefit from adjustments.

```yaml
# Memory management tuning
machine:
  sysctls:
    # Swappiness controls preference for swapping vs dropping caches
    vm.swappiness: "10"                     # Low value prefers dropping caches

    # Dirty page settings control write buffering
    vm.dirty_ratio: "15"                    # Start blocking writes at 15%
    vm.dirty_background_ratio: "5"          # Start background writeback at 5%
    vm.dirty_expire_centisecs: "3000"       # Expire dirty pages after 30s
    vm.dirty_writeback_centisecs: "500"     # Check for dirty pages every 5s

    # Overcommit settings
    vm.overcommit_memory: "1"              # Always overcommit (useful for Redis)

    # Maximum number of memory map areas
    vm.max_map_count: "262144"             # Required by Elasticsearch

    # Out of memory handling
    vm.panic_on_oom: "0"                   # Don't panic, use OOM killer
    vm.oom_kill_allocating_task: "1"       # Kill the task causing OOM
```

The `vm.max_map_count` parameter is commonly required for applications like Elasticsearch, which creates many memory-mapped files. If you see Elasticsearch pods failing to start, this is almost always the fix.

## File System and I/O Parameters

File descriptor limits and I/O parameters affect how many connections and files your applications can handle simultaneously.

```yaml
# File system and I/O tuning
machine:
  sysctls:
    # File descriptor limits
    fs.file-max: "2097152"                 # Max open files system-wide
    fs.nr_open: "2097152"                  # Max open files per process
    fs.inotify.max_user_watches: "524288"  # Max inotify watches per user
    fs.inotify.max_user_instances: "512"   # Max inotify instances per user

    # AIO settings for async I/O workloads
    fs.aio-max-nr: "1048576"              # Max async I/O operations
```

The inotify settings are particularly relevant for Kubernetes. Tools like kubectl, container runtimes, and various operators all use inotify watches. Running out of watches causes subtle and hard-to-debug failures.

## Process and Scheduling Parameters

For compute-intensive workloads, tuning the process scheduler and limits helps ensure your applications get the CPU time they need.

```yaml
# Process and scheduling tuning
machine:
  sysctls:
    # PID limits
    kernel.pid_max: "4194304"              # Max number of PIDs

    # Scheduler tuning
    kernel.sched_min_granularity_ns: "2000000"   # 2ms minimum time slice
    kernel.sched_wakeup_granularity_ns: "2000000" # 2ms wakeup granularity
    kernel.sched_migration_cost_ns: "5000000"    # Cost of migrating tasks

    # Thread limits
    kernel.threads-max: "4194304"          # Max threads system-wide
```

The scheduler granularity parameters control how aggressively the kernel preempts running tasks. Higher values mean less preemption, which can improve throughput at the cost of latency for other tasks.

## Boot-Time Kernel Arguments

Some parameters can only be set at boot time. These are passed through the kernel command line and require a node reboot to take effect.

```yaml
# Boot-time kernel arguments
machine:
  install:
    extraKernelArgs:
      # Disable CPU vulnerability mitigations (for trusted environments)
      - mitigations=off

      # NUMA balancing
      - numa_balancing=enable

      # Transparent huge pages
      - transparent_hugepage=madvise

      # CPU isolation for dedicated workloads
      - isolcpus=8-15
      - nohz_full=8-15
      - rcu_nocbs=8-15

      # Disable watchdog for slightly less jitter
      - nowatchdog
      - nmi_watchdog=0
```

The `mitigations=off` flag disables Spectre and Meltdown mitigations. This can improve performance by 5-20% depending on the workload, but it should only be used in trusted environments where side-channel attacks are not a concern.

## Applying Configuration Changes

To apply your kernel parameter changes, use talosctl:

```bash
# Apply the machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Check if a reboot is needed
talosctl get machinestatus --nodes 10.0.0.1

# If reboot is required (for kernel args changes)
talosctl reboot --nodes 10.0.0.1

# Verify sysctl values after applying
talosctl read /proc/sys/net/core/somaxconn --nodes 10.0.0.1
```

For sysctl changes, the new values take effect as soon as the config is applied. For kernel command line arguments, you need to reboot the node.

## Verifying Your Changes

Always verify that your changes took effect. You can read the current values of any sysctl parameter:

```bash
# Check specific sysctl values
talosctl read /proc/sys/vm/swappiness --nodes 10.0.0.1
talosctl read /proc/sys/net/core/somaxconn --nodes 10.0.0.1

# Check kernel command line
talosctl read /proc/cmdline --nodes 10.0.0.1

# Check all current sysctl values
talosctl read /proc/sys/vm/ --nodes 10.0.0.1
```

## Common Pitfalls

One mistake people make is setting values that conflict with each other. For example, setting `vm.overcommit_memory` to `2` (strict accounting) while also running Kubernetes pods with requests lower than limits will cause scheduling failures.

Another common issue is forgetting that some parameters are per-namespace in newer kernels. Network namespace settings like `net.ipv4.ip_local_port_range` may need to be set both at the node level and within pod security contexts.

Finally, always test your changes in a staging environment first. Some combinations of kernel parameters can cause instability. Applying untested configuration changes to production Talos nodes can result in nodes that fail to boot or become unresponsive.

## Conclusion

Kernel parameter tuning on Talos Linux follows the same declarative, API-driven pattern as everything else in the Talos ecosystem. While the lack of shell access might feel limiting at first, it actually enforces a discipline of documenting and version-controlling all your tuning decisions. Every parameter change is part of your machine configuration, which can be reviewed, tested, and rolled back just like any other code change. Start with the defaults, identify your bottlenecks through monitoring, and tune incrementally.
