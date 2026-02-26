# Automate Creating ArgoCD Apps with Shell Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Automation, Shell Scripting

Description: Learn how to automate ArgoCD application creation using shell scripts for repeatable, consistent, and scalable GitOps workflows across multiple environments and teams.

---

Managing a handful of ArgoCD applications by hand is fine. Managing fifty or a hundred is not. Once your organization reaches a certain scale, clicking through the ArgoCD UI or copy-pasting YAML manifests becomes a bottleneck. Shell scripts offer a lightweight, portable way to automate application creation without requiring additional tooling or infrastructure.

This guide walks through practical shell script recipes for automating ArgoCD application creation, from simple one-off scripts to production-ready automation pipelines.

## Why Shell Scripts for ArgoCD Automation

Before jumping into code, it is worth understanding why shell scripts remain a popular choice for ArgoCD automation:

- They require no additional dependencies beyond the ArgoCD CLI and standard Unix tools
- They integrate naturally with CI/CD pipelines
- They are easy to version control alongside your GitOps repository
- They provide a stepping stone before more sophisticated solutions like ApplicationSets

That said, for truly large-scale environments, you should also evaluate [ArgoCD ApplicationSets](https://oneuptime.com/blog/post/2026-02-26-automate-argocd-project-creation-for-new-teams/view) for template-driven generation.

## Basic Application Creation Script

Here is a minimal script that creates an ArgoCD application using the CLI:

```bash
#!/bin/bash
# create-app.sh - Create a single ArgoCD application
set -euo pipefail

APP_NAME="$1"
REPO_URL="$2"
PATH_IN_REPO="$3"
DEST_NAMESPACE="${4:-default}"
DEST_SERVER="${5:-https://kubernetes.default.svc}"
PROJECT="${6:-default}"

# Validate required arguments
if [[ -z "${APP_NAME}" || -z "${REPO_URL}" || -z "${PATH_IN_REPO}" ]]; then
  echo "Usage: $0 <app-name> <repo-url> <path> [namespace] [server] [project]"
  exit 1
fi

echo "Creating ArgoCD application: ${APP_NAME}"

argocd app create "${APP_NAME}" \
  --repo "${REPO_URL}" \
  --path "${PATH_IN_REPO}" \
  --dest-namespace "${DEST_NAMESPACE}" \
  --dest-server "${DEST_SERVER}" \
  --project "${PROJECT}" \
  --sync-policy automated \
  --auto-prune \
  --self-heal \
  --sync-option CreateNamespace=true

echo "Application ${APP_NAME} created successfully"
```

Run it like this:

```bash
chmod +x create-app.sh
./create-app.sh my-app https://github.com/org/repo.git apps/my-app production
```

## Batch Creation from a CSV File

When you need to create many applications at once, a CSV-driven approach keeps things organized. Define your applications in a simple file.

Create a file called `apps.csv`:

```csv
app-name,repo-url,path,namespace,project
frontend,https://github.com/org/frontend.git,k8s/overlays/prod,frontend,web-team
backend-api,https://github.com/org/backend.git,k8s/overlays/prod,backend,api-team
worker,https://github.com/org/worker.git,k8s/overlays/prod,workers,api-team
redis-cache,https://github.com/org/infra.git,redis/prod,cache,infra-team
```

Then process it with this script:

```bash
#!/bin/bash
# batch-create-apps.sh - Create multiple ArgoCD apps from CSV
set -euo pipefail

CSV_FILE="${1:-apps.csv}"
DRY_RUN="${DRY_RUN:-false}"
FAILED_APPS=()

# Skip header line, read each row
tail -n +2 "${CSV_FILE}" | while IFS=',' read -r app_name repo_url path namespace project; do
  echo "---"
  echo "Processing: ${app_name}"

  # Check if app already exists
  if argocd app get "${app_name}" &>/dev/null; then
    echo "  SKIP: ${app_name} already exists"
    continue
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "  DRY RUN: Would create ${app_name} in project ${project}"
    continue
  fi

  # Create the application
  if argocd app create "${app_name}" \
    --repo "${repo_url}" \
    --path "${path}" \
    --dest-namespace "${namespace}" \
    --dest-server "https://kubernetes.default.svc" \
    --project "${project}" \
    --sync-policy automated \
    --auto-prune \
    --self-heal; then
    echo "  SUCCESS: ${app_name} created"
  else
    echo "  FAILED: ${app_name}"
    FAILED_APPS+=("${app_name}")
  fi
done

# Report failures
if [[ ${#FAILED_APPS[@]} -gt 0 ]]; then
  echo ""
  echo "Failed applications:"
  printf '  - %s\n' "${FAILED_APPS[@]}"
  exit 1
fi

echo ""
echo "All applications created successfully"
```

Run with a dry-run first:

```bash
DRY_RUN=true ./batch-create-apps.sh apps.csv
```

## YAML-Based Generation Script

For more complex configurations, generating YAML manifests gives you the ability to review changes in a pull request before applying them. This approach fits the GitOps model better.

```bash
#!/bin/bash
# generate-app-manifests.sh - Generate ArgoCD Application YAML files
set -euo pipefail

OUTPUT_DIR="${1:-generated-apps}"
REPO_URL="https://github.com/org/platform.git"
ENVIRONMENTS=("dev" "staging" "production")
SERVICES=("frontend" "backend" "worker" "gateway")

mkdir -p "${OUTPUT_DIR}"

for service in "${SERVICES[@]}"; do
  for env in "${ENVIRONMENTS[@]}"; do
    APP_NAME="${service}-${env}"
    OUTPUT_FILE="${OUTPUT_DIR}/${APP_NAME}.yaml"

    # Map environment to cluster
    case "${env}" in
      dev)        DEST_SERVER="https://dev-cluster.example.com" ;;
      staging)    DEST_SERVER="https://staging-cluster.example.com" ;;
      production) DEST_SERVER="https://prod-cluster.example.com" ;;
    esac

    cat > "${OUTPUT_FILE}" <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${APP_NAME}
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: ${service}
    environment: ${env}
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: ${env}-apps
  source:
    repoURL: ${REPO_URL}
    targetRevision: HEAD
    path: services/${service}/overlays/${env}
  destination:
    server: ${DEST_SERVER}
    namespace: ${service}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
EOF

    echo "Generated: ${OUTPUT_FILE}"
  done
done

echo ""
echo "Generated $(find "${OUTPUT_DIR}" -name '*.yaml' | wc -l | tr -d ' ') application manifests in ${OUTPUT_DIR}/"
```

This creates one YAML file per service-environment combination that you can commit to your GitOps repository.

## Templated Creation with Environment Variables

For CI/CD integration, using environment variables makes scripts more flexible:

```bash
#!/bin/bash
# ci-create-app.sh - CI/CD friendly app creation
set -euo pipefail

# Expected environment variables from CI
: "${APP_NAME:?APP_NAME is required}"
: "${GIT_REPO:?GIT_REPO is required}"
: "${GIT_BRANCH:?GIT_BRANCH is required}"
: "${DEPLOY_ENV:?DEPLOY_ENV is required}"

# Derive values from environment
NAMESPACE="${NAMESPACE:-${APP_NAME}}"
PROJECT="${PROJECT:-${DEPLOY_ENV}-apps}"
SYNC_POLICY="${SYNC_POLICY:-automated}"

# Build labels JSON for the ArgoCD CLI
LABELS="team=${TEAM:-unknown},env=${DEPLOY_ENV},managed-by=ci"

echo "Creating ArgoCD application"
echo "  Name:      ${APP_NAME}-${DEPLOY_ENV}"
echo "  Repo:      ${GIT_REPO}"
echo "  Branch:    ${GIT_BRANCH}"
echo "  Namespace: ${NAMESPACE}"

argocd app create "${APP_NAME}-${DEPLOY_ENV}" \
  --repo "${GIT_REPO}" \
  --revision "${GIT_BRANCH}" \
  --path "k8s/overlays/${DEPLOY_ENV}" \
  --dest-namespace "${NAMESPACE}" \
  --dest-server "https://kubernetes.default.svc" \
  --project "${PROJECT}" \
  --label "${LABELS}" \
  --sync-policy "${SYNC_POLICY}" \
  --auto-prune \
  --self-heal \
  --upsert

# Optionally trigger an initial sync
if [[ "${AUTO_SYNC:-false}" == "true" ]]; then
  echo "Triggering initial sync..."
  argocd app sync "${APP_NAME}-${DEPLOY_ENV}" --timeout 300
  argocd app wait "${APP_NAME}-${DEPLOY_ENV}" --timeout 300
fi
```

The `--upsert` flag is key here - it updates the application if it already exists, making the script idempotent.

## Adding Validation and Safety Checks

Production scripts need guardrails. Here is a validation wrapper:

```bash
#!/bin/bash
# safe-create-app.sh - Create apps with safety checks
set -euo pipefail

validate_prerequisites() {
  # Check ArgoCD CLI is available
  if ! command -v argocd &>/dev/null; then
    echo "ERROR: argocd CLI not found in PATH"
    exit 1
  fi

  # Check we are logged in
  if ! argocd account get-user-info &>/dev/null; then
    echo "ERROR: Not logged into ArgoCD. Run 'argocd login' first."
    exit 1
  fi

  # Check the target project exists
  if ! argocd proj get "${PROJECT}" &>/dev/null; then
    echo "ERROR: Project '${PROJECT}' does not exist"
    exit 1
  fi
}

validate_repo_access() {
  local repo_url="$1"
  # Verify ArgoCD can access the repository
  if ! argocd repo get "${repo_url}" &>/dev/null; then
    echo "WARNING: Repository ${repo_url} not registered. Adding it..."
    argocd repo add "${repo_url}" --ssh-private-key-path ~/.ssh/id_rsa
  fi
}

validate_prerequisites
validate_repo_access "${REPO_URL}"

# Proceed with creation only after all checks pass
argocd app create "${APP_NAME}" \
  --repo "${REPO_URL}" \
  --path "${APP_PATH}" \
  --dest-namespace "${NAMESPACE}" \
  --dest-server "${DEST_SERVER}" \
  --project "${PROJECT}" \
  --sync-policy automated \
  --auto-prune \
  --self-heal
```

## Cleanup and Lifecycle Management

Do not forget about cleanup. Here is a companion script for removing applications:

```bash
#!/bin/bash
# cleanup-apps.sh - Remove ArgoCD applications by label
set -euo pipefail

LABEL_SELECTOR="${1:?Usage: $0 <label-selector>}"
DRY_RUN="${DRY_RUN:-true}"

echo "Finding applications matching: ${LABEL_SELECTOR}"
APPS=$(argocd app list -l "${LABEL_SELECTOR}" -o name 2>/dev/null)

if [[ -z "${APPS}" ]]; then
  echo "No applications found matching selector"
  exit 0
fi

echo "Found applications:"
echo "${APPS}" | while read -r app; do echo "  - ${app}"; done

if [[ "${DRY_RUN}" == "true" ]]; then
  echo ""
  echo "DRY RUN: Set DRY_RUN=false to actually delete"
  exit 0
fi

echo "${APPS}" | while read -r app; do
  echo "Deleting: ${app}"
  argocd app delete "${app}" --cascade --yes
done
```

## Summary

Shell scripts provide a practical foundation for automating ArgoCD application management. Start with simple scripts and evolve them as your needs grow. The key patterns covered here - CSV-driven batch creation, YAML generation, CI/CD integration, validation checks, and lifecycle management - give you a solid toolkit for managing applications at scale. For even more advanced patterns, consider combining these scripts with ArgoCD ApplicationSets or moving to a declarative approach where generated manifests are committed directly to your GitOps repository.
