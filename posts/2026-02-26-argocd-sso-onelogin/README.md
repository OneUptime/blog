# How to Configure SSO with OneLogin in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, OneLogin, SSO

Description: Learn how to set up Single Sign-On with OneLogin in ArgoCD using OIDC, including role mapping and group-based access control configuration.

---

OneLogin is an enterprise identity and access management platform that provides SSO, MFA, and user provisioning. If your organization uses OneLogin as its primary identity provider, integrating it with ArgoCD allows your team to authenticate with their existing OneLogin credentials and leverage OneLogin groups for ArgoCD RBAC.

This guide covers the complete setup for connecting ArgoCD to OneLogin using OIDC.

## Overview

OneLogin supports OIDC natively, which means you can use ArgoCD's built-in OIDC support without needing Dex as an intermediary. The integration flow is:

1. User clicks "Login via OneLogin" in ArgoCD
2. ArgoCD redirects to OneLogin's authorization endpoint
3. User authenticates (with MFA if enabled)
4. OneLogin redirects back with an authorization code
5. ArgoCD exchanges the code for tokens containing user identity and groups
6. ArgoCD maps groups to RBAC roles

## Step 1: Create a OneLogin Application

1. Log into the OneLogin Admin portal
2. Navigate to **Applications > Applications**
3. Click **Add App**
4. Search for "OpenID Connect" or "OIDC"
5. Select **OpenID Connect (OIDC)** from the results
6. Configure:
   - **Display Name**: `ArgoCD`
   - **Icon**: Upload the ArgoCD logo (optional)
7. Click **Save**

## Step 2: Configure the Application

In the application settings:

### Configuration Tab
- **Login URL**: `https://argocd.example.com/auth/callback`
- **Redirect URIs**: `https://argocd.example.com/auth/callback`
- **Post Logout Redirect URI**: `https://argocd.example.com` (optional)
- **Token Endpoint Authentication Method**: POST

### SSO Tab
Note the following values:
- **Client ID**
- **Client Secret**
- **Issuer URL**: Typically `https://your-company.onelogin.com/oidc/2`

### Access Tab
Assign the application to the roles or groups that should have access to ArgoCD.

## Step 3: Configure Groups Claim

OneLogin can include group membership in the OIDC token through custom parameters:

1. In the ArgoCD application, go to the **Parameters** tab
2. Click **Add Parameter** (the + icon)
3. Configure:
   - **Field name**: `groups`
   - **Include in SAML assertion**: Check this
4. Click **Save**
5. In the parameter row, click the value field and set:
   - **Value**: Select **User Roles** or **Groups** depending on your OneLogin setup
   - **Include in Token**: Yes
6. Click **Save**

Alternatively, use OneLogin's custom claims feature:

1. Go to the **SSO** tab
2. Under **Token Claims**, add a custom claim:
   - **Claim name**: `groups`
   - **Claim value**: Select the appropriate source (e.g., User Roles)

## Step 4: Configure ArgoCD

Edit the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  oidc.config: |
    name: OneLogin
    issuer: https://your-company.onelogin.com/oidc/2
    clientID: your-onelogin-client-id
    clientSecret: $oidc.onelogin.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    requestedIDTokenClaims:
      groups:
        essential: true
```

Store the client secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "oidc.onelogin.clientSecret": "your-onelogin-client-secret"
  }
}'
```

## Step 5: Configure RBAC

Map OneLogin roles or groups to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # OneLogin role "Platform Admins" gets full admin access
    g, Platform Admins, role:admin

    # OneLogin role "Developers" gets deploy access to non-prod
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, applications, create, dev/*, allow
    g, Developers, role:developer

    # OneLogin role "QA Team" gets read-only access
    g, QA Team, role:readonly

  scopes: '[groups]'
```

## Step 6: Restart and Test

```bash
kubectl -n argocd rollout restart deployment argocd-server
```

Test the login:

```bash
# CLI login via SSO
argocd login argocd.example.com --sso

# Check user info and group membership
argocd account get-user-info
```

In the UI, click **Login via OneLogin** and verify you are redirected to OneLogin's authentication page and back to ArgoCD after successful login.

## Using OneLogin Mappings

OneLogin's mapping feature lets you dynamically assign users to roles based on attributes:

1. In the OneLogin Admin portal, go to **Mappings**
2. Create rules like:
   - If user's department is "Engineering", assign role "Developers"
   - If user's title contains "SRE" or "DevOps", assign role "Platform Admins"

These mappings automatically keep your ArgoCD access in sync with your organization's HR data.

## Using OneLogin with Dex

If you need more control over the OIDC flow or need to combine OneLogin with other identity providers, use Dex:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  dex.config: |
    connectors:
      - type: oidc
        id: onelogin
        name: OneLogin
        config:
          issuer: https://your-company.onelogin.com/oidc/2
          clientID: your-onelogin-client-id
          clientSecret: $dex.onelogin.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          scopes:
            - openid
            - profile
            - email
            - groups
          insecureSkipEmailVerified: true
          getUserInfo: true
```

When using Dex, update the callback URL in OneLogin to `https://argocd.example.com/api/dex/callback`.

## Troubleshooting

### "Invalid redirect URI" from OneLogin

Check that the redirect URI in OneLogin's application settings exactly matches what ArgoCD sends:
- For direct OIDC: `https://argocd.example.com/auth/callback`
- For Dex: `https://argocd.example.com/api/dex/callback`

### Users Can Login but Have No Permissions

1. Check that the groups claim is present in the token. You can decode the JWT token to inspect claims:
```bash
# Decode a JWT token (requires jq)
echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

2. Verify the group names in the token match exactly what you have in `policy.csv`

3. Make sure `scopes: '[groups]'` is set in `argocd-rbac-cm`

### OneLogin Returns "client_id is invalid"

Double-check the Client ID in `argocd-cm`. Also verify the issuer URL. OneLogin's OIDC issuer URL often ends with `/oidc/2` - make sure you have the correct version.

### Session Expires Too Quickly

Adjust OneLogin's session settings:
1. Go to **Settings > Session**
2. Increase the session timeout
3. Configure token lifetimes in the application's SSO settings

## Security Best Practices

1. **Enable MFA in OneLogin** - Enforce multi-factor authentication for all users who access ArgoCD
2. **Use OneLogin's risk-based authentication** - Configure adaptive MFA based on login context (location, device, etc.)
3. **Set up user provisioning** - Use OneLogin's provisioning to automatically create and deactivate user access
4. **Monitor login events** - Use OneLogin's event log to audit ArgoCD login activity
5. **Rotate client secrets** - Periodically rotate the OIDC client secret and update the ArgoCD Secret

## Summary

OneLogin integrates with ArgoCD through OIDC for single sign-on. The setup involves creating an OIDC application in OneLogin, configuring groups as a token claim, and mapping those groups to ArgoCD RBAC roles. OneLogin's mapping feature is particularly useful for automatically managing ArgoCD access based on organizational attributes.

For more on ArgoCD SSO options, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view).
