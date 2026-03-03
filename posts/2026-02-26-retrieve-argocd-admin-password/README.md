# How to Retrieve the ArgoCD Admin Password After Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security

Description: Learn multiple methods to retrieve the ArgoCD admin password after installation, including from secrets, Helm, and recovery options when the secret is deleted.

---

Every ArgoCD installation creates a default `admin` account with a randomly generated password. This password is stored in a Kubernetes Secret called `argocd-initial-admin-secret` in the `argocd` namespace. You need this password the first time you log into the ArgoCD UI or CLI.

This sounds simple, but in practice people run into issues: the secret might have been deleted, the cluster might use different base64 encoding, or you might need to decode it on a system without the usual tools. This guide covers every way to get that password and what to do when the normal method does not work.

## Method 1: kubectl with jsonpath (Standard)

This is the most common approach and works on all platforms.

```bash
# Retrieve and decode the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
echo
```

The `echo` at the end adds a newline so your terminal prompt does not appear on the same line as the password.

### What Each Part Does

- `kubectl -n argocd get secret` - Get a Secret from the argocd namespace
- `argocd-initial-admin-secret` - The name of the secret containing the password
- `-o jsonpath="{.data.password}"` - Extract just the password field
- `base64 -d` - Decode from base64 (Kubernetes stores secret data as base64)

## Method 2: kubectl with go-template

If `jsonpath` does not work on your kubectl version:

```bash
# Using go-template instead of jsonpath
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o go-template='{{.data.password | base64decode}}'
echo
```

## Method 3: Using jq

If you prefer `jq` for JSON processing:

```bash
# Using kubectl with jq
kubectl -n argocd get secret argocd-initial-admin-secret -o json | \
  jq -r '.data.password' | base64 -d
echo
```

## Method 4: Describe the Secret (Quick Look)

This shows the entire secret, but the data is base64-encoded.

```bash
# View the secret (password will be base64 encoded)
kubectl -n argocd describe secret argocd-initial-admin-secret
```

You will see something like:

```text
Name:         argocd-initial-admin-secret
Namespace:    argocd
Type:         Opaque

Data
====
password:  16 bytes
```

Then get the raw value and decode it manually:

```bash
# Get the raw base64 value
kubectl -n argocd get secret argocd-initial-admin-secret -o yaml

# Copy the password value and decode it
echo "dGhlLXBhc3N3b3Jk" | base64 -d
```

## Method 5: From Inside a Pod

If you have kubectl access only through a pod (like a bastion pod):

```bash
# Exec into any pod in the argocd namespace
kubectl exec -it -n argocd deployment/argocd-server -- bash

# Read the secret from the mounted volume or use the API
cat /run/secrets/kubernetes.io/serviceaccount/token
# This won't directly give you the password, but you can use the Kubernetes API

# Better approach: use argocd admin commands from inside the server pod
kubectl exec -n argocd deployment/argocd-server -- argocd admin initial-password -n argocd
```

## Method 6: ArgoCD CLI Built-in Command

ArgoCD v2.6+ has a built-in command to retrieve the initial password.

```bash
# Use the argocd CLI to get the initial password
argocd admin initial-password -n argocd
```

This command does the same thing as the kubectl approach but is easier to remember.

## Method 7: Helm Installation

If you installed ArgoCD with Helm, the password handling might be different.

### Default Helm Behavior

The Helm chart creates the same `argocd-initial-admin-secret` by default.

```bash
# Same retrieval method
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
echo
```

### Custom Password via Helm Values

If you set a custom password during Helm installation:

```yaml
# values.yaml
configs:
  secret:
    argocdServerAdminPassword: "$2a$12$hashed_password_here"
```

In this case, the password is whatever you set before hashing. The `argocd-initial-admin-secret` may not exist.

## What the Password Looks Like

The initial password is typically a 16-character random string like:

```text
xH2kL9mN4pQ7rS1t
```

It contains uppercase letters, lowercase letters, and numbers. No special characters.

## Platform-Specific Notes

### macOS

On macOS, `base64 -d` should work. If it does not, use `base64 -D` (capital D) or install GNU coreutils.

```bash
# macOS with native base64
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -D
echo

# macOS with GNU coreutils (install via brew install coreutils)
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | gbase64 -d
echo
```

### Windows PowerShell

```powershell
# PowerShell
$encodedPassword = kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}"
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encodedPassword))
```

### Windows Command Prompt

```cmd
:: Save encoded password to variable
for /f %i in ('kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath^="{.data.password}"') do set ENCODED=%i

:: Decode (requires certutil)
echo %ENCODED% > tmp.b64
certutil -decode tmp.b64 tmp.txt
type tmp.txt
del tmp.b64 tmp.txt
```

## What to Do After Getting the Password

Once you have the initial password, you should:

### 1. Login

```bash
argocd login <server-address> --username admin --password '<initial-password>' --insecure
```

### 2. Change the Password

```bash
argocd account update-password \
  --current-password '<initial-password>' \
  --new-password '<new-secure-password>'
```

### 3. Delete the Initial Secret

The ArgoCD documentation recommends deleting the initial admin secret after you have changed the password.

```bash
kubectl -n argocd delete secret argocd-initial-admin-secret
```

This prevents anyone from retrieving the original password later.

## Recovery: Password Secret is Deleted

If the `argocd-initial-admin-secret` was deleted and you do not know the password, you can reset it.

### Method A: Reset via kubectl

```bash
# Generate a bcrypt hash of your new password
# Using Python (most systems have this)
NEW_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'my-new-password', bcrypt.gensalt()).decode())")

# Update the admin password in argocd-secret
kubectl -n argocd patch secret argocd-secret -p \
  "{\"stringData\": {\"admin.password\": \"$NEW_HASH\", \"admin.passwordMtime\": \"$(date +%FT%T%Z)\"}}"
```

### Method B: Reset via ArgoCD CLI (from inside the pod)

```bash
# Reset the password from the server pod
kubectl exec -it -n argocd deployment/argocd-server -- \
  argocd admin initial-password reset -n argocd
```

### Method C: Delete and Recreate the Secret

```bash
# Generate a new password
NEW_PASSWORD=$(openssl rand -base64 12)
echo "New password: $NEW_PASSWORD"

# Hash it with bcrypt
BCRYPT_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'$NEW_PASSWORD', bcrypt.gensalt()).decode())")

# Update the argocd-secret
kubectl -n argocd patch secret argocd-secret -p \
  "{\"stringData\": {\"admin.password\": \"$BCRYPT_HASH\", \"admin.passwordMtime\": \"$(date +%FT%T%Z)\"}}"

# Restart the server to pick up the change
kubectl rollout restart deployment argocd-server -n argocd
```

## Troubleshooting

### "Error from server (NotFound): secrets argocd-initial-admin-secret not found"

The secret was deleted. Follow the recovery steps above.

### Password Does Not Work

Make sure you are not copying extra whitespace or newline characters.

```bash
# Store in a variable to avoid whitespace issues
PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

# Use the variable (quotes important)
argocd login localhost:8080 --username admin --password "$PASS" --insecure
```

### "Forbidden" Error When Retrieving Secret

You need the right RBAC permissions to read secrets.

```bash
# Check if you can read secrets
kubectl auth can-i get secrets -n argocd

# If not, you need a ClusterRole or Role with secrets read access
```

## Further Reading

- Change the admin password: [Change ArgoCD admin password](https://oneuptime.com/blog/post/2026-02-26-change-argocd-admin-password/view)
- First-time login walkthrough: [Login to ArgoCD CLI](https://oneuptime.com/blog/post/2026-02-26-login-argocd-cli-first-time/view)
- Disable admin for security: [Disable ArgoCD admin account](https://oneuptime.com/blog/post/2026-02-26-disable-argocd-admin-account/view)

Retrieving the initial admin password is a one-time operation. Get it, login, change it to something secure, and delete the initial secret. If you are setting up ArgoCD for a team, consider configuring SSO so nobody needs to remember the admin password at all.
