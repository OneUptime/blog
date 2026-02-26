# How to Configure SSO with Okta in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Okta, SSO

Description: A step-by-step guide to configuring Single Sign-On with Okta in ArgoCD using OIDC, including group mapping and RBAC integration.

---

Okta is one of the most commonly used identity providers in enterprise environments. Integrating Okta SSO with ArgoCD lets your team log in using their existing Okta credentials, enforce multi-factor authentication, and map Okta groups to ArgoCD roles for fine-grained access control.

This guide walks through the complete setup process for connecting ArgoCD to Okta using OIDC (OpenID Connect), which is the recommended approach.

## Why OIDC Over SAML for ArgoCD

ArgoCD supports SSO through two paths: built-in OIDC support and Dex (an embedded identity broker). For Okta specifically, using ArgoCD's built-in OIDC support is the simplest path because Okta natively supports OIDC.

Using Dex as a middleman adds complexity without much benefit when the identity provider already speaks OIDC. Save Dex for providers that only support LDAP or SAML.

## Step 1: Create an Okta Application

Log into the Okta Admin Console and create a new application:

1. Navigate to **Applications > Applications**
2. Click **Create App Integration**
3. Select **OIDC - OpenID Connect**
4. Select **Web Application** as the application type
5. Click **Next**

Configure the application:

- **App integration name**: `ArgoCD`
- **Grant type**: Check **Authorization Code** (required) and **Refresh Token** (optional but recommended)
- **Sign-in redirect URIs**: `https://argocd.example.com/auth/callback`
- **Sign-out redirect URIs**: `https://argocd.example.com` (optional)
- **Controlled access**: Assign to the groups or users who should have ArgoCD access

Click **Save** and note the following values:
- **Client ID** (e.g., `0oa1bcde2fghij3klmn4`)
- **Client Secret** (e.g., `ABcDeFgHiJkLmNoPqRsTuVwXyZ0123456789`)

## Step 2: Configure Okta Groups Claim

By default, Okta does not include group membership in the OIDC token. You need to configure it.

### Option A: Using the Default Authorization Server

1. Navigate to **Security > API > Authorization Servers**
2. Select the **default** authorization server
3. Go to the **Claims** tab
4. Click **Add Claim**
5. Configure:
   - **Name**: `groups`
   - **Include in token type**: **ID Token** and **Always**
   - **Value type**: **Groups**
   - **Filter**: **Matches regex** with value `.*` (includes all groups)
   - **Include in**: Select **The following scopes** and add `openid`
6. Click **Create**

### Option B: Using a Custom Authorization Server

If you use a custom authorization server (common in production Okta setups):

1. Navigate to **Security > API > Authorization Servers**
2. Select your custom authorization server
3. Add the same claim as above
4. Note the **Issuer URI** (e.g., `https://your-org.okta.com/oauth2/aus1bcde2fghij3klmn4`)

## Step 3: Configure ArgoCD for Okta OIDC

Edit the `argocd-cm` ConfigMap to add the OIDC configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  oidc.config: |
    name: Okta
    issuer: https://your-org.okta.com
    clientID: 0oa1bcde2fghij3klmn4
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    requestedIDTokenClaims:
      groups:
        essential: true
```

If you are using a custom authorization server, change the issuer URL:

```yaml
  oidc.config: |
    name: Okta
    issuer: https://your-org.okta.com/oauth2/aus1bcde2fghij3klmn4
    clientID: 0oa1bcde2fghij3klmn4
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
```

## Step 4: Store the Client Secret

Store the Okta client secret in the `argocd-secret` Secret:

```bash
# Patch the argocd-secret with the Okta client secret
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "oidc.okta.clientSecret": "ABcDeFgHiJkLmNoPqRsTuVwXyZ0123456789"
  }
}'
```

The `$oidc.okta.clientSecret` reference in the ConfigMap tells ArgoCD to look up the value from the `argocd-secret`.

## Step 5: Configure RBAC with Okta Groups

Now map Okta groups to ArgoCD roles. Edit the `argocd-rbac-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Default policy for authenticated users
  policy.default: role:readonly

  # Map Okta groups to ArgoCD roles
  policy.csv: |
    # Okta group "argocd-admins" gets full admin access
    g, argocd-admins, role:admin

    # Okta group "platform-team" gets admin access
    g, platform-team, role:admin

    # Okta group "developers" gets read-only access to production
    # and full access to staging
    p, role:developer, applications, get, staging/*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, create, staging/*, allow
    p, role:developer, applications, delete, staging/*, allow
    p, role:developer, applications, get, production/*, allow
    g, developers, role:developer

    # Okta group "qa-team" gets read-only access
    g, qa-team, role:readonly

  # Specify which OIDC claim contains the groups
  scopes: '[groups]'
```

## Step 6: Restart ArgoCD Components

After making configuration changes, restart the ArgoCD server:

```bash
kubectl -n argocd rollout restart deployment argocd-server
```

## Step 7: Test the Login

1. Open the ArgoCD UI at `https://argocd.example.com`
2. You should see a **Login via Okta** button
3. Click it and authenticate through Okta
4. After successful authentication, you should be redirected back to ArgoCD

Test with the CLI:

```bash
# Login via SSO
argocd login argocd.example.com --sso

# Check your account info
argocd account get-user-info
```

## Troubleshooting

### "Login Failed" After Okta Authentication

If you get redirected back to ArgoCD with an error after successfully authenticating with Okta:

1. Check the ArgoCD server logs:
```bash
kubectl -n argocd logs deploy/argocd-server | grep -i "oidc\|okta\|auth"
```

2. Common causes:
   - **Wrong callback URL** - The redirect URI in Okta must exactly match `https://argocd.example.com/auth/callback`
   - **Wrong issuer URL** - Make sure it matches exactly (with or without the custom authorization server path)
   - **Client secret mismatch** - Verify the secret is stored correctly

### Groups Not Showing Up

If users can log in but group-based RBAC is not working:

1. Check what claims are in the token:
```bash
# After logging in via CLI, check the stored token
argocd account get-user-info
```

2. Verify the groups claim is configured in Okta (Step 2)

3. Make sure `requestedScopes` includes `groups` in the ArgoCD ConfigMap

4. Check that `scopes: '[groups]'` is set in `argocd-rbac-cm`

### "Invalid redirect URI" from Okta

The redirect URI configured in ArgoCD does not match what Okta expects. Check:

- The `url` in `argocd-cm` must match the ArgoCD external URL
- The redirect URI in Okta must be `<argocd-url>/auth/callback`
- Make sure there is no trailing slash mismatch

### PKCE Errors

If you see PKCE-related errors, enable PKCE in the OIDC configuration:

```yaml
  oidc.config: |
    name: Okta
    issuer: https://your-org.okta.com
    clientID: 0oa1bcde2fghij3klmn4
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    enablePKCEAuthentication: true
```

## Disabling the Admin Account

Once SSO is working, consider disabling the local admin account for security:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  admin.enabled: "false"
```

Keep at least one Okta group mapped to the admin role before doing this.

## Complete Configuration Example

Here is the full set of ConfigMaps for a production Okta SSO setup:

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  admin.enabled: "false"
  oidc.config: |
    name: Okta
    issuer: https://your-org.okta.com
    clientID: 0oa1bcde2fghij3klmn4
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    requestedIDTokenClaims:
      groups:
        essential: true
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    g, argocd-admins, role:admin
    g, platform-team, role:admin
    p, role:developer, applications, *, staging/*, allow
    p, role:developer, applications, get, production/*, allow
    g, developers, role:developer
  scopes: '[groups]'
```

## Summary

Configuring Okta SSO with ArgoCD is straightforward when using the built-in OIDC support. The key steps are creating an Okta application, configuring the groups claim, updating ArgoCD's ConfigMaps, and mapping Okta groups to ArgoCD RBAC roles. This setup gives you centralized authentication, MFA enforcement, and group-based access control for your GitOps platform.

For more on ArgoCD SSO concepts, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view) and [How to Implement ArgoCD SSO with Dex](https://oneuptime.com/blog/post/2026-02-02-argocd-sso-dex/view).
