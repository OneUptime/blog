# How to Use Secrets with Podman Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Quadlet, Systemd

Description: Learn how to use Podman secrets with Quadlet unit files for systemd-managed containers.

---

> Podman Quadlet integrates secrets with systemd service management, letting you run containers with secure credential delivery as native system services.

Quadlet is Podman's integration with systemd that lets you define containers as systemd unit files. When combined with Podman secrets, you get systemd-managed containers with secure credential handling, ideal for production server deployments.

---

## Basic Secret with Quadlet

First, create the secret:

```bash
# Create the secret

echo -n "my-database-password" | podman secret create db_password -
```

Then create the Quadlet container file:

```ini
# ~/.config/containers/systemd/my-app.container
[Container]
Image=my-app:latest
PublishPort=8080:8080
Secret=db_password

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Activating the Quadlet Service

```bash
# Reload systemd to pick up the new unit file
systemctl --user daemon-reload

# Start the service
systemctl --user start my-app

# Check the status
systemctl --user status my-app

# Enable to start with the user systemd manager
systemctl --user enable my-app
```

## Secret with Custom Mount Options

```ini
# ~/.config/containers/systemd/secure-app.container
[Container]
Image=my-app:latest
PublishPort=8080:8080

# Mount secret with custom target and permissions
Secret=db_password,target=/app/config/db_pass,mode=0400,uid=1000,gid=1000

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Multiple Secrets

```ini
# ~/.config/containers/systemd/multi-secret-app.container
[Container]
Image=my-app:latest
PublishPort=8080:8080

Secret=db_password
Secret=api_key
Secret=redis_auth
Secret=tls_cert,target=/etc/ssl/cert.pem,mode=0444
Secret=tls_key,target=/etc/ssl/key.pem,mode=0400

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Secrets as Environment Variables in Quadlet

```ini
# ~/.config/containers/systemd/env-secret-app.container
[Container]
Image=my-app:latest
PublishPort=8080:8080

# Expose secrets as environment variables
Secret=db_password,type=env,target=DB_PASSWORD
Secret=api_key,type=env,target=API_KEY

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Full Application Stack with Quadlet

```ini
# ~/.config/containers/systemd/postgres.container
[Container]
Image=postgres:15
Volume=pg_data:/var/lib/postgresql/data
Secret=db_password
Environment=POSTGRES_PASSWORD_FILE=/run/secrets/db_password
Environment=POSTGRES_DB=myapp
Network=app-network.network

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/web-app.container
[Container]
Image=my-web-app:latest
PublishPort=8080:8080
Secret=db_password
Secret=api_key
Network=app-network.network

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/app-network.network
[Network]
```

## Managing Quadlet Services with Secrets

```bash
# Rotate a secret used by a Quadlet service
podman secret rm db_password
echo -n "new-rotated-password" | podman secret create db_password -

# Restart the service to pick up the new secret
systemctl --user restart my-app
```

## Summary

Podman Quadlet provides seamless integration of secrets with systemd service management. Define secrets in your `.container` unit files using the `Secret=` directive with support for custom mount paths, permissions, UID/GID, and environment variable exposure. This combination gives you production-grade container management with secure credential delivery, all managed through standard systemd tools.
