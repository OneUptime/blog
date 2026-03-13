# How to Configure Flux Git Secret with HTTPS Username and Password

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, HTTPS, Git, Credentials

Description: How to set up Flux CD to authenticate with Git repositories over HTTPS using a username and password or personal access token.

---

## Introduction

While SSH is a popular choice for Git authentication, HTTPS with username and password (or personal access token) is equally well-supported by Flux CD. Many organizations prefer HTTPS because it works through firewalls and proxies more easily than SSH, and personal access tokens provide fine-grained permission control.

This guide walks you through configuring a Flux `GitRepository` resource to authenticate over HTTPS using credentials stored in a Kubernetes Secret.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- A personal access token (PAT) or password for your Git provider
- Your Git repository accessible over HTTPS

## Step 1: Create a Personal Access Token

Most Git providers no longer accept plain passwords for HTTPS Git operations. You will typically use a personal access token (PAT) instead.

### GitHub

1. Go to Settings > Developer settings > Personal access tokens > Tokens (classic).
2. Click "Generate new token".
3. Select the `repo` scope for full repository access.
4. Generate and copy the token.

### GitLab

1. Go to User Settings > Access Tokens.
2. Create a new token with `read_repository` scope (and `write_repository` if needed).
3. Copy the token.

### Bitbucket

1. Go to Personal settings > App passwords.
2. Create a new app password with repository read permissions.
3. Copy the password.

## Step 2: Create the Kubernetes Secret

Create a Secret containing your username and password (or token):

```bash
kubectl create secret generic git-https-credentials \
  --namespace=flux-system \
  --from-literal=username=your-username \
  --from-literal=password=your-personal-access-token
```

You can also define it as a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-https-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: your-username
  password: your-personal-access-token
```

Apply the manifest:

```bash
kubectl apply -f git-https-secret.yaml
```

For GitHub, the username can be any non-empty string when using a personal access token. Many people use `git` or their GitHub username.

## Step 3: Configure the GitRepository Resource

Create or update your `GitRepository` resource to use HTTPS and reference the Secret:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/your-repo.git
  ref:
    branch: main
  secretRef:
    name: git-https-credentials
```

Apply the resource:

```bash
kubectl apply -f gitrepository.yaml
```

Make sure the `url` field uses the HTTPS protocol format (`https://...`).

## Step 4: Handle Self-Signed Certificates (Optional)

If your Git server uses a self-signed TLS certificate, you can add the CA certificate to the Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-https-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: your-username
  password: your-personal-access-token
  caFile: |
    -----BEGIN CERTIFICATE-----
    <your-ca-certificate-content>
    -----END CERTIFICATE-----
```

Then reference the CA file in your `GitRepository`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.example.com/your-org/your-repo.git
  ref:
    branch: main
  secretRef:
    name: git-https-credentials
```

The Source Controller will automatically use the `caFile` from the Secret when verifying the server certificate.

## Verification

Check the status of your `GitRepository`:

```bash
flux get sources git my-app
```

For detailed status:

```bash
kubectl describe gitrepository my-app -n flux-system
```

A successful reconciliation will show the latest commit hash and `Ready` status as `True`.

## Troubleshooting

### Authentication Failed (401 or 403)

If you see authentication errors:

1. Verify the token has not expired:

```bash
kubectl get secret git-https-credentials -n flux-system -o jsonpath='{.data.password}' | base64 -d
```

2. Check that the token has the correct scopes (e.g., `repo` for GitHub).
3. Regenerate the token if necessary and update the Secret:

```bash
kubectl create secret generic git-https-credentials \
  --namespace=flux-system \
  --from-literal=username=your-username \
  --from-literal=password=new-token \
  --dry-run=client -o yaml | kubectl apply -f -
```

4. Trigger a reconciliation:

```bash
flux reconcile source git my-app
```

### TLS Certificate Errors

If you see `x509: certificate signed by unknown authority`:

1. Add the CA certificate to the Secret as shown in Step 4.
2. Ensure the CA certificate is in PEM format.
3. Verify the certificate chain is complete.

### Repository URL Format

Make sure the URL uses HTTPS format. A common mistake is using SSH-style URLs with HTTPS credentials:

- Correct: `https://github.com/your-org/your-repo.git`
- Incorrect: `git@github.com:your-org/your-repo.git`

## Security Best Practices

1. Use personal access tokens with the minimum required scopes.
2. Set expiration dates on tokens and rotate them regularly.
3. Use Kubernetes RBAC to restrict access to the Secret.
4. Consider using a secrets management solution like Sealed Secrets or SOPS to encrypt the Secret in your Git repository.

## Summary

Configuring Flux with HTTPS username and password authentication is simple and works well in environments where SSH access is restricted. By using personal access tokens instead of plain passwords, you get fine-grained access control and the ability to rotate credentials without changing your account password.
