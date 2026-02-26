# How to Configure SSO with GitLab OAuth in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitLab, SSO

Description: Complete guide to setting up GitLab OAuth for ArgoCD single sign-on using Dex, including group mapping and self-hosted GitLab support.

---

GitLab is a popular DevOps platform that combines source code management, CI/CD, and project management in a single tool. If your team uses GitLab for hosting Git repositories that ArgoCD deploys from, configuring GitLab OAuth for ArgoCD authentication creates a unified experience where the same identity governs both code access and deployment access.

This guide covers GitLab OAuth integration with ArgoCD using Dex, for both GitLab.com and self-hosted GitLab instances.

## Why Use Dex for GitLab

While GitLab supports OIDC, Dex has a dedicated GitLab connector that provides better group mapping support. Dex can map GitLab groups and subgroups directly to ArgoCD RBAC roles, which is the key feature for access control.

You can use ArgoCD's built-in OIDC for simple setups, but Dex is recommended when you need group-based access control.

## Step 1: Create a GitLab OAuth Application

### For GitLab.com (SaaS)

1. Log into GitLab.com
2. For group-level applications (recommended):
   - Go to your group settings: **Settings > Applications**
3. For instance-level applications (admin only):
   - Go to **Admin Area > Applications**
4. Click **New application**
5. Configure:
   - **Name**: `ArgoCD`
   - **Redirect URI**: `https://argocd.example.com/api/dex/callback`
   - **Confidential**: Yes
   - **Scopes**: Select `openid`, `profile`, `email`, `read_user`
6. Click **Save application**

Note the **Application ID** (Client ID) and **Secret** (Client Secret).

### For Self-Hosted GitLab

The steps are the same, but you navigate to your GitLab instance's admin area. The URLs will use your self-hosted domain.

## Step 2: Configure Dex with GitLab Connector

Edit the `argocd-cm` ConfigMap:

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
      - type: gitlab
        id: gitlab
        name: GitLab
        config:
          clientID: your-gitlab-application-id
          clientSecret: $dex.gitlab.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          # For GitLab.com (default)
          baseURL: https://gitlab.com
          # Optional: restrict to specific GitLab groups
          groups:
            - my-organization
            - my-organization/platform-team
          # Use the full group path for subgroups
          useLoginAsID: true
```

For self-hosted GitLab:

```yaml
  dex.config: |
    connectors:
      - type: gitlab
        id: gitlab
        name: GitLab
        config:
          clientID: your-gitlab-application-id
          clientSecret: $dex.gitlab.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          baseURL: https://gitlab.internal.example.com
          groups:
            - my-organization
```

Store the client secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "dex.gitlab.clientSecret": "your-gitlab-client-secret"
  }
}'
```

## Step 3: Configure RBAC with GitLab Groups

GitLab groups are passed to ArgoCD in the format used in the `groups` configuration. Map them to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # GitLab group "my-organization/platform-team" gets admin access
    g, my-organization/platform-team, role:admin

    # GitLab group "my-organization/sre" gets admin access
    g, my-organization/sre, role:admin

    # GitLab group "my-organization/backend" gets deploy access
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    g, my-organization/backend, role:developer

    # GitLab group "my-organization/frontend" gets deploy access
    g, my-organization/frontend, role:developer

    # Top-level organization group gets read-only (catch-all)
    g, my-organization, role:readonly

  scopes: '[groups]'
```

## Step 4: Restart and Test

```bash
kubectl -n argocd rollout restart deployment argocd-server
kubectl -n argocd rollout restart deployment argocd-dex-server
```

Test the login:

1. Open `https://argocd.example.com`
2. Click **Login via GitLab**
3. Authorize the application in GitLab
4. Verify you are redirected back to ArgoCD with the correct access level

## Alternative: Using ArgoCD Built-in OIDC

If you do not need group mapping and prefer a simpler setup, you can use GitLab's OIDC directly with ArgoCD:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  oidc.config: |
    name: GitLab
    issuer: https://gitlab.com
    clientID: your-gitlab-application-id
    clientSecret: $oidc.gitlab.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
```

For self-hosted GitLab:

```yaml
  oidc.config: |
    name: GitLab
    issuer: https://gitlab.internal.example.com
    clientID: your-gitlab-application-id
    clientSecret: $oidc.gitlab.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
```

When using direct OIDC, the callback URL changes to `https://argocd.example.com/auth/callback`. Update the GitLab application accordingly.

With this approach, you can still assign permissions by email:

```yaml
  policy.csv: |
    g, alice@example.com, role:admin
    g, bob@example.com, role:developer
  scopes: '[email]'
```

## Self-Hosted GitLab with Self-Signed Certificates

If your self-hosted GitLab uses a self-signed certificate, configure both ArgoCD and Dex to trust it:

```bash
# Add GitLab's CA to ArgoCD's trust store
kubectl -n argocd create configmap argocd-tls-certs-cm \
  --from-file=gitlab.internal.example.com=/path/to/gitlab-ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -
```

For Dex, mount the CA certificate:

```yaml
# In the Dex deployment, mount the CA cert
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-dex-server
  namespace: argocd
spec:
  template:
    spec:
      volumes:
        - name: gitlab-ca
          configMap:
            name: gitlab-tls-ca
      containers:
        - name: dex
          volumeMounts:
            - name: gitlab-ca
              mountPath: /etc/ssl/certs/gitlab-ca.crt
              subPath: ca.crt
              readOnly: true
```

And reference it in the Dex config:

```yaml
  dex.config: |
    connectors:
      - type: gitlab
        id: gitlab
        name: GitLab
        config:
          clientID: your-gitlab-application-id
          clientSecret: $dex.gitlab.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          baseURL: https://gitlab.internal.example.com
          # Path to the CA certificate inside the Dex container
          rootCA: /etc/ssl/certs/gitlab-ca.crt
```

## GitLab Subgroups

GitLab supports nested groups (subgroups). Dex handles these using the full group path:

```yaml
# GitLab group structure:
# my-organization/
#   platform/
#     core-infra
#     networking
#   engineering/
#     backend
#     frontend

  dex.config: |
    connectors:
      - type: gitlab
        id: gitlab
        name: GitLab
        config:
          clientID: your-client-id
          clientSecret: $dex.gitlab.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          baseURL: https://gitlab.com
          groups:
            - my-organization/platform/core-infra
            - my-organization/platform/networking
            - my-organization/engineering/backend
            - my-organization/engineering/frontend
```

Map subgroups to roles:

```yaml
  policy.csv: |
    g, my-organization/platform/core-infra, role:admin
    g, my-organization/platform/networking, role:admin
    g, my-organization/engineering/backend, role:developer
    g, my-organization/engineering/frontend, role:developer
```

## Troubleshooting

### "Redirect URI mismatch"

GitLab requires an exact match for redirect URIs. Check:
- Dex callback: `https://argocd.example.com/api/dex/callback`
- OIDC callback: `https://argocd.example.com/auth/callback`

### "Could not find connector"

If you see this error in the Dex logs, the connector configuration is malformed. Check the YAML indentation in `argocd-cm`.

### Groups Not Working

1. Verify the user is a member of the GitLab groups listed in the Dex configuration
2. Check Dex logs for group-related messages:
```bash
kubectl -n argocd logs deploy/argocd-dex-server | grep -i group
```
3. Make sure the OAuth application has the `read_user` scope

### Self-Hosted GitLab Connection Errors

If ArgoCD or Dex cannot reach your self-hosted GitLab:

```bash
# Test connectivity from Dex pod
kubectl -n argocd exec -it deploy/argocd-dex-server -- \
  wget -qO- https://gitlab.internal.example.com/.well-known/openid-configuration
```

## Summary

GitLab OAuth integration with ArgoCD works best through Dex when you need group-based access control. The Dex GitLab connector maps GitLab groups and subgroups to ArgoCD RBAC roles, allowing you to control deployment access based on your existing GitLab organizational structure. For simpler setups, GitLab's native OIDC support works directly with ArgoCD's built-in OIDC.

For more on ArgoCD SSO, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view).
