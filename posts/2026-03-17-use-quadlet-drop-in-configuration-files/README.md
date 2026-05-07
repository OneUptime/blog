# How to Use Quadlet Drop-In Configuration Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Drop-In, Configuration

Description: Learn how to use systemd drop-in files to override and extend Quadlet container configurations without modifying the original files.

---

> Customize and override Quadlet container settings using systemd drop-in files, keeping your base configuration intact while applying environment-specific modifications.

Systemd drop-in files let you override specific settings in a unit file without editing the original. Since Quadlet generates systemd units, you can use drop-in files to modify the generated service behavior, add environment variables, change restart policies, or adjust resource limits.

---

## How Drop-In Files Work

Drop-in files are placed in a directory named after the service or Quadlet file with a `.d` suffix. They extend or override the generated unit file or the source Quadlet configuration.

## Creating a Drop-In for a Quadlet Service

If your Quadlet file is `webapp.container`, the generated service is `webapp.service`. Create a drop-in directory and file:

```bash
# Create the drop-in directory

mkdir -p ~/.config/systemd/user/webapp.service.d/
```

```ini
# ~/.config/systemd/user/webapp.service.d/override.conf
[Service]
# Override the restart delay
RestartSec=30

# Add environment variables for the podman process
Environment=PODMAN_USERNS=keep-id

# Override resource limits
LimitNOFILE=65536
LimitNPROC=4096
```

## Overriding Service Dependencies

```ini
# ~/.config/systemd/user/webapp.service.d/dependencies.conf
[Unit]
# Add additional dependencies
After=database.service redis.service
Requires=database.service
Wants=redis.service
```

## Adding Pre-Start and Post-Stop Commands

```ini
# ~/.config/systemd/user/webapp.service.d/hooks.conf
[Service]
# Run a command before the container starts
ExecStartPre=/usr/bin/podman pull docker.io/myorg/webapp:latest
# Run a command after the container stops
ExecStopPost=/bin/sh -c 'echo "Container stopped at $(date)" >> /tmp/webapp.log'
```

## Environment-Specific Overrides

Keep a base Quadlet file and use Quadlet drop-ins for different environments:

```ini
# Production override
# ~/.config/containers/systemd/webapp.container.d/production.conf
[Container]
Environment=NODE_ENV=production
Environment=LOG_LEVEL=warn

[Service]
RestartSec=5
```

```ini
# Development override
# ~/.config/containers/systemd/webapp.container.d/development.conf
[Container]
Environment=NODE_ENV=development
Environment=LOG_LEVEL=debug

[Service]
RestartSec=1
```

## Apply and Verify Drop-Ins

```bash
# Reload systemd to pick up drop-in files
systemctl --user daemon-reload

# Restart the service
systemctl --user restart webapp.service

# Verify the drop-in is loaded
systemctl --user cat webapp.service

# Check effective configuration
systemctl --user show webapp.service --property=RestartUSec
systemctl --user show webapp.service --property=Environment
```

## Summary

Systemd drop-in files complement Quadlet by letting you override generated service settings without modifying the original Quadlet files. Place `.conf` files in a `.service.d` directory to adjust dependencies, environment variables, restart policies, and pre/post commands. This approach keeps base configurations clean while supporting environment-specific customizations.
