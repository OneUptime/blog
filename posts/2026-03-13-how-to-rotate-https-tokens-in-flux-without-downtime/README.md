# How to Rotate HTTPS Tokens in Flux Without Downtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, HTTPS, Token Rotation, PAT, Security, Key Rotation

Description: A step-by-step guide to rotating HTTPS personal access tokens and credentials in Flux CD without breaking your GitOps pipeline.

---

## Introduction

Flux CD commonly uses HTTPS personal access tokens (PATs) or service account tokens to authenticate with Git providers like GitHub, GitLab, and Bitbucket. These tokens expire or should be rotated periodically for security. This guide walks through rotating HTTPS tokens in Flux with zero downtime by ensuring the new token is valid before deactivating the old one.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- Access to generate new tokens on your Git provider
- The `flux` CLI installed

## Understanding HTTPS Authentication in Flux

Flux stores HTTPS credentials in a Kubernetes secret with `username` and `password` fields. Despite the field name, the `password` field typically holds a personal access token rather than an actual password. The `GitRepository` resource references this secret via `secretRef`.

## Step 1: Identify the Current Secret

Find which secrets your Flux Git repositories use.

```bash
kubectl get gitrepository -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.secretRef.name}{"\n"}{end}'
```

Check the current secret contents:

```bash
kubectl get secret my-git-auth -n flux-system -o jsonpath='{.data.username}' | base64 -d
echo
kubectl get secret my-git-auth -n flux-system -o jsonpath='{.data.password}' | base64 -d | head -c 10
echo "..."
```

## Step 2: Generate a New Token

Create a new token on your Git provider. Do not revoke the old token yet.

### GitHub Personal Access Token

```bash
# Using GitHub CLI
gh auth token

# Or create a fine-grained PAT via the web UI:
# Settings > Developer settings > Personal access tokens > Fine-grained tokens
# Grant: Contents (read-only) for the required repositories
```

### GitHub App Installation Token

```bash
# If using a GitHub App, generate a new installation token
# Or rotate the app's private key and generate a fresh token
```

### GitLab Personal Access Token

Create a new token at Settings > Access Tokens with `read_repository` scope.

### GitLab Project Access Token

Create a new project token at Project > Settings > Access Tokens.

### Bitbucket App Password

Create a new app password at Personal Settings > App Passwords with repository read access.

## Step 3: Verify the New Token Works

Test the token before updating Flux.

```bash
# GitHub
curl -s -H "Authorization: token NEW_TOKEN_HERE" \
  https://api.github.com/repos/my-org/my-repo | jq .full_name

# GitLab
curl -s -H "PRIVATE-TOKEN: NEW_TOKEN_HERE" \
  https://gitlab.example.com/api/v4/projects/PROJECT_ID | jq .name

# Test git clone with the new token
git clone https://oauth2:NEW_TOKEN_HERE@github.com/my-org/my-repo.git /tmp/test-clone
rm -rf /tmp/test-clone
```

## Step 4: Update the Kubernetes Secret

Update the secret with the new token. The old token is still valid on the Git provider, so this is a safe transition.

```bash
kubectl create secret generic my-git-auth \
  --namespace=flux-system \
  --from-literal=username=git \
  --from-literal=password=NEW_TOKEN_HERE \
  --dry-run=client -o yaml | kubectl apply -f -
```

For GitHub, the username is typically `git` or `x-access-token`:

```bash
kubectl create secret generic my-git-auth \
  --namespace=flux-system \
  --from-literal=username=x-access-token \
  --from-literal=password=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --dry-run=client -o yaml | kubectl apply -f -
```

For GitLab, the username is `oauth2` or the token name:

```bash
kubectl create secret generic my-git-auth \
  --namespace=flux-system \
  --from-literal=username=oauth2 \
  --from-literal=password=glpat-xxxxxxxxxxxxxxxxxxxx \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 5: Force Reconciliation

Trigger Flux to use the new credentials immediately.

```bash
# Reconcile all Git sources
flux reconcile source git flux-system

# Reconcile a specific source
flux reconcile source git my-app

# Check status
flux get sources git
```

## Step 6: Verify Flux Is Working

```bash
# All sources should show Ready: True
kubectl get gitrepository -n flux-system

# Check events for successful fetches
kubectl events -n flux-system --for gitrepository/flux-system

# View source controller logs
kubectl logs -n flux-system deploy/source-controller --tail=20
```

## Step 7: Revoke the Old Token

Once Flux is confirmed working with the new token, revoke the old one.

### GitHub

```bash
# Revoke via GitHub CLI or web UI
# Settings > Developer settings > Personal access tokens > Delete the old token
```

### GitLab

Revoke the old token at Settings > Access Tokens.

### Bitbucket

Delete the old app password at Personal Settings > App Passwords.

## Step 8: Update Multiple Secrets at Once

If multiple Flux sources use different secrets, update them all.

```bash
# List all secrets used by Git sources
kubectl get gitrepository -n flux-system \
  -o jsonpath='{range .items[*]}{.spec.secretRef.name}{"\n"}{end}' | sort -u

# Update each secret
for SECRET in my-git-auth another-git-auth; do
  kubectl create secret generic $SECRET \
    --namespace=flux-system \
    --from-literal=username=git \
    --from-literal=password=NEW_TOKEN_HERE \
    --dry-run=client -o yaml | kubectl apply -f -
done

# Reconcile all sources
flux reconcile source git --all
```

## Handling Helm Repository Tokens

HTTPS tokens for Helm repositories follow the same pattern.

```bash
# Update Helm repository credentials
kubectl create secret generic helm-repo-auth \
  --namespace=flux-system \
  --from-literal=username=token \
  --from-literal=password=NEW_HELM_TOKEN \
  --dry-run=client -o yaml | kubectl apply -f -

# Reconcile
flux reconcile source helm my-helm-repo
```

## Automating Token Rotation

### Using a CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-token-rotation
  namespace: flux-system
spec:
  schedule: "0 2 1 * *"  # Monthly at 2 AM on the 1st
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-token-rotator
          containers:
          - name: rotate
            image: bitnami/kubectl:latest
            env:
            - name: VAULT_ADDR
              value: "https://vault.example.com"
            command:
            - /bin/bash
            - -c
            - |
              # Fetch new token from Vault or token provider
              NEW_TOKEN=$(vault read -field=token secret/flux/git-token)

              # Update the Kubernetes secret
              kubectl create secret generic my-git-auth \
                --namespace=flux-system \
                --from-literal=username=git \
                --from-literal=password=$NEW_TOKEN \
                --dry-run=client -o yaml | kubectl apply -f -

              # Trigger reconciliation
              kubectl annotate gitrepository flux-system \
                -n flux-system \
                reconcile.fluxcd.io/requestedAt="$(date +%s)" \
                --overwrite
          restartPolicy: OnFailure
```

### Using External Secrets Operator

For a fully automated approach, use the External Secrets Operator (covered in a separate guide).

## Rollback Plan

If the new token does not work, revert to the old token.

```bash
kubectl create secret generic my-git-auth \
  --namespace=flux-system \
  --from-literal=username=git \
  --from-literal=password=OLD_TOKEN_HERE \
  --dry-run=client -o yaml | kubectl apply -f -

flux reconcile source git flux-system
```

## Summary of Zero-Downtime Steps

1. Generate a new token on the Git provider (old token still active)
2. Verify the new token works
3. Update the Kubernetes secret with the new token
4. Confirm Flux reconciles successfully
5. Revoke the old token on the Git provider

The overlap where both tokens are valid is what makes this a zero-downtime process.

## Conclusion

Rotating HTTPS tokens in Flux follows a simple pattern: create the new token, update the secret, verify, then revoke the old token. By keeping both tokens valid during the transition, you prevent any disruption to your GitOps pipeline. Automate this process with a CronJob or External Secrets Operator for ongoing security.
