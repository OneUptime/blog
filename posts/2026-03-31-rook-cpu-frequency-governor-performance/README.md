# How to Set CPU Frequency Governor to Performance Mode for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, CPU, Kernel, Storage

Description: Configure the CPU frequency scaling governor to performance mode on Ceph nodes to eliminate frequency throttling and reduce I/O latency for consistent throughput.

---

## CPU Governors and Their Impact on Ceph

Linux CPU frequency governors control how the kernel scales processor speed under different workloads. The default `powersave` or `ondemand` governors reduce clock speed during idle periods, causing latency spikes when Ceph suddenly needs full CPU speed for I/O operations. Switching to the `performance` governor locks CPUs at maximum frequency.

## Available Governors

Check which governors are available on your system:

```bash
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors
# Output: conservative ondemand userspace powersave performance schedutil
```

View the current governor:

```bash
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
cpupower frequency-info | grep "The governor"
```

## Setting the Governor at Runtime

Use `cpupower` to change all CPUs at once:

```bash
# Install cpupower
dnf install -y kernel-tools         # RHEL/Rocky/AlmaLinux
apt install -y linux-tools-generic  # Ubuntu/Debian

# Set all CPUs to performance
cpupower frequency-set -g performance

# Verify the change
cpupower frequency-info | grep governor
```

Or set directly via sysfs:

```bash
for governor in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
  echo performance > $governor
done
```

## Making the Change Persistent

### Using tuned (RHEL/Rocky/CentOS)

```bash
# Install tuned
dnf install -y tuned

# Use the throughput-performance or latency-performance profile
tuned-adm profile throughput-performance
tuned-adm active

# Or create a custom Ceph profile
mkdir -p /etc/tuned/ceph-osd
cat > /etc/tuned/ceph-osd/tuned.conf << 'EOF'
[main]
summary=Optimized for Ceph OSD nodes

[cpu]
governor=performance
energy_perf_bias=performance
min_perf_pct=100
EOF

tuned-adm profile ceph-osd
systemctl enable tuned
```

### Using cpufrequtils (Ubuntu/Debian)

```bash
apt install -y cpufrequtils

cat > /etc/default/cpufrequtils << 'EOF'
GOVERNOR="performance"
EOF

systemctl enable cpufrequtils
systemctl start cpufrequtils
```

### Using systemd service

```bash
cat > /etc/systemd/system/cpu-governor.service << 'EOF'
[Unit]
Description=Set CPU governor to performance for Ceph
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do echo performance > $f; done'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now cpu-governor.service
```

## Applying via Kubernetes DaemonSet

For Rook-managed clusters, use a privileged DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ceph-cpu-governor
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: ceph-cpu-governor
  template:
    metadata:
      labels:
        app: ceph-cpu-governor
    spec:
      nodeSelector:
        ceph-osd: "true"
      initContainers:
      - name: set-governor
        image: alpine:3.18
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
            echo performance > $f 2>/dev/null || true
          done
        volumeMounts:
        - name: sys
          mountPath: /sys
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.10
      volumes:
      - name: sys
        hostPath:
          path: /sys
```

## Verifying the Configuration

After applying, verify CPUs are running at max frequency:

```bash
cpupower frequency-info
cat /proc/cpuinfo | grep "cpu MHz"
```

Run a quick latency benchmark to compare:

```bash
fio --name=randread --rw=randread --bs=4k --numjobs=4 \
    --iodepth=32 --runtime=30 --filename=/dev/sdb \
    --ioengine=libaio --direct=1 --group_reporting
```

## Summary

The CPU frequency governor directly affects Ceph OSD latency by controlling how quickly CPUs ramp to full speed. Setting the governor to `performance` mode eliminates frequency scaling delays and provides more consistent tail latency. This is best applied persistently using tuned profiles or systemd services, and can be automated across all OSD nodes using a privileged Kubernetes DaemonSet.
