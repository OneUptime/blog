# How to Install the Real-Time Kernel on RHEL for Low-Latency Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time Kernel, Low Latency, Performance, Linux

Description: Install and configure the RHEL real-time kernel to achieve deterministic, low-latency performance for time-sensitive workloads such as financial trading and industrial control systems.

---

The RHEL real-time kernel (kernel-rt) is a specialized kernel optimized for workloads that require deterministic response times. It is available as part of the RHEL for Real Time subscription and is suited for financial trading platforms, telecommunications, and industrial automation.

## Prerequisites

You need an active RHEL for Real Time subscription.

```bash
# Verify your subscription includes the RT repository
sudo subscription-manager repos --list | grep rt

# Enable the real-time repository
sudo subscription-manager repos --enable=rhel-9-for-x86_64-rt-rpms
```

## Install the Real-Time Kernel

```bash
# Install the real-time kernel package
sudo dnf install -y kernel-rt kernel-rt-core kernel-rt-modules

# Verify the RT kernel is installed
rpm -qa | grep kernel-rt
```

## Set the Real-Time Kernel as Default

```bash
# List all installed kernels
sudo grubby --info=ALL | grep title

# Find the RT kernel entry
sudo grubby --info=ALL | grep -A1 "kernel-rt"

# Set the RT kernel as the default boot entry
sudo grubby --set-default=/boot/vmlinuz-$(rpm -q --qf '%{VERSION}-%{RELEASE}.%{ARCH}' kernel-rt-core)

# Verify the default kernel
sudo grubby --default-kernel
```

## Reboot into the Real-Time Kernel

```bash
# Reboot the system
sudo reboot
```

## Verify the Running Kernel

```bash
# After reboot, confirm the RT kernel is active
uname -r
# Output should contain ".rt" in the version string, e.g.:
# 5.14.0-362.8.1.el9_3.x86_64+rt

# Check the kernel preemption model
uname -v
# Should show PREEMPT_RT
```

## Install Real-Time Tuning Tools

```bash
# Install the real-time tuning utilities
sudo dnf install -y tuned-profiles-realtime rt-tests tuna

# Enable the realtime tuned profile
sudo tuned-adm profile realtime

# Verify the active profile
sudo tuned-adm active
```

## Basic Real-Time Configuration

```bash
# Add kernel boot parameters for real-time tuning
# Isolate CPUs 2-7 for real-time tasks, keep 0-1 for housekeeping
sudo grubby --update-kernel=ALL \
  --args="isolcpus=2-7 nohz_full=2-7 rcu_nocbs=2-7"

# Reboot to apply
sudo reboot
```

After installation, use tools like `cyclictest` and `tuna` to measure latency and fine-tune CPU and IRQ assignments for your specific workload requirements.
