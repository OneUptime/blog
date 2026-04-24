# How to Disable Bind Mounts for Non-Admin Users in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Docker, Hardening, RBAC

Description: Learn how to disable bind mounts for non-admin users in Portainer to prevent container escape attacks that leverage host filesystem access.

## Introduction

Bind mounts allow containers to mount directories directly from the host filesystem. This is powerful but dangerous in multi-user environments - a user who can create a bind mount to `/etc` or `/var/run/docker.sock` effectively has root access to the host. Portainer allows administrators to disable this capability for non-admin users.

## Why Bind Mounts Are Dangerous

A malicious or careless user with bind mount access can:

```bash
# Mount the Docker socket - gives root-equivalent container control

-v /var/run/docker.sock:/var/run/docker.sock

# Mount SSH authorized_keys - add their own key for host SSH access
-v /root/.ssh:/host_ssh

# Mount /etc/cron.d - plant a cron job on the host
-v /etc/cron.d:/host_cron
```

All of these provide access to sensitive host resources and can lead to host compromise. Disabling bind mounts for non-admin users eliminates this entire class of risk.

## Step 1: Disable Bind Mounts in Environment Settings

### Via Portainer UI

1. Log into Portainer as admin.
2. Select your Docker environment.
3. Click the **gear icon** (environment settings).
4. Scroll to the **Security** section.
5. Find **Hide bind mounts for non-administrators**.
6. Enable this toggle.
7. Click **Save configuration**.

### Via Portainer API

```bash
PORTAINER_URL="https://portainer.example.com"
TOKEN="your-admin-token"
ENDPOINT_ID=1

# Disable bind mounts for non-admin users
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/settings" \
  -d '{
    "allowBindMountsForRegularUsers": false
  }' | jq .
```

## Step 2: Verify the Restriction Is Active

After enabling, log in as a non-admin user and try to create a container with a bind mount:

1. Navigate to **Containers** → **Add container**.
2. Under **Volumes**, try to add a **Bind** type volume.
3. The option should be hidden in the UI or produce an authorization error.

Non-admin users will still be able to use **named volumes** (safer) but cannot bind-mount host paths.

## Step 3: Apply to Multiple Environments

Use the API to apply this restriction across all environments:

```bash
#!/bin/bash
# disable-bind-mounts-all-envs.sh

PORTAINER_URL="https://portainer.example.com"
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Get all Docker environments (standalone, agent, and Edge agent)
ENDPOINTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" | \
  jq -c '.[] | select(.Type == 1 or .Type == 2 or .Type == 4)')

echo "$ENDPOINTS" | while read -r ENDPOINT; do
  ID=$(echo "$ENDPOINT" | jq -r '.Id')
  NAME=$(echo "$ENDPOINT" | jq -r '.Name')

  curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoints/${ID}/settings" \
    -d '{"allowBindMountsForRegularUsers": false}' > /dev/null

  echo "Disabled bind mounts on environment: $NAME (ID: $ID)"
done
```

## Step 4: Communicate the Change to Users

Notify users about the change and provide alternatives:

```bash
To all container developers:

Bind mounts to host paths have been disabled for security reasons.
Please use named Docker volumes for persistent storage instead.

Before (bind mount - now restricted):
  Volumes: /host/path:/container/path

After (named volume - allowed):
  Volumes: my-data-volume:/container/path

If you need to share files between the host and container, please
contact the DevOps team to arrange an approved workflow.
```

## Step 5: Alternatives to Bind Mounts for Users

Provide users with safe alternatives:

### Named Volumes (Recommended)

```yaml
# compose.yaml - Using named volumes (safe for all users)
services:
  app:
    image: myapp:latest
    volumes:
      - app_data:/data      # Named volume - allowed for non-admin users
      - app_config:/config

volumes:
  app_data:
  app_config:
```

### NFS-Backed Volumes for Shared Storage

```yaml
# Using an NFS-backed volume via Docker's local driver
services:
  app:
    image: myapp:latest
    volumes:
      - shared_uploads:/app/uploads

volumes:
  shared_uploads:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,rw
      device: :/nfs/uploads
```

## Step 6: Admin-Level Bind Mounts

Admin users retain the ability to use bind mounts for legitimate operations:

```bash
# Admin can still use bind mounts for:
# - Configuration files
# - Nginx config mounting
# - Certificate mounting
# - Development environment tools

# Example: Admin-deployed nginx with config bind mount
docker run -d \
  --name nginx \
  -v /etc/nginx/sites-available:/etc/nginx/conf.d:ro \
  -p 80:80 \
  nginx:latest
```

## Conclusion

Disabling bind mounts for non-admin users in Portainer is a simple, one-click security control that eliminates a whole class of container escape vulnerabilities. Named volumes provide a safe alternative for legitimate data persistence needs. Apply this restriction to all production environments and combine with other security controls (disable privileged mode, host PID access) for defense in depth.
