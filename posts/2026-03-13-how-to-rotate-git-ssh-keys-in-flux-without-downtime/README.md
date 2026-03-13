# How to Rotate Git SSH Keys in Flux Without Downtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, SSH, Key Rotation, Security, Git

Description: A practical guide to rotating SSH keys used by Flux CD for Git repository access without causing reconciliation failures or downtime.

---

## Introduction

SSH keys used by Flux to access Git repositories should be rotated regularly as a security best practice. However, rotating keys incorrectly can cause Flux to lose access to your repositories, breaking your GitOps pipeline. This guide describes a zero-downtime process for rotating Git SSH keys in Flux by ensuring the new key is authorized on the Git server before updating the Kubernetes secret.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- Access to your Git server to manage SSH keys (GitHub, GitLab, Bitbucket, etc.)
- `ssh-keygen` available locally

## Understanding the SSH Key Flow

Flux uses an SSH key pair stored in a Kubernetes secret:

1. The private key is stored in the `identity` field of the secret
2. The public key is registered as a deploy key on the Git server
3. The `known_hosts` field contains the Git server fingerprint

When you rotate keys, both the Kubernetes secret and the Git server deploy key must be updated.

## Step 1: Identify the Current SSH Secret

Find which secret your `GitRepository` resource references.

```bash
kubectl get gitrepository -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.secretRef.name}{"\n"}{end}'
```

Check the current secret:

```bash
kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity}' | base64 -d | head -2
```

## Step 2: Generate a New SSH Key Pair

Generate a new Ed25519 key pair (recommended) or RSA key pair.

```bash
# Ed25519 (recommended)
ssh-keygen -t ed25519 -C "flux-rotation-$(date +%Y%m%d)" -f new-flux-key -N ""

# Or RSA 4096 if Ed25519 is not supported
ssh-keygen -t rsa -b 4096 -C "flux-rotation-$(date +%Y%m%d)" -f new-flux-key -N ""
```

This creates two files:
- `new-flux-key` (private key)
- `new-flux-key.pub` (public key)

## Step 3: Add the New Public Key to the Git Server

Before updating the Flux secret, register the new public key on your Git server. This is the critical step that prevents downtime because both old and new keys will be authorized simultaneously.

### GitHub

```bash
# Display the public key to copy
cat new-flux-key.pub

# Using GitHub CLI
gh repo deploy-key add new-flux-key.pub -R my-org/my-repo --title "flux-new-$(date +%Y%m%d)"
```

### GitLab

```bash
# Using GitLab API
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --data-urlencode "key=$(cat new-flux-key.pub)" \
  --data "title=flux-new-$(date +%Y%m%d)" \
  --data "can_push=false" \
  "https://gitlab.example.com/api/v4/projects/PROJECT_ID/deploy_keys"
```

### Bitbucket

Add the new public key through the repository settings under Access Keys.

## Step 4: Verify the New Key Works

Test the new key against the Git server before updating Flux.

```bash
# Test GitHub connectivity
GIT_SSH_COMMAND="ssh -i new-flux-key -o IdentitiesOnly=yes" git ls-remote git@github.com:my-org/my-repo.git HEAD

# Test GitLab connectivity
GIT_SSH_COMMAND="ssh -i new-flux-key -o IdentitiesOnly=yes" git ls-remote git@gitlab.example.com:my-org/my-repo.git HEAD
```

## Step 5: Get the Known Hosts Entry

Fetch the SSH host key fingerprint for your Git server.

```bash
# GitHub
ssh-keyscan github.com > known_hosts 2>/dev/null

# GitLab
ssh-keyscan gitlab.example.com > known_hosts 2>/dev/null

# Custom Git server
ssh-keyscan git.internal.example.com > known_hosts 2>/dev/null
```

## Step 6: Update the Kubernetes Secret

Now update the Flux secret with the new private key. Since the new public key is already authorized on the Git server, this transition is seamless.

```bash
kubectl create secret generic flux-system \
  --namespace=flux-system \
  --from-file=identity=new-flux-key \
  --from-file=identity.pub=new-flux-key.pub \
  --from-file=known_hosts=known_hosts \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 7: Force Reconciliation

Trigger Flux to pick up the new credentials immediately.

```bash
# Reconcile all Git sources
flux reconcile source git flux-system

# Or reconcile a specific source
flux reconcile source git my-app

# Check the status
flux get sources git
```

## Step 8: Verify Flux Is Working with the New Key

```bash
# Check all Git sources are ready
kubectl get gitrepository -n flux-system

# Look at recent events
kubectl events -n flux-system --for gitrepository/flux-system

# Check source controller logs
kubectl logs -n flux-system deploy/source-controller --tail=20 | grep -i "ssh\|auth\|fetch"
```

All sources should show `Ready: True` with a recent `lastHandshakeTime`.

## Step 9: Remove the Old Deploy Key from the Git Server

Once you confirm Flux is working with the new key, remove the old deploy key.

### GitHub

```bash
# List deploy keys
gh repo deploy-key list -R my-org/my-repo

# Delete the old key by ID
gh repo deploy-key delete KEY_ID -R my-org/my-repo
```

### GitLab

```bash
# List deploy keys
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.example.com/api/v4/projects/PROJECT_ID/deploy_keys"

# Delete by ID
curl --request DELETE --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.example.com/api/v4/projects/PROJECT_ID/deploy_keys/KEY_ID"
```

## Step 10: Clean Up Local Files

Delete the key files from your local machine.

```bash
rm -f new-flux-key new-flux-key.pub known_hosts
```

## Automating Key Rotation

You can automate this process with a CronJob or external tool.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-ssh-key-rotation
  namespace: flux-system
spec:
  schedule: "0 0 1 */3 *"  # Every 3 months
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-key-rotator
          containers:
          - name: rotate
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Generate new key
              ssh-keygen -t ed25519 -f /tmp/new-key -N ""
              # Add to Git server via API
              # Update Kubernetes secret
              # Remove old key from Git server
          restartPolicy: OnFailure
```

## Rollback Plan

If something goes wrong after updating the secret, you can quickly revert.

```bash
# If you saved the old key, restore it
kubectl create secret generic flux-system \
  --namespace=flux-system \
  --from-file=identity=old-flux-key \
  --from-file=identity.pub=old-flux-key.pub \
  --from-file=known_hosts=known_hosts \
  --dry-run=client -o yaml | kubectl apply -f -

flux reconcile source git flux-system
```

## Summary of the Zero-Downtime Process

1. Generate new SSH key pair
2. Add new public key to Git server (both keys now authorized)
3. Verify new key works
4. Update Kubernetes secret with new private key
5. Confirm Flux reconciles successfully
6. Remove old public key from Git server
7. Delete local key files

The key principle is that there is always at least one valid key authorized on the Git server at every step.

## Conclusion

Rotating SSH keys in Flux without downtime requires a deliberate sequence: authorize the new key on the Git server first, update the Kubernetes secret second, and remove the old key last. This overlap period ensures Flux never loses access to your repositories during the transition.
