# How to Create the Initial Admin User via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Admin Setup, Automation, DevOps

Description: Learn how to automate the initial Portainer admin user creation via the API to enable unattended deployments and infrastructure-as-code workflows.

## Why Automate Admin Creation?

When deploying Portainer in automated infrastructure provisioning (Terraform, Ansible, cloud init scripts), you need to create the admin user without manual browser interaction. Portainer provides an API endpoint for initial setup.

## The Admin Initialization Window

Portainer has a **5-minute window** after first startup to create the admin user. After this window, the setup endpoint is disabled and you must use the UI.

## Checking If Portainer Needs Initialization

```bash
# Check Portainer status - returns whether admin setup is still needed

curl -s "http://localhost:9000/api/system/status" | jq '.'

# Response when not yet initialized:
# {"Version": "2.x.x", "InstanceID": "...", "EdgeAgents": 0, ...}
```

## Creating the Initial Admin User

```bash
# Create the admin user via the API (must be done within 5 minutes of startup)
curl -X POST "http://localhost:9000/api/users/admin/init" \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "admin",
    "Password": "YourStr0ngP@ssword!"
  }'

# Response on success (the created User object):
# {"Id": 1, "Username": "admin", "Role": 1, ...}
```

The minimum password length is 12 characters. The init endpoint does not return a JWT — to obtain one for follow-up API calls, authenticate against `/api/auth` with the same credentials:

```bash
curl -X POST "http://localhost:9000/api/auth" \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "admin",
    "Password": "YourStr0ngP@ssword!"
  }'

# Response:
# {"jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

## Full Automation Script

```bash
#!/bin/bash
# portainer-init.sh - Initialize Portainer with admin user and basic config

set -e

PORTAINER_URL="http://localhost:9000"
ADMIN_USER="${PORTAINER_ADMIN_USER:-admin}"
ADMIN_PASS="${PORTAINER_ADMIN_PASS:?PORTAINER_ADMIN_PASS is required}"

# Wait for Portainer to be ready
echo "Waiting for Portainer to start..."
until curl -sf "${PORTAINER_URL}/api/system/status" > /dev/null; do
  sleep 2
done

# Initialize the admin user
echo "Creating admin user..."
if ! curl -sf -X POST "${PORTAINER_URL}/api/users/admin/init" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${ADMIN_USER}\",\"Password\":\"${ADMIN_PASS}\"}" > /dev/null; then
  echo "Error: Failed to create admin user (window may have expired)"
  exit 1
fi

# Authenticate to obtain a JWT for subsequent API calls
echo "Authenticating..."
JWT=$(curl -sf -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${ADMIN_USER}\",\"Password\":\"${ADMIN_PASS}\"}" \
  | jq -r '.jwt')

echo "Admin user created. JWT: ${JWT:0:30}..."

# Configure additional settings with the obtained JWT
curl -s -X PUT "${PORTAINER_URL}/api/settings" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 1
  }'

echo "Portainer initialized successfully."
```

## Using with Docker Compose

The official `portainer/portainer-ce` image is built `FROM scratch` and contains only the Portainer binary — no shell, no `curl`, no `wget`. That makes container-internal `HEALTHCHECK` impractical, so let the init container poll for readiness itself before posting:

```yaml
# docker-compose.yml with init container
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    ports:
      - "9000:9000"
    volumes:
      - portainer_data:/data

  portainer-init:
    image: curlimages/curl:latest
    depends_on:
      - portainer
    environment:
      - ADMIN_PASS=${PORTAINER_ADMIN_PASS}
    command: >
      sh -c "until curl -sf http://portainer:9000/api/system/status > /dev/null; do sleep 2; done
        && curl -X POST http://portainer:9000/api/users/admin/init
        -H 'Content-Type: application/json'
        -d '{\"Username\":\"admin\",\"Password\":\"'\"$$ADMIN_PASS\"'\"}'
        && echo 'Admin created'"

volumes:
  portainer_data:
```

Note the `$$ADMIN_PASS` — this escapes the variable from Compose-time interpolation so it's expanded by the container's shell at runtime against the value injected via `environment:`.

## Conclusion

Automating Portainer initialization enables fully unattended infrastructure deployments. Use the `/api/users/admin/init` endpoint in your bootstrap scripts, and store the admin password securely (e.g., in Vault or AWS Secrets Manager).
