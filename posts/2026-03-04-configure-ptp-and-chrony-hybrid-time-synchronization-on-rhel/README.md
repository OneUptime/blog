# How to Configure PTP and chrony Hybrid Time Synchronization on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PTP, Chrony, Time Synchronization, NTP

Description: Combine PTP and chrony on RHEL to use PTP as the primary high-precision time source with NTP as a fallback, providing both accuracy and resilience.

---

A hybrid PTP/NTP setup uses PTP for sub-microsecond accuracy when available and falls back to NTP via chrony when PTP is unreachable. This gives you precision and resilience in one configuration.

## Architecture Overview

The setup works as follows:
1. ptp4l synchronizes the NIC hardware clock to a PTP grandmaster
2. phc2sys feeds the PTP time into a shared memory (SHM) reference clock
3. chrony reads the SHM reference clock and can also use NTP servers as backup

## Install Required Packages

```bash
sudo dnf install -y linuxptp chrony
```

## Configure ptp4l

Edit `/etc/ptp4l.conf` to synchronize with the PTP grandmaster:

```ini
[global]
time_stamping           hardware
logging_level           6
step_threshold          1.0
first_step_threshold    0.00002

[enp1s0]
```

## Configure phc2sys to Feed chrony

Instead of syncing directly to the system clock, phc2sys writes to a shared memory segment that chrony can read:

```bash
# Edit the phc2sys service to output to SHM
sudo systemctl edit phc2sys
```

Add this override:

```ini
[Service]
ExecStart=
ExecStart=/usr/sbin/phc2sys -s enp1s0 -E ntpshm -M 0 -w
```

The `-E ntpshm` option tells phc2sys to write time samples to an NTP shared memory segment. The `-M 0` sets the SHM segment number.

## Configure chrony to Read PTP via SHM

Edit `/etc/chrony.conf`:

```ini
# PTP source via shared memory (from phc2sys)
# SHM segment 0, poll every 2 seconds, high precision
refclock SHM 0 poll 2 refid PTP precision 1e-9 prefer

# NTP fallback servers
server time1.example.com iburst
server time2.example.com iburst

# Allow the system clock to be stepped on first sync
makestep 1.0 3

# Record tracking data
logdir /var/log/chrony
log tracking measurements statistics

# Serve time to local clients
allow 192.168.1.0/24
```

## Start the Services in Order

```bash
# Start ptp4l first
sudo systemctl enable --now ptp4l

# Then phc2sys (depends on ptp4l being synced)
sudo systemctl enable --now phc2sys

# Finally chrony
sudo systemctl enable --now chronyd
```

## Verify the Hybrid Setup

```bash
# Check chrony sources - PTP should appear as a refclock
chronyc sources -v

# The PTP SHM source should show as preferred with low offset
chronyc tracking

# Check if PTP or NTP is currently in use
chronyc sourcestats
```

Expected output shows the SHM/PTP source with nanosecond-level accuracy preferred over the NTP sources.

## Failover Behavior

If the PTP grandmaster goes down:
- phc2sys stops updating the SHM segment
- chrony detects the SHM source as unreachable
- chrony automatically switches to the NTP servers
- When PTP recovers, chrony switches back

This hybrid approach provides the precision of PTP with the reliability of NTP fallback on RHEL.
