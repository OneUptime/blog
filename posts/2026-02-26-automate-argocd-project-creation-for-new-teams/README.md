# Automate ArgoCD Project Creation for New Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Automation, Multi-Tenancy

Description: Learn how to automate ArgoCD AppProject creation for new teams with standardized configurations, RBAC policies, resource restrictions, and namespace isolation.

---

Every time a new team spins up in your organization, they need an ArgoCD project. That project needs the right source repositories, destination namespaces, resource quotas, RBAC roles, and sync windows. Doing this manually is slow, error-prone, and inconsistent. This guide shows you how to automate ArgoCD project creation so that new teams get a fully configured, secure project in minutes.

## What an ArgoCD Project Needs

An AppProject in ArgoCD controls:

- Which Git repositories can be used as sources
- Which clusters and namespaces are valid deployment targets
- Which Kubernetes resource types are allowed or denied
- RBAC roles scoped to the project
- Sync windows defining when deployments can happen
- Cluster resource restrictions for security isolation

Getting all of these right for every team, every time, requires automation.

## Template-Based Project Generator

Here is a script that generates standardized ArgoCD projects from a team configuration:

```bash
#!/bin/bash
# create-team-project.sh - Generate and apply ArgoCD project for a new team
set -euo pipefail

TEAM_NAME="${1:?Usage: $0 <team-name> [tier]}"
TIER="${2:-standard}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
GIT_ORG="${GIT_ORG:-https://github.com/myorg}"

echo "Creating ArgoCD project for team: ${TEAM_NAME} (tier: ${TIER})"

# Define tier-based settings
case "${TIER}" in
  standard)
    MAX_APPS=20
    ALLOW_CLUSTER_RESOURCES="false"
    SYNC_WINDOW_DENY=""
    DESTINATIONS_SERVERS='["https://kubernetes.default.svc"]'
    ;;
  premium)
    MAX_APPS=50
    ALLOW_CLUSTER_RESOURCES="false"
    SYNC_WINDOW_DENY=""
    DESTINATIONS_SERVERS='["https://kubernetes.default.svc","https://staging.k8s.example.com"]'
    ;;
  platform)
    MAX_APPS=100
    ALLOW_CLUSTER_RESOURCES="true"
    SYNC_WINDOW_DENY=""
    DESTINATIONS_SERVERS='["*"]'
    ;;
  *)
    echo "ERROR: Unknown tier '${TIER}'. Use: standard, premium, or platform"
    exit 1
    ;;
esac

# Generate the AppProject manifest
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: ${TEAM_NAME}
  namespace: ${NAMESPACE}
  labels:
    team: ${TEAM_NAME}
    tier: ${TIER}
    managed-by: automation
  annotations:
    team-onboard/created: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    team-onboard/tier: "${TIER}"
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: "Project for ${TEAM_NAME} team (${TIER} tier)"

  # Source repositories - team-specific repos plus shared charts
  sourceRepos:
    - "${GIT_ORG}/${TEAM_NAME}-*"
    - "${GIT_ORG}/shared-charts"
    - "${GIT_ORG}/platform-configs"
    - "https://charts.helm.sh/stable"

  # Destination restrictions
  destinations:
    - namespace: "${TEAM_NAME}-*"
      server: "https://kubernetes.default.svc"
    - namespace: "${TEAM_NAME}"
      server: "https://kubernetes.default.svc"

  # Namespace-scoped resource whitelist
  namespaceResourceWhitelist:
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: ""
      kind: Service
    - group: ""
      kind: ServiceAccount
    - group: ""
      kind: PersistentVolumeClaim
    - group: apps
      kind: Deployment
    - group: apps
      kind: StatefulSet
    - group: apps
      kind: DaemonSet
    - group: batch
      kind: Job
    - group: batch
      kind: CronJob
    - group: networking.k8s.io
      kind: Ingress
    - group: networking.k8s.io
      kind: NetworkPolicy
    - group: autoscaling
      kind: HorizontalPodAutoscaler
    - group: policy
      kind: PodDisruptionBudget

  # Cluster resource restrictions based on tier
  clusterResourceWhitelist: $( [[ "${ALLOW_CLUSTER_RESOURCES}" == "true" ]] && echo '
    - group: ""
      kind: Namespace
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding' || echo '[]' )

  # Deny certain dangerous resources
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota
    - group: ""
      kind: LimitRange

  # RBAC roles within this project
  roles:
    - name: developer
      description: "Read-only access plus sync for ${TEAM_NAME} team developers"
      policies:
        - "p, proj:${TEAM_NAME}:developer, applications, get, ${TEAM_NAME}/*, allow"
        - "p, proj:${TEAM_NAME}:developer, applications, sync, ${TEAM_NAME}/*, allow"
        - "p, proj:${TEAM_NAME}:developer, logs, get, ${TEAM_NAME}/*, allow"
    - name: lead
      description: "Full application management for ${TEAM_NAME} team leads"
      policies:
        - "p, proj:${TEAM_NAME}:lead, applications, *, ${TEAM_NAME}/*, allow"
        - "p, proj:${TEAM_NAME}:lead, logs, get, ${TEAM_NAME}/*, allow"
        - "p, proj:${TEAM_NAME}:lead, exec, create, ${TEAM_NAME}/*, allow"
    - name: ci
      description: "CI/CD pipeline access for ${TEAM_NAME}"
      policies:
        - "p, proj:${TEAM_NAME}:ci, applications, sync, ${TEAM_NAME}/*, allow"
        - "p, proj:${TEAM_NAME}:ci, applications, get, ${TEAM_NAME}/*, allow"

  # Sync windows - block production deployments on weekends for standard tier
  syncWindows:
    - kind: allow
      schedule: "0 8 * * 1-5"
      duration: 12h
      applications: ["*"]
      timeZone: "America/New_York"
    - kind: deny
      schedule: "0 0 * * 0,6"
      duration: 48h
      applications: ["*-production"]
      timeZone: "America/New_York"
EOF

echo "AppProject '${TEAM_NAME}' created successfully"
```

## Creating Team Namespaces

A project without namespaces is not useful. Automate namespace creation alongside the project:

```bash
#!/bin/bash
# create-team-namespaces.sh - Create namespaces for a team
set -euo pipefail

TEAM_NAME="${1:?Usage: $0 <team-name>}"
ENVIRONMENTS=("dev" "staging" "production")

for env in "${ENVIRONMENTS[@]}"; do
  NS="${TEAM_NAME}-${env}"
  echo "Creating namespace: ${NS}"

  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: ${NS}
  labels:
    team: ${TEAM_NAME}
    environment: ${env}
    managed-by: automation
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${NS}-quota
  namespace: ${NS}
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: ${NS}-limits
  namespace: ${NS}
spec:
  limits:
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      type: Container
EOF
done

echo "All namespaces created for team ${TEAM_NAME}"
```

## Full Team Onboarding Pipeline

Combine project and namespace creation into a single onboarding pipeline:

```bash
#!/bin/bash
# onboard-team.sh - Complete team onboarding for ArgoCD
set -euo pipefail

TEAM_NAME="${1:?Usage: $0 <team-name> <tier> <lead-email>}"
TIER="${2:?Specify tier: standard, premium, or platform}"
LEAD_EMAIL="${3:?Specify team lead email}"

echo "============================================="
echo "Team Onboarding: ${TEAM_NAME}"
echo "============================================="

# Step 1: Create ArgoCD project
echo ""
echo "Step 1: Creating ArgoCD project..."
./create-team-project.sh "${TEAM_NAME}" "${TIER}"

# Step 2: Create namespaces
echo ""
echo "Step 2: Creating team namespaces..."
./create-team-namespaces.sh "${TEAM_NAME}"

# Step 3: Set up RBAC group mappings for SSO
echo ""
echo "Step 3: Configuring SSO group mappings..."
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
CURRENT_POLICY=$(kubectl get configmap argocd-rbac-cm -n "${NAMESPACE}" \
  -o jsonpath='{.data.policy\.csv}' 2>/dev/null || echo "")

TEAM_POLICIES="g, ${TEAM_NAME}-devs, proj:${TEAM_NAME}:developer
g, ${TEAM_NAME}-leads, proj:${TEAM_NAME}:lead
g, ${TEAM_NAME}-ci, proj:${TEAM_NAME}:ci"

UPDATED_POLICY="${CURRENT_POLICY}
${TEAM_POLICIES}"

kubectl patch configmap argocd-rbac-cm -n "${NAMESPACE}" --type merge -p "{
  \"data\": {
    \"policy.csv\": $(echo "${UPDATED_POLICY}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"

# Step 4: Create a starter application
echo ""
echo "Step 4: Creating starter application..."
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${TEAM_NAME}-dev
  namespace: ${NAMESPACE}
spec:
  project: ${TEAM_NAME}
  source:
    repoURL: https://github.com/myorg/${TEAM_NAME}-app
    targetRevision: HEAD
    path: k8s/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: ${TEAM_NAME}-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF

echo ""
echo "============================================="
echo "Onboarding complete for team: ${TEAM_NAME}"
echo "============================================="
echo "Project:     ${TEAM_NAME}"
echo "Tier:        ${TIER}"
echo "Namespaces:  ${TEAM_NAME}-dev, ${TEAM_NAME}-staging, ${TEAM_NAME}-production"
echo "SSO Groups:  ${TEAM_NAME}-devs, ${TEAM_NAME}-leads, ${TEAM_NAME}-ci"
echo "Starter App: ${TEAM_NAME}-dev"
echo "============================================="
```

## GitOps Approach with ApplicationSets

For the most scalable approach, use an ApplicationSet to generate projects from a Git directory structure:

```yaml
# team-project-generator.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-projects
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform-config
        revision: HEAD
        files:
          - path: "teams/*/config.json"
  template:
    metadata:
      name: "{{team}}-project-setup"
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform-config
        targetRevision: HEAD
        path: "teams/{{team}}/manifests"
      destination:
        server: https://kubernetes.default.svc
        namespace: argocd
```

Each team gets a directory in the platform config repository:

```
teams/
  frontend/
    config.json        # {"team": "frontend", "tier": "standard"}
    manifests/
      project.yaml     # AppProject definition
      namespaces.yaml  # Namespace definitions
  backend/
    config.json
    manifests/
      project.yaml
      namespaces.yaml
```

This way, onboarding a new team is just adding a new directory and opening a pull request.

## Summary

Automating ArgoCD project creation for new teams ensures consistency, reduces onboarding time, and enforces security boundaries from day one. Start with shell scripts for quick wins, then evolve toward a GitOps-native approach using ApplicationSets. The key is standardizing your project templates based on team tiers so that every team gets appropriate access controls, resource restrictions, and deployment policies without manual intervention.
