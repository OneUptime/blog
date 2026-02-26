# How to Configure SSO with Keycloak in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Keycloak, SSO

Description: A detailed guide to integrating Keycloak with ArgoCD for Single Sign-On, covering realm setup, client configuration, group mappers, and RBAC integration.

---

Keycloak is a popular open-source identity and access management solution that many organizations self-host for authentication and authorization. If your infrastructure already uses Keycloak, integrating it with ArgoCD gives your team a unified login experience across all internal tools.

This guide walks through the full Keycloak-to-ArgoCD integration using OIDC, including realm configuration, client setup, group mappers, and RBAC configuration.

## Why Keycloak with ArgoCD

Keycloak offers several advantages as an identity provider for ArgoCD:

- Self-hosted and fully under your control
- Supports user federation with LDAP, Active Directory, and external identity providers
- Fine-grained group and role management
- Protocol mappers for customizing token claims
- Built-in admin console for managing users and groups

Since Keycloak natively supports OIDC, you can use ArgoCD's built-in OIDC support directly without needing Dex as an intermediary.

## Prerequisites

- ArgoCD v2.0+ running in Kubernetes
- Keycloak v18+ (or the legacy WildFly-based version) accessible from ArgoCD
- Admin access to Keycloak
- A DNS name and TLS certificate for both ArgoCD and Keycloak

## Step 1: Create a Keycloak Realm

If you do not already have a realm for your organization, create one:

1. Log into the Keycloak Admin Console
2. Click the dropdown in the top-left and select **Create realm**
3. Set the realm name (e.g., `platform`)
4. Click **Create**

If you already have a realm, skip this step and use your existing one.

## Step 2: Create Groups in Keycloak

Create groups that will map to ArgoCD roles:

1. In the realm, go to **Groups**
2. Create groups such as:
   - `argocd-admins`
   - `argocd-developers`
   - `argocd-viewers`
3. Assign users to these groups

## Step 3: Create a Client for ArgoCD

1. Go to **Clients** and click **Create client**
2. Configure:
   - **Client type**: OpenID Connect
   - **Client ID**: `argocd`
3. Click **Next**
4. Configure capability:
   - **Client authentication**: On (this makes it a confidential client)
   - **Authorization**: Off
   - **Authentication flow**: Check **Standard flow** (Authorization Code Flow)
5. Click **Next**
6. Configure login settings:
   - **Root URL**: `https://argocd.example.com`
   - **Valid redirect URIs**: `https://argocd.example.com/auth/callback`
   - **Valid post logout redirect URIs**: `https://argocd.example.com`
   - **Web origins**: `https://argocd.example.com`
7. Click **Save**

## Step 4: Get the Client Secret

1. In the client settings, go to the **Credentials** tab
2. Copy the **Client secret**

## Step 5: Configure a Groups Protocol Mapper

By default, Keycloak does not include group membership in the ID token. You need to add a protocol mapper:

1. In the ArgoCD client, go to the **Client scopes** tab
2. Click on `argocd-dedicated` (the dedicated scope for this client)
3. Click **Add mapper > By configuration**
4. Select **Group Membership**
5. Configure:
   - **Name**: `groups`
   - **Token Claim Name**: `groups`
   - **Full group path**: Off (recommended - gives just the group name, not the full path)
   - **Add to ID token**: On
   - **Add to access token**: On
   - **Add to userinfo**: On
6. Click **Save**

## Step 6: Configure ArgoCD

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
    name: Keycloak
    issuer: https://keycloak.example.com/realms/platform
    clientID: argocd
    clientSecret: $oidc.keycloak.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    requestedIDTokenClaims:
      groups:
        essential: true
```

Note: If you are using Keycloak before v18 (WildFly-based), the issuer URL format is different:

```
issuer: https://keycloak.example.com/auth/realms/platform
```

Store the client secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "oidc.keycloak.clientSecret": "your-keycloak-client-secret"
  }
}'
```

## Step 7: Configure RBAC

Map Keycloak groups to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Keycloak group "argocd-admins" gets full admin access
    g, argocd-admins, role:admin

    # Keycloak group "argocd-developers" gets deploy access to non-prod
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, create, dev/*, allow
    p, role:developer, applications, delete, dev/*, allow
    g, argocd-developers, role:developer

    # Keycloak group "argocd-viewers" gets read-only access
    g, argocd-viewers, role:readonly

  scopes: '[groups]'
```

## Step 8: Restart and Test

```bash
kubectl -n argocd rollout restart deployment argocd-server
```

Test the login:

1. Open ArgoCD at `https://argocd.example.com`
2. Click **Login via Keycloak**
3. Authenticate with your Keycloak credentials
4. Verify access based on your group membership

CLI test:

```bash
argocd login argocd.example.com --sso
argocd account get-user-info
```

## Advanced Configuration

### Using Keycloak Roles Instead of Groups

If you prefer using Keycloak client roles instead of groups:

1. In the ArgoCD client, go to **Roles**
2. Create roles like `admin`, `developer`, `viewer`
3. Assign roles to users
4. Create a protocol mapper of type **User Client Role** instead of Group Membership:
   - **Name**: `client-roles`
   - **Client ID**: `argocd`
   - **Token Claim Name**: `roles`
   - **Add to ID token**: On

Update ArgoCD RBAC to use the roles claim:

```yaml
data:
  policy.csv: |
    g, admin, role:admin
    g, developer, role:developer
  scopes: '[roles]'
```

### Integrating Keycloak with External Identity Providers

Keycloak can federate with external identity providers, making it a broker between ArgoCD and sources like:

- Corporate LDAP/Active Directory
- GitHub
- Google
- SAML providers

To add an external identity provider:

1. In Keycloak, go to **Identity Providers**
2. Select the provider type (e.g., LDAP, GitHub, SAML)
3. Configure the connection
4. Map external attributes to Keycloak groups

This way, ArgoCD only needs to know about Keycloak, and Keycloak handles the complexity of multiple identity sources.

### Logout Configuration

To enable proper logout (clear both ArgoCD and Keycloak sessions):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  oidc.config: |
    name: Keycloak
    issuer: https://keycloak.example.com/realms/platform
    clientID: argocd
    clientSecret: $oidc.keycloak.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
    logoutURL: https://keycloak.example.com/realms/platform/protocol/openid-connect/logout?post_logout_redirect_uri=https://argocd.example.com&client_id=argocd
```

## Troubleshooting

### "Invalid redirect URI" from Keycloak

The redirect URI in ArgoCD's request does not match the allowed redirect URIs in the Keycloak client. Check:
- `Valid redirect URIs` in the Keycloak client includes `https://argocd.example.com/auth/callback`
- The `url` in `argocd-cm` matches the ArgoCD external URL exactly

### Groups Missing from Token

If users can log in but groups are not being passed:

1. Verify the protocol mapper is configured correctly
2. Test the token by navigating to:
   ```
   https://keycloak.example.com/realms/platform/protocol/openid-connect/userinfo
   ```
   with a Bearer token
3. Use the Keycloak **Evaluate** tool in the client settings to preview token content

### "Certificate signed by unknown authority"

If Keycloak uses a self-signed certificate:

```bash
kubectl -n argocd create configmap argocd-tls-certs-cm \
  --from-file=keycloak.example.com=/path/to/keycloak-ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n argocd rollout restart deployment argocd-server
```

### Session Timeout Issues

Configure Keycloak session timeouts to match your needs:

1. In the realm settings, go to **Sessions**
2. Adjust:
   - **SSO Session Idle**: How long before an idle session expires
   - **SSO Session Max**: Maximum session lifetime
   - **Access Token Lifespan**: How long access tokens are valid

## Summary

Keycloak and ArgoCD integrate cleanly through OIDC. The key steps are creating a confidential client, adding a groups protocol mapper, and mapping those groups to ArgoCD RBAC roles. Keycloak's ability to federate with LDAP, Active Directory, and other identity providers makes it an excellent choice when you need a centralized identity management layer for your GitOps platform.

For more on ArgoCD authentication patterns, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view) and [How to Implement ArgoCD SSO with Dex](https://oneuptime.com/blog/post/2026-02-02-argocd-sso-dex/view).
