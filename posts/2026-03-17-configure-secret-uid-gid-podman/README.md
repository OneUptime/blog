# How to Configure Secret UID and GID in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, UID, GID, Permission

Description: Learn how to configure the UID and GID of secret files in Podman to control ownership for non-root container processes.

---

> Setting the UID and GID on secret files ensures that non-root processes inside your container can access the sensitive data they need.

When containers run as non-root users, the default root ownership on secret files can prevent the application from reading them. By specifying the UID and GID on secret mounts, you ensure the correct user and group own the secret files.

---

## Setting UID and GID on a Secret

```bash
# Create a secret

echo -n "app-secret-value" | podman secret create app_secret -

# Mount the secret with specific UID and GID
podman run -d \
  --name my-app \
  --user 1000:1000 \
  --secret app_secret,uid=1000,gid=1000 \
  my-app:latest

# The secret file is owned by user 1000 and group 1000
```

## Combining UID, GID, and Mode

```bash
# Full permission configuration
echo -n "database-password" | podman secret create db_pass -

podman run -d \
  --name secure-app \
  --user 1000:1000 \
  --secret db_pass,uid=1000,gid=1000,mode=0400 \
  my-app:latest

# File is owned by 1000:1000 with read-only permissions for the owner
```

## Common Use Cases

```bash
# Node.js application running as user 'node' (UID 1000)
echo -n "api-key-value" | podman secret create api_key -

podman run -d \
  --name node-app \
  --user node \
  --secret api_key,uid=1000,gid=1000,mode=0440 \
  node:lts-alpine

# Nginx running as user 'nginx' (UID 101, GID 101)
podman secret create nginx_cert ./certs/server.crt
podman secret create nginx_key ./certs/server.key

podman run -d \
  --name nginx \
  --secret nginx_cert,target=/etc/nginx/ssl/cert.pem,uid=101,gid=101,mode=0444 \
  --secret nginx_key,target=/etc/nginx/ssl/key.pem,uid=101,gid=101,mode=0400 \
  nginx:latest
```

## Finding the Right UID and GID

```bash
# Check the UID and GID of the application user inside the container
podman run --rm my-app:latest id
# Output: uid=1000(appuser) gid=1000(appuser) groups=1000(appuser)

# Or check /etc/passwd for a specific user
podman run --rm my-app:latest grep appuser /etc/passwd
# Output: appuser:x:1000:1000::/home/appuser:/bin/sh
```

## Group-Based Access

```bash
# Share a secret across processes in the same group
echo -n "shared-secret" | podman secret create shared_secret -

podman run -d \
  --name multi-process-app \
  --secret shared_secret,uid=0,gid=1000,mode=0440 \
  multi-process-app:latest

# Root owns the file, but group 1000 can also read it
# This allows multiple users in group 1000 to access the secret
```

## Verifying Ownership

```bash
# Check the ownership and permissions inside the container
podman exec my-app ls -la /run/secrets/app_secret

# Example output:
# -r-------- 1 1000 1000 16 Mar 17 10:00 /run/secrets/app_secret

# Check with stat for numeric values
podman exec my-app stat -c '%u:%g %a' /run/secrets/app_secret
# Output: 1000:1000 400
```

## Summary

Use the `uid` and `gid` options when mounting secrets in Podman to set file ownership that matches your container's application user. This is essential when running containers as non-root users, as the default root ownership would prevent the application from reading the secret. Always combine UID/GID settings with appropriate `mode` permissions for a complete security configuration.
