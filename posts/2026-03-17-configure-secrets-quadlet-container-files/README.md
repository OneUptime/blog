# How to Configure Secrets in Quadlet Container Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Secret, Security

Description: Learn how to securely pass secrets to Podman containers using the Secret directive in Quadlet container files.

---

> Use Podman secrets with Quadlet to inject sensitive data like passwords, API keys, and certificates into containers without exposing them in configuration files.

Hardcoding secrets in environment variables or configuration files is a security risk. Podman provides a secrets management system that stores sensitive data separately and makes it available inside containers as files. Quadlet integrates with this through the `Secret` directive.

---

## Creating a Podman Secret

First, create a secret using the Podman CLI:

```bash
# Create a secret from a string

echo -n "my-database-password" | podman secret create db_password -

# Create a secret from a file
podman secret create tls_cert /path/to/certificate.pem

# List existing secrets
podman secret ls
```

## Using Secrets in a Quadlet File

Reference secrets in the `[Container]` section:

```ini
# ~/.config/containers/systemd/myapp.container
[Unit]
Description=Application with secrets

[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
PublishPort=3000:3000

# Mount the secret as a file inside the container
Secret=db_password
# The secret will be available at /run/secrets/db_password

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Mounting Secrets at Custom Paths

Specify a custom mount point and permissions:

```ini
[Container]
Image=docker.io/myorg/myapp:latest

# Mount secret at a specific path
Secret=db_password,target=/app/secrets/db_pass
# Mount another secret with specific permissions
Secret=tls_cert,target=/app/certs/server.pem,mode=0400
```

## Using Secrets as Environment Variables

You can expose secrets as environment variables instead of files:

```ini
[Container]
Image=docker.io/myorg/myapp:latest

# Expose secret as an environment variable
Secret=db_password,type=env,target=DATABASE_PASSWORD
Secret=api_key,type=env,target=API_KEY
```

## Database Example with Secrets

```bash
# Create the database secrets
echo -n "postgres" | podman secret create pg_user -
echo -n "supersecretpassword" | podman secret create pg_password -
```

```ini
# ~/.config/containers/systemd/postgres.container
[Unit]
Description=PostgreSQL with secrets

[Container]
Image=docker.io/library/postgres:16
Volume=pgdata.volume:/var/lib/postgresql/data
PublishPort=5432:5432

# Pass secrets as environment variables
Secret=pg_user,type=env,target=POSTGRES_USER
Secret=pg_password,type=env,target=POSTGRES_PASSWORD

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Verify Secrets Are Available

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start myapp.service

# Check that the secret file exists inside the container
podman exec myapp cat /run/secrets/db_password

# List secrets used by the container
podman inspect myapp --format '{{.HostConfig.Secrets}}'
```

## Summary

Podman secrets with Quadlet provide a secure way to inject sensitive data into containers. Create secrets with `podman secret create`, then reference them in Quadlet files using the `Secret` directive. Secrets can be mounted as files or exposed as environment variables, keeping sensitive data out of your configuration files and container images.
