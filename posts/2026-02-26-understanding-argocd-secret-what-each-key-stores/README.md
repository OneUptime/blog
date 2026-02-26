# Understanding ArgoCD argocd-secret: What Each Key Stores

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Configuration

Description: A detailed breakdown of every key stored in the ArgoCD argocd-secret Kubernetes Secret, including admin credentials, server keys, SSO secrets, and webhook configurations.

---

The `argocd-secret` Kubernetes Secret is one of the most sensitive components in your ArgoCD installation. It stores the admin password, server signing keys, SSO credentials, and webhook secrets. Understanding what each key stores helps you manage, rotate, and troubleshoot authentication issues. This guide documents every key in the argocd-secret.

## Viewing the Secret

You should never dump the secret contents in plain text in a shared terminal, but for reference:

```bash
# See the keys (not values)
kubectl get secret argocd-secret -n argocd -o jsonpath='{.data}' | jq 'keys'

# Decode a specific key (be careful with this)
kubectl get secret argocd-secret -n argocd -o jsonpath='{.data.admin\.password}' | base64 -d
```

## admin.password

The bcrypt-hashed password for the built-in `admin` account.

```yaml
data:
  # This is a bcrypt hash, not the plaintext password
  admin.password: JDJhJDEwJHh4WnNVZkVMRlRkbjRhVXN5b0lGZi5KMTNiY0pNRUF3WUxwN1VjUWo5eTJLMm1zLmRTeQ==
```

The value is base64-encoded, and underneath that encoding is a bcrypt hash. To set or reset the admin password:

```bash
# Generate a new bcrypt hash
NEW_HASH=$(htpasswd -nbBC 10 "" 'MyNewPassword123' | tr -d ':\n' | sed 's/$2y/$2a/')

# Update the secret
kubectl patch secret argocd-secret -n argocd -p "{
  \"stringData\": {
    \"admin.password\": \"${NEW_HASH}\",
    \"admin.passwordMtime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }
}"
```

## admin.passwordMtime

Timestamp of when the admin password was last modified. ArgoCD uses this to determine if a password change has occurred.

```yaml
data:
  admin.passwordMtime: MjAyNi0wMS0xNVQxMDozMDowMFo=    # 2026-01-15T10:30:00Z
```

This is a plain ISO 8601 timestamp, base64-encoded. When you change the password, update this field too, or ArgoCD may not recognize the password change.

## server.secretkey

The symmetric key used by the ArgoCD server to sign and encrypt JWT tokens, session cookies, and other server-side secrets.

```yaml
data:
  server.secretkey: c29tZS1yYW5kb20tc2VjcmV0LWtleS12YWx1ZQ==
```

This key is critical for security:

- If it is compromised, all active sessions can be forged
- If it changes, all existing sessions are invalidated (users must re-login)
- It must be the same across all ArgoCD server replicas

To rotate the server secret key:

```bash
# Generate a new random key
NEW_KEY=$(openssl rand -base64 32)

# Update the secret
kubectl patch secret argocd-secret -n argocd -p "{
  \"stringData\": {
    \"server.secretkey\": \"${NEW_KEY}\"
  }
}"

# Restart the server to pick up the new key
kubectl rollout restart deployment argocd-server -n argocd
```

After rotation, all users will need to log in again.

## tls.crt and tls.key

The TLS certificate and private key for the ArgoCD server. These are standard Kubernetes TLS secret fields:

```yaml
data:
  tls.crt: <base64-encoded PEM certificate>
  tls.key: <base64-encoded PEM private key>
```

ArgoCD generates a self-signed certificate if these are not provided. For production, replace with a proper certificate:

```bash
kubectl create secret tls argocd-server-tls \
  -n argocd \
  --cert=server.crt \
  --key=server.key \
  --dry-run=client -o yaml | kubectl apply -f -
```

Note: Some installations use a separate `argocd-server-tls` secret instead of storing TLS in `argocd-secret`.

## Dex SSO Secrets

### dex.github.clientID and dex.github.clientSecret

GitHub OAuth app credentials for Dex-based SSO:

```yaml
data:
  dex.github.clientID: <base64-encoded client ID>
  dex.github.clientSecret: <base64-encoded client secret>
```

Referenced in `argocd-cm` as `$dex.github.clientID` and `$dex.github.clientSecret`.

### dex.gitlab.clientID and dex.gitlab.clientSecret

GitLab OAuth credentials:

```yaml
data:
  dex.gitlab.clientID: <base64-encoded>
  dex.gitlab.clientSecret: <base64-encoded>
```

### Custom Dex Secrets

Any key in `argocd-secret` can be referenced in the Dex config using the `$` prefix:

```yaml
# In argocd-secret
data:
  dex.okta.clientID: <base64-encoded>
  dex.okta.clientSecret: <base64-encoded>
  dex.ldap.bindPW: <base64-encoded>
```

Referenced in argocd-cm:

```yaml
# In argocd-cm
data:
  dex.config: |
    connectors:
      - type: oidc
        config:
          clientID: $dex.okta.clientID
          clientSecret: $dex.okta.clientSecret
```

## OIDC Secrets

### oidc.<provider>.clientSecret

When using direct OIDC (without Dex), store the client secret here:

```yaml
data:
  oidc.okta.clientSecret: <base64-encoded>
  oidc.azure.clientSecret: <base64-encoded>
```

Referenced in argocd-cm:

```yaml
# In argocd-cm
data:
  oidc.config: |
    name: Okta
    issuer: https://myorg.okta.com
    clientID: argocd-client
    clientSecret: $oidc.okta.clientSecret
```

## Webhook Secrets

### webhook.github.secret

Shared secret for validating GitHub webhook payloads:

```yaml
data:
  webhook.github.secret: <base64-encoded>
```

When GitHub sends webhook events to ArgoCD, this secret is used to verify the HMAC signature.

### webhook.gitlab.secret

Shared secret for GitLab webhooks:

```yaml
data:
  webhook.gitlab.secret: <base64-encoded>
```

### webhook.bitbucket.secret

Secret for Bitbucket Server webhooks:

```yaml
data:
  webhook.bitbucket.secret: <base64-encoded>
```

### webhook.bitbucketserver.secret

Secret for Bitbucket Server (self-hosted) webhooks:

```yaml
data:
  webhook.bitbucketserver.secret: <base64-encoded>
```

### webhook.gogs.secret

Secret for Gogs webhooks:

```yaml
data:
  webhook.gogs.secret: <base64-encoded>
```

### webhook.azuredevops.username and webhook.azuredevops.password

Azure DevOps webhook credentials:

```yaml
data:
  webhook.azuredevops.username: <base64-encoded>
  webhook.azuredevops.password: <base64-encoded>
```

## Setting Up Webhook Secrets

Here is how to configure webhook secrets properly:

```bash
# Generate a random webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)

# Store in argocd-secret
kubectl patch secret argocd-secret -n argocd -p "{
  \"stringData\": {
    \"webhook.github.secret\": \"${WEBHOOK_SECRET}\"
  }
}"

echo "Configure this secret in your GitHub webhook settings: ${WEBHOOK_SECRET}"
```

## Backup and Recovery

Backing up the argocd-secret is essential for disaster recovery:

```bash
# Backup (encrypted)
kubectl get secret argocd-secret -n argocd -o yaml | \
  gpg --encrypt --recipient admin@example.com > argocd-secret-backup.yaml.gpg

# Restore
gpg --decrypt argocd-secret-backup.yaml.gpg | kubectl apply -f -
```

Never store unencrypted backups of this secret - it contains credentials that grant full access to your ArgoCD instance and potentially your Git repositories.

## Key Rotation Schedule

A recommended rotation schedule for production:

| Key | Rotation Frequency | Impact |
|-----|-------------------|--------|
| admin.password | Every 90 days | Admin must use new password |
| server.secretkey | Every 180 days | All sessions invalidated |
| tls.crt/tls.key | Before expiry | Handled by cert-manager ideally |
| dex/oidc secrets | Per provider policy | Users must re-authenticate |
| webhook secrets | Every 90 days | Update in Git provider too |

For automating credential rotation, see the [ArgoCD credential rotation guide](https://oneuptime.com/blog/post/2026-02-26-automate-argocd-repository-credential-rotation/view).

## Summary

The `argocd-secret` is the most sensitive resource in your ArgoCD installation. It stores the admin password hash, server signing key, SSO credentials, and webhook secrets. Treat it with the same care you would give to any credential store - encrypt backups, limit access via RBAC, rotate keys regularly, and monitor for unauthorized changes. Understanding what each key stores helps you troubleshoot authentication issues and plan your security posture effectively.
