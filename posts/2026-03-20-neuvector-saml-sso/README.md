# How to Configure NeuVector SAML SSO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, SAML, SSO, Authentication, Identity Management

Description: Configure SAML 2.0 Single Sign-On for NeuVector to enable your team to authenticate using Okta, Azure AD, or other identity providers.

## Introduction

SAML 2.0 (Security Assertion Markup Language) Single Sign-On allows NeuVector users to authenticate using your organization's identity provider (IdP). This eliminates the need for separate NeuVector passwords and provides centralized access control through your existing SSO infrastructure. This guide covers configuration with Okta and Azure AD.

## Prerequisites

- NeuVector Manager accessible via HTTPS
- An identity provider that supports SAML 2.0 (Okta, Azure AD, Google Workspace, etc.)
- Admin access to both NeuVector and your IdP
- NeuVector Manager URL (e.g., `https://neuvector.company.com:8443`)

## Step 1: Get NeuVector SAML Metadata

First, gather NeuVector's SAML service provider information:

```bash
# NeuVector SAML Service Provider details

# These values are needed when configuring your IdP.
# In the NeuVector console, see Settings > SAML Setting and copy the
# "SAML Redirect URL" - that is your ACS URL. The server name (default
# "saml1") becomes the trailing path segment.

Entity ID (Audience URI): https://neuvector.company.com:8443
ACS URL (Reply URL): https://neuvector.company.com:8443/v1/token_auth_server/saml1
```

## Step 2: Configure Okta as the IdP

### Create an Okta Application

1. Log in to Okta Admin Console
2. Go to **Applications** > **Applications**
3. Click **Create App Integration**
4. Select **SAML 2.0**
5. Configure the app:

```text
App name: NeuVector Security Platform
App logo: (upload NeuVector logo)
```

6. In SAML Settings:

```text
Single Sign On URL (ACS URL): https://neuvector.company.com:8443/v1/token_auth_server/saml1
Audience URI (SP Entity ID): https://neuvector.company.com:8443
Name ID format: EmailAddress
Application username: Email

Attribute Statements:
- Name: Username
  Value: user.login
- Name: Email
  Value: user.email

Group Attribute Statements:
- Name: NVRoleGroup
  Filter: Starts with: NeuVector-
```

NeuVector reads the user identifier from the SAML NameID, the email from
the `Email` attribute, and group membership from the attribute named in
the SAML server's group claim setting (default `NVRoleGroup`).

7. Download the IdP metadata XML or note:
   - Identity Provider SSO URL
   - Identity Provider Issuer
   - X.509 Certificate

### Configure NeuVector with Okta Settings

Create a SAML server entry in NeuVector. The default server name is
`saml1`:

```bash
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/server" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "server": {
      "server_name": "saml1",
      "server_type": "saml",
      "saml": {
        "sso_url": "https://dev-123456.okta.com/app/neuvector/sso/saml",
        "issuer": "http://www.okta.com/abc123def456",
        "x509_cert": "MIIDpDCCAoygAwIBAgIGAXXXXXXXXXXXX...",
        "group_claim": "NVRoleGroup",
        "group_mapped_roles": [
          {
            "group": "NeuVector-Admins",
            "global_role": "admin"
          },
          {
            "group": "NeuVector-SecurityTeam",
            "global_role": "reader"
          },
          {
            "group": "NeuVector-Developers",
            "global_role": "",
            "role_domains": {
              "reader": ["development"]
            }
          }
        ],
        "enable": true,
        "default_role": ""
      }
    }
  }'
```

To update an existing SAML server, PATCH `/v1/server/saml1` with the same
`saml` block wrapped under a `config` object. To add SAML to the
authentication order, update the system config separately:

```bash
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"config": {"auth_order": ["saml1", "local"]}}'
```

## Step 3: Configure Azure AD as the IdP

### Create an Azure AD Enterprise Application

```bash
# Using Azure CLI

# Create the application registration
az ad app create \
  --display-name "NeuVector" \
  --web-redirect-uris "https://neuvector.company.com:8443/v1/token_auth_server/saml1"

# Get the application ID
APP_ID=$(az ad app list --display-name "NeuVector" --query "[].appId" -o tsv)
echo "Application ID: ${APP_ID}"
```

In Azure Portal:
1. Go to **Azure Active Directory** > **Enterprise Applications**
2. Click **New application** > **Create your own application**
3. Name it "NeuVector" and select **Non-gallery application**
4. Go to **Single sign-on** > **SAML**
5. Configure Basic SAML Configuration:

```text
Identifier (Entity ID): https://neuvector.company.com:8443
Reply URL (ACS URL): https://neuvector.company.com:8443/v1/token_auth_server/saml1
Sign on URL: https://neuvector.company.com:8443
```

6. Configure User Attributes & Claims:

```text
Unique User Identifier: user.mail
Additional claims:
- username: user.userprincipalname
- email: user.mail
- groups: user.groups (group Object IDs)
```

7. Download the Federation Metadata XML or note the values

### Configure NeuVector with Azure AD Settings

```bash
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/server/saml1" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "saml1",
      "saml": {
        "sso_url": "https://login.microsoftonline.com/<tenant-id>/saml2",
        "issuer": "https://sts.windows.net/<tenant-id>/",
        "x509_cert": "MIIC8DCCAdigAwIBAgIQXXXXXXXXXX...",
        "group_claim": "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
        "group_mapped_roles": [
          {
            "group": "<azure-ad-group-object-id-for-admins>",
            "global_role": "admin"
          },
          {
            "group": "<azure-ad-group-object-id-for-readers>",
            "global_role": "reader"
          }
        ],
        "enable": true
      }
    }
  }'
```

## Step 4: Test SAML SSO Login

```bash
# Access the NeuVector UI via browser
# Navigate to: https://neuvector.company.com:8443
# Click "Login with SSO"
# Should redirect to your IdP login page

# After authentication, verify the token contains the correct role
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/token_auth_server/saml1" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "SAMLResponse=$(cat saml-response.xml | base64)" | \
  jq '.token | {username: .username, role: .role}'
```

## Step 5: Configure Default Role for Unmatched Groups

Set a default role for users who don't match any group mapping:

```bash
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/server/saml1" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "saml1",
      "saml": {
        "default_role": "reader"
      }
    }
  }'
```

## Conclusion

SAML SSO integration provides enterprise-grade authentication for NeuVector, enabling your team to use existing corporate credentials and benefiting from centralized access revocation. When an employee leaves, removing them from the IdP immediately revokes their NeuVector access. Always maintain a local admin fallback account with a secure password for emergencies when the IdP is unavailable.
