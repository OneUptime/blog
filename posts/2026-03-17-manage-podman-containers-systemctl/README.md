# How to Manage Podman Containers with systemctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, systemctl, Management

Description: Learn how to manage Podman containers using systemctl commands for starting, stopping, monitoring, and troubleshooting container services.

---

> Manage your Podman container lifecycle through systemctl for consistent, reliable operations including start, stop, restart, status checks, and log viewing.

When Podman containers run as systemd services (via Quadlet or generated units), you manage them with `systemctl` instead of `podman` commands. This gives you a consistent interface for all system services. Quadlet is the recommended approach for new Podman systemd services; `podman generate systemd` is deprecated but still supported for existing generated units.

---

## Starting and Stopping Services

```bash
# Start a container service

systemctl --user start webapp.service

# Stop a container service
systemctl --user stop webapp.service

# Restart a container service
systemctl --user restart webapp.service

# Reload configuration (if ExecReload is configured)
systemctl --user reload webapp.service
```

## Checking Service Status

```bash
# View detailed status
systemctl --user status webapp.service

# Check if the service is active
systemctl --user is-active webapp.service

# Check if the service is enabled for boot
systemctl --user is-enabled webapp.service

# Check if the service has failed
systemctl --user is-failed webapp.service
```

## Enabling and Disabling Services

```bash
# Enable an installed generated user unit to start on user login
systemctl --user enable webapp.service

# Enable and start immediately
systemctl --user enable --now webapp.service

# Disable from boot startup
systemctl --user disable webapp.service

# Disable and stop immediately
systemctl --user disable --now webapp.service
```

For Quadlet services, add an `[Install]` section such as `WantedBy=default.target` to the Quadlet file and run `systemctl --user daemon-reload`; Quadlet applies that install information when generating the service. User services start at boot only if the user's systemd instance is started at boot, for example with linger enabled.

## Viewing Logs

```bash
# View all logs for a service
journalctl --user -u webapp.service

# Follow logs in real time
journalctl --user -u webapp.service -f

# View logs since last boot
journalctl --user -u webapp.service -b

# View logs from the last hour
journalctl --user -u webapp.service --since "1 hour ago"

# View only error-level logs
journalctl --user -u webapp.service -p err
```

## Inspecting Service Properties

```bash
# Show all service properties
systemctl --user show webapp.service

# Show specific properties
systemctl --user show webapp.service --property=ActiveState,SubState,NRestarts

# View the full unit file (including drop-ins)
systemctl --user cat webapp.service

# View dependencies
systemctl --user list-dependencies webapp.service
```

## Listing Container Services

```bash
# List all running services
systemctl --user list-units --type=service --state=running

# List all failed services
systemctl --user list-units --type=service --state=failed

# List all enabled services
systemctl --user list-unit-files --type=service --state=enabled
```

## Handling Failed Services

```bash
# Reset a failed service
systemctl --user reset-failed webapp.service

# Check why a service failed
systemctl --user status webapp.service
journalctl --user -u webapp.service --since "10 minutes ago" --no-pager
```

## Reloading After Configuration Changes

```bash
# After changing Quadlet files, reload the systemd daemon
systemctl --user daemon-reload

# Then restart the affected service
systemctl --user restart webapp.service
```

## Summary

Managing Podman containers through systemctl provides a uniform interface for controlling container services. Use `systemctl` for lifecycle management, `journalctl` for log viewing, and `systemctl show` for inspecting service properties. Remember to run `daemon-reload` after changing Quadlet files.
