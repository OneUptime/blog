# How to Use loginctl enable-linger for Rootless Podman Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, Rootless, Linger, loginctl

Description: Learn how to use loginctl enable-linger to keep rootless Podman services running after logout and start them at boot.

---

> Enable user linger with loginctl so your rootless Podman containers persist across logouts and start automatically at system boot.

Rootless Podman containers run under your user session. By default, systemd terminates user services when you log out. The `loginctl enable-linger` command tells systemd to keep your user services running even when no login session exists.

---

## The Problem Without Linger

Without linger enabled:
- User services stop when you log out
- Services do not start at boot (until you log in)
- SSH session disconnects kill your containers

## Enable Linger

```bash
# Enable linger for the current user

loginctl enable-linger

# Or specify a username
loginctl enable-linger myuser

# Verify linger is enabled
loginctl show-user $(whoami) --property=Linger
# Output: Linger=yes
```

## What Linger Does

When linger is enabled:
1. The user manager starts at boot (not at login)
2. User services with `WantedBy=default.target` start at boot
3. Services continue running after logout
4. The user XDG_RUNTIME_DIR persists

## Set Up a Persistent Rootless Service

```bash
# Enable linger
loginctl enable-linger

# Create a Quadlet container file
mkdir -p ~/.config/containers/systemd/
```

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Persistent web application

[Container]
Image=docker.io/myorg/webapp:latest
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
# Reload and start the generated service
systemctl --user daemon-reload
systemctl --user start webapp.service
```

Now the service will:
- Start when the system boots (not when you log in)
- Keep running after you log out
- Restart on failure

## Verify Persistent Services

```bash
# Log out and log back in, or reboot
# Then check the service
systemctl --user status webapp.service

# Check the boot log
journalctl --user -u webapp.service -b

# List all enabled user services
systemctl --user list-unit-files --state=enabled
```

## Verify from Another Session

You can check the service even from a root session:

```bash
# As root, check the user's services
machinectl shell myuser@ /usr/bin/systemctl --user status webapp.service
```

## Disable Linger

```bash
# Disable linger (services will stop on logout again)
loginctl disable-linger

# Verify
loginctl show-user $(whoami) --property=Linger
# Output: Linger=no
```

## Common Issues

### XDG_RUNTIME_DIR Not Set

If you get errors about XDG_RUNTIME_DIR when running systemctl over SSH:

```bash
# Set the runtime directory manually
export XDG_RUNTIME_DIR=/run/user/$(id -u)
```

### Services Not Starting at Boot

Ensure linger is enabled and the generated service is enabled:

```bash
loginctl show-user $(whoami) --property=Linger
systemctl --user is-enabled webapp.service
```

## Summary

`loginctl enable-linger` is essential for production rootless Podman services. Without it, services stop when you log out and do not start at boot. Enable linger, include an `[Install]` section in your Quadlet file, reload the user manager, and start the generated service to get persistent, boot-starting rootless container services.
