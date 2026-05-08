# How to Configure Environment Variables in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Environment Variable, Configuration

Description: Learn how to set environment variables in Podman Quadlet container files to configure your containerized applications.

---

> Pass configuration to your containers using the Environment directive in Quadlet container files for clean, declarative configuration management.

Environment variables are the standard way to configure containerized applications. Quadlet provides the `Environment` directive to set individual environment variables directly in your container unit files. This keeps configuration visible, version-controlled, and easy to manage.

---

## Setting a Single Environment Variable

Use the `Environment` directive in the `[Container]` section:

```ini
# ~/.config/containers/systemd/myapp.container

[Unit]
Description=My application

[Container]
Image=docker.io/myorg/myapp:latest
Environment=NODE_ENV=production
PublishPort=3000:3000

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Setting Multiple Environment Variables

Add multiple `Environment` lines for each variable:

```ini
# ~/.config/containers/systemd/myapp.container
[Unit]
Description=My application with multiple env vars

[Container]
Image=docker.io/myorg/myapp:latest
Environment=NODE_ENV=production
Environment=DATABASE_HOST=db.example.com
Environment=DATABASE_PORT=5432
Environment=LOG_LEVEL=info
Environment=APP_NAME=myapp
PublishPort=3000:3000

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using Variables with Spaces

Wrap the full assignment in quotes when values contain spaces:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
Environment="APP_TITLE=My Application Server"
Environment="GREETING=Hello World"
```

## Combining with systemd Environment Directives

You can also use the `[Service]` section's `Environment` directive, which follows standard systemd syntax:

```ini
[Container]
Image=docker.io/myorg/myapp:latest

[Service]
# These are systemd-level environment variables
# They are available to the podman process, not inside the container
Environment=PODMAN_SYSTEMD_UNIT=%n
Restart=on-failure
```

Note that environment variables in the `[Service]` section are for the systemd service, not the container process.

## Reload and Verify

```bash
# Reload systemd to pick up changes
systemctl --user daemon-reload

# Start the service
systemctl --user start myapp.service

# Verify environment variables inside the container
podman exec systemd-myapp env | grep -E 'NODE_ENV|DATABASE_HOST|LOG_LEVEL'
```

Expected output:

```text
NODE_ENV=production
DATABASE_HOST=db.example.com
LOG_LEVEL=info
```

## Summary

The `Environment` directive in Quadlet container files provides a straightforward way to pass configuration to your containers. Each variable gets its own line, making it easy to read and manage. For sensitive values or large sets of variables, consider using environment files instead.
