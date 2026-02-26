# How to Configure SSO with Zitadel in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Zitadel, SSO

Description: Learn how to set up Single Sign-On with Zitadel in ArgoCD using OIDC, including project roles, group claims, and RBAC integration for GitOps access control.

---

Zitadel is a modern, open-source identity management platform that has been gaining traction as an alternative to Keycloak and Auth0. Built with a cloud-native architecture, Zitadel offers a clean API, multi-tenancy support, and built-in OIDC compliance. If your organization uses Zitadel for identity management, integrating it with ArgoCD is straightforward thanks to Zitadel's standards-compliant OIDC implementation.

This guide walks through the complete setup for using Zitadel as the OIDC identity provider for ArgoCD.

## Why Zitadel for ArgoCD

Zitadel brings several interesting features to the table:

- **Cloud-native architecture** - Designed for Kubernetes from the ground up
- **Built-in multi-tenancy** - Organizations within a single Zitadel instance
- **OIDC compliant** - Works directly with ArgoCD's built-in OIDC support (no Dex needed)
- **Project-based role management** - Roles are scoped to projects, giving fine-grained control
- **Self-hostable** - Run it in your own infrastructure or use the cloud version
- **Actions** - Custom logic during authentication flows (similar to Auth0 Actions)

## Prerequisites

- ArgoCD v2.0+ running in Kubernetes
- A Zitadel instance (cloud or self-hosted) with admin access
- A domain configured for ArgoCD (e.g., `argocd.example.com`)

## Step 1: Create a Project in Zitadel

1. Log into your Zitadel Console
2. Navigate to **Projects**
3. Click **Create New Project**
4. Name it `ArgoCD` (or similar)
5. Click **Continue**

## Step 2: Create Roles

In the ArgoCD project, create roles that will map to ArgoCD RBAC:

1. Go to the project and click **Roles**
2. Click **New Role**
3. Create roles:
   - Key: `admin`, Display Name: `ArgoCD Admin`
   - Key: `developer`, Display Name: `ArgoCD Developer`
   - Key: `viewer`, Display Name: `ArgoCD Viewer`

## Step 3: Create an Application

1. In the ArgoCD project, click **Applications**
2. Click **New Application**
3. Configure:
   - **Name**: `ArgoCD OIDC`
   - **Type**: **Web**
4. Click **Continue**
5. Configure authentication:
   - **Authentication Method**: **CODE** (Authorization Code Flow)
6. Click **Continue**
7. Configure redirect URIs:
   - **Redirect URIs**: `https://argocd.example.com/auth/callback`
   - **Post Logout URIs**: `https://argocd.example.com` (optional)
8. Click **Create**

Note the **Client ID** from the application overview.

## Step 4: Generate Client Secret

1. In the application, go to the configuration
2. Find the **Client Secret** section
3. Click **Generate New Secret**
4. Copy the secret immediately (it will not be shown again)

## Step 5: Configure Token Claims

Zitadel can include project roles in OIDC tokens. Enable this:

1. Go to your ArgoCD project settings
2. Enable **Assert Roles on Authentication**
3. Enable **Check authorization on Authentication**

This ensures that when a user authenticates for the ArgoCD application, their project roles are included in the token.

In the application settings:

1. Go to the **Token Settings** section
2. Enable **User roles inside ID Token**
3. Enable **User Info inside ID Token**

## Step 6: Assign Roles to Users

1. Navigate to **Users** in Zitadel
2. Select a user
3. Go to **Authorizations**
4. Click **New Authorization**
5. Select the ArgoCD project
6. Select the appropriate role (admin, developer, or viewer)
7. Click **Save**

Alternatively, you can create groups and assign roles to groups, then add users to groups.

## Step 7: Configure ArgoCD

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
    name: Zitadel
    issuer: https://zitadel.example.com
    clientID: your-zitadel-client-id
    clientSecret: $oidc.zitadel.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - urn:zitadel:iam:org:project:roles
    requestedIDTokenClaims:
      urn:zitadel:iam:org:project:roles:
        essential: true
```

For Zitadel Cloud, the issuer URL is your instance URL (e.g., `https://your-instance-abc123.zitadel.cloud`).

Store the client secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "oidc.zitadel.clientSecret": "your-zitadel-client-secret"
  }
}'
```

## Step 8: Configure RBAC

Zitadel project roles appear in the token under the `urn:zitadel:iam:org:project:roles` claim. The structure is a JSON object where keys are role names. ArgoCD needs to extract these for RBAC.

Since the roles claim is structured differently from simple string arrays, you may need to configure the scopes in `argocd-rbac-cm` accordingly:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Map Zitadel project roles to ArgoCD roles
    g, admin, role:admin

    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, applications, create, dev/*, allow
    g, developer, role:developer

    g, viewer, role:readonly

  scopes: '[urn:zitadel:iam:org:project:roles]'
```

## Step 9: Restart and Test

```bash
kubectl -n argocd rollout restart deployment argocd-server
```

Test the login:

1. Open `https://argocd.example.com`
2. Click **Login via Zitadel**
3. Authenticate through Zitadel
4. Verify your access matches your assigned role

CLI test:

```bash
argocd login argocd.example.com --sso
argocd account get-user-info
```

## Using Zitadel Actions for Custom Claims

If you need to transform the token claims for ArgoCD compatibility, Zitadel Actions let you run custom JavaScript during authentication:

1. In Zitadel, go to **Actions**
2. Create a new action:

```javascript
// Action: Flatten roles for ArgoCD
function flattenRoles(ctx, api) {
  // Get project roles
  const roles = ctx.v1.claims['urn:zitadel:iam:org:project:roles'];
  if (roles) {
    // Convert role object keys to a simple array
    const roleNames = Object.keys(roles);
    api.v1.claims.setClaim('groups', roleNames);
  }
}
```

3. Attach the action to the **Pre Userinfo creation** flow

Then update ArgoCD to use the simpler `groups` claim:

```yaml
  oidc.config: |
    name: Zitadel
    issuer: https://zitadel.example.com
    clientID: your-zitadel-client-id
    clientSecret: $oidc.zitadel.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - urn:zitadel:iam:org:project:roles
```

And update RBAC:

```yaml
  scopes: '[groups]'
```

## Multi-Tenancy with Zitadel Organizations

Zitadel supports multiple organizations within a single instance. Each organization can have its own users and role assignments. This is useful if you manage ArgoCD for multiple teams or customers:

1. Create separate organizations in Zitadel for each tenant
2. Add the ArgoCD project to each organization
3. Assign roles within each organization
4. Users from different organizations can log into the same ArgoCD instance with different permissions

## Troubleshooting

### "Invalid issuer" Error

Make sure the issuer URL in ArgoCD matches Zitadel's actual issuer. Test it:

```bash
curl https://zitadel.example.com/.well-known/openid-configuration | jq .issuer
```

### Roles Not Appearing in Token

1. Verify "Assert Roles on Authentication" is enabled on the project
2. Verify "User roles inside ID Token" is enabled on the application
3. Check that the user has an authorization in the ArgoCD project
4. Include the `urn:zitadel:iam:org:project:roles` scope in `requestedScopes`

### "Unauthorized client" Error

The client ID or secret is incorrect, or the application is not active. Check the application status in Zitadel.

### Connection Issues with Self-Hosted Zitadel

If Zitadel is self-hosted with a self-signed certificate:

```bash
kubectl -n argocd create configmap argocd-tls-certs-cm \
  --from-file=zitadel.example.com=/path/to/zitadel-ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n argocd rollout restart deployment argocd-server
```

## Summary

Zitadel works well with ArgoCD through OIDC. Its project-based role system maps naturally to ArgoCD's access model, and its standards compliance means you can use ArgoCD's built-in OIDC support without Dex. Zitadel Actions provide flexibility for customizing token claims when needed. If you are looking for a modern, open-source identity provider that is designed for cloud-native environments, Zitadel is worth considering.

For more on ArgoCD SSO configuration, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view).
