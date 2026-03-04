# How to Configure TuneD Dynamic Tuning for Automatic Performance Optimization on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TuneD, Dynamic Tuning, Performance, Automation, Linux

Description: Learn how to enable and configure TuneD dynamic tuning on RHEL to automatically adjust system parameters based on real-time workload conditions.

---

TuneD dynamic tuning on RHEL monitors system activity in real time and automatically adjusts performance parameters based on current workload conditions. Unlike static profiles that apply fixed settings, dynamic tuning adapts to changing demands.

## Prerequisites

- A RHEL system with TuneD installed and running
- Root or sudo access

## Understanding Dynamic Tuning

When dynamic tuning is enabled, TuneD periodically monitors system metrics and adjusts parameters accordingly. For example:

- CPU governor changes based on load
- Disk readahead adjusts based on I/O patterns
- Network parameters tune based on traffic

## Enabling Dynamic Tuning

Edit the TuneD main configuration:

```bash
sudo vi /etc/tuned/tuned-main.conf
```

Set `dynamic_tuning` to 1:

```ini
dynamic_tuning = 1
```

Set the monitoring interval (in seconds):

```ini
update_interval = 10
```

Restart TuneD:

```bash
sudo systemctl restart tuned
```

## Verifying Dynamic Tuning

Check that dynamic tuning is active:

```bash
grep dynamic_tuning /etc/tuned/tuned-main.conf
```

Monitor TuneD logs to see adjustments:

```bash
sudo journalctl -u tuned -f
```

## How Dynamic Tuning Works

TuneD uses monitor plugins to gather system data and adjust settings:

### CPU Monitor

Tracks CPU utilization and adjusts the CPU governor:
- High load: switches to `performance` governor
- Low load: switches to `powersave` governor

### Disk Monitor

Tracks disk activity and adjusts settings:
- Active disk: increases readahead, adjusts ALPM to performance mode
- Idle disk: decreases readahead, enables power saving

### Network Monitor

Tracks network activity and adjusts interface parameters:
- High traffic: disables power saving features
- Low traffic: enables wake-on-LAN and power management

## Customizing Dynamic Tuning Behavior

Create a custom profile that uses dynamic tuning plugins:

```bash
sudo mkdir -p /etc/tuned/my-dynamic
```

```bash
sudo tee /etc/tuned/my-dynamic/tuned.conf << 'CONF'
[main]
summary=Custom dynamic tuning profile
include=balanced

[cpu]
governor=performance|powersave
energy_perf_bias=performance|powersave

[disk]
dynamic=1
readahead=>128
readahead=<4096

[net]
dynamic=1
CONF
```

The pipe syntax (e.g., `performance|powersave`) defines the range of values that dynamic tuning can select between.

## Adjusting the Update Interval

The update interval controls how often TuneD checks metrics:

```ini
# Check every 5 seconds for faster response
update_interval = 5
```

Shorter intervals respond faster but use slightly more CPU. For most workloads, 10 seconds is a good balance.

## Disabling Dynamic Tuning for Specific Plugins

You can enable dynamic tuning globally but disable it for specific plugins in a custom profile:

```ini
[disk]
dynamic=0
readahead=4096

[cpu]
dynamic=1
```

## Monitoring Dynamic Tuning Changes

Enable verbose logging to see what changes TuneD makes:

```bash
sudo tuned-adm profile my-dynamic
sudo journalctl -u tuned --no-pager -n 100
```

## Conclusion

TuneD dynamic tuning on RHEL automates performance optimization by responding to real-time workload changes. Enable it for environments with variable workloads where static profiles may not be optimal. Customize the behavior with per-plugin controls and adjust the monitoring interval for your needs.
