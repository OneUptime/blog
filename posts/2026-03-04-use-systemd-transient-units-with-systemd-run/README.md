# How to Use systemd Transient Units with systemd-run on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, System Administration, Transient Units, Linux

Description: Learn how to use systemd Transient Units with systemd-run on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd-run lets you create transient (temporary) systemd units on the fly without writing unit files. This is useful for running one-off tasks with resource limits, testing service configurations, or executing commands within a controlled systemd scope.

## Prerequisites

- RHEL with systemd
- Root or sudo access for system-level transient units

## What Are Transient Units

Transient units are systemd units that exist only for the duration of a command or process. They do not persist across reboots and do not require unit files on disk. When the process exits, the unit is cleaned up automatically.

## Step 1: Run a Basic Transient Service

```bash
sudo systemd-run --unit=mytask /usr/bin/sleep 300
```

Check the status:

```bash
systemctl status mytask.service
```

This creates a temporary service called `mytask.service` that runs `sleep 300`.

## Step 2: Run with Resource Limits

Apply CPU and memory limits to any command:

```bash
sudo systemd-run --unit=limited-task   --property=CPUQuota=50%   --property=MemoryMax=512M   /usr/local/bin/heavy-computation
```

## Step 3: Run in a Specific Slice

Place the transient unit in a custom resource slice:

```bash
sudo systemd-run --slice=batch.slice   --unit=batch-job   /usr/local/bin/data-processor
```

## Step 4: Run a Transient Timer

Schedule a one-shot task to run after a delay:

```bash
sudo systemd-run --on-active=5m /usr/local/bin/cleanup.sh
```

Or at a specific time:

```bash
sudo systemd-run --on-calendar="2026-03-04 22:00:00" /usr/local/bin/report.sh
```

## Step 5: Run as a Specific User

```bash
sudo systemd-run --uid=appuser --gid=appgroup   /usr/local/bin/myapp
```

## Step 6: Interactive Shell in a Scope

Use `--scope` to run a command in the current terminal but under systemd resource control:

```bash
sudo systemd-run --scope --property=MemoryMax=1G bash
```

Everything you run in that shell session is limited to 1 GB of memory.

## Useful Options

| Option | Description |
|--------|-------------|
| `--unit=NAME` | Set a custom unit name |
| `--scope` | Run in a scope (foreground) instead of a service |
| `--property=KEY=VALUE` | Set any systemd property |
| `--on-active=TIME` | Run after a delay |
| `--on-calendar=SPEC` | Run at a specific time |
| `--timer-property=KEY=VALUE` | Set timer properties |
| `--collect` | Remove the unit after it finishes |
| `--wait` | Wait for the unit to finish and show exit status |

## Step 7: Monitor and Clean Up

List running transient units:

```bash
systemctl list-units --type=service | grep run-
```

Stop a transient unit:

```bash
sudo systemctl stop mytask.service
```

## Conclusion

systemd-run is a versatile tool for running commands with systemd features like resource limits, scheduling, and user isolation without writing permanent unit files. It is ideal for testing, one-off tasks, and batch processing.
