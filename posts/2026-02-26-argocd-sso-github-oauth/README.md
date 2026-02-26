# How to Configure SSO with GitHub OAuth in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitHub, SSO

Description: Learn how to configure GitHub OAuth for ArgoCD single sign-on using Dex, including organization and team-based access control for your GitOps workflows.

---

GitHub OAuth is a natural choice for ArgoCD authentication, especially when your team already uses GitHub for source code management. Since ArgoCD syncs applications from Git repositories, having the same identity provider for both code access and deployment access simplifies your security model.

This guide covers how to configure GitHub OAuth with ArgoCD using Dex, including restricting access by GitHub organization and mapping GitHub teams to ArgoCD RBAC roles.

## Why Dex for GitHub OAuth

ArgoCD's built-in OIDC support works with standard OIDC providers, but GitHub's OAuth implementation is not fully OIDC-compliant. Specifically, GitHub does not provide a standard OIDC discovery endpoint or issue proper ID tokens. Dex, which is bundled with ArgoCD, has a purpose-built GitHub connector that handles these differences.

## Step 1: Create a GitHub OAuth Application

### For GitHub.com

1. Go to your GitHub organization's settings (or your personal settings)
2. Navigate to **Settings > Developer settings > OAuth Apps**
3. Click **New OAuth App**
4. Configure:
   - **Application name**: `ArgoCD`
   - **Homepage URL**: `https://argocd.example.com`
   - **Authorization callback URL**: `https://argocd.example.com/api/dex/callback`
5. Click **Register application**

Note the **Client ID**. Click **Generate a new client secret** and copy it immediately.

### For GitHub Enterprise

1. Go to your GitHub Enterprise instance
2. Navigate to **Site admin > Developer settings > OAuth Apps** (or organization settings)
3. Follow the same steps, but use your GitHub Enterprise URLs

## Step 2: Configure Dex in ArgoCD

Edit the `argocd-cm` ConfigMap to configure the Dex GitHub connector:

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
      - type: github
        id: github
        name: GitHub
        config:
          clientID: your-github-client-id
          clientSecret: $dex.github.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          # Restrict to specific GitHub organizations
          orgs:
            - name: your-organization
          # Load all teams for RBAC mapping
          loadAllGroups: true
          # Use login name for user identification
          useLoginAsID: true
```

Store the client secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "dex.github.clientSecret": "your-github-client-secret"
  }
}'
```

## Step 3: Restrict Access by Organization

The `orgs` configuration limits who can log in. Only members of the specified organizations will be allowed:

```yaml
  dex.config: |
    connectors:
      - type: github
        id: github
        name: GitHub
        config:
          clientID: your-github-client-id
          clientSecret: $dex.github.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          orgs:
            - name: your-organization
            - name: partner-organization
```

To further restrict by specific teams within an organization:

```yaml
          orgs:
            - name: your-organization
              teams:
                - platform-team
                - backend-team
                - sre-team
```

This means only members of those specific teams in `your-organization` can log in. Users who are organization members but not in any listed team will be denied.

## Step 4: Configure RBAC with GitHub Teams

GitHub teams are passed as groups in the format `org-name:team-name`. Map them to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # GitHub team "your-organization:platform-team" gets admin access
    g, your-organization:platform-team, role:admin

    # GitHub team "your-organization:sre-team" gets admin access
    g, your-organization:sre-team, role:admin

    # GitHub team "your-organization:backend-team" gets deploy access
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, applications, create, dev/*, allow
    g, your-organization:backend-team, role:developer

    # GitHub team "your-organization:qa-team" gets read-only
    g, your-organization:qa-team, role:readonly

  scopes: '[groups]'
```

## Step 5: Restart and Test

```bash
kubectl -n argocd rollout restart deployment argocd-server
kubectl -n argocd rollout restart deployment argocd-dex-server
```

Test the login:

1. Open `https://argocd.example.com`
2. Click **Login via GitHub**
3. Authorize the ArgoCD OAuth app when prompted by GitHub
4. Verify you are redirected back to ArgoCD with the correct access level

CLI test:

```bash
argocd login argocd.example.com --sso
argocd account get-user-info
```

## GitHub Enterprise Configuration

For GitHub Enterprise Server, add the enterprise URLs to the Dex configuration:

```yaml
  dex.config: |
    connectors:
      - type: github
        id: github
        name: GitHub Enterprise
        config:
          clientID: your-client-id
          clientSecret: $dex.github.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          orgs:
            - name: your-organization
          # GitHub Enterprise endpoints
          hostName: github.enterprise.example.com
          # For GitHub Enterprise with self-signed certificates
          rootCA: /etc/dex/tls/github-ca.crt
```

If your GitHub Enterprise uses a self-signed certificate, mount the CA certificate into the Dex container:

```yaml
# Patch the Dex deployment to mount the CA cert
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-dex-server
  namespace: argocd
spec:
  template:
    spec:
      volumes:
        - name: github-ca
          configMap:
            name: github-enterprise-ca
      containers:
        - name: dex
          volumeMounts:
            - name: github-ca
              mountPath: /etc/dex/tls
              readOnly: true
```

## Using Individual User Access

If you want to grant access to specific GitHub users regardless of team membership:

```yaml
  policy.csv: |
    # Team-based access
    g, your-organization:platform-team, role:admin

    # Individual user access (use GitHub username)
    g, octocat, role:admin
    g, developer-jane, role:developer
```

## Multiple GitHub Organizations

You can allow users from multiple organizations:

```yaml
  dex.config: |
    connectors:
      - type: github
        id: github
        name: GitHub
        config:
          clientID: your-client-id
          clientSecret: $dex.github.clientSecret
          redirectURI: https://argocd.example.com/api/dex/callback
          orgs:
            - name: main-organization
              teams:
                - platform-team
                - dev-team
            - name: contractor-organization
              teams:
                - approved-contractors
```

Map teams from different organizations:

```yaml
  policy.csv: |
    g, main-organization:platform-team, role:admin
    g, main-organization:dev-team, role:developer
    g, contractor-organization:approved-contractors, role:readonly
```

## Troubleshooting

### "Not a member of any allowed organization"

The user trying to log in is not a member of any organization listed in the `orgs` configuration. They need to be added to the GitHub organization first.

### "Bad credentials" Error

The client secret is wrong or has been regenerated. Generate a new client secret in GitHub and update the ArgoCD Secret:

```bash
kubectl -n argocd patch secret argocd-secret --type merge -p '
{
  "stringData": {
    "dex.github.clientSecret": "new-secret-value"
  }
}'
kubectl -n argocd rollout restart deployment argocd-dex-server
```

### Teams Not Showing Up

1. Make sure `loadAllGroups: true` is set in the Dex configuration
2. Check that the OAuth app has the `read:org` scope (Dex requests this automatically)
3. Verify team membership in GitHub
4. Check Dex logs:
```bash
kubectl -n argocd logs deploy/argocd-dex-server
```

### Callback URL Mismatch

GitHub requires an exact match for the callback URL. Make sure it is:
- `https://argocd.example.com/api/dex/callback` (note: `/api/dex/callback`, not `/auth/callback`)

### Rate Limiting

GitHub has API rate limits. If you have many users logging in simultaneously, you may hit rate limits. The Dex GitHub connector caches team information to minimize API calls, but very large organizations may still hit limits.

## Security Considerations

1. **Restrict to specific organizations** - Always use the `orgs` field to limit who can log in
2. **Use team-based access** - Define teams in the `orgs` section for tighter control
3. **Regularly audit team membership** - GitHub team membership changes should trigger access reviews
4. **Use fine-grained PATs for CI** - Do not use the OAuth app for CI/CD pipelines; use personal access tokens or GitHub App tokens instead
5. **Enable GitHub's audit log** - Monitor OAuth app authorizations through GitHub's audit log

## Summary

GitHub OAuth with ArgoCD works through Dex's GitHub connector, which handles the non-standard aspects of GitHub's OAuth implementation. The integration lets you leverage GitHub organizations and teams for ArgoCD access control, creating a natural alignment between code access and deployment access. This is especially useful for teams that already use GitHub as their GitOps repository host.

For more SSO options, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view) and [How to Implement ArgoCD SSO with Dex](https://oneuptime.com/blog/post/2026-02-02-argocd-sso-dex/view).
