# How to Place Quadlet Files for User Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, User Services, Rootless

Description: Learn where to place Quadlet unit files for rootless user-level Podman services that run without root privileges.

---

> User-level Quadlet files run rootless containers under your user account, requiring no root privileges and isolated from other users.

User services run as your regular user account without root privileges. They are ideal for development servers, personal applications, and any container workload that does not need system-wide access. The containers start when you log in and can be configured to persist with lingering.

---

## User Quadlet Directory

```bash
# Primary location for user Quadlet files

~/.config/containers/systemd/

# Create it if it doesn't exist
mkdir -p ~/.config/containers/systemd/
```

## Creating a User Service

```ini
# ~/.config/containers/systemd/devserver.container
[Container]
Image=docker.io/library/nginx:alpine
PublishPort=8080:80
Volume=%h/projects/website:/usr/share/nginx/html:ro,Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```

The `%h` specifier expands to the user's home directory.

```bash
# Reload user systemd
systemctl --user daemon-reload

# Start the service
systemctl --user start devserver

# Check status
systemctl --user status devserver
```

## User Database for Development

```ini
# ~/.config/containers/systemd/dev-pgdata.volume
[Volume]

# ~/.config/containers/systemd/dev-postgres.container
[Container]
Image=docker.io/library/postgres:16-alpine
Environment=POSTGRES_PASSWORD=devpassword
Environment=POSTGRES_DB=devdb
Volume=dev-pgdata.volume:/var/lib/postgresql/data
PublishPort=5432:5432

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Enabling Services at Login

```bash
# Apply the [Install] section for auto-start when you log in
systemctl --user daemon-reload

# Start it immediately in the current session
systemctl --user start devserver

# Check the generated unit
systemctl --user list-unit-files devserver.service
```

## Persistent Services with Lingering

By default, user services stop when you log out. Enable lingering to keep them running.

```bash
# Enable lingering for your user
loginctl enable-linger $(whoami)

# Verify
loginctl show-user $(whoami) | grep Linger
# Output: Linger=yes

# Now services start at boot and persist after logout
```

## WantedBy Target

```ini
# User services should use default.target
[Install]
WantedBy=default.target

# default.target is the user session target
# It activates when the user logs in (or at boot with lingering)
```

## Managing User Services

```bash
# No sudo needed - these are user services
systemctl --user start devserver
systemctl --user stop devserver
systemctl --user restart devserver

# View logs
journalctl --user -u devserver -f

# List all user container services
systemctl --user list-units --type=service | grep podman
```

## Multiple User Services

```ini
# ~/.config/containers/systemd/redis-dev.container
[Container]
Image=docker.io/library/redis:7-alpine
PublishPort=6379:6379

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/mailhog.container
[Container]
Image=docker.io/mailhog/mailhog:latest
PublishPort=1025:1025
PublishPort=8025:8025

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload and start all
systemctl --user daemon-reload
systemctl --user start redis-dev mailhog
```

## Verifying Quadlet Generation

```bash
# Preview generated unit files for user services
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun

# Check for configuration errors
systemctl --user status devserver
journalctl --user -u devserver --no-pager
```

## User vs System Services

```bash
# User services: rootless, no sudo, per-user isolation
# Location: ~/.config/containers/systemd/
# Manage: systemctl --user
# Target: default.target

# System services: rootful, requires sudo, system-wide
# Location: /etc/containers/systemd/
# Manage: sudo systemctl
# Target: multi-user.target
```

## Summary

Place user-level Quadlet files in `~/.config/containers/systemd/` for rootless containers managed without root privileges. Use `default.target` in the `[Install]` section, enable lingering for persistent services, and manage with `systemctl --user`. User services are isolated from other users and run entirely within your account.
