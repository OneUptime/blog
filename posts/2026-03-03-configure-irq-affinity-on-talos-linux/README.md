# How to Configure IRQ Affinity on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, IRQ Affinity, Performance, Interrupts, Kubernetes

Description: Learn how to configure IRQ affinity on Talos Linux to reduce latency and improve performance by controlling interrupt routing

---

Interrupt Request (IRQ) affinity controls which CPU cores handle hardware interrupts. When a network packet arrives or a disk operation completes, the hardware generates an interrupt that must be processed by a CPU core. By default, Linux distributes these interrupts across all available cores, which can interfere with latency-sensitive workloads. On Talos Linux, configuring IRQ affinity requires a different approach since there is no shell access, but it is absolutely possible and worth the effort.

This guide explains how IRQ affinity works and how to configure it on Talos Linux for optimal performance.

## Understanding Hardware Interrupts

Every piece of hardware in your server communicates with the CPU through interrupts. When a network interface card (NIC) receives a packet, it triggers an interrupt. The CPU core that handles that interrupt must stop whatever it was doing, save its state, run the interrupt handler, and then resume its previous work. This context switch costs hundreds to thousands of CPU cycles.

On a busy network interface, this can mean thousands of interrupts per second. If these interrupts land on a core that is running your latency-sensitive application, they introduce jitter that shows up in your tail latency measurements.

```bash
# On a traditional Linux system, you would check interrupts with:
cat /proc/interrupts

# On Talos Linux:
talosctl read /proc/interrupts --nodes 10.0.0.1
```

The output shows each interrupt source and how many times each CPU has handled it. Look for your NIC interrupts (usually labeled with your driver name like `mlx5_comp`, `ixgbe`, or `virtio`) and note which CPUs are handling them.

## The Default IRQ Distribution Problem

Linux uses the `irqbalance` daemon to distribute interrupts across CPUs. While this provides reasonable performance for general workloads, it has two problems for performance-sensitive environments:

1. It may route interrupts to cores running latency-sensitive applications
2. It periodically rebalances, causing interrupt routing changes that create transient performance dips

On Talos Linux, `irqbalance` runs as part of the system services. While you cannot disable it directly through configuration, you can override its decisions by explicitly setting IRQ affinity.

## Setting IRQ Affinity with a DaemonSet

Since Talos Linux does not provide shell access, the standard approach for setting IRQ affinity is through a privileged DaemonSet:

```yaml
# irq-affinity-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: irq-affinity-manager
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: irq-affinity-manager
  template:
    metadata:
      labels:
        app: irq-affinity-manager
    spec:
      hostPID: true
      hostNetwork: true
      tolerations:
      - operator: Exists           # Run on all nodes including control plane
      containers:
      - name: affinity-setter
        image: alpine:latest
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          #!/bin/sh
          set -e

          # Define CPU mask for interrupt handling (cores 0-3)
          # Binary: 00001111 = Hex: 0f
          IRQ_CPUMASK="0f"

          # Set affinity for all NIC interrupts
          set_nic_affinity() {
            local iface=$1
            for irq_dir in /proc/irq/*/; do
              irq_num=$(basename "$irq_dir")
              # Skip non-numeric directories
              [ "$irq_num" = "default_smp_affinity" ] && continue

              # Check if this IRQ is associated with our interface
              if [ -f "$irq_dir/actions" ]; then
                if grep -q "$iface" "$irq_dir/actions" 2>/dev/null; then
                  echo "$IRQ_CPUMASK" > "${irq_dir}smp_affinity" 2>/dev/null || true
                  echo "Set IRQ $irq_num for $iface to mask $IRQ_CPUMASK"
                fi
              fi
            done
          }

          # Set affinity for common network interfaces
          for iface in eth0 ens3 ens4 enp0s3 bond0; do
            set_nic_affinity "$iface"
          done

          # Set default affinity for new interrupts
          echo "$IRQ_CPUMASK" > /proc/irq/default_smp_affinity

          echo "IRQ affinity configuration complete"

          # Keep running and re-apply periodically
          while true; do
            sleep 300
            for iface in eth0 ens3 ens4 enp0s3 bond0; do
              set_nic_affinity "$iface"
            done
          done
```

This DaemonSet runs on every node, pins all NIC interrupts to cores 0-3, and re-applies the configuration every 5 minutes in case irqbalance overrides the settings.

## Understanding CPU Affinity Masks

The affinity mask is a hexadecimal bitmask where each bit represents a CPU core. Here is a quick reference:

```
# CPU bitmask reference
# Cores 0-3:   0x0f  (binary: 00001111)
# Cores 0-7:   0xff  (binary: 11111111)
# Cores 4-7:   0xf0  (binary: 11110000)
# Core 0 only: 0x01  (binary: 00000001)
# Core 1 only: 0x02  (binary: 00000010)

# For systems with more than 8 cores, extend the mask:
# Cores 0-15:  0xffff
# Cores 0-3:   0x000f (with leading zeros for 16-bit mask)
# Cores 8-15:  0xff00
```

When choosing your affinity mask, pick cores that are NOT running your latency-sensitive workloads. If you have isolated CPUs 4-15 for your application (using `isolcpus`), route interrupts to cores 0-3.

## Multi-Queue NIC Configuration

Modern NICs support multiple receive and transmit queues, with each queue having its own interrupt. This allows true parallel packet processing across multiple cores.

```yaml
# multi-queue-nic-tuning.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nic-queue-tuning
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: nic-queue-tuning
  template:
    metadata:
      labels:
        app: nic-queue-tuning
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: tuner
        image: alpine:latest
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache ethtool

          IFACE="eth0"

          # Set number of queues to match available cores
          ethtool -L $IFACE combined 4 2>/dev/null || \
          ethtool -L $IFACE rx 4 tx 4 2>/dev/null || true

          # Enable receive flow hashing
          ethtool -N $IFACE rx-flow-hash tcp4 sdfn 2>/dev/null || true
          ethtool -N $IFACE rx-flow-hash udp4 sdfn 2>/dev/null || true

          # Pin each queue's interrupt to a specific core
          QUEUE=0
          for irq in $(grep "$IFACE" /proc/interrupts | awk '{print $1}' | tr -d ':'); do
            CPU_MASK=$(printf "%x" $((1 << QUEUE)))
            echo "$CPU_MASK" > /proc/irq/$irq/smp_affinity
            echo "Pinned IRQ $irq (queue $QUEUE) to CPU $QUEUE"
            QUEUE=$((QUEUE + 1))
          done

          sleep infinity
```

This script distributes NIC queue interrupts across cores, with each queue pinned to a different core. Queue 0 goes to core 0, queue 1 to core 1, and so on. This provides the best packet processing throughput because each core handles its own queue without contention.

## Combining IRQ Affinity with CPU Isolation

For the best results, combine IRQ affinity with CPU isolation:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Isolate cores 4-15 for application workloads
      - isolcpus=4-15
      - nohz_full=4-15
      - rcu_nocbs=4-15
```

Then set IRQ affinity to cores 0-3:

```
IRQ handling:    Cores 0-3  (handle all hardware interrupts)
System services: Cores 0-3  (kubelet, containerd, etc.)
Application:     Cores 4-15 (CPU-pinned pods, no interrupts)
```

This clean separation ensures that your application cores are never interrupted by hardware events.

## Monitoring IRQ Distribution

After configuring IRQ affinity, monitor to verify it is working:

```bash
# Check interrupt distribution
talosctl read /proc/interrupts --nodes 10.0.0.1

# Look for your NIC interrupts and verify that only the intended
# cores show non-zero counts. For example, if you pinned to cores 0-3:
#            CPU0       CPU1       CPU2       CPU3       CPU4       CPU5
# 45:       12345      11234      13456      10987          0          0  eth0-TxRx-0
# 46:       11234      12345      10987      13456          0          0  eth0-TxRx-1
```

If you see interrupt counts incrementing on cores that should be isolated, your affinity settings are not taking effect. Check that your DaemonSet is running and that the IRQ numbers have not changed (which can happen after driver reloads).

## Performance Impact

The impact of IRQ affinity tuning depends on your workload and interrupt rate. In testing, moving NIC interrupts off isolated cores typically reduces P99 latency by 10-50 microseconds for high-frequency applications. For workloads that are not particularly latency-sensitive, the difference may be negligible.

The biggest benefit comes from eliminating interrupt storms. Under heavy network traffic, a single core can be overwhelmed with interrupt handling, causing everything else on that core to stall. Distributing interrupts across dedicated cores prevents this.

## Applying and Verifying

Deploy the IRQ affinity DaemonSet:

```bash
# Apply the DaemonSet
kubectl apply -f irq-affinity-daemonset.yaml

# Verify it is running on all nodes
kubectl get pods -n kube-system -l app=irq-affinity-manager

# Check logs for confirmation
kubectl logs -n kube-system -l app=irq-affinity-manager
```

## Conclusion

IRQ affinity configuration on Talos Linux requires the DaemonSet approach since there is no direct shell access. The extra setup effort is worth it for workloads where consistent low latency matters. By routing hardware interrupts to dedicated cores and keeping your application cores free from interrupt handling, you eliminate a significant source of jitter. Combine IRQ affinity with CPU isolation and NUMA awareness for the best possible performance on Talos Linux.
