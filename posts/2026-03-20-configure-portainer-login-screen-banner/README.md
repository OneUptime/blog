# How to Configure the Portainer Login Screen Banner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Customization, Security, Business Edition, Compliance

Description: Learn how to add a custom message or legal disclaimer banner to the Portainer login screen for compliance and security awareness.

---

Many organizations are required by policy or regulation to display a warning or acceptable use policy on systems before authentication. Portainer Business Edition supports adding a custom login banner to meet this requirement.

## Prerequisites

- Portainer Business Edition
- Administrator access

## Configure Login Banner via the UI

### Step 1: Go to General Settings

1. Log in as an administrator
2. Navigate to **Settings > General**
3. Scroll to find the **Login screen banner** section

### Step 2: Enter Your Banner Text

Toggle **Login screen banner** on, then enter the message you want displayed on the login screen in the **Details** box. This typically includes:
- Authorized access only notice
- Legal disclaimer
- Contact information for access requests

Click **Save** to apply.

## Configure Login Banner via API

```bash
# Authenticate

TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Set the login banner message
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "BlackListedLabels": [],
    "AuthenticationMethod": 1,
    "LoginBannerEnabled": true,
    "LoginBanner": "AUTHORIZED ACCESS ONLY\n\nThis system is restricted to authorized users. All activities on this system are monitored and recorded. Unauthorized access is prohibited and may be prosecuted under applicable law.\n\nBy logging in, you agree to comply with the acceptable use policy."
  }' \
  --insecure

echo "Login banner configured"
```

## Example Banner Content

Here are common templates for different use cases:

### Compliance Banner

```text
NOTICE: Authorized Access Only

This system is the property of Acme Corp and is restricted to authorized users only. All activities may be monitored and recorded by system personnel. By accessing this system, you consent to such monitoring.

Unauthorized use of this system may result in civil or criminal penalties. If you are not an authorized user, disconnect immediately.
```

### IT Department Banner

```text
Welcome to Acme Corp Container Management Platform

For access requests, contact: it-support@acme.com
For security incidents: security@acme.com | +1-555-0100

This platform is for managing production infrastructure. Proceed with caution.
```

## Remove the Login Banner

```bash
# Disable the login banner
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"LoginBannerEnabled": false, "LoginBanner": ""}' \
  --insecure
```

## Banner Best Practices

- Keep banners concise - very long text hurts usability
- Include contact information for legitimate access requests
- Review with your legal team for compliance requirements
- Avoid including sensitive information in the banner text itself

---

*Add monitoring and alerting to your Portainer deployment with [OneUptime](https://oneuptime.com).*
