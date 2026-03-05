# How to Rotate Flux CD Deploy Keys

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Deploy Keys, SSH, Key Rotation

Description: Learn how to rotate SSH deploy keys used by Flux CD to access Git repositories, ensuring continued security of your GitOps pipeline.

---

Flux CD uses SSH deploy keys to authenticate with Git repositories. Regular key rotation is a security best practice that limits the window of exposure if a key is compromised. This guide walks you through rotating Flux CD deploy keys with zero downtime.

## Why Rotate Deploy Keys

- **Limit exposure**: If a key was compromised without your knowledge, rotation invalidates it.
- **Compliance requirements**: Many security frameworks require periodic credential rotation.
- **Personnel changes**: Rotate keys when team members with access to keys leave the organization.
- **Incident response**: Immediately rotate keys after a suspected security incident.

## Step 1: Identify Current Deploy Keys

Find the deploy keys currently used by Flux:

```bash
# List Git repository sources and their secret references
flux get sources git -A

# Check the secret used by the main GitRepository
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.spec.secretRef.name}'

# View the current deploy key (public key only)
kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity\.pub}' | base64 -d
```

## Step 2: Generate a New SSH Key Pair

Generate a new ED25519 SSH key pair:

```bash
# Generate a new ED25519 key pair
ssh-keygen -t ed25519 -C "flux-deploy-key-$(date +%Y%m%d)" -f flux-deploy-key -N ""

# Display the public key (you will add this to your Git provider)
cat flux-deploy-key.pub

# The private key is in flux-deploy-key (do not share this)
```

## Step 3: Add the New Deploy Key to Your Git Provider

Before updating Flux, add the new public key to your Git provider so that both old and new keys work during the transition.

For GitHub:

```bash
# Add deploy key using GitHub CLI
gh repo deploy-key add flux-deploy-key.pub \
  --repo myorg/fleet-repo \
  --title "flux-deploy-key-$(date +%Y%m%d)" \
  --allow-write
```

For GitLab, add the deploy key through the UI or API:

```bash
# Add deploy key using GitLab API
curl --request POST \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --header "Content-Type: application/json" \
  --data "{\"title\": \"flux-deploy-key-$(date +%Y%m%d)\", \"key\": \"$(cat flux-deploy-key.pub)\", \"can_push\": true}" \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/deploy_keys"
```

## Step 4: Update the Kubernetes Secret

Update the Flux secret with the new key:

```bash
# Create a new secret with the rotated key
kubectl create secret generic flux-system \
  --from-file=identity=flux-deploy-key \
  --from-file=identity.pub=flux-deploy-key.pub \
  --from-file=known_hosts=<(ssh-keyscan github.com 2>/dev/null) \
  --namespace=flux-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Verify the secret was updated
kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity\.pub}' | base64 -d
```

## Step 5: Trigger Reconciliation and Verify

Force Flux to reconcile using the new key:

```bash
# Trigger a source reconciliation
flux reconcile source git flux-system

# Check the source status
flux get sources git flux-system

# Verify the GitRepository is ready
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'

# Check source-controller logs for authentication errors
kubectl logs -n flux-system deployment/source-controller --tail=20 | grep -i "auth\|key\|ssh"
```

## Step 6: Remove the Old Deploy Key

After confirming the new key works, remove the old deploy key from your Git provider:

```bash
# List deploy keys on GitHub
gh repo deploy-key list --repo myorg/fleet-repo

# Delete the old deploy key by ID
gh repo deploy-key delete <KEY_ID> --repo myorg/fleet-repo
```

## Step 7: Clean Up Local Key Files

Securely delete the private key from your local machine:

```bash
# Securely delete the private key file
shred -u flux-deploy-key 2>/dev/null || rm -P flux-deploy-key

# You can keep the public key for reference
# rm flux-deploy-key.pub
```

## Automating Key Rotation

Create a script to automate the rotation process:

```bash
#!/bin/bash
# rotate-flux-deploy-key.sh
# Automates Flux CD deploy key rotation

set -euo pipefail

REPO="myorg/fleet-repo"
NAMESPACE="flux-system"
SECRET_NAME="flux-system"
KEY_FILE=$(mktemp)
PUB_FILE="${KEY_FILE}.pub"
DATE=$(date +%Y%m%d)

echo "Generating new SSH key pair..."
ssh-keygen -t ed25519 -C "flux-deploy-key-${DATE}" -f "$KEY_FILE" -N "" -q

echo "Adding new deploy key to GitHub..."
gh repo deploy-key add "${PUB_FILE}" \
  --repo "$REPO" \
  --title "flux-deploy-key-${DATE}" \
  --allow-write

echo "Updating Kubernetes secret..."
kubectl create secret generic "$SECRET_NAME" \
  --from-file=identity="$KEY_FILE" \
  --from-file=identity.pub="${PUB_FILE}" \
  --from-file=known_hosts=<(ssh-keyscan github.com 2>/dev/null) \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Triggering reconciliation..."
flux reconcile source git flux-system

echo "Waiting for reconciliation..."
sleep 10
flux get sources git flux-system

echo "Cleaning up local key files..."
shred -u "$KEY_FILE" 2>/dev/null || rm -P "$KEY_FILE"
rm -f "${PUB_FILE}"

echo "Key rotation complete. Remember to remove the old deploy key from GitHub."
```

## Best Practices

1. **Rotate regularly**: Set a rotation schedule (e.g., every 90 days) and automate it.
2. **Use ED25519 keys**: ED25519 keys are more secure and shorter than RSA keys.
3. **Overlap keys during rotation**: Add the new key before removing the old one to avoid downtime.
4. **Verify before removing**: Always confirm the new key works before deleting the old one.
5. **Secure key storage**: Never store private keys in Git or other version-controlled locations.
6. **Audit key access**: Track who has access to deploy keys and rotate when personnel changes occur.

Regular deploy key rotation is a critical security practice for maintaining the integrity of your Flux CD GitOps pipeline. By automating the process and following a zero-downtime rotation strategy, you can maintain security without disrupting your workflows.
