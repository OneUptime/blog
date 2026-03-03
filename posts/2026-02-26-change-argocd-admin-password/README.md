# How to Change the ArgoCD Admin Password

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security

Description: Learn how to change the ArgoCD admin password using the CLI, kubectl, and Helm, including password rotation best practices and automation.

---

The first thing you should do after installing ArgoCD is change the admin password. The initial password is randomly generated and stored in a Kubernetes Secret that anyone with cluster access can read. Changing it to a strong, known password - and then deleting the initial secret - is a basic security step that many teams skip.

This guide covers multiple methods for changing the password, automating password rotation, and best practices for admin account security.

## Method 1: ArgoCD CLI (Recommended)

The simplest way to change the password is through the ArgoCD CLI.

### Prerequisites

You need to be logged in first. If you have not logged in yet, see [Login to ArgoCD CLI for the first time](https://oneuptime.com/blog/post/2026-02-26-login-argocd-cli-first-time/view).

```bash
# Login with the current password
argocd login localhost:8080 --username admin --password '<current-password>' --insecure
```

### Change the Password

```bash
# Change the admin password
argocd account update-password \
  --current-password '<current-password>' \
  --new-password '<new-password>'
```

You will see:

```text
Password updated
Context 'localhost:8080' updated
```

The CLI automatically updates your local context with the new credentials.

### Verify the New Password

```bash
# Logout
argocd logout localhost:8080

# Login with the new password
argocd login localhost:8080 --username admin --password '<new-password>' --insecure
```

## Method 2: kubectl (When CLI is Not Available)

If you cannot use the ArgoCD CLI (for example, ArgoCD API server is not exposed), you can change the password directly through Kubernetes secrets.

### Generate a bcrypt Hash

ArgoCD stores passwords as bcrypt hashes. You need to hash your new password before storing it.

Using Python:

```bash
# Generate bcrypt hash with Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'my-new-password', bcrypt.gensalt()).decode())"
```

Using htpasswd:

```bash
# Generate bcrypt hash with htpasswd
htpasswd -nbBC 10 "" 'my-new-password' | tr -d ':\n' | sed 's/$2y/$2a/'
```

Using a Docker container:

```bash
# Generate bcrypt hash using Docker
docker run --rm httpd:2-alpine htpasswd -nbBC 10 "" 'my-new-password' | tr -d ':\n' | sed 's/$2y/$2a/'
```

### Update the Secret

```bash
# Set your bcrypt hash
BCRYPT_HASH='$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

# Update the argocd-secret
kubectl -n argocd patch secret argocd-secret -p \
  "{\"stringData\": {\"admin.password\": \"$BCRYPT_HASH\", \"admin.passwordMtime\": \"$(date +%FT%T%Z)\"}}"
```

The `admin.passwordMtime` field records when the password was last changed. ArgoCD uses this to invalidate existing sessions.

### Restart the ArgoCD Server

After changing the password via kubectl, restart the server to pick up the change.

```bash
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout status deployment argocd-server -n argocd
```

## Method 3: Helm Values

If you installed ArgoCD with Helm, you can set the password in your values file.

```yaml
# values.yaml
configs:
  secret:
    # Pre-generate this hash: htpasswd -nbBC 10 "" 'my-password' | tr -d ':\n' | sed 's/$2y/$2a/'
    argocdServerAdminPassword: "$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    argocdServerAdminPasswordMtime: "2026-02-26T00:00:00Z"
```

Apply the updated values:

```bash
helm upgrade argocd argo/argo-cd -n argocd -f values.yaml
```

## Method 4: Change Password for Non-Admin Accounts

If you have created additional local accounts, you can change their passwords too.

```bash
# Change password for a specific account
argocd account update-password \
  --account <account-name> \
  --current-password '<admin-password>' \
  --new-password '<new-password>'
```

Note: You need admin privileges to change another account's password. The `--current-password` here is the admin password, not the target account's password.

## Delete the Initial Admin Secret

After changing the password, delete the initial secret that ArgoCD created during installation.

```bash
# Delete the initial admin secret
kubectl -n argocd delete secret argocd-initial-admin-secret
```

This is important because anyone who can read Kubernetes secrets in the argocd namespace can retrieve the original password from this secret.

## Password Requirements

ArgoCD does not enforce password complexity rules by default, but you should follow these guidelines:

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and special characters
- Not reused from other systems
- Not based on dictionary words

Generate a strong password:

```bash
# Generate a random 24-character password
openssl rand -base64 18
```

## Automating Password Rotation

For compliance requirements, you may need to rotate the admin password regularly.

### Password Rotation Script

```bash
#!/bin/bash
# rotate-argocd-password.sh
# Rotates the ArgoCD admin password and stores it in a secret management system

NAMESPACE="${NAMESPACE:-argocd}"

# Generate a new random password
NEW_PASSWORD=$(openssl rand -base64 18)

# Generate bcrypt hash
NEW_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'$NEW_PASSWORD', bcrypt.gensalt()).decode())")

# Update the ArgoCD secret
kubectl -n $NAMESPACE patch secret argocd-secret -p \
  "{\"stringData\": {\"admin.password\": \"$NEW_HASH\", \"admin.passwordMtime\": \"$(date +%FT%T%Z)\"}}"

# Restart the server
kubectl rollout restart deployment argocd-server -n $NAMESPACE
kubectl rollout status deployment argocd-server -n $NAMESPACE

# Store the new password in your secret manager
# Example with AWS Secrets Manager:
# aws secretsmanager update-secret --secret-id argocd-admin-password --secret-string "$NEW_PASSWORD"

# Example with HashiCorp Vault:
# vault kv put secret/argocd/admin password="$NEW_PASSWORD"

echo "Password rotated successfully at $(date)"
echo "New password has been stored in your secret management system"
```

### Schedule with a CronJob

You can run this as a Kubernetes CronJob for automated rotation:

```yaml
# password-rotation-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-password-rotation
  namespace: argocd
spec:
  schedule: "0 0 1 * *"  # First day of each month
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-password-rotator
          containers:
          - name: rotator
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              NEW_PASSWORD=$(openssl rand -base64 18)
              NEW_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'$NEW_PASSWORD', bcrypt.gensalt()).decode())")
              kubectl -n argocd patch secret argocd-secret -p \
                "{\"stringData\": {\"admin.password\": \"$NEW_HASH\", \"admin.passwordMtime\": \"$(date +%FT%T%Z)\"}}"
              kubectl rollout restart deployment argocd-server -n argocd
          restartPolicy: OnFailure
```

## Best Practices

### 1. Use SSO Instead of Admin Password

For team environments, configure SSO so people log in with their identity provider credentials. This eliminates the need to share the admin password.

```bash
# Once SSO is configured, consider disabling the admin account entirely
# See: https://oneuptime.com/blog/post/2026-02-26-disable-argocd-admin-account/view
```

### 2. Limit Who Knows the Admin Password

The admin password should be known only by the platform team or stored in a secret management system. Individual developers should use SSO.

### 3. Audit Password Changes

Track when passwords are changed by checking the `admin.passwordMtime` field.

```bash
# Check when the password was last changed
kubectl -n argocd get secret argocd-secret -o jsonpath='{.data.admin\.passwordMtime}' | base64 -d
echo
```

### 4. Use API Tokens for Automation

Instead of sharing the admin password with CI/CD pipelines, generate API tokens.

```bash
# Create a dedicated account for CI/CD
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p '{"data":{"accounts.cicd":"apiKey"}}'

# Generate a token
argocd account generate-token --account cicd
```

## Troubleshooting

### "Account admin has been disabled"

If the admin account is disabled, you cannot change its password through normal means.

```bash
# Re-enable the admin account
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p '{"data":{"admin.enabled":"true"}}'

# Restart the server
kubectl rollout restart deployment argocd-server -n argocd
```

### "Invalid username or password" After Change

If the password change seems to not take effect:

```bash
# Make sure the server restarted
kubectl rollout restart deployment argocd-server -n argocd

# Clear your local CLI context
rm ~/.config/argocd/config

# Login again
argocd login localhost:8080 --username admin --password '<new-password>' --insecure
```

### bcrypt Hash Format Issues

ArgoCD expects `$2a$` prefixed bcrypt hashes. Some tools generate `$2y$` or `$2b$` prefixes. Convert them:

```bash
# Replace $2y$ with $2a$ (they are functionally identical)
echo '$2y$10$xxxxx' | sed 's/$2y/$2a/'
```

## Further Reading

- Retrieve the initial password: [Retrieve ArgoCD admin password](https://oneuptime.com/blog/post/2026-02-26-retrieve-argocd-admin-password/view)
- Disable admin for better security: [Disable ArgoCD admin account](https://oneuptime.com/blog/post/2026-02-26-disable-argocd-admin-account/view)
- Configure SSO: [ArgoCD SSO with OIDC](https://oneuptime.com/blog/post/2026-01-25-sso-oidc-argocd/view)

Changing the admin password is a critical first step after installation. Do it immediately, delete the initial secret, and if possible, move to SSO so the admin password becomes a break-glass emergency tool rather than a daily credential.
