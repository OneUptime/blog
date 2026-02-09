# How to Use kubectl label and annotate Commands for Bulk Resource Tagging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Resource Management

Description: Learn how to use kubectl label and annotate commands to add metadata to Kubernetes resources in bulk, enabling better organization, filtering, and automation workflows.

---

Labels and annotations organize Kubernetes resources with metadata. Labels enable selection and filtering, while annotations store arbitrary information. kubectl provides commands to add, update, and remove this metadata without editing YAML files.

## Understanding Labels vs Annotations

Labels are key-value pairs used for selection:

```bash
# Labels for filtering
kubectl get pods -l app=nginx
kubectl get pods -l environment=production,tier=backend
```

Annotations store non-identifying metadata:

```bash
# Annotations for documentation
kubectl annotate pod webapp description="Main application pod"
kubectl annotate deployment webapp deployment-tool="helm"
```

Labels have syntax restrictions, annotations do not.

## Basic Label Operations

Add labels to resources:

```bash
# Add single label
kubectl label pod webapp app=nginx

# Add multiple labels
kubectl label pod webapp app=nginx environment=production tier=backend

# Add label to specific namespace
kubectl label pod webapp version=v2.0 -n production

# Label with special characters in value
kubectl label pod webapp team="platform-engineering"
```

Labels must follow DNS subdomain format for keys and values.

## Labeling Multiple Resources

Apply labels to many resources at once:

```bash
# Label all pods in namespace
kubectl label pods --all environment=development

# Label pods matching selector
kubectl label pods -l app=nginx version=v1.21

# Label across namespaces
kubectl label pods --all-namespaces tier=backend -l app=api

# Label multiple resource types
kubectl label deployment,service webapp owner=platform-team
```

Bulk labeling standardizes metadata across resources.

## Updating Existing Labels

Modify labels that already exist:

```bash
# Update existing label (requires --overwrite)
kubectl label pod webapp environment=staging --overwrite

# Change multiple labels
kubectl label pod webapp env=prod tier=frontend --overwrite

# Update labels on all pods
kubectl label pods --all version=v2.0 --overwrite
```

The `--overwrite` flag prevents accidental label changes.

## Removing Labels

Delete labels from resources:

```bash
# Remove single label (note the trailing -)
kubectl label pod webapp version-

# Remove multiple labels
kubectl label pod webapp env- tier-

# Remove label from all pods
kubectl label pods --all deprecated-

# Remove label from selected resources
kubectl label pods -l app=old-version legacy-
```

The minus sign suffix indicates label removal.

## Labeling by Resource Type

Apply labels to specific resource types:

```bash
# Label all deployments
kubectl label deployments --all managed-by=kubernetes

# Label all services
kubectl label services --all team=backend

# Label all configmaps
kubectl label configmaps --all config-version=v1

# Label nodes
kubectl label nodes --all region=us-west-2
```

This creates consistent labeling schemes across resource types.

## Node Labeling for Scheduling

Labels control pod placement:

```bash
# Label node for specific workloads
kubectl label node worker-1 workload=gpu-intensive

# Label nodes by hardware type
kubectl label node worker-2 disk=ssd

# Label nodes by availability zone
kubectl label node worker-3 zone=us-west-2a

# Use in pod spec for scheduling
# nodeSelector:
#   workload: gpu-intensive
```

Node labels enable targeted pod scheduling.

## Adding Annotations

Attach descriptive metadata:

```bash
# Add single annotation
kubectl annotate pod webapp description="Main application server"

# Add multiple annotations
kubectl annotate pod webapp \
  maintainer="platform-team@example.com" \
  docs="https://wiki.example.com/webapp"

# Annotate with JSON data
kubectl annotate deployment webapp \
  config='{"replicas":3,"version":"v2.0"}'

# Add annotation to namespace
kubectl annotate namespace production owner="ops-team"
```

Annotations store arbitrary string data without format restrictions.

## Bulk Annotation Operations

Annotate many resources:

```bash
# Annotate all pods
kubectl annotate pods --all last-updated="2026-02-09"

# Annotate matching resources
kubectl annotate deployments -l app=backend team="backend-team"

# Annotate across namespaces
kubectl annotate pods --all-namespaces monitoring="enabled"

# Annotate multiple resource types
kubectl annotate deployment,service webapp created-by="automation"
```

This standardizes metadata across environments.

## Updating Annotations

Modify existing annotations:

```bash
# Update annotation (requires --overwrite)
kubectl annotate pod webapp description="Updated description" --overwrite

# Update multiple annotations
kubectl annotate deployment webapp \
  version="v2.1" \
  updated="2026-02-09" \
  --overwrite

# Bulk update
kubectl annotate pods --all last-checked="2026-02-09" --overwrite
```

Overwrite protects against accidental changes.

## Removing Annotations

Delete annotations:

```bash
# Remove single annotation
kubectl annotate pod webapp description-

# Remove multiple annotations
kubectl annotate pod webapp docs- maintainer-

# Remove from all resources
kubectl annotate pods --all deprecated-annotation-

# Remove from selected resources
kubectl annotate deployments -l app=old temporary-
```

Trailing minus removes annotations like labels.

## Label Selectors for Filtering

Use labels to filter resources:

```bash
# Equality-based selector
kubectl get pods -l app=nginx

# Set-based selector
kubectl get pods -l 'environment in (production,staging)'

# Multiple requirements
kubectl get pods -l app=nginx,version=v1.21

# Not equal
kubectl get pods -l app!=legacy

# Label exists
kubectl get pods -l app

# Label doesn't exist
kubectl get pods -l '!legacy'
```

Selectors enable precise resource filtering.

## Organizational Label Strategies

Create consistent labeling hierarchies:

```bash
# Application identification
kubectl label deployment webapp \
  app=webapp \
  component=frontend \
  part-of=ecommerce

# Environment tracking
kubectl label deployment webapp \
  environment=production \
  region=us-west \
  zone=us-west-2a

# Ownership and management
kubectl label deployment webapp \
  team=platform \
  managed-by=helm \
  owner=ops-team

# Version tracking
kubectl label deployment webapp \
  version=v2.0.1 \
  release=stable
```

Hierarchical labels improve resource organization.

## Annotation Use Cases

Store operational metadata:

```bash
# Contact information
kubectl annotate deployment webapp \
  contact="team@example.com" \
  slack-channel="#platform-team"

# Documentation links
kubectl annotate service api \
  documentation="https://docs.example.com/api" \
  runbook="https://wiki.example.com/runbooks/api"

# Deployment information
kubectl annotate deployment webapp \
  deployed-by="jenkins" \
  deployment-time="2026-02-09T10:30:00Z" \
  git-commit="abc123"

# Cost tracking
kubectl annotate namespace production \
  cost-center="engineering" \
  billing-code="PROJ-123"
```

Annotations document resources without affecting functionality.

## Propagating Labels

Label changes don't propagate automatically:

```bash
# Labeling deployment doesn't label its pods
kubectl label deployment webapp version=v2.0

# To label deployment's pods
kubectl label pods -l app=webapp version=v2.0

# Or use deployment template update
kubectl patch deployment webapp -p \
  '{"spec":{"template":{"metadata":{"labels":{"version":"v2.0"}}}}}'
```

Template changes propagate to new pods only.

## Labeling in Scripts

Automate labeling workflows:

```bash
#!/bin/bash
# label-environment.sh

ENV=$1
NAMESPACE=$2

if [ -z "$ENV" ] || [ -z "$NAMESPACE" ]; then
    echo "Usage: $0 <environment> <namespace>"
    exit 1
fi

echo "Labeling resources in $NAMESPACE as $ENV..."

# Label all deployments
kubectl label deployments --all environment=$ENV -n $NAMESPACE --overwrite

# Label all services
kubectl label services --all environment=$ENV -n $NAMESPACE --overwrite

# Label all configmaps
kubectl label configmaps --all environment=$ENV -n $NAMESPACE --overwrite

# Annotate namespace
kubectl annotate namespace $NAMESPACE \
  environment=$ENV \
  labeled-date="$(date -I)" \
  --overwrite

echo "Labeling complete"
```

Scripts ensure consistent labeling practices.

## Validation Before Labeling

Check resources before applying labels:

```bash
#!/bin/bash
# safe-label.sh

RESOURCE=$1
NAME=$2
LABEL=$3

# Check resource exists
if ! kubectl get $RESOURCE $NAME &>/dev/null; then
    echo "Error: $RESOURCE $NAME not found"
    exit 1
fi

# Show current labels
echo "Current labels:"
kubectl get $RESOURCE $NAME --show-labels

# Confirm change
read -p "Add label $LABEL? (yes/no): " confirm
if [[ "$confirm" == "yes" ]]; then
    kubectl label $RESOURCE $NAME $LABEL
    echo "Label added successfully"
else
    echo "Cancelled"
fi
```

Validation prevents labeling mistakes.

## Label Constraints and Limits

Labels have syntax requirements:

```bash
# Valid label keys
# - Must be 63 characters or less
# - Can have optional prefix up to 253 characters
# - Format: [prefix/]name

# Valid examples
kubectl label pod webapp app=nginx
kubectl label pod webapp example.com/app=nginx
kubectl label pod webapp platform.example.com/team=backend

# Invalid (will fail)
# kubectl label pod webapp "invalid label=value"  # Space in key
# kubectl label pod webapp label=  # Empty value
```

Follow DNS naming conventions for labels.

## Using kubectl get with Labels

Display resources with their labels:

```bash
# Show labels column
kubectl get pods --show-labels

# Filter by label
kubectl get pods -l app=nginx --show-labels

# Show specific labels as columns
kubectl get pods -L app,version,environment

# Custom columns including labels
kubectl get pods -o custom-columns=NAME:.metadata.name,LABELS:.metadata.labels
```

Viewing labels helps verify labeling schemes.

## Label-Based Resource Deletion

Delete resources by labels:

```bash
# Delete pods with specific label
kubectl delete pods -l app=old-version

# Delete deployments in namespace with label
kubectl delete deployments -l deprecated=true -n production

# Delete across resource types
kubectl delete deployment,service,configmap -l app=legacy
```

Label-based deletion removes related resources together.

## Annotation for CI/CD Integration

Track deployment metadata:

```bash
#!/bin/bash
# ci-deploy-annotate.sh

DEPLOYMENT=$1
VERSION=$2
GIT_COMMIT=$3

kubectl annotate deployment $DEPLOYMENT \
  deployed-version="$VERSION" \
  git-commit="$GIT_COMMIT" \
  deployed-by="$USER" \
  deployment-time="$(date -Iseconds)" \
  ci-pipeline="$CI_PIPELINE_ID" \
  --overwrite

echo "Deployment annotated with CI/CD metadata"
```

This creates deployment audit trails.

## Monitoring Label Coverage

Check labeling completeness:

```bash
#!/bin/bash
# check-label-coverage.sh

LABEL="environment"

echo "Resources missing '$LABEL' label:"

# Check pods
echo "Pods:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.labels.environment == null) | "\(.metadata.namespace)/\(.metadata.name)"'

# Check deployments
echo "Deployments:"
kubectl get deployments --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.labels.environment == null) | "\(.metadata.namespace)/\(.metadata.name)"'

# Check services
echo "Services:"
kubectl get services --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.labels.environment == null) | "\(.metadata.namespace)/\(.metadata.name)"'
```

This identifies unlabeled resources.

Labels and annotations bring order to Kubernetes clusters. Label resources for filtering and selection, annotate them with operational metadata, and build consistent organizational schemes. Apply labels and annotations in bulk to standardize environments, then leverage them in selectors, automation, and monitoring. For more resource organization techniques, check out https://oneuptime.com/blog/post/kubectl-get-sort-by-resources/view.
