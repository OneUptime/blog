# How to Disable SSO and Use Only Local Accounts in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Authentication, Security

Description: Learn how to configure ArgoCD to use only local accounts without SSO, including when this approach is appropriate and how to set it up securely.

---

While SSO is the recommended authentication method for ArgoCD in production, there are legitimate scenarios where using only local accounts makes more sense. Small teams, development environments, air-gapped clusters, and situations where setting up an identity provider is impractical are all valid reasons to rely on local authentication only.

This guide covers how to configure ArgoCD without SSO, set up local accounts properly, and apply security practices that compensate for not having an identity provider.

## When Local-Only Authentication Makes Sense

Local accounts without SSO are appropriate for:

- **Development and testing environments** where quick setup matters more than enterprise-grade security
- **Small teams (2 to 5 people)** where the overhead of configuring an identity provider is not justified
- **Air-gapped environments** where the ArgoCD cluster has no network access to external identity providers
- **Temporary installations** like demo environments or proof-of-concept deployments
- **CI/CD-only usage** where no humans log into ArgoCD interactively

Local accounts are not recommended when:

- You have more than 5 to 10 human users
- You need centralized user lifecycle management (onboarding/offboarding)
- Compliance requires SSO or MFA
- You need audit trails tied to a corporate identity

## Step 1: Verify No SSO is Configured

Check your current `argocd-cm` ConfigMap:

```bash
kubectl -n argocd get configmap argocd-cm -o yaml
```

If there is an `oidc.config` or `dex.config` section, SSO is configured. To disable it, remove those sections:

```bash
# Remove OIDC configuration
kubectl -n argocd patch configmap argocd-cm --type json -p '[
  {"op": "remove", "path": "/data/oidc.config"}
]'

# Remove Dex configuration (if present)
kubectl -n argocd patch configmap argocd-cm --type json -p '[
  {"op": "remove", "path": "/data/dex.config"}
]'
```

## Step 2: Optionally Disable Dex

If you are not using SSO at all, you can scale down the Dex server to save resources:

```bash
kubectl -n argocd scale deployment argocd-dex-server --replicas=0
```

Or if you installed ArgoCD via Helm, set:

```yaml
# values.yaml
dex:
  enabled: false
```

## Step 3: Configure the Admin Account

The built-in admin account is your starting point. After installation, retrieve the initial password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

Change it immediately:

```bash
argocd login argocd.example.com --username admin --password '<initial-password>'
argocd account update-password --current-password '<initial-password>' --new-password '<strong-password>'
```

Delete the initial password secret:

```bash
kubectl -n argocd delete secret argocd-initial-admin-secret
```

## Step 4: Create Local User Accounts

Define accounts in `argocd-cm`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Keep admin enabled as the primary admin account
  admin.enabled: "true"

  # Human users (can login via UI/CLI and generate API tokens)
  accounts.alice: login, apiKey
  accounts.bob: login, apiKey
  accounts.carol: login, apiKey

  # Service accounts (API tokens only, no interactive login)
  accounts.ci-pipeline: apiKey
  accounts.deploy-bot: apiKey

  # Optional: disable accounts temporarily
  # accounts.carol.enabled: "false"
```

Set passwords for human users:

```bash
# As admin
argocd account update-password --account alice --new-password '<password>'
argocd account update-password --account bob --new-password '<password>'
argocd account update-password --account carol --new-password '<password>'
```

## Step 5: Configure RBAC

Without SSO groups, RBAC is based on individual account names:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Default policy for authenticated users
  policy.default: role:readonly

  policy.csv: |
    # Admin users
    g, alice, role:admin

    # Developer access
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, applications, create, dev/*, allow
    p, role:developer, applications, delete, dev/*, allow
    p, role:developer, logs, get, */*, allow
    g, bob, role:developer
    g, carol, role:developer

    # CI/CD pipeline
    p, role:ci, applications, get, */*, allow
    p, role:ci, applications, sync, */*, allow
    g, ci-pipeline, role:ci

    # Deploy bot
    p, role:deployer, applications, *, */*, allow
    g, deploy-bot, role:deployer
```

## Step 6: Restart ArgoCD

After configuration changes:

```bash
kubectl -n argocd rollout restart deployment argocd-server
```

## Verifying the Setup

```bash
# List all accounts
argocd account list

# Login as a user
argocd login argocd.example.com --username bob --password '<password>'

# Check permissions
argocd app list
argocd app sync my-dev-app  # Should work for dev project
argocd app sync my-prod-app  # Should fail (no permission)
```

## Security Hardening Without SSO

Since you do not have an identity provider handling security, apply these compensating controls:

### 1. Strong Password Policy

ArgoCD does not enforce password complexity, so enforce it procedurally:
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, and special characters
- No password reuse

### 2. Limit Login Attempts

ArgoCD does not have built-in brute-force protection. Add it at the ingress level:

```yaml
# Nginx Ingress rate limiting
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "5"
    nginx.ingress.kubernetes.io/limit-connections: "10"
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

### 3. Restrict Network Access

Limit who can reach ArgoCD at the network level:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-access
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
  ingress:
    - from:
        # Only allow from specific IP ranges
        - ipBlock:
            cidr: 10.0.0.0/8
        - ipBlock:
            cidr: 192.168.1.0/24
      ports:
        - port: 8080
          protocol: TCP
```

### 4. Enable Audit Logging

Monitor who is doing what:

```bash
# Check ArgoCD server logs for authentication events
kubectl -n argocd logs deploy/argocd-server | grep -i "auth\|login\|password"

# Check for application changes
kubectl -n argocd logs deploy/argocd-server | grep -i "sync\|create\|delete"
```

### 5. Regular Password Rotation

Create a schedule for password rotation:

```bash
#!/bin/bash
# password-rotation-reminder.sh
# Run monthly via cron

echo "ArgoCD password rotation reminder"
echo "================================="
echo "Accounts requiring password rotation:"
argocd account list | grep "login"
echo ""
echo "Run: argocd account update-password --account <username>"
```

### 6. Use VPN or Bastion Host

Do not expose ArgoCD directly to the internet without SSO. Instead:

- Require VPN connection to access ArgoCD
- Use a bastion host or jump server
- Use kubectl port-forward for temporary access:

```bash
kubectl -n argocd port-forward svc/argocd-server 8443:443
# Access at https://localhost:8443
```

## Migrating from Local Accounts to SSO Later

When your team grows or compliance requirements change, you can add SSO without disrupting existing local accounts:

1. Configure SSO (OIDC or Dex) in `argocd-cm`
2. Keep local accounts for service accounts
3. Update RBAC to map SSO groups alongside local accounts
4. Test SSO login
5. Once SSO is confirmed working, remove human local accounts
6. Keep service accounts as local accounts with apiKey only

```yaml
  policy.csv: |
    # SSO groups (new)
    g, platform-team, role:admin
    g, developers, role:developer

    # Local service accounts (kept)
    g, ci-pipeline, role:ci
    g, deploy-bot, role:deployer
```

## Complete Configuration Example

Here is the full configuration for a local-only ArgoCD setup:

```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  admin.enabled: "true"
  accounts.alice: login, apiKey
  accounts.bob: login, apiKey
  accounts.ci-pipeline: apiKey
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    g, alice, role:admin
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, staging/*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, logs, get, */*, allow
    g, bob, role:developer
    p, role:ci, applications, get, */*, allow
    p, role:ci, applications, sync, */*, allow
    g, ci-pipeline, role:ci
```

## Summary

Running ArgoCD with only local accounts is straightforward and appropriate for small teams and non-production environments. The key is to compensate for the lack of an identity provider with strong passwords, network restrictions, audit logging, and regular password rotation. When your team grows beyond 5 to 10 people, plan to migrate to SSO while keeping local accounts for service accounts and break-glass access.

For information on setting up SSO when you are ready, see [How to Configure ArgoCD SSO](https://oneuptime.com/blog/post/2026-01-27-argocd-sso/view).
