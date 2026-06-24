# How to Change the Minimum Password Length in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Password Policy, Administration, Configuration

Description: Configure the minimum password length requirement for Portainer user accounts to meet your organization's security policy.

## Introduction

When using internal authentication, Portainer enforces a minimum password length for user accounts. By default, this is set to 12 characters. Organizations with stricter security requirements may want to increase this, while development environments might lower it for convenience. This guide shows how to configure the password length policy.

## Finding the Password Policy Settings

Password policy settings are managed through the Portainer web UI under Settings. This is not configurable via CLI flags - it must be set after Portainer is running.

## Step 1: Access Security Settings

1. Log in to Portainer as an administrator
2. Navigate to **Settings** in the left sidebar
3. Select **Authentication**
4. Find the **Password rules** section

## Step 2: Configure Minimum Password Length

In the Authentication settings page, look for:

- **Minimum password length**: Set the minimum number of characters (default: 12)

The UI shows a slider where you can adjust the required minimum length.

## Step 3: Save the Changes

After adjusting the slider, save the authentication settings. Portainer will enforce the updated minimum length for new passwords and will ask users with shorter existing passwords to update them the next time they log in.

## Configuring via the API

For automation or infrastructure-as-code workflows, use the Portainer API:

```bash
# First, get an authentication token

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Get current settings
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/settings \
  | python3 -c 'import sys, json; print(json.dumps(json.load(sys.stdin)["InternalAuthSettings"], indent=2))'

# Update minimum password length to 16
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "InternalAuthSettings": {
      "RequiredPasswordLength": 16
    }
  }'
```

## Portainer Business Edition Additional Options

Portainer Business Edition uses the same `InternalAuthSettings.RequiredPasswordLength` setting for internal authentication. Current official API documentation does not document separate built-in uppercase, lowercase, digit, or symbol requirements for Portainer's internal authentication.

## Docker Compose with an Initial Admin Password

For fresh deployments, you can set the admin password meeting your policy from the start:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    command:
      # Portainer reads the plain-text password from the secret file and hashes it on first startup
      - "--admin-password-file=/run/secrets/portainer_admin_password"
    secrets:
      - portainer_admin_password
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

secrets:
  portainer_admin_password:
    file: ./portainer_password.txt

volumes:
  portainer_data:
```

## Best Practices

**Recommended minimums by environment (as general password policy guidance):**

| Environment | Minimum Length | Additional Rules |
|-------------|---------------|-----------------|
| Development | 8 characters | None required |
| Staging | 12 characters | Mixed case |
| Production | 16 characters | Mixed case + digits + symbols |
| High-security | 20 characters | All rules |

## Enforcing Policy for Existing Users

Changing the minimum password length does NOT retroactively invalidate existing passwords. Users with short passwords can still log in, but Portainer will ask them to update those passwords the next time they log in. To force all users to update:

1. After changing the policy, notify users to update their passwords
2. Portainer will ask users with shorter passwords to update them when they next log in
3. Admins can manually reset passwords for users who don't comply

## Conclusion

Portainer's internal authentication password length policy is a simple but effective control for maintaining account security standards. Configure it via the Settings UI or the API as part of your initial deployment, and align it with your organization's security policy. Remember that policy changes do not instantly invalidate existing passwords; users with shorter passwords are prompted to update them the next time they log in.
