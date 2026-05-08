# How to Configure systemd Timer for Container Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, Timer, Auto-Update

Description: Learn how to set up systemd timers to periodically check for and apply Podman container image updates.

---

> Schedule automatic container image updates using systemd timers that run podman auto-update at regular intervals.

Podman includes a built-in auto-update mechanism that checks for new container images and restarts containers configured for auto updates. A systemd timer triggers this check on a schedule, ensuring eligible containers stay up to date.

---

## The Built-In Auto-Update Timer

Podman ships with a pre-configured timer and service for auto-updates:

```bash
# Enable the pre-built auto-update timer (rootless)

systemctl --user enable --now podman-auto-update.timer

# Check the timer status
systemctl --user status podman-auto-update.timer

# View the timer schedule
systemctl --user list-timers podman-auto-update.timer
```

## Viewing the Default Timer Configuration

```bash
# View the timer unit
systemctl --user cat podman-auto-update.timer

# View the service it triggers
systemctl --user cat podman-auto-update.service
```

## Creating a Custom Update Timer

If you need a different schedule, create a custom timer for containers that are configured for Podman auto updates:

```ini
# ~/.config/systemd/user/container-update.timer
[Unit]
Description=Check for container image updates every 6 hours

[Timer]
# Run every 6 hours
OnCalendar=*-*-* 00/6:00:00
# Add randomized delay up to 30 minutes to avoid thundering herd
RandomizedDelaySec=1800
# Run immediately if a scheduled run was missed
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# ~/.config/systemd/user/container-update.service
[Unit]
Description=Run Podman auto-update

[Service]
Type=oneshot
ExecStart=/usr/bin/podman auto-update
```

## Enable the Custom Timer

```bash
# Reload systemd
systemctl --user daemon-reload

# Enable and start the timer
systemctl --user enable --now container-update.timer

# Verify the timer is scheduled
systemctl --user list-timers container-update.timer
```

## Common Timer Schedules

```ini
# Every hour
OnCalendar=hourly

# Every day at 3:00 AM
OnCalendar=*-*-* 03:00:00

# Every Monday at 2:00 AM
OnCalendar=Mon *-*-* 02:00:00

# Every 15 minutes
OnCalendar=*:0/15

# First day of every month
OnCalendar=*-*-01 00:00:00
```

## Checking Timer Results

```bash
# View the last run result
systemctl --user status container-update.service

# View update logs
journalctl --user -u container-update.service --since "1 day ago"

# Check which containers were updated
journalctl --user -u container-update.service | grep -i "update"
```

## Manually Trigger the Timer

```bash
# Run the auto-update service manually without waiting for the timer
systemctl --user start container-update.service

# Or run podman auto-update directly
podman auto-update
```

## Summary

Systemd timers automate Podman container image updates for containers configured with an auto-update policy. Enable the built-in `podman-auto-update.timer` for a default schedule, or create a custom timer for specific intervals. Use `RandomizedDelaySec` to spread load and `Persistent=true` to catch missed runs. Monitor update results through `journalctl` and `systemctl status`.
