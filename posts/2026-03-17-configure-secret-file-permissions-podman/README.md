# How to Configure Secret File Permissions in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Permission, Security

Description: Learn how to configure file permissions on Podman secret mounts to control which processes can read sensitive data.

---

> Setting proper file permissions on secret mounts ensures that only authorized processes inside the container can read sensitive data.

By default, secret files mounted in Podman containers use UID 0, GID 0, and mode `0444`, which makes them readable by users inside the container. You can customize these permissions to restrict access further, which is important when running multiple processes inside a container or when using non-root users.

---

## Setting File Permissions with mode

```bash
# Create a secret

echo -n "sensitive-data" | podman secret create my_secret -

# Mount with specific file permissions (read-only for owner)
podman run -d \
  --name secure-app \
  --secret my_secret,mode=0400 \
  my-app:latest

# The secret file at /run/secrets/my_secret has permissions -r--------
```

## Common Permission Modes

```bash
# Owner read-only (most restrictive, recommended)
podman run -d --name app1 \
  --secret my_secret,mode=0400 \
  my-app:latest

# Owner read-write
podman run -d --name app2 \
  --secret my_secret,mode=0600 \
  my-app:latest

# Owner and group read-only
podman run -d --name app3 \
  --secret my_secret,mode=0440 \
  my-app:latest

# All users read-only (least restrictive)
podman run -d --name app4 \
  --secret my_secret,mode=0444 \
  my-app:latest
```

## Permissions for Non-Root Containers

```bash
# When running as a non-root user, ensure the user can read the secret
echo -n "app-password" | podman secret create app_pass -

# Set group-readable permissions with matching GID
podman run -d \
  --name nonroot-app \
  --user 1000:1000 \
  --secret app_pass,mode=0440,uid=1000,gid=1000 \
  my-app:latest

# The file is readable by user 1000 and group 1000
```

## Combining Permissions with Custom Paths

```bash
# Custom path with restricted permissions
echo -n "tls-key-data" | podman secret create tls_key -

podman run -d \
  --name nginx \
  --secret tls_key,target=/etc/ssl/private/server.key,mode=0400 \
  nginx:latest

# The key file is only readable by the file owner
```

## Verifying Permissions Inside the Container

```bash
# Check the file permissions
podman exec secure-app ls -la /run/secrets/my_secret

# Example output:
# -r-------- 1 root root 14 Mar 17 10:00 /run/secrets/my_secret

# Check the numeric permissions
podman exec secure-app stat -c '%a %U:%G' /run/secrets/my_secret

# Example output:
# 400 root:root
```

## Production Configuration

```bash
# Full production secret configuration with permissions
echo -n "prod-db-password" | podman secret create prod_db_pass -
podman secret create prod_tls_cert ./certs/server.crt
podman secret create prod_tls_key ./certs/server.key

podman run -d \
  --name production-app \
  --secret prod_db_pass,mode=0400 \
  --secret prod_tls_cert,target=/etc/ssl/cert.pem,mode=0444 \
  --secret prod_tls_key,target=/etc/ssl/key.pem,mode=0400 \
  production-app:latest
```

## Summary

Configure secret file permissions in Podman using the `mode` option when attaching secrets to containers. Use `0400` (owner read-only) for maximum security, and adjust based on your application's needs. When running as a non-root user, combine `mode` with `uid` and `gid` options to ensure the application process can read the secret files. Always use the most restrictive permissions that allow your application to function correctly.
