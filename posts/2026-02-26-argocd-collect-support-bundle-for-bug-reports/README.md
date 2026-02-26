# How to Collect ArgoCD Support Bundle for Bug Reports

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Support, Debugging

Description: Learn how to collect a comprehensive ArgoCD support bundle for filing bug reports, including logs, configuration, resource state, and metrics to help maintainers reproduce issues.

---

When you hit a bug in ArgoCD that you cannot resolve yourself, filing a good bug report is the fastest path to getting help. The ArgoCD maintainers need specific information to reproduce and diagnose your issue. This guide shows you how to collect a complete support bundle that makes your bug report actionable.

## What a Good Support Bundle Contains

A thorough ArgoCD support bundle should include:
1. ArgoCD version and deployment details
2. Component pod status and resource usage
3. Logs from all relevant components
4. Configuration (ConfigMaps, minus secrets)
5. Application definitions and status
6. Kubernetes events
7. Metrics (if available)
8. Steps to reproduce the issue

## Quick Collection: The Automated Script

Here is a comprehensive script that collects everything:

```bash
#!/bin/bash
# argocd-support-bundle.sh
# Collects diagnostic information for ArgoCD bug reports

set -e

NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
BUNDLE_DIR="argocd-support-bundle-$(date +%Y%m%d-%H%M%S)"
TAIL_LINES=1000

echo "Collecting ArgoCD support bundle..."
echo "Namespace: $NAMESPACE"
echo "Output: $BUNDLE_DIR/"

mkdir -p "$BUNDLE_DIR"/{logs,config,applications,status}

# ============================================
# 1. Version and environment info
# ============================================
echo "Collecting version info..."

cat > "$BUNDLE_DIR/environment.txt" << ENVEOF
Collection Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Kubernetes Version: $(kubectl version --short 2>/dev/null || kubectl version -o json 2>/dev/null | jq -r '.serverVersion.gitVersion')
Kubectl Version: $(kubectl version --client --short 2>/dev/null || echo "unknown")
ArgoCD CLI Version: $(argocd version --client --short 2>/dev/null || echo "not installed")
Namespace: $NAMESPACE
ENVEOF

# ArgoCD server version (from container image)
kubectl get deploy -n $NAMESPACE -o json 2>/dev/null | \
  jq -r '.items[] | "\(.metadata.name): \(.spec.template.spec.containers[0].image)"' \
  >> "$BUNDLE_DIR/environment.txt"

# ============================================
# 2. Pod status
# ============================================
echo "Collecting pod status..."

kubectl get pods -n $NAMESPACE -o wide > "$BUNDLE_DIR/status/pods.txt" 2>&1
kubectl describe pods -n $NAMESPACE > "$BUNDLE_DIR/status/pods-describe.txt" 2>&1
kubectl top pods -n $NAMESPACE > "$BUNDLE_DIR/status/pods-resources.txt" 2>&1

# ============================================
# 3. Component logs
# ============================================
echo "Collecting logs..."

COMPONENTS=(
  "argocd-server"
  "argocd-application-controller"
  "argocd-repo-server"
  "argocd-dex-server"
  "argocd-redis"
  "argocd-notifications-controller"
  "argocd-applicationset-controller"
)

for comp in "${COMPONENTS[@]}"; do
  echo "  Logs: $comp"
  # Current logs
  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=$comp \
    --tail=$TAIL_LINES --max-log-requests=10 \
    > "$BUNDLE_DIR/logs/${comp}.log" 2>&1
  # Previous logs
  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=$comp \
    --previous --tail=$TAIL_LINES --max-log-requests=10 \
    > "$BUNDLE_DIR/logs/${comp}-previous.log" 2>&1
done

# ============================================
# 4. Configuration (sanitized)
# ============================================
echo "Collecting configuration..."

# ConfigMaps (safe to share)
kubectl get configmap argocd-cm -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/argocd-cm.yaml" 2>&1
kubectl get configmap argocd-rbac-cm -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/argocd-rbac-cm.yaml" 2>&1
kubectl get configmap argocd-cmd-params-cm -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/argocd-cmd-params-cm.yaml" 2>&1
kubectl get configmap argocd-ssh-known-hosts-cm -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/argocd-ssh-known-hosts-cm.yaml" 2>&1
kubectl get configmap argocd-tls-certs-cm -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/argocd-tls-certs-cm.yaml" 2>&1

# Deployments (container args, resource limits)
kubectl get deployments -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/deployments.yaml" 2>&1

# Services
kubectl get services -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/services.yaml" 2>&1

# Ingress
kubectl get ingress -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/ingress.yaml" 2>&1

# ============================================
# 5. Applications
# ============================================
echo "Collecting application information..."

# Application list with status
kubectl get applications -n $NAMESPACE \
  -o custom-columns=NAME:.metadata.name,SYNC:.status.sync.status,HEALTH:.status.health.status,PROJECT:.spec.project \
  > "$BUNDLE_DIR/applications/app-list.txt" 2>&1

# Full application specs (redact if needed)
kubectl get applications -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/applications/all-applications.yaml" 2>&1

# Applications with conditions (errors)
kubectl get applications -n $NAMESPACE -o json 2>/dev/null | \
  jq '[.items[] | select(.status.conditions != null and (.status.conditions | length > 0)) | {
    name: .metadata.name,
    conditions: .status.conditions
  }]' > "$BUNDLE_DIR/applications/apps-with-conditions.json" 2>&1

# Projects
kubectl get appprojects -n $NAMESPACE -o yaml \
  > "$BUNDLE_DIR/config/projects.yaml" 2>&1

# ============================================
# 6. Events
# ============================================
echo "Collecting events..."

kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' \
  > "$BUNDLE_DIR/status/events.txt" 2>&1

# ============================================
# 7. Error summary
# ============================================
echo "Generating error summary..."

echo "=== Error Summary ===" > "$BUNDLE_DIR/error-summary.txt"
echo "" >> "$BUNDLE_DIR/error-summary.txt"

for logfile in "$BUNDLE_DIR"/logs/*.log; do
  component=$(basename "$logfile" .log)
  errors=$(grep -c "level=error\|level=fatal" "$logfile" 2>/dev/null || echo 0)
  if [ "$errors" -gt 0 ]; then
    echo "$component: $errors errors" >> "$BUNDLE_DIR/error-summary.txt"
    echo "--- Top errors ---" >> "$BUNDLE_DIR/error-summary.txt"
    grep "level=error\|level=fatal" "$logfile" | \
      sort | uniq -c | sort -rn | head -5 >> "$BUNDLE_DIR/error-summary.txt"
    echo "" >> "$BUNDLE_DIR/error-summary.txt"
  fi
done

# ============================================
# 8. Create tarball
# ============================================
echo "Creating archive..."
tar czf "${BUNDLE_DIR}.tar.gz" "$BUNDLE_DIR"

echo ""
echo "Support bundle created: ${BUNDLE_DIR}.tar.gz"
echo ""
echo "IMPORTANT: Before sharing, review the bundle for sensitive data:"
echo "  - Check config files for client secrets or tokens"
echo "  - Check application specs for sensitive values"
echo "  - Check logs for any leaked credentials"
echo ""
echo "Error summary:"
cat "$BUNDLE_DIR/error-summary.txt"
```

## Sanitizing the Bundle Before Sharing

Before attaching the bundle to a GitHub issue, remove sensitive data:

```bash
# Check for potential secrets in the bundle
grep -rl "password\|secret\|token\|key" argocd-support-bundle-*/ | \
  grep -v ".log" | sort

# Remove client secrets from ConfigMap exports
sed -i 's/clientSecret:.*/clientSecret: REDACTED/g' \
  argocd-support-bundle-*/config/argocd-cm.yaml

# Remove repository credentials
rm -f argocd-support-bundle-*/config/repo-credentials.yaml
```

## What to Include in the Bug Report

Use this template when filing an issue on the ArgoCD GitHub repository:

```markdown
## Bug Description

[Clear description of the issue]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- ArgoCD version: [from support bundle]
- Kubernetes version: [from support bundle]
- Installation method: [Helm/kubectl/Kustomize]
- HA mode: [Yes/No]

## Relevant Logs

[Paste the relevant error messages from logs]

## Configuration

[Paste relevant ConfigMap sections, with secrets redacted]

## Support Bundle

[Attach the sanitized support bundle tar.gz]
```

## Collecting Specific Information

### For Sync Failure Bugs

```bash
# Get detailed sync result for the failing application
kubectl get application my-app -n argocd -o json | \
  jq '{
    syncStatus: .status.sync,
    operationState: .status.operationState,
    conditions: .status.conditions,
    source: .spec.source
  }' > sync-failure-details.json
```

### For Performance Bugs

```bash
# Collect metrics snapshot
kubectl port-forward -n argocd deploy/argocd-application-controller 8082:8082 &
curl -s localhost:8082/metrics > controller-metrics.txt
kill %1

kubectl port-forward -n argocd deploy/argocd-server 8083:8083 &
curl -s localhost:8083/metrics > server-metrics.txt
kill %1

kubectl port-forward -n argocd deploy/argocd-repo-server 8084:8084 &
curl -s localhost:8084/metrics > repo-server-metrics.txt
kill %1
```

### For Authentication Bugs

```bash
# Collect Dex configuration (sanitized)
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.dex\.config}' | \
  sed 's/clientSecret:.*/clientSecret: REDACTED/g' | \
  sed 's/clientID:.*/clientID: REDACTED/g' \
  > dex-config-sanitized.yaml

# Collect recent Dex and API server auth logs
kubectl logs -n argocd deploy/argocd-dex-server --tail=200 | \
  grep -i "auth\|login\|token\|error" > dex-auth-logs.txt

kubectl logs -n argocd deploy/argocd-server --tail=200 | \
  grep -i "auth\|login\|session\|error" > server-auth-logs.txt
```

## Using argocd admin Export

The ArgoCD admin export command creates a complete backup that can also serve as a support bundle:

```bash
# Export all ArgoCD data
argocd admin export --namespace argocd > argocd-export.yaml

# This includes:
# - All Application resources
# - All AppProject resources
# - ConfigMaps
# - Repository configurations (credentials redacted)
```

## Summary

A good ArgoCD support bundle collects version information, component logs, configuration (sanitized), application state, and Kubernetes events. Use the automated script above to collect everything at once, then sanitize sensitive data before sharing. The faster you can provide complete diagnostic information, the faster the ArgoCD community or your team can help resolve the issue. For ongoing issue tracking and incident management, integrate ArgoCD monitoring with [OneUptime](https://oneuptime.com) to automatically capture diagnostic data when problems occur.
