# How to Disable CPU C-States for Ceph Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, CPU, Kernel, Storage

Description: Learn how to disable CPU C-states on Ceph nodes to reduce latency spikes caused by CPU idle power management and improve consistent OSD throughput.

---

## Why CPU C-States Affect Ceph Performance

CPU C-states are power-saving idle states that park CPU cores to reduce power consumption. While beneficial for desktops, they introduce wakeup latency - often 50-200 microseconds - that causes unpredictable latency spikes in Ceph OSDs. Disabling deep C-states keeps CPUs ready to handle I/O requests immediately.

## Checking Current C-State Configuration

Inspect current CPU power states on an OSD node:

```bash
cat /sys/module/intel_idle/parameters/max_cstate
cpupower idle-info
```

Check which governor is active:

```bash
cpupower frequency-info | grep -i "The governor"
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

## Disabling C-States via Kernel Boot Parameters

The most reliable method is adding kernel parameters at boot. Edit the GRUB configuration:

```bash
# On RHEL/CentOS/Rocky
vi /etc/default/grub
# Add to GRUB_CMDLINE_LINUX:
# intel_idle.max_cstate=1 processor.max_cstate=1 idle=poll
```

Apply the change:

```bash
grub2-mkconfig -o /boot/grub2/grub.cfg
reboot
```

For Ubuntu/Debian:

```bash
vi /etc/default/grub
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_idle.max_cstate=1 processor.max_cstate=1"
update-grub
reboot
```

## Runtime Disabling Without Reboot

Disable deep C-states at runtime using the cpupower tool:

```bash
# Install cpupower
dnf install -y kernel-tools   # RHEL/Rocky
apt install -y linux-tools-common linux-tools-$(uname -r)  # Ubuntu

# Disable all C-states with exit latency >= 10 microseconds (keeps C0 and C1)
cpupower idle-set -D 10
```

Or write directly to sysfs for each CPU:

```bash
for i in /sys/devices/system/cpu/cpu*/cpuidle/state*/disable; do
  echo 1 > $i
done
```

Re-enable C1 only (lightest sleep state):

```bash
for cpu in /sys/devices/system/cpu/cpu*/cpuidle/state1/disable; do
  echo 0 > $cpu
done
```

## Automating via systemd

Create a systemd service to apply the setting at boot:

```bash
cat > /etc/systemd/system/disable-cstates.service << 'EOF'
[Unit]
Description=Disable CPU C-states for Ceph performance
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'cpupower idle-set -D 10'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now disable-cstates.service
```

## Applying via Rook DaemonSet

In Kubernetes environments, apply C-state tuning using a privileged DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ceph-cpu-tuning
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: ceph-cpu-tuning
  template:
    metadata:
      labels:
        app: ceph-cpu-tuning
    spec:
      nodeSelector:
        ceph-osd: "true"
      initContainers:
      - name: disable-cstates
        image: rockylinux:9
        securityContext:
          privileged: true
        command:
        - /bin/bash
        - -c
        - |
          for i in /sys/devices/system/cpu/cpu*/cpuidle/state[2-9]*/disable; do
            echo 1 > "$i" 2>/dev/null || true
          done
        volumeMounts:
        - name: sys
          mountPath: /sys
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
      volumes:
      - name: sys
        hostPath:
          path: /sys
```

## Measuring the Impact

Benchmark latency before and after with fio:

```bash
fio --name=latency-test --rw=randread --bs=4k --numjobs=1 \
    --iodepth=1 --runtime=60 --filename=/dev/sdb \
    --ioengine=libaio --direct=1 --lat_percentiles=1 \
    --percentile_list=50:90:95:99:99.9
```

## Summary

CPU C-states introduce idle-to-active transition latency that causes tail latency spikes in Ceph. Disabling deep C-states (C2 and above) via kernel boot parameters or runtime sysfs writes keeps CPUs in a low-latency ready state. Deploying this change via a privileged DaemonSet ensures all OSD nodes are consistently tuned in Kubernetes environments.
