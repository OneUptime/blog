# How to Configure Terraform Enterprise OIDC Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, OIDC, OpenID Connect, SSO, Authentication, Security

Description: Learn how to configure OpenID Connect (OIDC) authentication for Terraform Enterprise with step-by-step instructions for popular identity providers.

---

OpenID Connect (OIDC) has become the preferred authentication protocol for modern web applications, and Terraform Enterprise supports it as a first-class SSO option. Compared to SAML, OIDC is simpler to configure, easier to debug, and better suited for API-driven workflows. If your identity provider supports OIDC, it is usually the better choice for TFE integration.

This guide covers configuring OIDC authentication in Terraform Enterprise with detailed examples for Okta, Azure AD, and Keycloak.

## OIDC vs SAML for TFE

Both protocols achieve the same goal - single sign-on - but they differ in implementation:

- **OIDC** uses JSON-based tokens (JWTs), making them easy to inspect and debug.
- **SAML** uses XML-based assertions, which are verbose and harder to troubleshoot.
- **OIDC** works better with API clients and modern applications.
- **SAML** has broader legacy support in older enterprise systems.

For new TFE deployments, OIDC is the recommended approach unless your organization has a strong reason to use SAML.

## Prerequisites

- Terraform Enterprise instance with admin access
- An OIDC-capable identity provider (Okta, Azure AD, Keycloak, Auth0, etc.)
- The TFE callback URL: `https://tfe.example.com/users/oidc/callback`
- Admin access to your identity provider

## Step 1: Register TFE as an OIDC Client

### Okta Setup

1. In the Okta admin console, go to **Applications** > **Create App Integration**
2. Select **OIDC - OpenID Connect** and **Web Application**

```
App integration name: Terraform Enterprise
Grant type: Authorization Code
Sign-in redirect URIs: https://tfe.example.com/users/oidc/callback
Sign-out redirect URIs: https://tfe.example.com
Assignments: Limit access to selected groups
```

3. Note the **Client ID** and **Client Secret** after saving.

4. Under the **Sign On** tab, configure claims:

```
Groups claim type: Filter
Groups claim filter: memberOf - Matches regex - .*
```

5. Get the OIDC discovery URL:

```
https://your-org.okta.com/.well-known/openid-configuration
```

### Azure AD (Entra ID) Setup

1. Go to **Azure Active Directory** > **App registrations** > **New registration**

```
Name: Terraform Enterprise
Supported account types: Accounts in this organizational directory only
Redirect URI: Web - https://tfe.example.com/users/oidc/callback
```

2. After registration, note the **Application (client) ID** and **Directory (tenant) ID**.

3. Create a client secret under **Certificates & secrets** > **New client secret**.

4. Configure API permissions:

```
Microsoft Graph:
  - openid (Delegated)
  - profile (Delegated)
  - email (Delegated)
  - User.Read (Delegated)
```

5. Configure optional claims under **Token configuration** > **Add optional claim**:

```
Token type: ID
Claims: email, groups, preferred_username
```

6. The OIDC discovery URL follows this pattern:

```
https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration
```

### Keycloak Setup

```bash
# Create a new client in Keycloak using the admin CLI
# First, get an admin token
ADMIN_TOKEN=$(curl -s \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin-password" \
  -d "grant_type=password" \
  "https://keycloak.example.com/realms/master/protocol/openid-connect/token" | jq -r '.access_token')

# Create the OIDC client for TFE
curl -s \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  "https://keycloak.example.com/admin/realms/your-realm/clients" \
  -d '{
    "clientId": "terraform-enterprise",
    "name": "Terraform Enterprise",
    "enabled": true,
    "protocol": "openid-connect",
    "publicClient": false,
    "redirectUris": ["https://tfe.example.com/users/oidc/callback"],
    "webOrigins": ["https://tfe.example.com"],
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": false,
    "serviceAccountsEnabled": false,
    "attributes": {
      "post.logout.redirect.uris": "https://tfe.example.com"
    }
  }'
```

The Keycloak discovery URL:

```
https://keycloak.example.com/realms/your-realm/.well-known/openid-configuration
```

## Step 2: Configure OIDC in Terraform Enterprise

### Via the Admin UI

1. Log in to TFE as a site admin
2. Go to **Admin** > **SSO** > **OIDC**
3. Fill in the configuration:

```
OIDC Provider:         Custom (or select a preset if available)
Client ID:             your-client-id-from-idp
Client Secret:         your-client-secret-from-idp
OIDC Discovery URL:    https://your-org.okta.com/.well-known/openid-configuration
Scopes:                openid, profile, email, groups
Username Claim:        email
Groups Claim:          groups (or memberOf depending on your IdP)
```

### Via API

```bash
# Configure OIDC via the TFE Admin Settings API
curl -s \
  --header "Authorization: Bearer $TFE_ADMIN_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PUT \
  https://tfe.example.com/api/v2/admin/oidc-settings \
  --data '{
    "data": {
      "type": "oidc-settings",
      "attributes": {
        "enabled": true,
        "client-id": "your-client-id",
        "client-secret": "your-client-secret",
        "oidc-discovery-url": "https://your-org.okta.com/.well-known/openid-configuration",
        "scopes": "openid profile email groups",
        "username-claim": "email",
        "groups-claim": "groups",
        "site-admin-group": "tfe-site-admins",
        "team-management-enabled": true
      }
    }
  }'
```

### Via Environment Variables

For Docker-based deployments, you can also use environment variables:

```bash
# OIDC configuration via environment variables
TFE_OIDC_ENABLED=true
TFE_OIDC_CLIENT_ID=your-client-id
TFE_OIDC_CLIENT_SECRET=your-client-secret
TFE_OIDC_DISCOVERY_URL=https://your-org.okta.com/.well-known/openid-configuration
TFE_OIDC_SCOPES="openid profile email groups"
TFE_OIDC_USERNAME_CLAIM=email
TFE_OIDC_GROUPS_CLAIM=groups
```

## Step 3: Configure Team Mapping

OIDC group claims allow TFE to automatically assign users to teams based on their IdP group membership.

```bash
# Create a team in TFE that maps to an IdP group
curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://tfe.example.com/api/v2/organizations/my-org/teams" \
  --data '{
    "data": {
      "type": "teams",
      "attributes": {
        "name": "platform-engineers",
        "sso-team-id": "tfe-platform-engineers",
        "organization-access": {
          "manage-workspaces": true,
          "manage-policies": false,
          "manage-vcs-settings": true
        }
      }
    }
  }'
```

The `sso-team-id` must match the group name or ID that your IdP sends in the groups claim.

## Step 4: Test the OIDC Flow

```bash
# Verify the OIDC discovery endpoint is reachable from TFE
curl -s https://your-org.okta.com/.well-known/openid-configuration | jq '.issuer, .authorization_endpoint, .token_endpoint'

# Open a browser and navigate to TFE
# Click "Sign in with SSO"
# Authenticate with your IdP
# Verify you are logged in and in the correct teams
```

### Debugging with JWT Inspection

If something is not working, inspect the ID token your IdP returns:

```bash
# Decode a JWT token (copy from browser network tab)
# Split on dots and base64-decode the payload (second part)
echo "$JWT_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# You should see claims like:
# {
#   "sub": "user123",
#   "email": "user@example.com",
#   "groups": ["tfe-admins", "tfe-developers"],
#   "iss": "https://your-org.okta.com",
#   "aud": "your-client-id",
#   "exp": 1708700000
# }
```

## Troubleshooting Common Issues

**"Invalid redirect URI"**: The callback URL registered in your IdP must exactly match `https://tfe.example.com/users/oidc/callback`. Check for trailing slashes or http vs https mismatches.

**"Invalid client credentials"**: The client ID and secret in TFE must match what your IdP has. Regenerate the secret if needed.

**Users are authenticated but not in any teams**: Verify the groups claim is being sent. Check that `groups-claim` in TFE matches the claim name your IdP uses. Some IdPs use `groups`, others use `memberOf` or `roles`.

**"Discovery URL not reachable"**: TFE needs outbound HTTPS access to the OIDC discovery URL. In air-gapped environments, you may need to configure a proxy or use SAML instead.

**Token expiration issues**: If users get logged out frequently, check the token lifetime settings in your IdP. TFE respects the token expiration from the OIDC flow.

## Security Best Practices

1. **Use PKCE**: If your IdP supports Proof Key for Code Exchange, enable it for added security.
2. **Restrict redirect URIs**: Only register the exact callback URL, no wildcards.
3. **Rotate client secrets**: Set a reminder to rotate the client secret periodically.
4. **Use groups for access control**: Do not rely on individual user assignments. Use IdP groups mapped to TFE teams.
5. **Keep a local admin**: Always maintain a local admin account for emergency access.

## Summary

OIDC authentication in Terraform Enterprise provides a clean, modern approach to single sign-on. The setup is straightforward - register TFE as a client in your IdP, configure TFE with the client credentials and discovery URL, and set up team mapping. OIDC's use of JWTs makes debugging much simpler than SAML when things go wrong. Whether you use Okta, Azure AD, Keycloak, or another provider, the TFE configuration follows the same pattern.
