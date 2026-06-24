# How to Run Rootless Podman Containers That Survive Logout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Systemd, Linger, Persistence

Description: A practical guide to keeping rootless Podman containers running after you log out of your session, using systemd user services and loginctl linger.

---

> "A container that stops when you close your terminal is not ready for production."

By default, rootless Podman containers that you start directly from a login session are tied to that session. When the session ends, systemd may terminate the session scope that contains those processes. This guide shows you how to make rootless containers persistent, surviving logouts and even reboots.

---

## Understanding Why Containers Stop

When you log out, systemd can clean up processes in your login session. Rootless Podman containers started directly from that session can be terminated too.

```bash
# Start a rootless container

podman run -d --name test-app docker.io/library/nginx:latest

# Check which systemd scope it runs under
podman inspect test-app --format '{{.State.ConmonPid}}' | xargs ps -o user,pid,cgroup -p

# Log out and log back in -- the container will stop
podman ps -a --filter name=test-app
# The container will show as stopped
```

## Step 1: Enable Linger for Your User

The `loginctl enable-linger` command tells systemd to keep your user manager running even when you have no active sessions.

```bash
# Enable linger for your user
loginctl enable-linger $USER

# Verify linger is enabled
loginctl show-user $USER --property=Linger
# Output: Linger=yes

# Check that your user manager is running
systemctl --user status
```

With linger enabled, systemd starts your user instance at boot and keeps it running permanently.

## Step 2: Create a Quadlet User Service

Podman Quadlet lets you define containers as systemd user services.

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Rootless webapp container

[Container]
Image=docker.io/library/nginx:latest
ContainerName=webapp
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

Quadlet reads the `.container` file and generates a `webapp.service` systemd user unit that creates and removes the container as part of the service lifecycle.

## Step 3: Install the Service

Create the Quadlet file in your user configuration directory and enable it:

```bash
# Create the Quadlet user directory if it does not exist
mkdir -p ~/.config/containers/systemd

# Reload the systemd user daemon
systemctl --user daemon-reload

# Enable the service to start at boot
systemctl --user enable webapp.service

# Start the service now
systemctl --user start webapp.service

# Check the service status
systemctl --user status webapp.service
```

## Step 4: Verify Persistence Across Logout

Test that the container survives a logout:

```bash
# Verify the container is running
podman ps --filter name=webapp

# Check the service is active
systemctl --user is-active webapp.service

# Log out via SSH and log back in, then check again
# The container should still be running
podman ps --filter name=webapp
systemctl --user status webapp.service
```

## Managing the Persistent Container

Use standard systemctl commands to manage the container lifecycle:

```bash
# Stop the container
systemctl --user stop webapp.service

# Start the container
systemctl --user start webapp.service

# Restart the container
systemctl --user restart webapp.service

# View container logs through journald
journalctl --user -u webapp.service --no-pager -n 50

# Follow logs in real time
journalctl --user -u webapp.service -f
```

## Handling Multiple Containers with Pods

For multi-container applications, define a pod and attach containers to it:

```ini
# ~/.config/containers/systemd/myapp.pod
[Pod]
PodName=myapp
PublishPort=8080:80
PublishPort=5432:5432

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/myapp-web.container
[Container]
Image=docker.io/library/nginx:latest
ContainerName=myapp-web
Pod=myapp.pod
```

```ini
# ~/.config/containers/systemd/myapp-db.container
[Container]
Image=docker.io/library/postgres:16
ContainerName=myapp-db
Pod=myapp.pod
```

```bash
# Enable and start the pod service
systemctl --user daemon-reload
systemctl --user enable --now myapp-pod.service

# Verify the pod is running
podman pod ps
podman ps --pod
```

## Summary

Making rootless Podman containers survive logout requires two things: enabling linger with `loginctl enable-linger` and managing containers through systemd user services. Use Quadlet files under `~/.config/containers/systemd/`, reload the user manager with `systemctl --user daemon-reload`, and enable the generated services with `systemctl --user enable`. This gives you containers that start at boot, survive logouts, restart on failure, and integrate with standard systemd management workflows.
