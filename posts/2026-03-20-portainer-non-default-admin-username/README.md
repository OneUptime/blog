# How to Use a Non-Default Admin Username in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Authentication, Hardening, DevOps

Description: Learn how to configure Portainer with a non-default admin username to reduce exposure to credential stuffing and brute force attacks targeting the default admin account.

## Introduction

Using `admin` as your Portainer administrator username is a well-known default that attackers specifically target in brute force and credential stuffing attacks. Changing to a unique, organization-specific username adds a layer of security through obscurity as part of a defense-in-depth strategy.

## Prerequisites

- Fresh Portainer installation (for initial setup)
- OR existing Portainer with admin access (for changing existing admin username)

## Method 1: Set Non-Default Username During Initial Setup

The best time to change the admin username is during the initial Portainer setup:

### Via the Web UI

1. Open Portainer for the first time at `https://portainer.example.com:9443`.
2. On the **Create initial administrator** page, change the **Username** field from `admin` to your chosen username.
3. Enter a strong password.
4. Click **Create user**.

### Via the API (for automated setups)

```bash
PORTAINER_URL="https://portainer.example.com:9443"
ADMIN_USERNAME="portainer-ops"  # Custom, non-default username
ADMIN_PASSWORD="$(openssl rand -base64 32)"

# Create the initial admin with custom username

curl -s -X POST "${PORTAINER_URL}/api/users/admin/init" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${ADMIN_USERNAME}\",
    \"password\": \"${ADMIN_PASSWORD}\"
  }" | jq '{Id, Username, Role}'

echo "Admin created: ${ADMIN_USERNAME}"
echo "Password: ${ADMIN_PASSWORD}"
# Store the password securely!
```

## Method 2: Rename the Existing Admin Username

If Portainer is already set up with the default `admin` user:

### Step 1: Authenticate as the Current Admin

```bash
PORTAINER_URL="https://portainer.example.com:9443"
CURRENT_PASSWORD="CurrentSecurePassword123!"

TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"${CURRENT_PASSWORD}\"}" | jq -r '.jwt')
```

### Step 2: Rename the Existing Admin Account

```bash
# Find the current admin's user ID
CURRENT_ADMIN_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/users" | \
  jq -r '.[] | select(.Username == "admin") | .Id')

# Update the username on the existing admin account
UPDATED_ADMIN=$(curl -s -X PUT "${PORTAINER_URL}/api/users/${CURRENT_ADMIN_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "portainer-ops"
  }')

echo "$UPDATED_ADMIN" | jq .
```

### Step 3: Verify Login with the New Username

```bash
# Test authentication with the renamed admin account
NEW_TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"portainer-ops\",\"password\":\"${CURRENT_PASSWORD}\"}" | jq -r '.jwt')

if [ -n "$NEW_TOKEN" ] && [ "$NEW_TOKEN" != "null" ]; then
  echo "Admin username updated successfully!"
else
  echo "ERROR: Updated admin login failed."
  exit 1
fi
```

## Method 3: Create a Second Admin (Optional)

Portainer also supports creating additional administrator accounts. If you take this approach, note that the initial administrator account (user ID `1`) is protected and cannot be deleted through the API, so renaming the existing account is the better option if your goal is to stop using `admin`.

## Choosing a Good Admin Username

Avoid predictable usernames:
- `admin`, `administrator`, `root`, `superuser` - Targeted by default
- Your company name alone - Too predictable
- `portainer` - Product-specific and predictable

Use less predictable options:
- `infra-ops` - Function-based
- `platform-admin` - Team-based
- `sre-lead` - Role-based with initials
- A random identifier: `portal-a7k2m` - Hardest to guess

## Scripted Initial Setup with Custom Username

```bash
#!/bin/bash
# portainer-init-secure.sh - Initialize with custom admin username

PORTAINER_URL="${PORTAINER_URL:-https://portainer.example.com:9443}"

# Generate secure random credentials
ADMIN_USERNAME="${ADMIN_USERNAME:-portainer-ops-$(openssl rand -hex 4)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 24)}"

echo "Waiting for Portainer to start..."
until curl -sf "${PORTAINER_URL}/api/system/status" > /dev/null 2>&1; do
  sleep 3
done

echo "Creating admin user: ${ADMIN_USERNAME}"

RESPONSE=$(curl -s -X POST "${PORTAINER_URL}/api/users/admin/init" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}")

if echo "$RESPONSE" | jq -e '.Id' > /dev/null 2>&1; then
  echo "Admin created successfully!"
  echo ""
  echo "=== Credentials (store these securely) ==="
  echo "URL:      ${PORTAINER_URL}"
  echo "Username: ${ADMIN_USERNAME}"
  echo "Password: ${ADMIN_PASSWORD}"

  # Save to a local credentials file with restrictive permissions
  umask 077
  {
    echo "PORTAINER_ADMIN_USER=${ADMIN_USERNAME}"
    echo "PORTAINER_ADMIN_PASS=${ADMIN_PASSWORD}"
  } > ./portainer-admin-credentials
else
  echo "ERROR: ${RESPONSE}"
  exit 1
fi
```

## Conclusion

Using a non-default admin username in Portainer is a simple but effective security measure that reduces your exposure to automated attacks targeting default credentials. Set the custom username during initial setup for the cleanest approach, or rename the existing administrator username for existing installations. Combine this with a strong password, HTTPS, IP restrictions, and RBAC for a comprehensive security posture.
