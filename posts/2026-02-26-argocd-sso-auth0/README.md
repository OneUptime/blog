# How to Configure SSO with Auth0 in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Auth0, SSO

Description: Step-by-step guide to configuring Auth0 as an OIDC identity provider for ArgoCD with organization support and role-based access control.

---

Auth0 is a flexible identity platform that supports a wide range of authentication methods, from social logins to enterprise connections. If your organization uses Auth0 for identity management, integrating it with ArgoCD gives your team seamless single sign-on for your GitOps platform.

This guide covers the complete setup for connecting ArgoCD to Auth0 using OIDC, including how to pass group or role information for RBAC.

## Auth0 Concepts for ArgoCD Integration

Before diving into the configuration, it helps to understand how Auth0 maps to ArgoCD concepts:

- **Auth0 Tenant** - Your Auth0 instance (e.g., `your-company.auth0.com`)
- **Auth0 Application** - The OAuth client that ArgoCD uses to authenticate users
- **Auth0 API** - Used for defining permissions and scopes
- **Auth0 Rules/Actions** - Custom logic that runs during authentication to add claims to tokens
- **Auth0 Organizations** - Multi-tenant isolation (useful if managing multiple ArgoCD teams)

## Step 1: Create an Auth0 Application

1. Log into the [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications > Applications**
3. Click **Create Application**
4. Configure:
   - **Name**: `ArgoCD`
   - **Type**: **Regular Web Applications**
5. Click **Create**

In the application settings:
- **Allowed Callback URLs**: `https://argocd.example.com/auth/callback`
- **Allowed Logout URLs**: `https://argocd.example.com`
- **Allowed Web Origins**: `https://argocd.example.com`

Note the following values:
- **Domain**: e.g., `your-company.auth0.com`
- **Client ID**: e.g., `abc123def456`
- **Client Secret**: e.g., `xyz789...`

Click **Save Changes**.

## Step 2: Create an Auth0 Action for Groups Claim

Auth0 does not include group or role information in tokens by default. You need to create an Action (or Rule in older Auth0 tenants) to inject this information.

### Using Auth0 Actions (Recommended)

1. Go to **Actions > Flows > Login**
2. Click **Add Action > Build Custom**
3. Name it `Add Groups to Token`
4. Add this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  // Get user's roles from Auth0
  const roles = event.authorization?.roles || [];

  // Add roles as a custom claim
  const namespace = 'https://argocd.example.com';
  api.idToken.setCustomClaim(`${namespace}/groups`, roles);
  api.accessToken.setCustomClaim(`${namespace}/groups`, roles);
};
```

5. Click **Deploy**
6. Drag the action into the Login flow and click **Apply**

### Using Auth0 Rules (Legacy)

If your Auth0 tenant still uses Rules:

```javascript
function addGroupsToToken(user, context, callback) {
  const namespace = 'https://argocd.example.com';
  const roles = (context.authorization || {}).roles || [];
  context.idToken[namespace + '/groups'] = roles;
  context.accessToken[namespace + '/groups'] = roles;
  callback(null, user, context);
}
```

## Step 3: Create Roles in Auth0

1. Go to **User Management > Roles**
2. Create roles that match your ArgoCD access levels:
   - `argocd-admin`
   - `argocd-developer`
   - `argocd-viewer`
3. Assign roles to users:
   - Go to **User Management > Users**
   - Select a user
   - Go to the **Roles** tab
   - Assign the appropriate role

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
    name: Auth0
    issuer: https://your-company.auth0.com/
    clientID: abc123def456
    clientSecret: $oidc.auth0.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
    requestedIDTokenClaims:
      https://argocd.example.com/groups:
        essential: true
```

Important: The issuer URL must include the trailing slash for Auth0.

Store the client secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "oidc.auth0.clientSecret": "your-auth0-client-secret"
  }
}'
```

## Step 5: Configure RBAC

Map Auth0 roles to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: ""
  policy.csv: |
    g, argocd-admin, role:admin
    g, argocd-developer, role:developer
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    g, argocd-viewer, role:readonly
  # Use the namespaced claim from the Auth0 Action
  scopes: '[https://argocd.example.com/groups]'
```

## Step 6: Restart and Test

```bash
kubectl -n argocd rollout restart deployment argocd-server
```

Test the login:

1. Open `https://argocd.example.com`
2. Click **Login via Auth0**
3. Authenticate through the Auth0 Universal Login page
4. Verify your access level matches your Auth0 role

## Using Auth0 Organizations

If you use Auth0 Organizations for multi-tenant isolation:

```yaml
  oidc.config: |
    name: Auth0
    issuer: https://your-company.auth0.com/
    clientID: abc123def456
    clientSecret: $oidc.auth0.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
    requestedIDTokenClaims:
      https://argocd.example.com/groups:
        essential: true
```

Auth0 Organizations allow different user groups to log into the same application with different identity providers and settings. This is useful if you run ArgoCD for multiple teams or customers.

## Using Auth0 Social Connections

Auth0 supports social login providers (GitHub, Google, etc.) as upstream identity sources. Users can log into ArgoCD through these providers via Auth0:

1. In Auth0, go to **Authentication > Social**
2. Enable the desired social connections (GitHub, Google, etc.)
3. Users will see these options on the Auth0 login page when accessing ArgoCD

The Auth0 Action will still add roles to the token regardless of which identity provider the user authenticates with.

## Troubleshooting

### "Callback URL mismatch"

Auth0 requires an exact match for callback URLs. Make sure:
- The callback URL in Auth0 is `https://argocd.example.com/auth/callback`
- The `url` in `argocd-cm` is `https://argocd.example.com` (no trailing slash)

### Groups Not Appearing in ArgoCD

1. Test the Auth0 Action by using the Auth0 Authentication API Explorer
2. Check that the Action is deployed and placed in the Login flow
3. Verify the roles are assigned to the user
4. Check ArgoCD server logs:
```bash
kubectl -n argocd logs deploy/argocd-server | grep -i "auth0\|oidc\|groups"
```

### "Unauthorized" After Login

If the user logs in but gets "unauthorized":
- Check that `scopes` in `argocd-rbac-cm` matches the claim name exactly
- Remember Auth0 requires namespaced custom claims (the `https://argocd.example.com/groups` format)

### Rate Limiting

Auth0 has rate limits on their API. If ArgoCD makes too many requests during high-traffic periods, you may see intermittent authentication failures. Consider:
- Increasing token lifetimes in Auth0 to reduce refresh frequency
- Using Auth0's paid plans for higher rate limits

## Complete Configuration

Here is the full configuration for reference:

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  oidc.config: |
    name: Auth0
    issuer: https://your-company.auth0.com/
    clientID: abc123def456
    clientSecret: $oidc.auth0.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
    requestedIDTokenClaims:
      https://argocd.example.com/groups:
        essential: true
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: ""
  policy.csv: |
    g, argocd-admin, role:admin
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    g, argocd-developer, role:developer
    g, argocd-viewer, role:readonly
  scopes: '[https://argocd.example.com/groups]'
```

## Summary

Auth0 integrates with ArgoCD through OIDC with the addition of an Auth0 Action to inject role claims into the token. The namespace requirement for custom claims is the main Auth0-specific detail you need to handle. Once configured, you get the full Auth0 feature set (social logins, MFA, branding) for your ArgoCD authentication flow.

For more on ArgoCD SSO patterns, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view).
