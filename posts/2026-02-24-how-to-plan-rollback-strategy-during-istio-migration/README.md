# How to Plan Rollback Strategy During Istio Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Rollback, Kubernetes, Service Mesh, DevOps

Description: How to plan and execute rollback strategies when migrating to Istio so you can recover quickly from any issues during the transition.

---

Every Istio migration plan needs a rollback strategy. Hoping nothing goes wrong is not a strategy. Having a clear, tested path back to the pre-Istio state is what separates a smooth migration from a 3am incident.

The tricky part is that "rolling back Istio" is not a single action. Depending on how far along you are in the migration, rollback means different things. You might need to roll back a single service, an entire namespace, or the whole Istio installation.

## Define Your Rollback Triggers

Before you start migrating, agree on specific conditions that trigger a rollback. Vague criteria like "if things look bad" lead to arguments during incidents.

Good rollback triggers include:

- Error rate exceeds X% for more than Y minutes
- P99 latency increases by more than Z milliseconds
- Any service becomes unreachable
- Health checks fail for more than a threshold of pods

Set these up as alerts before you begin:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-migration-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-migration
    rules:
    - alert: HighErrorRateDuringMigration
      expr: |
        sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) /
        sum(rate(istio_requests_total[5m])) > 0.05
      for: 3m
      labels:
        severity: critical
      annotations:
        summary: "Error rate above 5% during Istio migration"
    - alert: HighLatencyDuringMigration
      expr: |
        histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le)) > 500
      for: 3m
      labels:
        severity: critical
      annotations:
        summary: "P99 latency above 500ms during Istio migration"
```

## Level 1: Rolling Back a Single Service

This is the most common rollback scenario. You migrated a service, something went wrong, and you need to pull it back out of the mesh.

```bash
# Option 1: Disable sidecar injection for specific pods
kubectl patch deployment my-service -n production -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "sidecar.istio.io/inject": "false"
        }
      }
    }
  }
}'

# This triggers a rolling update that removes the sidecar
# Watch the rollout
kubectl rollout status deployment/my-service -n production
```

Verify the sidecar is gone:

```bash
kubectl get pods -n production -l app=my-service \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[*].name}{"\n"}{end}'
```

Also clean up any Istio-specific resources you created for this service:

```bash
# Remove VirtualService, DestinationRule, etc.
kubectl delete virtualservice my-service -n production --ignore-not-found
kubectl delete destinationrule my-service -n production --ignore-not-found
```

## Level 2: Rolling Back an Entire Namespace

When multiple services in a namespace are affected, it is faster to roll back the whole namespace.

```bash
# Remove the injection label
kubectl label namespace production istio-injection-

# Restart all deployments to remove sidecars
kubectl rollout restart deployment -n production

# Monitor the rollout
kubectl get pods -n production -w
```

If you are using revision-based injection, remove the revision label instead:

```bash
kubectl label namespace production istio.io/rev-
kubectl rollout restart deployment -n production
```

## Level 3: Rolling Back the Entire Istio Installation

This is the nuclear option. Use it only when the control plane itself is causing cluster-wide issues.

Before uninstalling, remove injection labels from all namespaces first:

```bash
# Remove injection labels from all namespaces
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl label namespace $ns istio-injection-
done

# Restart all deployments to remove sidecars
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n $ns 2>/dev/null
done

# Wait for all pods to restart without sidecars
kubectl get pods --all-namespaces -o json | \
  jq '[.items[] | select(.spec.containers[].name == "istio-proxy") | .metadata.namespace + "/" + .metadata.name]'

# Once no pods have sidecars, uninstall Istio
istioctl uninstall --purge -y

# Clean up the namespace
kubectl delete namespace istio-system
```

## Handling mTLS During Rollback

If you have switched to STRICT mTLS, rolling back services one at a time can break communication. A service without a sidecar cannot send mTLS traffic to a service that requires it.

Before rolling back any services, switch mTLS back to PERMISSIVE:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

```bash
kubectl apply -f peer-auth-permissive.yaml

# Verify the change is applied
kubectl get peerauthentication -A
```

This allows both plaintext and mTLS traffic, so services with and without sidecars can still communicate.

## Preserving Routing During Rollback

If you have set up VirtualService and DestinationRule resources for traffic management, those won't have any effect once the sidecars are removed. But they also won't cause harm.

However, if you have changed your Kubernetes Service definitions (like port names), you should revert those changes too:

```bash
# Save the current state before migration
kubectl get services -n production -o yaml > services-pre-migration.yaml

# During rollback, restore the original services
kubectl apply -f services-pre-migration.yaml
```

## Automating the Rollback

Create a rollback script that you can execute quickly under pressure:

```bash
#!/bin/bash
# rollback-istio.sh

NAMESPACE=${1:-"production"}
echo "Rolling back Istio in namespace: $NAMESPACE"

# Step 1: Switch to permissive mTLS
echo "Switching to PERMISSIVE mTLS..."
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
EOF

sleep 5

# Step 2: Remove injection label
echo "Removing injection label..."
kubectl label namespace $NAMESPACE istio-injection- 2>/dev/null
kubectl label namespace $NAMESPACE istio.io/rev- 2>/dev/null

# Step 3: Restart deployments
echo "Restarting deployments..."
kubectl rollout restart deployment -n $NAMESPACE

# Step 4: Wait for rollout
echo "Waiting for rollout to complete..."
kubectl rollout status deployment --timeout=300s -n $NAMESPACE

# Step 5: Verify no sidecars remain
echo "Checking for remaining sidecars..."
SIDECAR_COUNT=$(kubectl get pods -n $NAMESPACE -o json | \
  jq '[.items[] | select(.spec.containers[].name == "istio-proxy")] | length')

if [ "$SIDECAR_COUNT" -gt 0 ]; then
  echo "WARNING: $SIDECAR_COUNT pods still have sidecars"
else
  echo "All sidecars removed successfully"
fi

# Step 6: Clean up Istio resources
echo "Cleaning up Istio resources..."
kubectl delete virtualservice --all -n $NAMESPACE 2>/dev/null
kubectl delete destinationrule --all -n $NAMESPACE 2>/dev/null
kubectl delete gateway --all -n $NAMESPACE 2>/dev/null

echo "Rollback complete for namespace: $NAMESPACE"
```

Make the script executable and test it in your staging environment:

```bash
chmod +x rollback-istio.sh
./rollback-istio.sh staging
```

## Testing Your Rollback Plan

A rollback plan you have never tested is just a wish. Schedule a rollback drill in your staging environment.

1. Install Istio and migrate all staging services
2. Simulate a failure condition
3. Execute the rollback script
4. Verify all services recover
5. Time the entire process

Record how long the rollback takes. In production, you need to know whether rollback will take 5 minutes or 50 minutes.

## What to Do After Rollback

After a successful rollback, do not just move on. Document what happened:

- What was the specific failure?
- At what point in the migration did it occur?
- What was the impact?
- How long did rollback take?
- What changes are needed before trying again?

Feed these findings back into your migration plan. Every rollback is a learning opportunity that makes the next attempt more likely to succeed.

The goal is not to avoid rollbacks entirely. The goal is to make rollbacks fast, reliable, and low-risk so that you can migrate with confidence, knowing you can always go back.
