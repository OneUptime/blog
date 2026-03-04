# How to Install and Get Started with TuneD on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TuneD, Performance, Linux, System Tuning

Description: Learn how to install and get started with TuneD on RHEL to automatically tune system performance for your workload.

---

TuneD is a system tuning daemon that monitors your system and applies performance profiles to optimize settings for specific workloads. On RHEL, TuneD is the recommended way to manage kernel parameters, CPU governors, disk settings, and network tuning.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access

## Installing TuneD

TuneD is usually installed by default on RHEL. If it is not installed:

```bash
sudo dnf install tuned -y
```

## Starting and Enabling TuneD

Start the TuneD service and enable it to run at boot:

```bash
sudo systemctl enable --now tuned
```

Verify the service is running:

```bash
sudo systemctl status tuned
```

## Checking the Active Profile

View the currently active TuneD profile:

```bash
tuned-adm active
```

Output example:

```
Current active profile: virtual-guest
```

## Listing Available Profiles

See all available profiles:

```bash
tuned-adm list
```

Common profiles include:

- `balanced` - General purpose balancing performance and power
- `throughput-performance` - High throughput server workloads
- `latency-performance` - Low latency workloads
- `virtual-guest` - Optimized for virtual machines
- `virtual-host` - Optimized for KVM hypervisors
- `network-latency` - Low latency network tuning
- `network-throughput` - High network throughput
- `powersave` - Maximum power saving

## Getting Profile Recommendations

TuneD can recommend a profile based on your hardware:

```bash
tuned-adm recommend
```

This analyzes your system and suggests the best profile.

## Switching Profiles

Apply a different profile:

```bash
sudo tuned-adm profile throughput-performance
```

Verify the change:

```bash
tuned-adm active
```

## Verifying Profile Settings

Check that the profile settings are properly applied:

```bash
sudo tuned-adm verify
```

This compares current system settings against the active profile and reports any differences.

## Viewing Profile Details

See what a profile configures:

```bash
cat /usr/lib/tuned/throughput-performance/tuned.conf
```

Each profile has a configuration file in `/usr/lib/tuned/` that defines kernel parameters, disk scheduler settings, CPU governor preferences, and more.

## Disabling TuneD

If you need to revert all tuning and stop TuneD:

```bash
sudo tuned-adm off
sudo systemctl stop tuned
```

The `off` command reverts settings to system defaults before stopping.

## Checking TuneD Logs

Review TuneD logs for troubleshooting:

```bash
sudo journalctl -u tuned --no-pager -n 50
```

## Conclusion

TuneD provides an easy way to apply performance optimizations on RHEL without manually editing kernel parameters. Start with the recommended profile and switch profiles as your workload requirements change.
