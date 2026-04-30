# How to Fix OAuth Login Issues with Authentik in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, OAuth2, Authentik, SSO, Authentication, OpenID Connect

Description: Learn how to diagnose and fix OAuth login failures when integrating Portainer with Authentik as the identity provider, including scope, redirect URI, and claim mapping issues.

---

Integrating Portainer with Authentik for SSO is powerful but involves multiple configuration points that can fail independently. This guide covers the most common OAuth/OIDC integration issues.

## Step 1: Verify Authentik Application and Provider Setup

In Authentik, ensure:

1. You have an **OAuth2/OpenID Connect Provider** (not a Proxy Provider)
2. The **Client Type** is set to **Confidential**
3. The **Redirect URIs** include your Portainer callback URL

The correct redirect URI for Portainer OAuth:

```text
https://portainer.example.com/
```

Note: Portainer's redirect URI is just the root URL with a trailing slash, not a `/callback` path.

## Step 2: Check Portainer OAuth Configuration

In Portainer go to **Settings > Authentication > OAuth**:

```text
Authorization URL: https://authentik.example.com/application/o/authorize/
Access Token URL:  https://authentik.example.com/application/o/token/
Resource URL:      https://authentik.example.com/application/o/userinfo/
Redirect URL:      https://portainer.example.com/
Client ID:         <from Authentik provider>
Client Secret:     <from Authentik provider>
Scopes:            openid email profile
User Identifier:   email
```

## Step 3: Check for Redirect URI Mismatch

This is the most common error. The URL in Portainer's OAuth settings must exactly match one of the Redirect URIs in Authentik:

```bash
# Check Portainer logs for OAuth errors

docker logs portainer 2>&1 | grep -i "oauth\|redirect\|token\|state"

# Error: "redirect_uri_mismatch" means the URIs do not match exactly
# Check for trailing slashes, HTTP vs HTTPS differences
```

## Step 4: Test the OIDC Endpoints Manually

```bash
# Test the authorization endpoint is reachable
curl -I https://authentik.example.com/application/o/authorize/

# Test the userinfo endpoint
curl -H "Authorization: Bearer <your-token>" \
  https://authentik.example.com/application/o/userinfo/
```

## Step 5: Verify Claim Mapping

Portainer uses a specific field from the userinfo response as the user identifier. If Portainer is set to `email`, Authentik must return an `email` claim. If it is set to `preferred_username`, Authentik must return that claim from the `profile` scope.

1. In Portainer **Settings > Authentication > OAuth**, set **User Identifier** to a claim that is actually present in the userinfo response, such as `email`, `preferred_username`, or `sub`.
2. In Authentik, verify the provider has the corresponding scope mappings selected (`email` for `email`, `profile` for `preferred_username`). If you use a custom identifier, verify your custom mapping returns that field.

## Step 6: Check Authentik Authorization Policy

Ensure the Portainer application in Authentik has a policy allowing your users:

1. In Authentik go to **Applications > Applications > Portainer > Policy/Group/User Bindings**.
2. Verify that the relevant groups, users, or policies are bound and enabled.
3. If nothing is bound, all users can access the application by default. If access is restricted, use the application's **Check Access** or **Test** action for a specific user if your Authentik version provides one.
