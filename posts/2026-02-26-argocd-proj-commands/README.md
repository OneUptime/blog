# How to Use argocd proj Commands for Project Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, RBAC

Description: A comprehensive guide to argocd proj commands for creating, configuring, and managing ArgoCD projects including source restrictions, destination rules, and role management.

---

ArgoCD projects are the primary mechanism for multi-tenancy and access control. They define what repositories applications can use, what clusters and namespaces they can deploy to, and what resource types are allowed. The `argocd proj` command family gives you full control over project lifecycle from the command line.

## Listing Projects

```bash
# List all projects
argocd proj list

# Output:
# NAME       DESCRIPTION                   DESTINATIONS    SOURCES  CLUSTER-RESOURCE-WHITELIST  NAMESPACE-RESOURCE-BLACKLIST  ...
# default    Default project               *,*            *        */*                          <none>
# production Production workloads          prod-cluster,* https://github.com/my-org/* <none>                        <none>
```

## Creating a Project

### Basic Project Creation

```bash
# Create a minimal project
argocd proj create my-project \
  --description "My team's project"
```

### Project with Source Restrictions

```bash
# Allow only specific repositories
argocd proj create backend-team \
  --description "Backend team applications" \
  --src https://github.com/my-org/backend-manifests.git \
  --src https://github.com/my-org/shared-charts.git
```

### Project with Destination Restrictions

```bash
# Allow deployment only to specific clusters and namespaces
argocd proj create backend-team \
  --description "Backend team applications" \
  --dest https://kubernetes.default.svc,backend-* \
  --dest https://kubernetes.default.svc,shared-services
```

The destination format is `CLUSTER,NAMESPACE`. Use `*` for wildcard matching.

### Full Project Setup

```bash
argocd proj create production \
  --description "Production workloads" \
  --src https://github.com/my-org/production-manifests.git \
  --src https://github.com/my-org/helm-charts.git \
  --dest https://prod-cluster.example.com,production \
  --dest https://prod-cluster.example.com,kube-system \
  --orphaned-resources
```

## Viewing Project Details

```bash
# Get full project details
argocd proj get my-project

# Output includes:
# - Description
# - Source repositories
# - Destinations (cluster/namespace pairs)
# - Cluster resource whitelist
# - Namespace resource blacklist
# - Roles
# - Sync windows
```

## Modifying Source Repositories

### Adding Sources

```bash
# Add a new allowed source repository
argocd proj add-source my-project https://github.com/my-org/new-repo.git

# Add a wildcard source
argocd proj add-source my-project 'https://github.com/my-org/*'
```

### Removing Sources

```bash
# Remove a source repository
argocd proj remove-source my-project https://github.com/my-org/old-repo.git
```

## Modifying Destinations

### Adding Destinations

```bash
# Add a specific namespace on a cluster
argocd proj add-destination my-project https://kubernetes.default.svc my-namespace

# Add all namespaces on a cluster
argocd proj add-destination my-project https://kubernetes.default.svc '*'

# Add by cluster name
argocd proj add-destination my-project production-cluster my-namespace
```

### Removing Destinations

```bash
# Remove a destination
argocd proj remove-destination my-project https://kubernetes.default.svc my-namespace
```

## Resource Whitelists and Blacklists

### Cluster Resource Whitelist

Control which cluster-scoped resources applications in this project can manage:

```bash
# Allow managing Namespaces
argocd proj allow-cluster-resource my-project "" Namespace

# Allow managing ClusterRoles
argocd proj allow-cluster-resource my-project rbac.authorization.k8s.io ClusterRole

# Allow managing ClusterRoleBindings
argocd proj allow-cluster-resource my-project rbac.authorization.k8s.io ClusterRoleBinding

# Allow all cluster resources
argocd proj allow-cluster-resource my-project '*' '*'
```

### Deny Cluster Resources

```bash
# Deny managing specific cluster resources
argocd proj deny-cluster-resource my-project "" Namespace
```

### Namespace Resource Blacklist

Prevent applications from managing specific namespace-scoped resources:

```bash
# Deny managing Secrets (force use of external secret management)
argocd proj deny-namespace-resource my-project "" Secret

# Deny managing ResourceQuotas (admin-only)
argocd proj deny-namespace-resource my-project "" ResourceQuota
```

### Allow Namespace Resources

```bash
argocd proj allow-namespace-resource my-project "" Secret
```

## Project Roles

Roles within projects provide fine-grained access control.

### Creating a Role

```bash
# Create a role in a project
argocd proj role create my-project deployer \
  --description "Can sync and view applications"
```

### Adding Policies to a Role

```bash
# Grant sync access
argocd proj role add-policy my-project deployer \
  --action sync \
  --permission allow \
  --object '*'

# Grant get (view) access
argocd proj role add-policy my-project deployer \
  --action get \
  --permission allow \
  --object '*'

# Deny delete access
argocd proj role add-policy my-project deployer \
  --action delete \
  --permission deny \
  --object '*'
```

### Generating JWT Tokens for Roles

```bash
# Generate a token for automation/CI systems
argocd proj role create-token my-project deployer

# Generate a token with an expiration
argocd proj role create-token my-project deployer --expires-in 24h

# Generate a token with a specific ID (for tracking)
argocd proj role create-token my-project deployer --token-id ci-pipeline-token
```

The token can be used for API authentication:

```bash
# Use the token to authenticate
argocd app sync my-app --auth-token <generated-token>

# Or set it as an environment variable
export ARGOCD_AUTH_TOKEN=<generated-token>
argocd app sync my-app
```

### Listing Roles

```bash
# List roles in a project
argocd proj role list my-project
```

### Deleting Tokens

```bash
# Delete a specific token
argocd proj role delete-token my-project deployer <issued-at-timestamp>
```

## Orphaned Resource Monitoring

Enable monitoring for resources in the project's namespaces that are not managed by ArgoCD:

```bash
# Enable orphaned resource monitoring
argocd proj set my-project --orphaned-resources

# Enable with specific warnings
argocd proj set my-project --orphaned-resources-warn
```

## Sync Windows

Control when applications in the project can sync:

```bash
# Add an allow sync window (deployments only during business hours)
argocd proj windows add my-project \
  --kind allow \
  --schedule "0 9 * * 1-5" \
  --duration 8h \
  --applications '*'

# Add a deny sync window (no deployments during weekends)
argocd proj windows add my-project \
  --kind deny \
  --schedule "0 0 * * 0,6" \
  --duration 48h \
  --applications '*'

# List sync windows
argocd proj windows list my-project

# Delete a sync window
argocd proj windows delete my-project 0
```

## Complete Project Setup Script

Here is a script that sets up a project for a team:

```bash
#!/bin/bash
# setup-team-project.sh - Set up a complete project for a team

TEAM="${1:?Usage: setup-team-project.sh <team-name>}"
CLUSTER="${2:-https://kubernetes.default.svc}"

PROJECT="team-${TEAM}"

echo "=== Setting up project: $PROJECT ==="

# Create the project
argocd proj create "$PROJECT" \
  --description "${TEAM} team project"

# Configure sources
argocd proj add-source "$PROJECT" "https://github.com/my-org/${TEAM}-*"
argocd proj add-source "$PROJECT" "https://github.com/my-org/shared-charts.git"

# Configure destinations
argocd proj add-destination "$PROJECT" "$CLUSTER" "${TEAM}-dev"
argocd proj add-destination "$PROJECT" "$CLUSTER" "${TEAM}-staging"
argocd proj add-destination "$PROJECT" "$CLUSTER" "${TEAM}-production"

# Allow Namespace creation
argocd proj allow-cluster-resource "$PROJECT" "" Namespace

# Create roles
argocd proj role create "$PROJECT" developer \
  --description "Developer access"
argocd proj role add-policy "$PROJECT" developer \
  --action get --permission allow --object '*'
argocd proj role add-policy "$PROJECT" developer \
  --action sync --permission allow --object '*'

argocd proj role create "$PROJECT" admin \
  --description "Team admin access"
argocd proj role add-policy "$PROJECT" admin \
  --action '*' --permission allow --object '*'

# Enable orphaned resource monitoring
argocd proj set "$PROJECT" --orphaned-resources-warn

# Add sync windows (no weekend deploys to production)
argocd proj windows add "$PROJECT" \
  --kind deny \
  --schedule "0 0 * * 0,6" \
  --duration 48h \
  --applications '*-production'

echo ""
echo "Project $PROJECT created successfully."
echo ""
echo "Generate tokens for CI/CD:"
echo "  argocd proj role create-token $PROJECT developer"
```

## Deleting a Project

```bash
# Delete a project (must have no applications)
argocd proj delete my-project
```

If applications still exist in the project, you will get an error. Either move or delete the applications first.

## Auditing Project Configuration

```bash
#!/bin/bash
# audit-projects.sh - Audit all project configurations

echo "=== Project Audit Report ==="
echo ""

for proj in $(argocd proj list -o json | jq -r '.[].metadata.name'); do
  echo "--- Project: $proj ---"

  DATA=$(argocd proj get "$proj" -o json)

  SOURCES=$(echo "$DATA" | jq '.spec.sourceRepos | length')
  DESTS=$(echo "$DATA" | jq '.spec.destinations | length')
  ROLES=$(echo "$DATA" | jq '.spec.roles // [] | length')

  echo "  Sources:      $SOURCES"
  echo "  Destinations: $DESTS"
  echo "  Roles:        $ROLES"
  echo "  Orphaned Resources: $(echo "$DATA" | jq '.spec.orphanedResources != null')"
  echo ""
done
```

## Summary

The `argocd proj` command family provides complete lifecycle management for ArgoCD projects. Use projects to isolate teams, restrict what repositories and clusters applications can use, control resource types, and set up deployment windows. Combined with project roles and JWT tokens, projects form the foundation of ArgoCD's multi-tenancy and access control model. Start with restrictive settings and open up access as needed, following the principle of least privilege.
