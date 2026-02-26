# How to Configure SSO with Google Workspace in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Google Workspace, SSO

Description: Learn how to set up Single Sign-On with Google Workspace in ArgoCD using OIDC, including Google Groups mapping for role-based access control.

---

Google Workspace (formerly G Suite) is used by many organizations as their primary identity provider. When your team uses Google accounts for everything from Gmail to Google Cloud, it makes sense to use those same accounts for ArgoCD authentication. This eliminates yet another set of credentials for your developers to manage.

This guide covers how to configure ArgoCD to use Google Workspace as an OIDC identity provider, including how to map Google Groups to ArgoCD RBAC roles.

## The Challenge with Google Groups

Google's OIDC implementation does not include group membership in the ID token by default. Unlike Okta or Azure AD, you cannot simply add a "groups" scope and get group information back. This is a common stumbling block when configuring Google SSO with ArgoCD.

There are two ways to handle this:

1. **Use Dex with the Google connector** - Dex can use the Google Admin SDK to fetch group memberships (recommended)
2. **Use ArgoCD's built-in OIDC without groups** - Simpler but you lose group-based RBAC

This guide covers both approaches.

## Method 1: Google OIDC with Dex (Recommended)

Using Dex as an intermediary gives you access to Google Groups through the Admin SDK.

### Step 1: Create OAuth Credentials in Google Cloud

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Name**: `ArgoCD Dex`
   - **Authorized redirect URIs**: `https://argocd.example.com/api/dex/callback`
7. Click **Create**
8. Note the **Client ID** and **Client Secret**

### Step 2: Create a Service Account for Google Admin SDK

To fetch Google Groups, Dex needs a service account with domain-wide delegation:

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Configure:
   - **Name**: `argocd-dex-groups`
   - **ID**: `argocd-dex-groups`
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**
6. Click on the newly created service account
7. Go to the **Keys** tab
8. Click **Add Key > Create new key > JSON**
9. Save the downloaded JSON file

### Step 3: Enable Domain-Wide Delegation

1. In the service account details, click **Show advanced settings**
2. Under **Domain-wide delegation**, click **Enable Google Workspace Domain-wide Delegation**
3. Note the **Client ID** (numeric) of the service account

### Step 4: Authorize the Service Account in Google Admin

1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Security > API Controls > Manage Domain-wide Delegation**
3. Click **Add new**
4. Enter:
   - **Client ID**: The numeric ID from Step 3
   - **OAuth scopes**: `https://www.googleapis.com/auth/admin.directory.group.readonly`
5. Click **Authorize**

### Step 5: Enable the Admin SDK API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Admin SDK API"
3. Click **Enable**

### Step 6: Configure Dex in ArgoCD

Create a Kubernetes Secret with the service account key:

```bash
kubectl -n argocd create secret generic dex-google-groups \
  --from-file=googleAuth.json=/path/to/service-account-key.json
```

Mount it in the Dex server. If using Helm to install ArgoCD:

```yaml
# values.yaml for ArgoCD Helm chart
dex:
  volumes:
    - name: google-groups
      secret:
        secretName: dex-google-groups
  volumeMounts:
    - name: google-groups
      mountPath: /tmp/google
      readOnly: true
```

If managing ArgoCD with kubectl, patch the Dex deployment:

```bash
kubectl -n argocd patch deployment argocd-dex-server --type json -p '[
  {
    "op": "add",
    "path": "/spec/template/spec/volumes/-",
    "value": {
      "name": "google-groups",
      "secret": {
        "secretName": "dex-google-groups"
      }
    }
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/volumeMounts/-",
    "value": {
      "name": "google-groups",
      "mountPath": "/tmp/google",
      "readOnly": true
    }
  }
]'
```

Configure the Dex connector in `argocd-cm`:

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
      - type: google
        id: google
        name: Google
        config:
          clientID: your-oauth-client-id.apps.googleusercontent.com
          clientSecret: $dex.google.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          hostedDomains:
            - example.com
          # Service account for fetching Google Groups
          serviceAccountFilePath: /tmp/google/googleAuth.json
          # A Google Workspace admin email (required for domain-wide delegation)
          adminEmail: admin@example.com
          # Fetch group membership
          fetchTransitiveGroupMembership: true
```

Store the client secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "dex.google.clientSecret": "your-client-secret"
  }
}'
```

### Step 7: Configure RBAC

Map Google Groups to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Google Group "platform-admins@example.com" gets admin access
    g, platform-admins@example.com, role:admin

    # Google Group "developers@example.com" gets limited access
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    g, developers@example.com, role:developer

    # Google Group "sre@example.com" gets admin access
    g, sre@example.com, role:admin

  scopes: '[groups, email]'
```

## Method 2: Google OIDC Without Groups (Simple)

If you do not need group-based RBAC and are fine with per-user role assignments, use ArgoCD's built-in OIDC support directly.

### Step 1: Create OAuth Credentials

Same as Method 1, Step 1, but use this redirect URI:

```
https://argocd.example.com/auth/callback
```

### Step 2: Configure ArgoCD

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  oidc.config: |
    name: Google
    issuer: https://accounts.google.com
    clientID: your-oauth-client-id.apps.googleusercontent.com
    clientSecret: $oidc.google.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
```

Store the secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "oidc.google.clientSecret": "your-client-secret"
  }
}'
```

### Step 3: Configure RBAC by Email

Without groups, assign roles by individual email:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: ""
  policy.csv: |
    g, alice@example.com, role:admin
    g, bob@example.com, role:admin
    g, carol@example.com, role:readonly
  scopes: '[email]'
```

This approach does not scale well for large teams, which is why Method 1 with Dex is recommended.

## Restricting to Your Domain

Both methods allow you to restrict login to specific Google Workspace domains. With Dex, use the `hostedDomains` setting. With direct OIDC, Google handles this through the OAuth consent screen configuration in Google Cloud Console.

For extra safety, add domain validation in ArgoCD:

```yaml
  oidc.config: |
    name: Google
    issuer: https://accounts.google.com
    clientID: your-client-id
    clientSecret: $oidc.google.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
    allowedAudiences:
      - your-client-id
```

## Troubleshooting

### "Access blocked: ArgoCD has not completed the Google verification process"

For internal apps, go to **APIs & Services > OAuth consent screen** and set the user type to **Internal**. This restricts the app to your Google Workspace domain and skips the verification requirement.

### Groups Not Appearing in ArgoCD

If using Dex with Google Groups:
1. Verify the service account has domain-wide delegation enabled
2. Verify the Admin SDK API is enabled in your Google Cloud project
3. Verify the admin email is a real Google Workspace admin account
4. Check Dex logs for errors:
```bash
kubectl -n argocd logs deploy/argocd-dex-server
```

### "Invalid redirect URI" Error

Make sure the redirect URI matches exactly:
- For Dex: `https://argocd.example.com/api/dex/callback`
- For direct OIDC: `https://argocd.example.com/auth/callback`

### MFA Not Being Enforced

Google Workspace MFA policies are enforced at the Google level, not the ArgoCD level. If MFA is enabled in your Google Workspace admin settings, it will be required when users authenticate through ArgoCD SSO.

## Summary

Google Workspace SSO with ArgoCD works best through Dex when you need group-based access control. The Dex Google connector uses the Admin SDK to fetch group memberships, which Google's standard OIDC flow does not provide. For simpler setups without group-based RBAC, direct OIDC works fine and is easier to configure.

For general ArgoCD SSO information, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view).
