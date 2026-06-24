# How to Set Up Docker Security Policies in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Docker, Policies, Hardening

Description: Learn how to configure comprehensive Docker security policies in Portainer to enforce container security standards across all environments and user groups.

## Introduction

Portainer provides a centralized way to reduce risky Docker deployment options across your container infrastructure. In Portainer CE these controls are configured per environment, while Portainer BE can also apply policies to supported Edge Agent environment groups. These controls apply to non-administrator users, helping you enforce your organization's security standards without giving every user unrestricted Docker access.

## Prerequisites

- Portainer CE or BE with admin access
- Docker environments connected to Portainer
- If using Portainer BE policies: Edge (Standard) Agent environments running version 2.37.0 or later
- Security requirements documented for your organization

## Available Security Controls in Portainer

| Policy | Protection |
|--------|-----------|
| Bind mount restriction | Prevents host filesystem access |
| Privileged mode restriction | Prevents privileged containers |
| Host PID restriction | Prevents process namespace sharing |
| Stack management restriction | Removes a major deployment entry point for non-admin users |
| Device mapping restriction | Prevents host device access |
| Container capabilities restriction | Prevents adding extra Linux capabilities |
| Sysctl restriction | Prevents kernel parameter changes |
| Registry access controls | Limits which registries users can access in Portainer |

## Step 1: Configure Security Policies in the UI

For each environment:

1. Log into Portainer as admin.
2. Select your environment.
3. For Docker Standalone environments, open **Host** → **Setup**. For Docker Swarm environments, open **Swarm** → **Setup**.
4. Scroll to **Docker Security Settings**.
5. Enable the restrictions you want to enforce for non-administrator users.
6. Click **Save**.

## Step 2: Configure Environment Security Settings via API

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"
ENDPOINT_ID=1

# Apply Docker security settings for non-admin users

curl -s -X PUT \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/settings" \
  -d '{
    "allowBindMountsForRegularUsers": false,
    "allowPrivilegedModeForRegularUsers": false,
    "allowHostNamespaceForRegularUsers": false,
    "allowStackManagementForRegularUsers": false,
    "allowDeviceMappingForRegularUsers": false,
    "allowContainerCapabilitiesForRegularUsers": false,
    "allowSysctlSettingForRegularUsers": false,
    "allowVolumeBrowserForRegularUsers": false,
    "enableHostManagementFeatures": false
  }' | jq .
```

## Step 3: Limit Registry Access in Portainer

In Portainer:

1. Go to **Registries** and add only approved registries.
2. Optionally hide the anonymous Docker Hub registry for all users in the Portainer UI.
3. For each environment, open **Host** → **Registries** or **Swarm** → **Registries**.
4. Use **Manage access** to grant users or teams access only to approved registries.

Via API:

```bash
# Hide anonymous Docker Hub from the Portainer UI
curl -s -X PUT \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/settings/default_registry" \
  -d '{
    "Hide": true
  }' | jq .
```

This only hides the anonymous Docker Hub option in the Portainer UI. It does not fully disable Docker Hub access because anonymous Docker Hub access is built into Docker itself.

## Step 4: Enforce Secure Container Templates

Create approved App Templates that already include security settings:

```json
{
  "version": "2",
  "templates": [
    {
      "type": 1,
      "title": "Secure Web App",
      "description": "Pre-configured with security best practices",
      "categories": ["Web"],
      "platform": "linux",
      "image": "nginx:1.25",
      "ports": ["80/tcp"],
      "env": [],
      "volumes": [],
      "privileged": false,
      "note": "Production-hardened configuration. No privileged mode, no bind mounts."
    }
  ]
}
```

Upload templates in Portainer:
1. Go to **Settings** → **General**.
2. Scroll to **App Templates** and enter the URL to your templates JSON file.
3. Save.

## Step 5: Implement Docker Daemon Security Defaults

On the Docker host itself, configure secure defaults:

```json
{
  "icc": false,
  "no-new-privileges": true,
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false
}
```

```bash
# Validate and apply daemon configuration
sudo dockerd --validate --config-file=/etc/docker/daemon.json
sudo systemctl restart docker

# Verify
docker info | grep -Ei "(Security Options|name=userns|name=seccomp)"
```

## Step 6: Create a Security Audit Script

```bash
#!/bin/bash
# security-audit.sh - Audit running containers for security violations

PORTAINER_URL="https://portainer.example.com"
API_KEY="your-api-key"
ENDPOINT_ID=1

echo "=== Container Security Audit ==="
echo ""

CONTAINERS=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json?all=false")

VIOLATIONS=0

while read -r CONTAINER; do
  NAME=$(echo "$CONTAINER" | jq -r '.Names[0]' | sed 's/^\///')
  ID=$(echo "$CONTAINER" | jq -r '.Id')

  # Inspect each container
  INSPECT=$(curl -s -H "X-API-Key: $API_KEY" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${ID}/json")

  PRIVILEGED=$(echo "$INSPECT" | jq -r '.HostConfig.Privileged')
  PID_MODE=$(echo "$INSPECT" | jq -r '.HostConfig.PidMode')
  NET_MODE=$(echo "$INSPECT" | jq -r '.HostConfig.NetworkMode')

  # Check for violations
  if [ "$PRIVILEGED" = "true" ]; then
    echo "VIOLATION: $NAME - Running in PRIVILEGED mode"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi

  if [ "$PID_MODE" = "host" ]; then
    echo "VIOLATION: $NAME - Running with HOST PID namespace"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi

  if [ "$NET_MODE" = "host" ]; then
    echo "WARNING: $NAME - Running with HOST network mode"
  fi
done < <(jq -c '.[]' <<< "$CONTAINERS")

echo ""
echo "Audit complete. Violations found: $VIOLATIONS"
```

## Step 7: Portainer Security Policy Template

Document your policy as code:

```yaml
# portainer-security-policy.yml
# Security policy for all Portainer environments

policy_version: "1.0"
environments:
  production:
    bind_mounts: disabled
    privileged_mode: disabled
    host_pid: disabled
    stack_management: disabled
    device_mapping: disabled
    container_capabilities: disabled
    sysctl_settings: disabled
    approved_registries:
      - registry.company.com
      - ghcr.io/your-org

  staging:
    bind_mounts: disabled
    privileged_mode: disabled
    host_pid: disabled
    stack_management: disabled
    approved_registries:
      - registry.company.com
      - ghcr.io/your-org

  development:
    bind_mounts: allowed  # More permissive for dev
    privileged_mode: disabled
    host_pid: disabled
    approved_registries: any
```

## Conclusion

Portainer's Docker security controls provide a centralized way to reduce risky deployment options for non-administrator users. Enable all applicable restrictions for production environments, run periodic security audits to detect violations, and use pre-approved application templates to guide developers toward secure defaults. Combine Portainer's controls with Docker daemon hardening and registry access management for defense in depth.
