# How to Disable Host PID Access for Non-Admin Users in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Docker, Hardening, Container

Description: Learn how to prevent non-admin users from running containers with host PID namespace sharing in Portainer, blocking a critical container escape vector.

## Introduction

The `--pid=host` option in Docker shares the host's process namespace with a container. This allows a container to see and interact with all processes on the host, including sensitive system processes. In a shared Portainer environment, this is a critical security risk. Portainer includes a control to block this for non-admin users, and on new environments the restriction is enabled by default.

## Why Host PID Is Dangerous

When a container runs with `--pid=host`:

```bash
# Inside a container with --pid=host, the user can:

# See all host processes
ps aux  # Shows ALL host processes

# Kill host processes
kill -9 HOST_PID  # Can crash the host OS or services

# Attach to host processes (with ptrace capability)
strace -p HOST_PROCESS_PID

# Access /proc/[pid]/environ of host processes - may expose secrets
cat /proc/1/environ  # Read init process environment variables

# Read memory of other processes
cat /proc/HOST_PID/mem  # With appropriate permissions
```

## Step 1: Disable Host PID in Portainer

### Via Portainer UI

1. Log into Portainer as admin.
2. Select your Docker environment.
3. Open **Host > Setup** for Docker Standalone, or **Swarm > Setup** for Docker Swarm.
4. Scroll to the **Docker Security Settings** section.
5. Find the host PID restriction toggle for non-administrators.
6. Ensure it is enabled.
7. Click **Save configuration**.

### Via Portainer API

```bash
PORTAINER_URL="https://portainer.example.com"
TOKEN="your-admin-token"
ENDPOINT_ID=1

# Disable host PID for non-admin users
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/settings" \
  -d '{
    "allowHostNamespaceForRegularUsers": false
  }' | jq .

echo "Host PID access disabled for non-admin users on endpoint $ENDPOINT_ID"
```

## Step 2: Understand What Gets Blocked

After enabling this restriction:

- Non-admin users **cannot** create containers with `--pid=host` through Portainer
- Non-admin users **cannot** deploy a Portainer-managed stack or Compose application with `pid: "host"`
- Admin users retain the ability to use host PID when genuinely required

Legitimate use cases for host PID (admin-only):

```bash
# Debugging or profiling tools that need host PID visibility
docker run --rm -it --pid=host alpine

# Process tracing against host processes generally also needs extra permissions
docker run --rm -it --pid=host --cap-add SYS_PTRACE --security-opt seccomp=unconfined alpine

# Docker-in-Docker scenarios (with appropriate controls)
```

## Step 3: Apply Across All Environments

```bash
#!/bin/bash
# apply-security-restrictions.sh - Apply Docker security restrictions to all Docker environments

PORTAINER_URL="https://portainer.example.com"
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

# Get all Docker environments (Type 1, 2, or 4)
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
    -d '{
      "allowBindMountsForRegularUsers": false,
      "allowPrivilegedModeForRegularUsers": false,
      "allowHostNamespaceForRegularUsers": false
    }' > /dev/null

  echo "Applied security restrictions to: $NAME (ID: $ID)"
done

echo "Core Docker security restrictions applied to all matching environments."
```

## Step 4: Comprehensive Security Restrictions

Disable host PID as part of a broader security hardening:

```bash
# Apply broader Docker security restrictions via API
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/settings" \
  -d '{
    "allowBindMountsForRegularUsers": false,
    "allowPrivilegedModeForRegularUsers": false,
    "allowHostNamespaceForRegularUsers": false,
    "allowDeviceMappingForRegularUsers": false,
    "allowStackManagementForRegularUsers": false,
    "allowContainerCapabilitiesForRegularUsers": false,
    "allowSysctlSettingForRegularUsers": false,
    "allowSecurityOptForRegularUsers": false
  }'
```

## Step 5: Docker Security Defaults

Teach users to rely on secure container defaults:

```yaml
# Secure docker-compose.yml - No host namespace sharing needed
services:
  app:
    image: myapp:latest
    restart: unless-stopped
    # No pid: host
    # No network_mode: host
    # No privileged: true
    security_opt:
      - no-new-privileges:true  # Prevent privilege escalation
    cap_drop:
      - ALL                     # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE        # Add only what's needed
    read_only: true             # Read-only root filesystem
    tmpfs:
      - /tmp                    # Writable temp storage
    ports:
      - "3000:3000"             # Expose via port mapping, not host network
```

## Step 6: Validate the Restriction

Verify the restriction with a non-admin Portainer account:

```bash
USER_TOKEN="your-non-admin-token"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/create?name=pid-host-test" \
  -d '{
    "Image": "alpine:latest",
    "Cmd": ["sleep", "60"],
    "HostConfig": {
      "PidMode": "host"
    }
  }')

echo "Portainer response: HTTP $HTTP_STATUS"
# Expected for a non-admin user with the restriction enabled: HTTP 403
```

## Conclusion

Disabling host PID access for non-admin users in Portainer removes a significant isolation bypass in Portainer-managed deployments. Combined with disabling privileged mode, bind mounts, device mappings, stack management, container capabilities, sysctl settings, and `security-opt`, these restrictions create a strong multi-layered container security policy. Admin users retain full flexibility for legitimate operational tools, while standard users operate within a safer Portainer environment.
