# Automate ArgoCD Repository Credential Rotation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Automation

Description: Learn how to automate ArgoCD repository credential rotation using scripts, CronJobs, and external secret managers to maintain security without disrupting deployments.

---

Repository credentials are the keys to your GitOps kingdom. ArgoCD needs them to pull manifests from your Git repositories, and like all credentials, they should be rotated regularly. The problem is that manual rotation is disruptive - if done incorrectly, it breaks every application that depends on the affected repository. This guide shows you how to automate credential rotation safely.

## Understanding ArgoCD Repository Credentials

ArgoCD stores repository credentials in Kubernetes Secrets within the `argocd` namespace. There are two types:

- **Individual repository secrets** - credentials for a specific repository, labeled with `argocd.argoproj.io/secret-type: repository`
- **Credential templates** - pattern-matching credentials that apply to multiple repositories, labeled with `argocd.argoproj.io/secret-type: repo-creds`

Each secret contains the repository URL, authentication type (SSH key, HTTPS token, or username/password), and the credential data itself.

## SSH Key Rotation Script

Here is a script that rotates SSH keys for ArgoCD repository access:

```bash
#!/bin/bash
# rotate-ssh-key.sh - Rotate SSH key for ArgoCD repository credentials
set -euo pipefail

REPO_URL="${1:?Usage: $0 <repo-url-pattern>}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
KEY_DIR="/tmp/argocd-key-rotation"
BACKUP_DIR="/backups/credentials"

mkdir -p "${KEY_DIR}" "${BACKUP_DIR}"

echo "Rotating SSH key for repositories matching: ${REPO_URL}"

# Step 1: Generate new SSH key pair
echo "Generating new SSH key pair..."
ssh-keygen -t ed25519 -f "${KEY_DIR}/new_key" -N "" -C "argocd-$(date +%Y%m%d)"

NEW_PUBLIC_KEY=$(cat "${KEY_DIR}/new_key.pub")
NEW_PRIVATE_KEY=$(cat "${KEY_DIR}/new_key")

echo "New public key: ${NEW_PUBLIC_KEY}"

# Step 2: Find the existing credential secret
echo "Finding existing credential secrets..."
SECRETS=$(kubectl get secrets -n "${NAMESPACE}" \
  -l "argocd.argoproj.io/secret-type in (repository,repo-creds)" \
  -o json | jq -r ".items[] | select(.data.url != null) | select((.data.url | @base64d) | test(\"${REPO_URL}\")) | .metadata.name")

if [[ -z "${SECRETS}" ]]; then
  echo "No secrets found matching ${REPO_URL}"
  exit 1
fi

echo "Found secrets: ${SECRETS}"

# Step 3: Backup existing credentials
echo "Backing up existing credentials..."
BACKUP_FILE="${BACKUP_DIR}/creds-backup-$(date +%Y%m%d-%H%M%S).yaml"
for secret_name in ${SECRETS}; do
  kubectl get secret "${secret_name}" -n "${NAMESPACE}" -o yaml >> "${BACKUP_FILE}"
  echo "---" >> "${BACKUP_FILE}"
done
echo "Backup saved to ${BACKUP_FILE}"

# Step 4: Deploy the new public key to your Git provider
echo ""
echo "IMPORTANT: Before continuing, add this public key to your Git provider:"
echo ""
echo "${NEW_PUBLIC_KEY}"
echo ""
echo "For GitHub: Settings -> Deploy keys -> Add deploy key"
echo "For GitLab: Settings -> Repository -> Deploy keys"
echo ""

# In automated scenarios, use the Git provider API
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "Adding deploy key via GitHub API..."
  # Extract owner/repo from URL
  REPO_PATH=$(echo "${REPO_URL}" | sed 's/.*github.com[:/]//' | sed 's/.git$//')
  curl -s -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${REPO_PATH}/keys" \
    -d "{
      \"title\": \"argocd-$(date +%Y%m%d)\",
      \"key\": \"${NEW_PUBLIC_KEY}\",
      \"read_only\": true
    }"
  echo "Deploy key added to GitHub"
fi

read -p "Press Enter once the key has been added to your Git provider..." -r

# Step 5: Update the ArgoCD secrets
echo "Updating ArgoCD credential secrets..."
for secret_name in ${SECRETS}; do
  kubectl patch secret "${secret_name}" -n "${NAMESPACE}" --type merge -p "{
    \"stringData\": {
      \"sshPrivateKey\": $(echo "${NEW_PRIVATE_KEY}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
    }
  }"
  echo "  Updated: ${secret_name}"
done

# Step 6: Verify connectivity
echo "Verifying repository connectivity..."
sleep 5  # Give ArgoCD time to pick up the new credentials

argocd repo list -o json | jq -r ".[] | select(.repo | test(\"${REPO_URL}\")) | \"\(.repo) - \(.connectionState.status)\"" | \
  while read -r line; do
    echo "  ${line}"
  done

# Cleanup
rm -rf "${KEY_DIR}"

echo ""
echo "SSH key rotation complete"
```

## HTTPS Token Rotation

For repositories using HTTPS tokens (GitHub PAT, GitLab tokens):

```bash
#!/bin/bash
# rotate-https-token.sh - Rotate HTTPS token for ArgoCD repositories
set -euo pipefail

REPO_PATTERN="${1:?Usage: $0 <repo-url-pattern> <new-token>}"
NEW_TOKEN="${2:?Provide the new token}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Rotating HTTPS token for repos matching: ${REPO_PATTERN}"

# Find matching secrets
SECRETS=$(kubectl get secrets -n "${NAMESPACE}" \
  -l "argocd.argoproj.io/secret-type in (repository,repo-creds)" \
  -o json | jq -r ".items[] | select(.data.url != null) | select((.data.url | @base64d) | test(\"${REPO_PATTERN}\")) | .metadata.name")

if [[ -z "${SECRETS}" ]]; then
  echo "No secrets found matching pattern"
  exit 1
fi

# Update each secret
for secret_name in ${SECRETS}; do
  echo "Updating: ${secret_name}"

  # Backup first
  kubectl get secret "${secret_name}" -n "${NAMESPACE}" -o yaml > "/tmp/${secret_name}-backup.yaml"

  # Update the password/token field
  kubectl patch secret "${secret_name}" -n "${NAMESPACE}" --type merge -p "{
    \"stringData\": {
      \"password\": \"${NEW_TOKEN}\"
    }
  }"
done

# Wait and verify
echo "Waiting for ArgoCD to detect updated credentials..."
sleep 10

echo "Verifying repository connections..."
argocd repo list -o json | jq -r ".[] | select(.repo | test(\"${REPO_PATTERN}\")) | \"\(.repo): \(.connectionState.status)\""

echo "Token rotation complete"
```

## Automated Rotation with CronJob

Set up a CronJob that rotates credentials on a schedule using a vault or secret manager:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-cred-rotation
  namespace: argocd
spec:
  schedule: "0 3 1 * *"     # First day of every month at 3 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 1
      template:
        spec:
          serviceAccountName: argocd-cred-rotator
          restartPolicy: OnFailure
          containers:
            - name: rotator
              image: bitnami/kubectl:1.28
              command: ["/bin/bash", "/scripts/rotate-from-vault.sh"]
              env:
                - name: VAULT_ADDR
                  value: "https://vault.example.com"
                - name: VAULT_ROLE
                  value: "argocd-cred-rotator"
                - name: ARGOCD_NAMESPACE
                  value: "argocd"
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
          volumes:
            - name: scripts
              configMap:
                name: argocd-cred-rotation-scripts
                defaultMode: 0755
```

The vault-based rotation script:

```bash
#!/bin/bash
# rotate-from-vault.sh - Rotate credentials using HashiCorp Vault
set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:?VAULT_ADDR required}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Starting credential rotation from Vault..."

# Authenticate to Vault using Kubernetes auth
VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login \
  role="${VAULT_ROLE}" \
  jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)")
export VAULT_TOKEN

# Get list of repositories to rotate
REPOS=$(vault kv list -format=json secret/argocd/repos | jq -r '.[]')

for repo in ${REPOS}; do
  echo "Rotating credentials for: ${repo}"

  # Generate new credentials in Vault
  NEW_CREDS=$(vault kv get -format=json "secret/argocd/repos/${repo}")
  REPO_URL=$(echo "${NEW_CREDS}" | jq -r '.data.data.url')
  AUTH_TYPE=$(echo "${NEW_CREDS}" | jq -r '.data.data.type')

  case "${AUTH_TYPE}" in
    ssh)
      # Generate new SSH key via Vault PKI
      NEW_KEY=$(vault write -format=json ssh/sign/argocd \
        public_key="$(ssh-keygen -t ed25519 -f /dev/stdin -N '' <<< '' 2>/dev/null | head -1)" | jq -r '.data.signed_key')
      kubectl patch secret "repo-${repo}" -n "${NAMESPACE}" --type merge -p "{
        \"stringData\": {\"sshPrivateKey\": \"${NEW_KEY}\"}
      }"
      ;;
    https)
      # Get rotated token from Vault
      NEW_TOKEN=$(echo "${NEW_CREDS}" | jq -r '.data.data.token')
      kubectl patch secret "repo-${repo}" -n "${NAMESPACE}" --type merge -p "{
        \"stringData\": {\"password\": \"${NEW_TOKEN}\"}
      }"
      ;;
  esac

  # Update Vault with rotation timestamp
  vault kv patch "secret/argocd/repos/${repo}" \
    last_rotated="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
done

echo "All credentials rotated successfully"
```

## Credential Template Rotation

Credential templates are especially important because they apply to many repositories at once. Rotating them updates access for all matching repos:

```bash
#!/bin/bash
# rotate-cred-template.sh - Rotate ArgoCD credential templates
set -euo pipefail

TEMPLATE_NAME="${1:?Usage: $0 <template-name> <new-token>}"
NEW_TOKEN="${2:?Provide new token}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Rotating credential template: ${TEMPLATE_NAME}"

# Find the template secret
SECRET_NAME=$(kubectl get secrets -n "${NAMESPACE}" \
  -l "argocd.argoproj.io/secret-type=repo-creds" \
  -o json | jq -r ".items[] | select(.metadata.name == \"${TEMPLATE_NAME}\") | .metadata.name")

if [[ -z "${SECRET_NAME}" ]]; then
  echo "ERROR: Credential template '${TEMPLATE_NAME}' not found"
  exit 1
fi

# Get the URL pattern for reporting
URL_PATTERN=$(kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" \
  -o jsonpath='{.data.url}' | base64 -d)
echo "Template URL pattern: ${URL_PATTERN}"

# Count affected repositories
AFFECTED=$(argocd repo list -o json | jq "[.[] | select(.repo | startswith(\"${URL_PATTERN}\"))] | length")
echo "Repositories affected: ${AFFECTED}"

# Perform the rotation
kubectl patch secret "${SECRET_NAME}" -n "${NAMESPACE}" --type merge -p "{
  \"stringData\": {
    \"password\": \"${NEW_TOKEN}\"
  }
}"

echo "Credential template updated. Verifying connections..."
sleep 10

# Verify all affected repos are still connected
FAILED=0
argocd repo list -o json | jq -r ".[] | select(.repo | startswith(\"${URL_PATTERN}\")) | \"\(.repo)\t\(.connectionState.status)\"" | \
  while IFS=$'\t' read -r repo status; do
    if [[ "${status}" != "Successful" ]]; then
      echo "  FAIL: ${repo} - ${status}"
      FAILED=$((FAILED + 1))
    else
      echo "  OK: ${repo}"
    fi
  done

if [[ ${FAILED} -gt 0 ]]; then
  echo "WARNING: ${FAILED} repositories failed connection check after rotation"
  exit 1
fi

echo "Credential template rotation complete"
```

## Summary

Automated credential rotation is a security best practice that should not be optional. By scripting the rotation process and running it on a schedule, you ensure that compromised credentials have a limited window of exposure. The key principles are: always backup before rotating, verify connectivity after rotation, and use a secrets manager for production environments. For monitoring the health of your Git repository connections after rotation, set up alerts through [OneUptime](https://oneuptime.com) to catch any connectivity issues immediately.
