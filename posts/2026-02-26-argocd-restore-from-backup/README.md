# How to Restore ArgoCD from Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Backups, Disaster Recovery

Description: Learn how to restore ArgoCD from a backup including applications, projects, credentials, and configuration for disaster recovery scenarios.

---

Restoring ArgoCD from backup is the critical second half of any disaster recovery plan. Whether you are recovering from a cluster failure, migrating to a new cluster, or rolling back a bad configuration change, knowing how to restore ArgoCD reliably is essential. This guide walks through the complete restore process, from preparing the backup files to verifying the restored state.

## When to Restore

Common scenarios that require an ArgoCD restore:

- **Cluster failure** - The Kubernetes cluster running ArgoCD is lost
- **Namespace deletion** - Someone accidentally deleted the argocd namespace
- **Configuration corruption** - Bad changes to ArgoCD ConfigMaps or RBAC
- **Migration** - Moving ArgoCD to a new cluster
- **Version rollback** - Reverting to a previous ArgoCD configuration after an upgrade gone wrong

## Prerequisites

Before restoring, ensure:

1. A working Kubernetes cluster is available
2. ArgoCD is installed (fresh installation)
3. You have the backup files
4. kubectl is configured to connect to the target cluster
5. You have cluster-admin permissions

## Using argocd admin import

The simplest restore method uses the built-in admin tool:

```bash
# Import from a backup file created with argocd admin export
argocd admin import -n argocd < argocd-backup.yaml
```

This command reads the YAML documents from the backup and creates or updates the resources in the argocd namespace.

## Step-by-Step Manual Restore

For more control over the restore process, do it manually:

### Step 1: Install ArgoCD

If ArgoCD is not already installed:

```bash
# Create the namespace
kubectl create namespace argocd

# Install ArgoCD (use the same version as the backup)
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.0/manifests/install.yaml

# Wait for the installation to be ready
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=120s
```

### Step 2: Restore ConfigMaps

Restore configuration first, as other resources may depend on it:

```bash
# Restore the main configuration
kubectl apply -f cm-argocd-cm.yaml -n argocd

# Restore RBAC configuration
kubectl apply -f cm-argocd-rbac-cm.yaml -n argocd

# Restore command parameters
kubectl apply -f cm-argocd-cmd-params-cm.yaml -n argocd

# Restore notification configuration
kubectl apply -f cm-argocd-notifications-cm.yaml -n argocd

# Restore SSH known hosts
kubectl apply -f cm-argocd-ssh-known-hosts-cm.yaml -n argocd

# Restore TLS certificates
kubectl apply -f cm-argocd-tls-certs-cm.yaml -n argocd

# Restore GPG keys
kubectl apply -f cm-argocd-gpg-keys-cm.yaml -n argocd
```

### Step 3: Restore Secrets

```bash
# Restore repository credentials
kubectl apply -f secrets-repos.yaml -n argocd

# Restore repository credential templates
kubectl apply -f secrets-repo-creds.yaml -n argocd

# Restore cluster credentials
kubectl apply -f secrets-clusters.yaml -n argocd

# Restore notification secrets
kubectl apply -f secrets-notifications.yaml -n argocd
```

### Step 4: Restart ArgoCD Components

After restoring ConfigMaps and Secrets, restart ArgoCD to pick up the changes:

```bash
# Restart all ArgoCD components
kubectl rollout restart deployment argocd-server -n argocd
kubectl rollout restart deployment argocd-repo-server -n argocd
kubectl rollout restart deployment argocd-applicationset-controller -n argocd
kubectl rollout restart deployment argocd-notifications-controller -n argocd
kubectl rollout restart statefulset argocd-application-controller -n argocd

# Wait for all components to be ready
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=120s
kubectl wait --for=condition=available deployment/argocd-repo-server -n argocd --timeout=120s
```

### Step 5: Restore Projects

Projects must be restored before applications, since applications reference projects:

```bash
# Clean up managed fields and status before applying
cat projects-backup.yaml | python3 -c "
import sys, yaml
for doc in yaml.safe_load_all(sys.stdin):
    if doc is None:
        continue
    meta = doc.get('metadata', {})
    for field in ['resourceVersion', 'uid', 'creationTimestamp',
                  'generation', 'managedFields']:
        meta.pop(field, None)
    doc.pop('status', None)
    print('---')
    print(yaml.dump(doc, default_flow_style=False))
" | kubectl apply -n argocd -f -
```

### Step 6: Restore Applications

```bash
# Restore applications (also clean managed fields)
cat applications-backup.yaml | python3 -c "
import sys, yaml
for doc in yaml.safe_load_all(sys.stdin):
    if doc is None:
        continue
    meta = doc.get('metadata', {})
    for field in ['resourceVersion', 'uid', 'creationTimestamp',
                  'generation', 'managedFields']:
        meta.pop(field, None)
    # Remove status - ArgoCD will re-evaluate
    doc.pop('status', None)
    # Remove operation state
    if 'operation' in doc:
        del doc['operation']
    print('---')
    print(yaml.dump(doc, default_flow_style=False))
" | kubectl apply -n argocd -f -
```

### Step 7: Restore ApplicationSets

```bash
# Restore ApplicationSets
cat applicationsets-backup.yaml | python3 -c "
import sys, yaml
for doc in yaml.safe_load_all(sys.stdin):
    if doc is None:
        continue
    meta = doc.get('metadata', {})
    for field in ['resourceVersion', 'uid', 'creationTimestamp',
                  'generation', 'managedFields']:
        meta.pop(field, None)
    doc.pop('status', None)
    print('---')
    print(yaml.dump(doc, default_flow_style=False))
" | kubectl apply -n argocd -f -
```

## Complete Restore Script

Here is an automated restore script:

```bash
#!/bin/bash
# argocd-restore.sh - Complete ArgoCD restore from backup

set -euo pipefail

BACKUP_DIR="$1"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: $0 <backup-directory>"
  exit 1
fi

# If backup is compressed, extract it
if [[ "$BACKUP_DIR" == *.tar.gz ]]; then
  EXTRACT_DIR="/tmp/argocd-restore-$(date +%s)"
  mkdir -p "$EXTRACT_DIR"
  tar -xzf "$BACKUP_DIR" -C "$EXTRACT_DIR"
  BACKUP_DIR="$EXTRACT_DIR/$(ls "$EXTRACT_DIR")"
fi

echo "Restoring ArgoCD from: $BACKUP_DIR"
echo "Target namespace: $NAMESPACE"
echo ""

# Helper function to clean and apply YAML
clean_and_apply() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "  File not found: $file (skipping)"
    return
  fi

  python3 -c "
import sys, yaml
for doc in yaml.safe_load_all(open('$file')):
    if doc is None:
        continue
    if doc.get('kind') == 'List':
        items = doc.get('items', [])
    else:
        items = [doc]
    for item in items:
        meta = item.get('metadata', {})
        for field in ['resourceVersion', 'uid', 'creationTimestamp',
                      'generation', 'managedFields', 'selfLink']:
            meta.pop(field, None)
        item.pop('status', None)
        item.pop('operation', None)
        print('---')
        print(yaml.dump(item, default_flow_style=False))
" | kubectl apply -n "$NAMESPACE" -f - 2>&1 | sed 's/^/  /'
}

# Step 1: ConfigMaps
echo "Step 1: Restoring ConfigMaps..."
for cm_file in "$BACKUP_DIR"/cm-*.yaml; do
  [ -f "$cm_file" ] && kubectl apply -f "$cm_file" -n "$NAMESPACE" 2>&1 | sed 's/^/  /'
done

# Step 2: Secrets
echo ""
echo "Step 2: Restoring Secrets..."
for secret_file in "$BACKUP_DIR"/secrets-*.yaml; do
  [ -f "$secret_file" ] && clean_and_apply "$secret_file"
done

# Step 3: Restart ArgoCD
echo ""
echo "Step 3: Restarting ArgoCD components..."
kubectl rollout restart deployment argocd-server -n "$NAMESPACE" 2>/dev/null || true
kubectl rollout restart deployment argocd-repo-server -n "$NAMESPACE" 2>/dev/null || true
kubectl rollout restart statefulset argocd-application-controller -n "$NAMESPACE" 2>/dev/null || true
echo "  Waiting for components to be ready..."
sleep 15

# Step 4: Projects
echo ""
echo "Step 4: Restoring Projects..."
clean_and_apply "$BACKUP_DIR/projects.yaml"

# Step 5: Applications
echo ""
echo "Step 5: Restoring Applications..."
clean_and_apply "$BACKUP_DIR/applications.yaml"

# Step 6: ApplicationSets
echo ""
echo "Step 6: Restoring ApplicationSets..."
clean_and_apply "$BACKUP_DIR/applicationsets.yaml"

# Step 7: Verify
echo ""
echo "Step 7: Verification..."
echo "  Applications: $(kubectl get applications.argoproj.io -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo "  Projects: $(kubectl get appprojects.argoproj.io -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo "  ApplicationSets: $(kubectl get applicationsets.argoproj.io -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l | tr -d ' ')"

echo ""
echo "Restore complete! ArgoCD will begin reconciling applications."
echo "Monitor progress: kubectl get applications -n $NAMESPACE"
```

## Post-Restore Verification

After restoring, verify everything is working:

```bash
# Check all ArgoCD components are running
kubectl get pods -n argocd

# Verify application count matches backup
kubectl get applications.argoproj.io -n argocd --no-headers | wc -l

# Check for applications in error state
kubectl get applications.argoproj.io -n argocd -o json | \
  jq -r '.items[] | select(.status.sync.status != "Synced" or .status.health.status != "Healthy") |
    "\(.metadata.name): sync=\(.status.sync.status), health=\(.status.health.status)"'

# Verify repository connections
argocd repo list

# Verify cluster connections
argocd cluster list

# Check the ArgoCD server logs for errors
kubectl logs deployment/argocd-server -n argocd --tail=50
```

## Handling Common Restore Issues

### Resource Already Exists

```bash
# Use server-side apply to handle conflicts
kubectl apply -f applications-backup.yaml -n argocd --server-side --force-conflicts
```

### Secret Decode Issues

```bash
# If secrets have encoding issues, re-encode them
kubectl get secret my-repo-secret -n argocd -o json | \
  jq '.data | map_values(@base64d)' # Check decoded values
```

### Cluster Credentials Invalid

After restoring to a new cluster, cluster credentials from the old backup may be invalid:

```bash
# Re-add clusters after restore
argocd cluster add my-context --name my-cluster
```

Restoring ArgoCD from backup should be a well-rehearsed procedure. Practice it regularly in a staging environment, document the steps for your team, and automate as much as possible. The best disaster recovery plan is one that has been tested before you actually need it.
