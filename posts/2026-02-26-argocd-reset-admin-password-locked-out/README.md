# How to Reset ArgoCD Admin Password When Locked Out

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Security

Description: Learn how to reset the ArgoCD admin password when you are locked out, including multiple recovery methods and preventive measures.

---

Getting locked out of your ArgoCD admin account is one of those problems that always seems to happen at the worst possible time. Maybe someone changed the password and forgot to document it. Maybe you are setting up a new laptop and the old credentials are gone. Whatever the reason, you need back in.

The good news is that ArgoCD stores admin credentials in a Kubernetes Secret, which means you can reset the password directly through kubectl as long as you have cluster access. Let me walk you through every method available.

## Understanding How ArgoCD Stores Passwords

ArgoCD keeps the admin password in a Kubernetes Secret named `argocd-secret` in the namespace where ArgoCD is installed. The password is stored as a bcrypt hash in the `admin.password` field. There is also an `admin.passwordMtime` field that tracks when the password was last changed.

You can inspect the current secret to see what is there.

```bash
# View the argocd-secret contents
kubectl get secret argocd-secret -n argocd -o yaml
```

The output will show base64-encoded values. The `admin.password` field contains a bcrypt hash that has been base64-encoded.

## Method 1: Reset Using bcrypt and kubectl patch

This is the most common and straightforward method. You generate a new bcrypt hash and patch the secret directly.

First, generate a bcrypt hash of your new password. You can use the `htpasswd` utility that comes with Apache, or use Python.

```bash
# Option A: Using htpasswd (available on most Linux systems)
htpasswd -nbBC 10 "" "MyNewPassword123!" | tr -d ':\n' | sed 's/$2y/$2a/'

# Option B: Using Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'MyNewPassword123!', bcrypt.gensalt()).decode())"

# Option C: Using the argocd CLI if you have it installed elsewhere
argocd account bcrypt --password "MyNewPassword123!"
```

Once you have the bcrypt hash, patch the secret.

```bash
# Replace the hash below with the one you generated
BCRYPT_HASH='$2a$10$rRyBsGSHK6.uc8fntPwVIuLVHgsAhAX7TcdrqW/RADU0uh7CaChLa'

# Patch the secret with the new password hash
kubectl -n argocd patch secret argocd-secret \
  -p '{"stringData": {
    "admin.password": "'$BCRYPT_HASH'",
    "admin.passwordMtime": "'$(date +%FT%T%Z)'"
  }}'
```

The `stringData` field is important here because it tells Kubernetes to handle the base64 encoding for you. If you use `data` instead, you need to base64-encode the bcrypt hash yourself.

## Method 2: Delete the Password and Let ArgoCD Regenerate It

If you want ArgoCD to generate a fresh random password, you can delete the password fields from the secret entirely. ArgoCD will then set the initial admin password based on the `argocd-initial-admin-secret`.

```bash
# Check if the initial admin secret still exists
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d

# If the initial secret exists, that password will work after you clear the main secret
kubectl -n argocd patch secret argocd-secret \
  -p '{"data": {"admin.password": null, "admin.passwordMtime": null}}'

# Restart the ArgoCD server to pick up the change
kubectl -n argocd rollout restart deployment argocd-server
```

If the `argocd-initial-admin-secret` was already deleted (which is recommended practice after first login), you will need to recreate it or use Method 1.

## Method 3: Recreate the Initial Admin Secret

If the initial admin secret is gone, you can create a new one and then reset ArgoCD to use it.

```bash
# Generate a new random password
NEW_PASSWORD=$(openssl rand -base64 16)
echo "New password: $NEW_PASSWORD"

# Create the initial admin secret
kubectl -n argocd create secret generic argocd-initial-admin-secret \
  --from-literal=password="$NEW_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

# Clear the existing password from argocd-secret
kubectl -n argocd patch secret argocd-secret \
  -p '{"data": {"admin.password": null, "admin.passwordMtime": null}}'

# Restart ArgoCD server
kubectl -n argocd rollout restart deployment argocd-server
```

After the server restarts, you can log in with `admin` and the new password.

## Method 4: Using the ArgoCD CLI from Another Authenticated Session

If you have the ArgoCD CLI authenticated on another machine or another user account that has admin privileges, you can reset the password that way.

```bash
# Log in with an existing session or SSO
argocd login argocd.example.com --sso

# Update the admin password
argocd account update-password \
  --account admin \
  --new-password "MyNewPassword123!"
```

## Verifying the Password Reset

After using any of the methods above, verify that the new password works.

```bash
# Test login with the ArgoCD CLI
argocd login argocd.example.com \
  --username admin \
  --password "MyNewPassword123!" \
  --grpc-web

# Or check the API directly
curl -k https://argocd.example.com/api/v1/session \
  -d '{"username":"admin","password":"MyNewPassword123!"}'
```

If the login still fails after patching the secret, make sure the ArgoCD server pod has restarted and picked up the new secret values.

```bash
# Check when the pod last started
kubectl -n argocd get pods -l app.kubernetes.io/name=argocd-server

# Force a restart if needed
kubectl -n argocd delete pod -l app.kubernetes.io/name=argocd-server
```

## Preventing Future Lockouts

Once you are back in, take a few steps to avoid this situation again.

First, set up SSO so you are not relying solely on the admin account. ArgoCD supports OIDC, SAML, and several other authentication methods. See our guide on [configuring SSO with OIDC in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-sso-oidc-argocd/view) for details.

Second, consider disabling the admin account entirely once SSO is configured.

```bash
# Disable the built-in admin account via argocd-cm ConfigMap
kubectl -n argocd patch configmap argocd-cm \
  -p '{"data": {"admin.enabled": "false"}}'
```

Third, store the admin password in a proper secret manager like HashiCorp Vault or AWS Secrets Manager. Document where it is stored so your team can find it.

Finally, set up monitoring on your ArgoCD instance so you know when authentication issues arise before they become emergencies. Tools like [OneUptime](https://oneuptime.com) can monitor your ArgoCD endpoints and alert you when the API becomes unreachable or returns authentication errors.

## Troubleshooting Common Issues

If the password reset does not seem to work, check these common problems:

**Pod not restarting**: The ArgoCD server caches the secret values. If you patched the secret but did not restart the server, the old password may still be active.

**Wrong bcrypt version**: ArgoCD expects bcrypt hashes starting with `$2a$`. Some tools generate `$2b$` or `$2y$` hashes. Use the `sed` replacement shown in Method 1 if needed.

**RBAC blocking access**: If you can authenticate but cannot perform actions, the issue may be RBAC configuration rather than the password. Check the `argocd-rbac-cm` ConfigMap.

**Multiple replicas**: If you are running ArgoCD in HA mode with multiple server replicas, make sure all replicas have restarted to pick up the new secret.

```bash
# Check all replicas have restarted
kubectl -n argocd get pods -l app.kubernetes.io/name=argocd-server -o wide
```

Resetting the ArgoCD admin password is a straightforward process once you know where the credentials are stored. The key is having kubectl access to the cluster, which is why it is important to maintain cluster access through separate credentials from your ArgoCD login.
