# How to Run Transient Units with systemd-run on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, systemd-run, Transient Units, Linux

Description: Learn how to use systemd-run on RHEL to create temporary service units on the fly with resource limits, sandboxing, and proper process management.

---

systemd-run lets you run commands as transient systemd units without creating permanent unit files. This is useful for one-off tasks that need resource limits, proper logging, or sandboxing.

## Step 1: Basic Usage

```bash
# Run a command as a transient service
sudo systemd-run --unit=mytask /usr/bin/my-script.sh

# Run with a description
sudo systemd-run --unit=backup-job --description="Nightly backup" /usr/local/bin/backup.sh

# Check the status
systemctl status mytask.service
```

## Step 2: Resource-Limited Commands

```bash
# Run a command with CPU and memory limits
sudo systemd-run \
    --unit=heavy-task \
    --property=CPUQuota=50% \
    --property=MemoryMax=512M \
    --property=MemorySwapMax=0 \
    /usr/bin/my-heavy-process

# Run with I/O limits
sudo systemd-run \
    --unit=io-task \
    --property=IOWeight=50 \
    --property=IOReadBandwidthMax="/dev/sda 10M" \
    /usr/bin/data-import.sh
```

## Step 3: Transient Timers

```bash
# Run a command after a delay
sudo systemd-run --on-active=30min /usr/local/bin/cleanup.sh

# Run a command at a specific time
sudo systemd-run --on-calendar="2026-03-05 02:00:00" /usr/local/bin/maintenance.sh

# Run a recurring task
sudo systemd-run --on-calendar="*:0/15" --timer-property=Persistent=true \
    /usr/local/bin/health-check.sh

# List transient timers
systemctl list-timers --all
```

## Step 4: Interactive and Foreground Mode

```bash
# Run interactively in the current terminal
systemd-run --user --scope --slice=mywork.slice bash

# Run a shell with resource limits
sudo systemd-run --scope --property=MemoryMax=1G bash

# Run and wait for completion, showing output
sudo systemd-run --wait --pipe /usr/bin/my-script.sh
```

## Step 5: Sandboxed Transient Services

```bash
# Run with filesystem sandboxing
sudo systemd-run \
    --unit=sandboxed-task \
    --property=ProtectSystem=strict \
    --property=ProtectHome=yes \
    --property=PrivateTmp=yes \
    --property=NoNewPrivileges=yes \
    /usr/bin/untrusted-script.sh

# Run with network isolation
sudo systemd-run \
    --unit=isolated-task \
    --property=PrivateNetwork=yes \
    /usr/bin/offline-process.sh
```

## Step 6: View Logs and Clean Up

```bash
# View logs for a transient unit
journalctl -u mytask.service

# Stop a running transient unit
sudo systemctl stop mytask.service

# Transient units are automatically removed when they stop
# But you can check for leftovers
systemctl list-units --type=service | grep run-

# Use --collect to auto-garbage-collect after exit
sudo systemd-run --collect --unit=one-shot-task /usr/bin/task.sh
```

## Summary

You have learned to use systemd-run for creating transient systemd units on RHEL. This tool is invaluable for running one-off tasks with resource limits, scheduling future jobs, and sandboxing untrusted processes, all without creating permanent unit files.
