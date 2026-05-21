# How to Use argocd admin Commands for Troubleshooting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Troubleshooting

Description: Learn how to use argocd admin commands for advanced troubleshooting, cluster maintenance, settings validation, backup/restore, and performance diagnostics.

---

The `argocd admin` command family is the power user's toolkit. These commands run directly against the ArgoCD Kubernetes resources (bypassing the API server), making them essential for situations where the ArgoCD server is down, misconfigured, or unresponsive. If `argocd app` commands are your everyday tools, `argocd admin` commands are your emergency repair kit.

## When to Use argocd admin

Use `argocd admin` when:
- The ArgoCD API server is down or unreachable
- You need to validate configuration before applying it
- You are performing backup and restore operations
- You need to diagnose performance issues
- You need to reset passwords or settings directly

**Important**: Most `argocd admin` commands need direct access to the ArgoCD Kubernetes namespace via kubectl, not the ArgoCD API.

## Settings Commands

### Validate RBAC Configuration

```bash
# Validate RBAC policies before applying

argocd admin settings rbac validate --namespace argocd

# Test if a specific user can perform an action
argocd admin settings rbac can role:developer get applications 'default/*' --namespace argocd

# Test with a specific policy file
argocd admin settings rbac can role:developer sync applications 'production/*' \
  --policy-file /path/to/rbac-policy.csv \
  --namespace argocd
```

This is incredibly valuable for testing RBAC changes before they go live:

```bash
#!/bin/bash
# test-rbac.sh - Test RBAC policies before applying

echo "=== RBAC Policy Test ==="
echo ""

NAMESPACE="argocd"

# Test developer role
echo "--- Developer Role ---"
ACTIONS=("get" "create" "update" "delete" "sync")
PROJECTS=("default" "staging" "production")

for project in "${PROJECTS[@]}"; do
  for action in "${ACTIONS[@]}"; do
    RESULT=$(argocd admin settings rbac can role:developer "$action" applications "${project}/*" --namespace "$NAMESPACE" 2>&1)
    printf "  %-8s %-12s %s/%s\n" "$RESULT" "$action" "$project" "*"
  done
done

echo ""
echo "--- CI Bot Role ---"
for project in "${PROJECTS[@]}"; do
  for action in "${ACTIONS[@]}"; do
    RESULT=$(argocd admin settings rbac can ci-bot "$action" applications "${project}/*" --namespace "$NAMESPACE" 2>&1)
    printf "  %-8s %-12s %s/%s\n" "$RESULT" "$action" "$project" "*"
  done
done
```

### View Current Settings

```bash
# Validate ArgoCD settings loaded from ConfigMaps and Secrets
argocd admin settings validate --load-cluster-settings --namespace argocd
```

### Validate Resource Customizations

```bash
# Test resource customization configurations
argocd admin settings resource-overrides health /path/to/resource.yaml \
  --load-cluster-settings \
  --namespace argocd

# Test ignore differences configuration
argocd admin settings resource-overrides ignore-differences /path/to/resource.yaml \
  --load-cluster-settings \
  --namespace argocd
```

## Cluster Management

### List Clusters with Details

```bash
# List cluster secrets directly from Kubernetes
kubectl get secrets -n argocd \
  -l argocd.argoproj.io/secret-type=cluster
```

### Cluster Namespace Scope

```bash
# Print namespaces that ArgoCD manages in each cluster
argocd admin cluster namespaces --namespace argocd
```

This shows the namespace scope per cluster, which helps diagnose cluster access and scoping issues.

### Generate Cluster Declarative Config

```bash
# Generate declarative cluster configuration from a kubeconfig context
argocd admin cluster generate-spec my-context -o yaml
```

## Backup and Restore

### Export All ArgoCD Configuration

```bash
# Export all ArgoCD resources (applications, projects, repos, clusters)
argocd admin export --namespace argocd > argocd-backup.yaml

# Export to a specific file with timestamp
argocd admin export --namespace argocd > "argocd-backup-$(date +%Y%m%d-%H%M%S).yaml"
```

The export includes:
- All Application resources
- All AppProject resources
- Repository configurations
- Cluster configurations

### Import Configuration

```bash
# Import from a backup
argocd admin import - --namespace argocd < argocd-backup.yaml

# Import from a specific file
argocd admin import argocd-backup-20260226-100000.yaml --namespace argocd
```

### Backup Script

```bash
#!/bin/bash
# backup-argocd.sh - Regular ArgoCD backup

BACKUP_DIR="/backups/argocd"
RETENTION_DAYS=30
NAMESPACE="argocd"

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/argocd-backup-$DATE.yaml"

echo "Creating ArgoCD backup: $BACKUP_FILE"
argocd admin export --namespace "$NAMESPACE" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  # Compress the backup
  gzip "$BACKUP_FILE"
  echo "Backup created: ${BACKUP_FILE}.gz"

  # Report backup size
  SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
  echo "Backup size: $SIZE"

  # Count resources in backup
  APP_COUNT=$(zcat "${BACKUP_FILE}.gz" | grep "kind: Application$" | wc -l)
  PROJ_COUNT=$(zcat "${BACKUP_FILE}.gz" | grep "kind: AppProject$" | wc -l)
  echo "Applications: $APP_COUNT"
  echo "Projects: $PROJ_COUNT"
else
  echo "ERROR: Backup failed!"
  exit 1
fi

# Clean up old backups
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "argocd-backup-*.yaml.gz" -mtime "+$RETENTION_DAYS" -delete
echo "Cleanup complete."
```

## Password Reset

When you are locked out of the admin account:

```bash
# Reset the admin password directly (bypasses the API server)
# First, generate a bcrypt hash of the new password
NEW_HASH=$(argocd account bcrypt --password mynewpassword)

# Then patch the secret directly
kubectl patch secret argocd-secret -n argocd \
  -p "{\"stringData\": {\"admin.password\": \"$NEW_HASH\", \"admin.passwordMtime\": \"$(date +%FT%T%Z)\"}}"
```

### Get Initial Admin Password

After a fresh install:

```bash
# Get the auto-generated initial admin password
argocd admin initial-password --namespace argocd
```

## Application Management (Direct)

### List Applications Directly

```bash
# List applications without going through the API server
kubectl get applications -n argocd
```

### Generate Application Declarative Spec

```bash
# Generate declarative config for an application
argocd admin app generate-spec my-app \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-namespace default \
  --dest-server https://kubernetes.default.svc
```

## Repo Configuration Diagnostics

### Generate Repository Declarative Config

Generate repository configuration without the ArgoCD server:

```bash
# Generate declarative repository config for debugging
argocd admin repo generate-spec https://github.com/example/repo.git
```

## Notification Diagnostics

If you have ArgoCD Notifications installed:

```bash
# Test notification templates
argocd admin notifications template notify app-sync-succeeded my-app \
  --namespace argocd
```

## Performance Diagnostics

### Checking Controller Performance

```bash
#!/bin/bash
# perf-check.sh - Check ArgoCD controller performance

NAMESPACE="argocd"

echo "=== ArgoCD Performance Check ==="
echo ""

# Check controller queue depth
echo "--- Controller Metrics ---"
kubectl exec -n "$NAMESPACE" deployment/argocd-application-controller -- \
  curl -s localhost:8082/metrics 2>/dev/null | \
  grep -E "argocd_app_reconcile|argocd_app_k8s_request|workqueue" | head -20

echo ""
echo "--- Repo Server Metrics ---"
kubectl exec -n "$NAMESPACE" deployment/argocd-repo-server -- \
  curl -s localhost:8084/metrics 2>/dev/null | \
  grep -E "argocd_git_request|argocd_repo" | head -20

echo ""
echo "--- API Server Metrics ---"
kubectl exec -n "$NAMESPACE" deployment/argocd-server -- \
  curl -s localhost:8083/metrics 2>/dev/null | \
  grep -E "argocd_app_info|grpc" | head -20
```

Resource Usage Check

```bash
#!/bin/bash
# resource-usage.sh - Check ArgoCD resource usage

NAMESPACE="argocd"

echo "=== ArgoCD Resource Usage ==="
echo ""

kubectl top pods -n "$NAMESPACE" 2>/dev/null || echo "Metrics server not available"

echo ""
echo "--- Pod Status ---"
kubectl get pods -n "$NAMESPACE" -o wide

echo ""
echo "--- Resource Requests/Limits ---"
kubectl get pods -n "$NAMESPACE" -o json | jq '
  .items[] |
  {
    name: .metadata.name,
    containers: [.spec.containers[] | {
      name: .name,
      requests: .resources.requests,
      limits: .resources.limits
    }]
  }
'
```

## Comprehensive Diagnostics Script

```bash
#!/bin/bash
# argocd-diagnostic.sh - Comprehensive ArgoCD diagnostics

NAMESPACE="argocd"

echo "====================================="
echo "  ArgoCD Comprehensive Diagnostics"
echo "====================================="
echo ""

# Version
echo "--- ArgoCD Version ---"
argocd version --short 2>/dev/null || echo "CLI not connected"
echo ""

# Component health
echo "--- Component Health ---"
kubectl get pods -n "$NAMESPACE" -o wide
echo ""

# Recent restarts
echo "--- Recent Restarts ---"
kubectl get pods -n "$NAMESPACE" -o json | jq -r '
  .items[] |
  select(.status.containerStatuses[].restartCount > 0) |
  "\(.metadata.name): \(.status.containerStatuses[].restartCount) restarts"
'
echo ""

# ConfigMap settings
echo "--- Key Settings ---"
echo "Application count: $(kubectl get applications -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)"
echo "Project count: $(kubectl get appprojects -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)"
echo ""

# Check for errors in recent logs
echo "--- Recent Errors (last 5 minutes) ---"
for component in argocd-application-controller argocd-server argocd-repo-server; do
  ERRORS=$(kubectl logs "deployment/$component" -n "$NAMESPACE" --since=5m 2>/dev/null | grep -ci "error\|fatal\|panic")
  echo "  $component: $ERRORS error(s)"
done
echo ""

# RBAC validation
echo "--- RBAC Validation ---"
argocd admin settings rbac validate --namespace "$NAMESPACE" 2>&1
echo ""

# Repository status
echo "--- Repository Status ---"
argocd repo list 2>/dev/null || echo "Cannot connect to ArgoCD server"
echo ""

# Cluster status
echo "--- Cluster Status ---"
argocd cluster list 2>/dev/null || echo "Cannot connect to ArgoCD server"
echo ""

echo "====================================="
echo "  Diagnostics Complete"
echo "====================================="
```

## Emergency Recovery Procedures

### ArgoCD Server Is Down

```bash
# Check what is wrong
kubectl get pods -n argocd
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-server

# Check logs
kubectl logs -n argocd deployment/argocd-server --previous

# Restart the server
kubectl rollout restart deployment/argocd-server -n argocd
```

### Controller Is Not Reconciling

```bash
# Check controller status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Check for OOM kills
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-application-controller | grep -A5 "Last State"

# Restart controller
kubectl rollout restart statefulset/argocd-application-controller -n argocd
```

### Redis Issues

```bash
# Check Redis status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-redis

# Check Redis memory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory

# Flush Redis cache (if needed)
kubectl exec -n argocd deployment/argocd-redis -- redis-cli flushall
```

## Summary

The `argocd admin` command family is your last resort troubleshooting toolkit. Use it when the ArgoCD API server is unresponsive, when you need to validate configuration before applying, for backup and restore operations, and for deep performance diagnostics. The RBAC validation commands (`argocd admin settings rbac can`) are useful even in normal operations for testing policy changes before they affect users. Always have your backup scripts running regularly - they are your safety net for disaster recovery.
