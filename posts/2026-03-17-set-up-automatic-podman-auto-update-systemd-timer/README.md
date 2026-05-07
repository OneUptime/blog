# How to Set Up Automatic podman auto-update with systemd Timer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Systemd, Timer

Description: Learn how to set up the systemd timer that automatically runs podman auto-update to keep containers current.

---

> Automate container image updates by enabling the podman-auto-update systemd timer, which periodically checks for and applies image updates for containers configured with an auto-update policy.

Podman ships with a systemd timer and service pair that automatically runs `podman auto-update` on a schedule. Enabling this timer keeps containers configured with `io.containers.autoupdate` or a Quadlet `AutoUpdate` setting running the latest images without manual intervention.

---

## Enable the Built-In Timer

For rootless containers:

```bash
# Enable and start the timer

systemctl --user enable --now podman-auto-update.timer

# Verify it is active
systemctl --user status podman-auto-update.timer
```

For rootful containers:

```bash
# Enable and start the system-level timer
sudo systemctl enable --now podman-auto-update.timer
```

## Check the Timer Schedule

```bash
# View when the next update check will run
systemctl --user list-timers podman-auto-update.timer

# Output shows:
# NEXT                         LEFT          LAST                         PASSED  UNIT                         ACTIVATES
# Wed 2026-03-18 00:00:00 UTC  6h left       Tue 2026-03-17 00:00:00 UTC 18h ago podman-auto-update.timer     podman-auto-update.service
```

## View the Timer Configuration

```bash
# See the timer unit
systemctl --user cat podman-auto-update.timer
```

The default timer typically runs daily.

## Customize the Timer Schedule

Override the default schedule with a drop-in file:

```bash
# Create the drop-in directory
mkdir -p ~/.config/systemd/user/podman-auto-update.timer.d/
```

```ini
# ~/.config/systemd/user/podman-auto-update.timer.d/schedule.conf
[Timer]
# Clear the default schedule
OnCalendar=
# Set a new schedule: every 4 hours
OnCalendar=*-*-* 00/4:00:00
# Add random delay to spread load
RandomizedDelaySec=900
```

```bash
# Reload and restart the timer
systemctl --user daemon-reload
systemctl --user restart podman-auto-update.timer

# Verify the new schedule
systemctl --user list-timers podman-auto-update.timer
```

## View Update Results

```bash
# Check the last run result
systemctl --user status podman-auto-update.service

# View the update log
journalctl --user -u podman-auto-update.service --since "1 day ago"
```

## Disable the Timer

```bash
# Stop and disable the timer
systemctl --user disable --now podman-auto-update.timer

# Verify it is disabled
systemctl --user is-enabled podman-auto-update.timer
```

## Monitoring Timer Health

```bash
# Check if the timer is functioning
systemctl --user list-timers --all | grep auto-update

# Check for failed runs
systemctl --user is-failed podman-auto-update.service

# View recent activity
journalctl --user -u podman-auto-update.timer --since "7 days ago"
```

## Summary

The `podman-auto-update.timer` automates image update checks on a schedule for containers configured with an auto-update policy. Enable it with `systemctl enable --now`, customize the schedule with a timer drop-in file, and monitor results through `journalctl`. The timer works with both rootless and rootful container configurations.
