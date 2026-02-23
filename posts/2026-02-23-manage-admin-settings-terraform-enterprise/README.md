# How to Manage Admin Settings in Terraform Enterprise

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Admin, Configuration, Management, DevOps

Description: A comprehensive guide to managing Terraform Enterprise admin settings, covering general configuration, security policies, resource limits, and organization management.

---

Terraform Enterprise ships with a lot of configurable knobs. The admin settings control everything from security policies and resource limits to SMTP configuration and Terraform version management. Knowing what each setting does and when to change it is important for running a well-tuned TFE instance.

This guide covers the key admin settings, how to configure them through both the UI and API, and recommendations for production environments.

## Accessing Admin Settings

Only site administrators can access admin settings. You become a site admin either during initial setup or by being granted the role by another admin.

```bash
# Check if your user is a site admin
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  "${TFE_URL}/api/v2/account/details" | \
  jq '.data.attributes["is-site-admin"]'

# Access the admin UI at:
# https://tfe.example.com/app/admin
```

## General Settings

```bash
# View current general settings
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/admin/general-settings" | jq '.data.attributes'

# Update general settings
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/general-settings" \
  --data '{
    "data": {
      "type": "general-settings",
      "attributes": {
        "limit-user-organization-creation": true,
        "require-two-factor-for-admin": true,
        "default-execution-mode": "remote",
        "send-passing-statuses-for-untriggered-speculative-plans": true
      }
    }
  }'
```

### Key General Settings Explained

| Setting | Description | Recommended Value |
|---|---|---|
| Limit organization creation | Prevents non-admins from creating organizations | true |
| Require 2FA for admins | Forces two-factor authentication for site admins | true |
| Default execution mode | Sets the default for new workspaces | remote |
| API rate limit | Max API requests per second | 30 (increase for heavy automation) |

## Managing Terraform Versions

Control which Terraform versions are available to workspaces:

```bash
# List all available Terraform versions
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/admin/terraform-versions?page[size]=20" | \
  jq '.data[] | {version: .attributes.version, enabled: .attributes.enabled, official: .attributes.official}'

# Disable a specific version (e.g., a known buggy release)
TF_VERSION_ID="tool-abc123"
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/terraform-versions/${TF_VERSION_ID}" \
  --data '{
    "data": {
      "type": "terraform-versions",
      "attributes": {
        "enabled": false
      }
    }
  }'

# Add a custom Terraform version (for air-gapped or custom builds)
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/admin/terraform-versions" \
  --data '{
    "data": {
      "type": "terraform-versions",
      "attributes": {
        "version": "1.8.5-custom",
        "url": "https://internal-mirror.example.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip",
        "sha": "abc123def456...",
        "enabled": true,
        "official": false
      }
    }
  }'
```

## Organization Management

```bash
# List all organizations
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/admin/organizations" | \
  jq '.data[] | {name: .attributes.name, email: .attributes.email, created: .attributes["created-at"]}'

# Create a new organization
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/admin/organizations" \
  --data '{
    "data": {
      "type": "organizations",
      "attributes": {
        "name": "platform-engineering",
        "email": "platform-team@example.com"
      }
    }
  }'

# Set organization-level limits
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/organizations/platform-engineering" \
  --data '{
    "data": {
      "type": "organizations",
      "attributes": {
        "workspace-limit": 500,
        "run-limit": 50
      }
    }
  }'
```

## User Management

```bash
# List all users
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/admin/users?page[size]=50" | \
  jq '.data[] | {username: .attributes.username, email: .attributes.email, admin: .attributes["is-site-admin"], suspended: .attributes["is-suspended"]}'

# Promote a user to site admin
USER_ID="user-abc123"
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/admin/users/${USER_ID}/actions/grant-admin"

# Suspend a user (disable their access without deleting)
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/admin/users/${USER_ID}/actions/suspend"

# Unsuspend a user
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/admin/users/${USER_ID}/actions/unsuspend"
```

## Run Concurrency and Resource Limits

```bash
# View current capacity settings
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/admin/general-settings" | \
  jq '{
    concurrency: .data.attributes["capacity-concurrency"],
    memory: .data.attributes["capacity-memory"]
  }'

# Adjust concurrency based on available resources
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/general-settings" \
  --data '{
    "data": {
      "type": "general-settings",
      "attributes": {
        "capacity-concurrency": 20,
        "capacity-memory": 2048
      }
    }
  }'
```

## Security Policies

### Two-Factor Authentication

```bash
# Require 2FA for all users in an organization
curl -s \
  --header "Authorization: Bearer ${TFE_ORG_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/organizations/my-org" \
  --data '{
    "data": {
      "type": "organizations",
      "attributes": {
        "two-factor-conformant": true
      }
    }
  }'
```

### Session Management

```bash
# Configure session timeout
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/general-settings" \
  --data '{
    "data": {
      "type": "general-settings",
      "attributes": {
        "session-timeout": 480,
        "session-remember": 20160
      }
    }
  }'
```

## Cost Estimation Settings

```bash
# Enable or disable cost estimation
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/general-settings" \
  --data '{
    "data": {
      "type": "general-settings",
      "attributes": {
        "cost-estimation-enabled": true
      }
    }
  }'
```

## Automating Admin Configuration

For reproducible TFE setup, script the admin configuration:

```bash
#!/bin/bash
# configure-tfe-admin.sh
# Apply standard admin settings to a TFE instance

TFE_URL="${1:-https://tfe.example.com}"

echo "Configuring TFE admin settings for ${TFE_URL}..."

# General settings
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "${TFE_URL}/api/v2/admin/general-settings" \
  --data '{
    "data": {
      "type": "general-settings",
      "attributes": {
        "limit-user-organization-creation": true,
        "require-two-factor-for-admin": true,
        "default-execution-mode": "remote",
        "capacity-concurrency": 20,
        "cost-estimation-enabled": true,
        "session-timeout": 480
      }
    }
  }' > /dev/null

echo "General settings configured."

# Disable known-vulnerable Terraform versions
echo "Disabling deprecated Terraform versions..."
# Add version disabling logic here

echo "Admin configuration complete."
```

## Monitoring Admin Changes

Always monitor changes to admin settings since they affect the entire TFE instance:

```bash
# Check audit logs for admin setting changes
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  "${TFE_URL}/api/v2/organization/audit-trail?filter[type]=admin" | \
  jq '.data[] | {
    timestamp: .attributes.timestamp,
    action: .attributes.action,
    actor: .attributes.actor.email,
    details: .attributes.resource
  }'
```

## Summary

Managing TFE admin settings is about finding the right balance between security and usability. Start with restrictive defaults - limit organization creation, require 2FA for admins, and set reasonable session timeouts. Use the API to manage settings programmatically so your configuration is versioned and repeatable. Monitor admin changes through audit logs so you always know who changed what. As your organization grows, revisit concurrency limits and resource allocations to keep TFE performing well under increasing load.
