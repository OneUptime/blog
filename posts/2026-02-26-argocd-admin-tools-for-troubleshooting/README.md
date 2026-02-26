# How to Use argocd admin Tools for Troubleshooting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Administration

Description: Learn how to use the argocd admin command-line tools to troubleshoot ArgoCD issues including settings validation, cluster management, RBAC testing, and data export.

---

The `argocd admin` subcommand is a collection of powerful diagnostic and administrative tools that most ArgoCD users never discover. These tools let you validate settings, test RBAC policies, export data, manage clusters, and debug issues that the regular CLI cannot handle. Here is how to use each one effectively.

## Getting Access to argocd admin

The `argocd admin` commands are included in the standard ArgoCD CLI binary. Some commands run against the ArgoCD API server, while others work directly against the Kubernetes cluster where ArgoCD is installed.

```bash
# Check available admin commands
argocd admin --help

# Most admin commands need kubeconfig access to the argocd namespace
# Make sure you have the right context
kubectl config current-context
```

## Testing RBAC Policies

One of the most useful admin tools. Before deploying RBAC changes, test them:

```bash
# Test if a user can perform an action
argocd admin settings rbac can role:developer get applications 'default/*' \
  --namespace argocd

# Test with a specific policy file
argocd admin settings rbac can role:developer sync applications 'production/*' \
  --namespace argocd --policy-file policy.csv

# Validate the entire RBAC policy for errors
argocd admin settings rbac validate --namespace argocd
```

For a comprehensive RBAC test:

```bash
#!/bin/bash
# rbac-test.sh - Test RBAC permissions for different roles

NAMESPACE="argocd"
ROLES=("role:admin" "role:developer" "role:readonly")
ACTIONS=("get" "create" "update" "delete" "sync")
RESOURCES=("applications" "projects" "clusters" "repositories")

for role in "${ROLES[@]}"; do
    echo "=== $role ==="
    for resource in "${RESOURCES[@]}"; do
        for action in "${ACTIONS[@]}"; do
            result=$(argocd admin settings rbac can "$role" "$action" "$resource" '*/*' \
              --namespace $NAMESPACE 2>&1)
            if echo "$result" | grep -q "Yes"; then
                echo "  $action $resource: ALLOWED"
            fi
        done
    done
    echo ""
done
```

## Validating ArgoCD Settings

Check if your ArgoCD configuration is valid:

```bash
# Validate all settings in argocd-cm ConfigMap
argocd admin settings validate --namespace argocd

# Check specific settings
argocd admin settings resource-overrides list --namespace argocd
```

Common validation issues this catches:
- Invalid YAML in Dex configuration
- Broken resource customization Lua scripts
- Invalid health check scripts
- Misconfigured resource actions

## Exporting and Importing ArgoCD Data

The export/import tools are critical for backups and migrations:

```bash
# Export all ArgoCD data (applications, projects, settings)
argocd admin export --namespace argocd > argocd-backup.yaml

# Export only applications
argocd admin export --namespace argocd | \
  grep -A 1000 'kind: Application' > applications-backup.yaml
```

The export produces a YAML stream that includes:
- Applications
- AppProjects
- Repository credentials
- Cluster configurations
- ConfigMaps (argocd-cm, argocd-rbac-cm)

To restore from a backup:

```bash
# Import ArgoCD data from backup
argocd admin import --namespace argocd < argocd-backup.yaml
```

## Managing ArgoCD Database

ArgoCD uses Kubernetes resources as its database. The admin tools help manage this:

```bash
# List all applications with their status
argocd admin app generate-spec my-app --namespace argocd

# Get the initial admin password
argocd admin initial-password --namespace argocd
```

## Debugging with Settings Resource Overrides

Check how ArgoCD is interpreting resource customizations:

```bash
# List all resource overrides
argocd admin settings resource-overrides list --namespace argocd

# Check health assessment for a specific resource type
argocd admin settings resource-overrides health deployment --namespace argocd

# Check ignore differences for a specific resource type
argocd admin settings resource-overrides ignore-differences deployment --namespace argocd

# Check custom actions for a resource type
argocd admin settings resource-overrides action list deployment --namespace argocd
```

This is invaluable when custom health checks or ignore-difference rules are not working as expected.

## Testing Custom Health Checks

Before deploying a custom health check, test it:

```bash
# Test a custom health check Lua script
argocd admin settings resource-overrides health \
  argoproj.io/Rollout \
  --namespace argocd
```

To test a health check script locally:

```yaml
# resource-overrides in argocd-cm
resource.customizations.health.argoproj.io_Rollout: |
  hs = {}
  if obj.status ~= nil then
    if obj.status.currentPodHash ~= nil then
      hs.status = "Healthy"
      hs.message = "Rollout is healthy"
    else
      hs.status = "Progressing"
      hs.message = "Waiting for pods"
    end
  else
    hs.status = "Progressing"
    hs.message = "No status yet"
  end
  return hs
```

```bash
# Validate the Lua script syntax
argocd admin settings resource-overrides health \
  argoproj.io/Rollout \
  --namespace argocd 2>&1
```

## Cluster Management

```bash
# List clusters with detailed information
argocd admin cluster stats --namespace argocd

# Generate a declarative cluster secret
argocd admin cluster generate-spec my-cluster \
  --namespace argocd
```

The `cluster stats` command shows useful metrics:
- Number of applications per cluster
- Resource count per cluster
- Connection status

## Checking Notifications Configuration

```bash
# List configured notification templates
argocd admin notifications template list --namespace argocd

# List configured notification triggers
argocd admin notifications trigger list --namespace argocd

# Test a notification template
argocd admin notifications template notify \
  app-sync-succeeded my-app \
  --namespace argocd

# Test a notification trigger
argocd admin notifications trigger run \
  on-sync-succeeded my-app \
  --namespace argocd
```

## Managing Repository Credentials

```bash
# List configured repositories
argocd admin repo list --namespace argocd

# Validate repository access
argocd admin repo validate --namespace argocd
```

## Full Diagnostic Report

Here is a script that generates a comprehensive diagnostic report using admin tools:

```bash
#!/bin/bash
# argocd-diagnostic-report.sh

NAMESPACE="argocd"
REPORT_FILE="argocd-diagnostic-$(date +%Y%m%d-%H%M%S).txt"

echo "Generating ArgoCD Diagnostic Report..." | tee $REPORT_FILE

# ArgoCD Version
echo -e "\n=== ArgoCD Version ===" | tee -a $REPORT_FILE
argocd version --short 2>&1 | tee -a $REPORT_FILE

# Component Health
echo -e "\n=== Component Pods ===" | tee -a $REPORT_FILE
kubectl get pods -n $NAMESPACE -o wide 2>&1 | tee -a $REPORT_FILE

# Settings Validation
echo -e "\n=== Settings Validation ===" | tee -a $REPORT_FILE
argocd admin settings validate --namespace $NAMESPACE 2>&1 | tee -a $REPORT_FILE

# RBAC Validation
echo -e "\n=== RBAC Validation ===" | tee -a $REPORT_FILE
argocd admin settings rbac validate --namespace $NAMESPACE 2>&1 | tee -a $REPORT_FILE

# Resource Overrides
echo -e "\n=== Resource Overrides ===" | tee -a $REPORT_FILE
argocd admin settings resource-overrides list --namespace $NAMESPACE 2>&1 | tee -a $REPORT_FILE

# Cluster Stats
echo -e "\n=== Cluster Stats ===" | tee -a $REPORT_FILE
argocd admin cluster stats --namespace $NAMESPACE 2>&1 | tee -a $REPORT_FILE

# Application Summary
echo -e "\n=== Application Summary ===" | tee -a $REPORT_FILE
argocd app list --output wide 2>&1 | tee -a $REPORT_FILE

# Notification Config
echo -e "\n=== Notification Templates ===" | tee -a $REPORT_FILE
argocd admin notifications template list --namespace $NAMESPACE 2>&1 | tee -a $REPORT_FILE

echo -e "\n=== Notification Triggers ===" | tee -a $REPORT_FILE
argocd admin notifications trigger list --namespace $NAMESPACE 2>&1 | tee -a $REPORT_FILE

echo -e "\nReport saved to: $REPORT_FILE"
```

## Common Admin Command Quick Reference

| Command | Purpose |
|---------|---------|
| `argocd admin settings validate` | Validate all ArgoCD settings |
| `argocd admin settings rbac can` | Test RBAC permissions |
| `argocd admin settings rbac validate` | Validate RBAC policy syntax |
| `argocd admin export` | Export all ArgoCD data |
| `argocd admin import` | Import ArgoCD data from backup |
| `argocd admin cluster stats` | Show cluster statistics |
| `argocd admin initial-password` | Get the initial admin password |
| `argocd admin settings resource-overrides` | Manage resource customizations |
| `argocd admin notifications template` | Manage notification templates |
| `argocd admin notifications trigger` | Manage notification triggers |

## Summary

The `argocd admin` toolset is your Swiss Army knife for ArgoCD troubleshooting. Use `settings validate` to catch configuration errors, `settings rbac can` to test permissions before deploying, `export/import` for backups and migrations, and `settings resource-overrides` to debug custom health checks and diff behaviors. These commands save hours of guessing and log-reading by giving you direct insight into how ArgoCD interprets your configuration.
