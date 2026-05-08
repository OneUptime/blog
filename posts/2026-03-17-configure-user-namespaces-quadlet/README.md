# How to Configure User Namespaces in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, User Namespaces, Security

Description: Learn how to configure user namespace mappings in Podman Quadlet container files for enhanced container isolation.

---

> Improve container security by mapping container UIDs and GIDs to unprivileged host users through user namespace configuration in Quadlet.

User namespaces provide an extra layer of isolation by mapping the root user inside a container to an unprivileged user on the host. This means that even if a process escapes the container, it has no elevated privileges on the host system.

---

## Understanding User Namespaces in Podman

Rootless Podman already runs containers in a user namespace by default. The `UserNS` directive in Quadlet gives you fine-grained control over the namespace configuration.

## Using Auto User Namespace

Let Podman automatically configure the user namespace:

```ini
# ~/.config/containers/systemd/secure-app.container

[Unit]
Description=Application with automatic user namespace

[Container]
Image=docker.io/myorg/myapp:latest
# Automatically allocate a user namespace
UserNS=auto
PublishPort=8080:8080

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Specifying Auto Namespace Size

Control the number of UIDs/GIDs allocated:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Allocate 65536 UIDs in the namespace
UserNS=auto:size=65536
```

## Keep ID Mapping

Map the current user's UID into the container:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Map the host user UID to the same UID inside the container
UserNS=keep-id
```

This is useful when you need files created inside the container to be owned by your host user.

## Keep ID with Specific UID/GID

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Map host user to UID 1000 and GID 1000 inside the container
UserNS=keep-id:uid=1000,gid=1000
```

## Running as a Specific User Inside the Container

Combine `UserNS` with the `User` directive:

```ini
# ~/.config/containers/systemd/app.container
[Unit]
Description=App running as non-root user

[Container]
Image=docker.io/myorg/myapp:latest
UserNS=keep-id
User=1000
Group=1000
Volume=%h/appdata:/data:Z

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Verify User Namespace Configuration

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start secure-app.service

# Check the user namespace mapping
podman inspect systemd-secure-app --format '{{.HostConfig.UsernsMode}}'

# Verify the user inside the container
podman exec systemd-secure-app id

# Check the UID mapping
podman exec systemd-secure-app cat /proc/self/uid_map
```

## Summary

User namespaces in Quadlet container files control how container UIDs map to host UIDs. Use `auto` for automatic isolation, `keep-id` to preserve host user ownership of files, or specify custom mappings. Rootless Podman already provides user namespace isolation by default, but explicit configuration gives you more control.
