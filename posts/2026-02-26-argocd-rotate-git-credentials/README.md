# How to Rotate Git Repository Credentials in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Credentials

Description: Learn how to safely rotate Git repository credentials in ArgoCD without causing sync failures, including strategies for zero-downtime credential rotation.

---

Credential rotation is a critical security practice that many teams neglect until a token expires and their deployments stop working at 2 AM. ArgoCD stores Git credentials in Kubernetes Secrets, and rotating them requires careful coordination to avoid disrupting your GitOps pipeline. This guide covers strategies for rotating credentials safely and setting up processes to prevent surprises.

## Why Rotate Credentials

There are several reasons to rotate Git credentials regularly. Security policies may mandate rotation every 90 days. A team member with access may have left the organization. A token may have been accidentally exposed in logs or commits. Or you might be migrating from personal tokens to a more secure authentication method like GitHub Apps.

## Understanding Where Credentials Live

Before rotating anything, understand how ArgoCD stores credentials:

```mermaid
flowchart TD
    A[Kubernetes Secrets in argocd namespace] --> B[Repository Secrets]
    A --> C[Credential Template Secrets]
    B --> B1["Label: argocd.argoproj.io/secret-type: repository"]
    C --> C1["Label: argocd.argoproj.io/secret-type: repo-creds"]
```

```bash
# List all repository credential secrets
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository

# List all credential template secrets
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repo-creds
```

## Method 1: In-Place Secret Update

The simplest approach is updating the existing Secret in place. ArgoCD detects Secret changes and picks up new credentials automatically.

### For HTTPS Credentials

```bash
# First, find the secret name
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repo-creds -o name

# Update the password field with the new token
kubectl patch secret github-org-creds -n argocd \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/password", "value": "'$(echo -n "new_token_here" | base64)'"}]'
```

Or replace the entire Secret:

```yaml
# updated-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/my-org
  username: argocd-bot
  password: new_token_value_here
```

```bash
kubectl apply -f updated-credentials.yaml
```

### For SSH Keys

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:my-org
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    (new key content here)
    -----END OPENSSH PRIVATE KEY-----
```

### For GitHub App Private Keys

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/my-org
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    (new private key content here)
    -----END RSA PRIVATE KEY-----
```

## Method 2: Zero-Downtime Rotation with Overlap Period

For critical production environments, use an overlap period where both old and new credentials are valid:

### Step 1: Generate New Credentials

```bash
# For GitHub - create a new PAT before revoking the old one
# For SSH - generate a new key pair and add it as a deploy key
ssh-keygen -t ed25519 -C "argocd-new@company.com" -f argocd-new-key -N ""
```

### Step 2: Add New Key/Token to Git Provider

Add the new SSH key as a deploy key or generate a new PAT. Do not remove the old one yet.

### Step 3: Update ArgoCD

```bash
# Update the secret with new credentials
kubectl apply -f updated-credentials.yaml

# Verify ArgoCD can still access the repository
argocd repo list

# Force a sync to confirm everything works
argocd app sync my-app --force
```

### Step 4: Verify and Remove Old Credentials

```bash
# Check all applications are syncing properly
argocd app list --output wide | grep -v "Healthy.*Synced"

# If everything looks good, revoke the old token/key in your Git provider
```

## Method 3: Using the ArgoCD CLI

The CLI can update credentials directly:

```bash
# Update HTTPS credentials
argocd repo add https://github.com/my-org/my-repo.git \
  --username argocd-bot \
  --password new_token_here \
  --upsert

# The --upsert flag updates existing credentials instead of failing with "already exists"

# Update credential template
argocd repocreds add https://github.com/my-org \
  --username argocd-bot \
  --password new_token_here \
  --upsert
```

## Automating Credential Rotation

### Using External Secrets Operator

The best long-term solution is to stop managing credentials manually and use External Secrets Operator to pull them from a secrets manager:

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: github-creds
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: github-org-creds
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repo-creds
      data:
        type: git
        url: https://github.com/my-org
        username: argocd-bot
        password: "{{ .github_token }}"
  data:
    - secretKey: github_token
      remoteRef:
        key: argocd/github-token
```

Now you update the token in AWS Secrets Manager, and External Secrets Operator propagates it to ArgoCD automatically.

### Using a CronJob for Token Refresh

For providers that support API-based token generation:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-git-credentials
  namespace: argocd
spec:
  schedule: "0 0 1 */3 *"  # Every 3 months
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: credential-rotator
          containers:
            - name: rotator
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Script to generate new token and update secret
                  # This is provider-specific
                  NEW_TOKEN=$(generate_new_token)
                  kubectl patch secret github-org-creds -n argocd \
                    --type='json' \
                    -p="[{\"op\": \"replace\", \"path\": \"/data/password\", \"value\": \"$(echo -n $NEW_TOKEN | base64)\"}]"
          restartPolicy: OnFailure
```

## Verification After Rotation

After rotating credentials, run a thorough verification:

```bash
# Check all repositories are accessible
argocd repo list

# Look for any repos with "Failed" status
argocd repo list | grep Failed

# Check application sync status
argocd app list --output wide

# Force refresh all applications to test with new credentials
argocd app list -o name | xargs -I {} argocd app get {} --refresh

# Check repo-server logs for auth errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=50 | grep -i "auth\|denied\|fail\|error"
```

## Setting Up Rotation Reminders

Create a proactive monitoring approach:

```bash
# Track when credentials were last rotated
kubectl annotate secret github-org-creds -n argocd \
  credential-rotated-date="2026-02-26" \
  credential-expires-date="2026-05-26" \
  --overwrite
```

You can then monitor these annotations with a simple script or integrate with your monitoring system. For comprehensive monitoring of your ArgoCD deployment health, consider using [OneUptime](https://oneuptime.com/blog/post/2026-01-25-gitops-argocd-kubernetes/view) to track credential expiry and sync failures.

## Common Rotation Mistakes

Do not rotate credentials during a deployment. Wait for all syncs to complete first. Do not revoke old credentials before confirming new ones work. Always test with a manual sync. Do not forget about credential templates versus individual repository credentials - you may need to update both. Keep a record of which secrets correspond to which Git provider tokens for audit purposes.

Credential rotation is a boring but essential practice. Automating it with External Secrets Operator or a similar tool removes the human error factor and ensures your GitOps pipeline stays healthy.
