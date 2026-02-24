# How to Roll Back Istio Configuration Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rollback, GitOps, Kubernetes, Incident Response

Description: How to quickly and safely roll back Istio configuration changes when something goes wrong in production using multiple strategies.

---

You pushed a VirtualService change to production and now requests are timing out. Or an AuthorizationPolicy update is blocking legitimate traffic. Whatever the case, you need to get back to the previous working configuration as fast as possible. The speed of your rollback directly determines how long your users are affected.

There are several rollback strategies for Istio configuration, ranging from quick manual fixes to fully automated GitOps rollbacks. The right approach depends on how you deploy your configuration and how fast you need to recover.

## Strategy 1: kubectl Rollback (Fastest)

If you just applied a change with `kubectl apply` and need to undo it immediately, you can use the resource version history that Kubernetes maintains.

For a single resource, you can apply the previous YAML:

```bash
# If you have the previous version saved
kubectl apply -f previous-virtual-service.yaml
```

But realistically, you probably do not have the previous YAML handy. Check what changed with:

```bash
# See the last applied configuration
kubectl get virtualservice order-service -n production -o yaml
```

For a quick rollback, edit the resource directly:

```bash
kubectl edit virtualservice order-service -n production
```

This works in a pinch but is not a great long-term strategy because there is no audit trail.

## Strategy 2: Git Revert

If your configuration lives in git (it should), reverting the problematic commit is the cleanest approach:

```bash
# Find the commit that caused the issue
git log --oneline -- istio-config/production/
# a1b2c3d Increased timeout to 120s for order-service
# d4e5f6g Previous configuration (known good)

# Revert the problematic commit
git revert a1b2c3d

# Apply the reverted configuration
kubectl apply -f istio-config/production/ -R
```

If you need to revert multiple commits:

```bash
# Revert to a specific known-good commit
git revert --no-commit a1b2c3d..HEAD
git commit -m "Revert Istio config to known-good state before timeout change"
kubectl apply -f istio-config/production/ -R
```

## Strategy 3: GitOps Rollback with Argo CD

If you use Argo CD, rolling back is straightforward:

```bash
# List the application history
argocd app history istio-config-production

# Roll back to a specific revision
argocd app rollback istio-config-production <revision-number>
```

Or change the target revision in the Application spec:

```bash
argocd app set istio-config-production --revision istio-config-v1.5.0
argocd app sync istio-config-production
```

With Flux:

```bash
# Suspend automatic reconciliation
flux suspend kustomization istio-config

# Manually apply the previous version
git checkout istio-config-v1.5.0 -- istio-config/production/
kubectl apply -f istio-config/production/ -R

# Or update the Flux Kustomization to point to the old tag
```

## Strategy 4: ConfigMap Snapshot Restore

If you maintained configuration snapshots (a good practice), restore from the last known good snapshot:

```bash
# Restore from snapshot
kubectl get configmap istio-config-snapshot -n istio-system \
  -o jsonpath='{.data.snapshot\.yaml}' | kubectl apply -f -
```

Create snapshots before every change:

```bash
#!/bin/bash
# save-snapshot.sh - Run before applying changes

TIMESTAMP=$(date +%Y%m%d-%H%M%S)

kubectl get virtualservices,destinationrules,authorizationpolicies,peerauthentications,gateways \
  -n production -o yaml > "/tmp/istio-snapshot-${TIMESTAMP}.yaml"

kubectl create configmap "istio-snapshot-${TIMESTAMP}" \
  --from-file="snapshot.yaml=/tmp/istio-snapshot-${TIMESTAMP}.yaml" \
  -n istio-system

# Keep track of the latest
kubectl label configmap "istio-snapshot-${TIMESTAMP}" -n istio-system latest=true
kubectl label configmap -n istio-system -l latest=true latest- 2>/dev/null
kubectl label configmap "istio-snapshot-${TIMESTAMP}" -n istio-system latest=true

echo "Snapshot saved as istio-snapshot-${TIMESTAMP}"
```

## Strategy 5: Rollback Individual Resources

Sometimes you only need to roll back one resource, not everything. If you know which resource changed:

```bash
# Get the resource from the previous git commit
git show HEAD~1:istio-config/production/virtual-services/order-service.yaml | \
  kubectl apply -f -
```

Or if you have the resource name and want to see its history:

```bash
# Check the managedFields to see what changed recently
kubectl get virtualservice order-service -n production -o json | \
  jq '.metadata.managedFields'
```

## Building a Rollback Runbook

Create a standard rollback procedure your team can follow during incidents:

```bash
#!/bin/bash
# rollback-istio.sh - Emergency rollback script

set -e

NAMESPACE=${1:-production}
TARGET_REVISION=${2:-""}

echo "=== Istio Configuration Rollback ==="
echo "Namespace: $NAMESPACE"
echo "Time: $(date -u)"

# Step 1: Save current state
echo "Step 1: Saving current state..."
kubectl get virtualservices,destinationrules,authorizationpolicies \
  -n "$NAMESPACE" -o yaml > "/tmp/pre-rollback-$(date +%s).yaml"

if [ -n "$TARGET_REVISION" ]; then
  # Step 2a: Roll back to specific git revision
  echo "Step 2: Rolling back to revision $TARGET_REVISION..."
  git checkout "$TARGET_REVISION" -- "istio-config/$NAMESPACE/"
  kubectl apply -f "istio-config/$NAMESPACE/" -R
  git checkout HEAD -- "istio-config/$NAMESPACE/"  # Restore working tree
else
  # Step 2b: Roll back to last snapshot
  echo "Step 2: Rolling back to last snapshot..."
  SNAPSHOT=$(kubectl get configmap -n istio-system -l latest=true -o jsonpath='{.items[0].metadata.name}')
  if [ -z "$SNAPSHOT" ]; then
    echo "ERROR: No snapshot found"
    exit 1
  fi
  echo "Using snapshot: $SNAPSHOT"
  kubectl get configmap "$SNAPSHOT" -n istio-system -o jsonpath='{.data.snapshot\.yaml}' | \
    kubectl apply -f -
fi

# Step 3: Verify
echo "Step 3: Verifying rollback..."
sleep 5

# Check for configuration errors
istioctl analyze -n "$NAMESPACE" 2>&1 || true

# Check proxy sync status
istioctl proxy-status 2>&1 | head -20

# Check for 5xx errors
echo "Monitoring error rates for 60 seconds..."
sleep 60
ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(istio_requests_total{response_code=~'5..',destination_service_namespace='$NAMESPACE'}[1m]))" | \
  jq -r '.data.result[0].value[1] // "0"')
echo "Current 5xx error rate: $ERROR_RATE"

echo "=== Rollback complete ==="
```

## Preventing the Need for Rollbacks

The best rollback is the one you never have to do. Here are practices that reduce the risk:

### Dry-Run Before Applying

```bash
# Validate the change will work
kubectl apply --dry-run=server -f istio-config/production/ -R

# Run istioctl analysis
istioctl analyze -f istio-config/production/ --recursive
```

### Gradual Rollout

Instead of applying changes to all services at once, apply them to one service first:

```bash
# Apply only the order-service change first
kubectl apply -f istio-config/production/virtual-services/order-service.yaml

# Monitor for 10 minutes
sleep 600

# If good, apply the rest
kubectl apply -f istio-config/production/ -R
```

### Canary Configuration Changes

For routing changes, use traffic splitting to test the new configuration with a small percentage of traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-config-test:
              exact: "true"
      route:
        - destination:
            host: order-service
            port:
              number: 8080
      timeout: 120s  # New timeout to test
    - route:
        - destination:
            host: order-service
            port:
              number: 8080
      timeout: 30s  # Current timeout
```

Test with the new configuration:

```bash
# Test the new timeout with explicit header
curl -H "x-config-test: true" http://order-service:8080/api/test
```

If it works, remove the match condition and apply the new timeout globally.

## Post-Rollback Checklist

After rolling back, verify everything is working:

```bash
# 1. Check all proxies are in sync
istioctl proxy-status

# 2. Check for configuration warnings
istioctl analyze -n production

# 3. Verify error rates are back to normal
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(istio_requests_total{response_code=~'5..'}[5m]))"

# 4. Check that all services are reachable
for SVC in order-service payment-service catalog-service; do
  kubectl exec -n production deploy/test-pod -- curl -s -o /dev/null -w "%{http_code}" "http://${SVC}:8080/health"
done
```

Fast rollbacks come from preparation. If you set up snapshots, git versioning, and a rollback script before you need them, recovering from a bad configuration change takes minutes instead of hours. The extra 15 minutes of setup is worth it for the peace of mind during the next late-night incident.
