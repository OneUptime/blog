# How to Isolate CPUs for Real-Time Processes Using the isolcpus Parameter on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time, CPU Isolation, isolcpus, Performance Tuning, Linux

Description: Use the isolcpus kernel parameter on RHEL to dedicate specific CPU cores to real-time processes, preventing the kernel scheduler from assigning other tasks to those cores.

---

CPU isolation removes specific cores from the general kernel scheduler, ensuring that only your designated real-time processes run on those cores. This eliminates context-switching overhead and provides more deterministic latency.

## Check Available CPUs

```bash
# View CPU topology
lscpu | grep -E "^CPU\(s\)|Thread|Core|Socket"

# Show detailed CPU information
cat /proc/cpuinfo | grep "processor" | wc -l

# View current CPU isolation status (if any)
cat /sys/devices/system/cpu/isolated
```

## Configure isolcpus via Kernel Boot Parameters

The `isolcpus` parameter tells the kernel scheduler to avoid using the specified CPUs for general-purpose scheduling.

```bash
# Isolate CPUs 2-7 from the general scheduler
# Also set nohz_full to disable timer ticks on isolated CPUs
# And rcu_nocbs to offload RCU callbacks from isolated CPUs
sudo grubby --update-kernel=ALL \
  --args="isolcpus=2-7 nohz_full=2-7 rcu_nocbs=2-7"

# Verify the parameters were added
sudo grubby --info=ALL | grep args
```

## Reboot to Apply

```bash
# Reboot the system for changes to take effect
sudo reboot
```

## Verify CPU Isolation After Reboot

```bash
# Check which CPUs are isolated
cat /sys/devices/system/cpu/isolated
# Expected output: 2-7

# Check which CPUs are available to the scheduler
cat /sys/devices/system/cpu/online
# Expected output: 0-7

# Verify kernel command line
cat /proc/cmdline | tr ' ' '\n' | grep -E "isolcpus|nohz_full|rcu_nocbs"
```

## Pin a Real-Time Process to Isolated CPUs

```bash
# Run a process on isolated CPU 2 with real-time FIFO scheduling at priority 99
sudo chrt -f 99 taskset -c 2 ./your_rt_application

# Or use taskset to pin an existing process (PID 1234) to CPUs 2-3
sudo taskset -pc 2-3 1234
```

## Verify No Other Processes Are Running on Isolated CPUs

```bash
# Check which processes are assigned to CPU 2
ps -eo pid,psr,comm | awk '$2 == 2'

# Move any kernel threads off the isolated CPUs using tuna
sudo dnf install -y tuna
sudo tuna --cpus=2-7 --isolate
```

## Using tuned Instead of Manual Parameters

An alternative approach uses the `tuned` real-time profile, which manages isolation for you.

```bash
# Install the real-time tuned profile
sudo dnf install -y tuned-profiles-realtime

# Edit the profile to specify isolated CPUs
sudo mkdir -p /etc/tuned/realtime-variables.conf
echo "isolated_cores=2-7" | sudo tee /etc/tuned/realtime-variables.conf

# Activate the profile
sudo tuned-adm profile realtime

# Verify
sudo tuned-adm active
```

CPU isolation combined with real-time scheduling priorities ensures that latency-sensitive workloads get uninterrupted access to dedicated processor cores.
