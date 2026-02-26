# Automate ArgoCD User Onboarding

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Automation, RBAC

Description: Learn how to automate ArgoCD user onboarding with scripts that handle account creation, RBAC role assignment, project access, and SSO group mappings for new team members.

---

Onboarding a new developer to ArgoCD should not involve a senior engineer spending an hour clicking through settings and copying RBAC snippets. In a growing organization, user onboarding is a repetitive task that benefits enormously from automation. This guide covers practical approaches to automating the entire ArgoCD onboarding process, from account creation to project access and role assignment.

## What User Onboarding Involves

When a new team member joins and needs ArgoCD access, you typically need to:

1. Create or configure their ArgoCD account (or map their SSO identity)
2. Assign them to the correct RBAC roles
3. Grant access to the appropriate ArgoCD projects
4. Set up notification preferences
5. Provide them with initial credentials or login instructions

Let us automate each of these steps.

## The Onboarding Script

Here is a comprehensive onboarding script that handles local account creation and RBAC configuration:

```bash
#!/bin/bash
# onboard-user.sh - Automate ArgoCD user onboarding
set -euo pipefail

USERNAME="${1:?Usage: $0 <username> <role> <team>}"
ROLE="${2:?Specify role: developer, lead, or admin}"
TEAM="${3:?Specify team name}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Onboarding user: ${USERNAME}"
echo "  Role: ${ROLE}"
echo "  Team: ${TEAM}"

# Step 1: Add user account to argocd-cm
echo "Adding user account..."
CURRENT_ACCOUNTS=$(kubectl get configmap argocd-cm -n "${NAMESPACE}" -o jsonpath='{.data.accounts\.'"${USERNAME}"'}' 2>/dev/null || echo "")

if [[ -n "${CURRENT_ACCOUNTS}" ]]; then
  echo "  User ${USERNAME} already exists in argocd-cm"
else
  # Patch the ConfigMap to add the new account
  kubectl patch configmap argocd-cm -n "${NAMESPACE}" --type merge -p "{
    \"data\": {
      \"accounts.${USERNAME}\": \"apiKey, login\",
      \"accounts.${USERNAME}.enabled\": \"true\"
    }
  }"
  echo "  User account created"
fi

# Step 2: Set initial password
echo "Setting initial password..."
TEMP_PASSWORD=$(openssl rand -base64 16)
argocd account update-password \
  --account "${USERNAME}" \
  --new-password "${TEMP_PASSWORD}" \
  --current-password "${ARGOCD_ADMIN_PASSWORD}"

# Step 3: Configure RBAC
echo "Configuring RBAC..."
configure_rbac() {
  local username="$1"
  local role="$2"
  local team="$3"

  # Get current RBAC policy
  CURRENT_POLICY=$(kubectl get configmap argocd-rbac-cm -n "${NAMESPACE}" -o jsonpath='{.data.policy\.csv}' 2>/dev/null || echo "")

  # Define role-based policies
  case "${role}" in
    developer)
      NEW_POLICY="p, ${username}, applications, get, ${team}/*, allow
p, ${username}, applications, sync, ${team}/*, allow
p, ${username}, logs, get, ${team}/*, allow
p, ${username}, exec, create, ${team}/*, deny"
      ;;
    lead)
      NEW_POLICY="p, ${username}, applications, *, ${team}/*, allow
p, ${username}, logs, get, ${team}/*, allow
p, ${username}, exec, create, ${team}/*, allow
p, ${username}, projects, get, ${team}, allow"
      ;;
    admin)
      NEW_POLICY="g, ${username}, role:admin"
      ;;
    *)
      echo "ERROR: Unknown role ${role}"
      exit 1
      ;;
  esac

  # Check if user already has policies
  if echo "${CURRENT_POLICY}" | grep -q "${username}"; then
    echo "  WARNING: User ${username} already has RBAC policies. Skipping to avoid duplicates."
    return
  fi

  # Append new policies
  UPDATED_POLICY="${CURRENT_POLICY}
${NEW_POLICY}"

  kubectl patch configmap argocd-rbac-cm -n "${NAMESPACE}" --type merge -p "{
    \"data\": {
      \"policy.csv\": $(echo "${UPDATED_POLICY}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
    }
  }"
  echo "  RBAC policies applied"
}

configure_rbac "${USERNAME}" "${ROLE}" "${TEAM}"

# Step 4: Ensure the team project exists
echo "Checking team project..."
if ! kubectl get appproject "${TEAM}" -n "${NAMESPACE}" &>/dev/null; then
  echo "  Creating project for team: ${TEAM}"
  cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: ${TEAM}
  namespace: ${NAMESPACE}
spec:
  description: "Project for ${TEAM} team"
  sourceRepos:
    - "https://github.com/org/${TEAM}-*"
  destinations:
    - namespace: "${TEAM}-*"
      server: "https://kubernetes.default.svc"
  clusterResourceWhitelist: []
  namespaceResourceWhitelist:
    - group: ""
      kind: "*"
    - group: "apps"
      kind: "*"
    - group: "networking.k8s.io"
      kind: "*"
EOF
  echo "  Project created"
else
  echo "  Project ${TEAM} already exists"
fi

# Step 5: Output onboarding information
echo ""
echo "=========================================="
echo "Onboarding complete for ${USERNAME}"
echo "=========================================="
echo "ArgoCD URL:       https://argocd.example.com"
echo "Username:         ${USERNAME}"
echo "Temporary Password: ${TEMP_PASSWORD}"
echo "Role:             ${ROLE}"
echo "Project:          ${TEAM}"
echo ""
echo "The user should change their password on first login."
echo "=========================================="
```

## SSO Group-Based Onboarding

If you use SSO (OIDC, SAML, or Dex), onboarding is primarily about mapping groups to RBAC roles. Here is a script that manages SSO group mappings:

```bash
#!/bin/bash
# onboard-sso-group.sh - Map SSO groups to ArgoCD RBAC roles
set -euo pipefail

SSO_GROUP="${1:?Usage: $0 <sso-group> <argocd-role> <project>}"
ARGOCD_ROLE="${2:?Specify ArgoCD role}"
PROJECT="${3:?Specify project name}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Mapping SSO group '${SSO_GROUP}' to role '${ARGOCD_ROLE}' for project '${PROJECT}'"

# Get current RBAC policy
CURRENT_POLICY=$(kubectl get configmap argocd-rbac-cm -n "${NAMESPACE}" \
  -o jsonpath='{.data.policy\.csv}' 2>/dev/null || echo "")

# Check for existing mapping
if echo "${CURRENT_POLICY}" | grep -q "g, ${SSO_GROUP}"; then
  echo "WARNING: Group ${SSO_GROUP} already has mappings:"
  echo "${CURRENT_POLICY}" | grep "${SSO_GROUP}"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] || exit 0
fi

# Build group mapping policy
GROUP_POLICY="g, ${SSO_GROUP}, role:${ARGOCD_ROLE}"

# If using a custom role (not built-in), define its permissions too
if [[ "${ARGOCD_ROLE}" != "admin" && "${ARGOCD_ROLE}" != "readonly" ]]; then
  ROLE_POLICY="p, role:${ARGOCD_ROLE}, applications, get, ${PROJECT}/*, allow
p, role:${ARGOCD_ROLE}, applications, sync, ${PROJECT}/*, allow
p, role:${ARGOCD_ROLE}, applications, create, ${PROJECT}/*, allow
p, role:${ARGOCD_ROLE}, applications, delete, ${PROJECT}/*, allow
p, role:${ARGOCD_ROLE}, logs, get, ${PROJECT}/*, allow"
  UPDATED_POLICY="${CURRENT_POLICY}
${ROLE_POLICY}
${GROUP_POLICY}"
else
  UPDATED_POLICY="${CURRENT_POLICY}
${GROUP_POLICY}"
fi

# Apply the updated RBAC policy
kubectl patch configmap argocd-rbac-cm -n "${NAMESPACE}" --type merge -p "{
  \"data\": {
    \"policy.csv\": $(echo "${UPDATED_POLICY}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"

echo "SSO group mapping applied successfully"
```

## Batch Onboarding from a File

For onboarding multiple users at once (common during team restructuring or new project kickoffs):

```bash
#!/bin/bash
# batch-onboard.sh - Onboard multiple users from a file
set -euo pipefail

USERS_FILE="${1:?Usage: $0 <users.csv>}"

echo "Starting batch onboarding from ${USERS_FILE}"
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

# CSV format: username,role,team,email
tail -n +2 "${USERS_FILE}" | while IFS=',' read -r username role team email; do
  TOTAL=$((TOTAL + 1))
  echo "Processing ${username} (${role} in ${team})..."

  if ./onboard-user.sh "${username}" "${role}" "${team}" 2>/dev/null; then
    SUCCESS=$((SUCCESS + 1))
    # Send welcome email if mail command is available
    if command -v mail &>/dev/null && [[ -n "${email}" ]]; then
      echo "Your ArgoCD account has been created. Please log in at https://argocd.example.com" | \
        mail -s "ArgoCD Access Granted" "${email}"
    fi
  else
    FAILED=$((FAILED + 1))
    echo "  FAILED: ${username}"
  fi
  echo ""
done

echo "Batch onboarding complete"
echo "  Total:   ${TOTAL}"
echo "  Success: ${SUCCESS}"
echo "  Failed:  ${FAILED}"
```

The CSV file format:

```csv
username,role,team,email
alice,developer,frontend,alice@company.com
bob,lead,backend,bob@company.com
charlie,developer,backend,charlie@company.com
diana,admin,,diana@company.com
```

## GitOps-Native Onboarding

The most GitOps-aligned approach is to manage user configurations as manifests in a Git repository. This allows onboarding to go through a standard pull request review process:

```yaml
# users/alice.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
  annotations:
    user-onboard/username: alice
    user-onboard/team: frontend
    user-onboard/role: developer
data:
  accounts.alice: "apiKey, login"
  accounts.alice.enabled: "true"
```

A Kustomize overlay can merge multiple user configurations together, and ArgoCD itself syncs them. This creates a self-managing onboarding system where adding a user is simply a pull request.

## Offboarding Script

Onboarding is only half the story. When someone leaves the team, you need to revoke their access:

```bash
#!/bin/bash
# offboard-user.sh - Remove ArgoCD user access
set -euo pipefail

USERNAME="${1:?Usage: $0 <username>}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Offboarding user: ${USERNAME}"

# Disable the account
kubectl patch configmap argocd-cm -n "${NAMESPACE}" --type merge -p "{
  \"data\": {
    \"accounts.${USERNAME}.enabled\": \"false\"
  }
}"

# Remove RBAC policies
CURRENT_POLICY=$(kubectl get configmap argocd-rbac-cm -n "${NAMESPACE}" \
  -o jsonpath='{.data.policy\.csv}')
UPDATED_POLICY=$(echo "${CURRENT_POLICY}" | grep -v "^.*${USERNAME}.*$" || true)

kubectl patch configmap argocd-rbac-cm -n "${NAMESPACE}" --type merge -p "{
  \"data\": {
    \"policy.csv\": $(echo "${UPDATED_POLICY}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"

# Delete any API tokens
argocd account delete-token "${USERNAME}" --all 2>/dev/null || true

echo "User ${USERNAME} has been disabled and their access revoked"
```

## Summary

Automating ArgoCD user onboarding reduces human error, ensures consistent access policies, and frees up engineering time. Whether you use shell scripts for imperative automation or Git-based manifests for declarative onboarding, the key is to have a repeatable process. Start with the simple scripts here and evolve toward a fully GitOps-native approach where user management is just another pull request.
