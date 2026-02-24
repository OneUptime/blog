# How to Handle Istio Configuration Rollback

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rollback, Configuration Management, Kubernetes, GitOps

Description: Practical techniques for rolling back Istio configuration changes when things go wrong, including VirtualService rollbacks, bulk rollbacks, and preventing bad configs.

---

You just applied a VirtualService change and now half your traffic is going to the wrong backend. Or you updated an AuthorizationPolicy and locked everyone out. These things happen, and having a solid rollback strategy is what turns a 30-minute outage into a 2-minute blip.

Istio doesn't have a built-in "undo" button, but there are several effective approaches to rolling back configuration changes quickly and safely.

## Quick Rollback with kubectl

If you just applied a change and need to revert immediately, the fastest option is re-applying the previous configuration.

If you still have the old YAML file:

```bash
kubectl apply -f old-virtualservice.yaml
```

If you don't have the file but the resource still exists, you can edit it directly:

```bash
kubectl edit virtualservice my-vs -n my-namespace
```

## Using kubectl Rollback Annotations

Kubernetes doesn't natively version custom resources like it does Deployments, but you can use the `kubectl.kubernetes.io/last-applied-configuration` annotation. This annotation stores the last configuration that was applied via `kubectl apply`:

```bash
# View the last-applied configuration
kubectl get virtualservice my-vs -n my-namespace \
  -o jsonpath='{.metadata.annotations.kubectl\.kubernetes\.io/last-applied-configuration}' | \
  python3 -m json.tool
```

Unfortunately, this only gives you the most recent apply, not a history of changes. For proper versioning, you need external tooling.

## Rollback with Git

The best rollback strategy is keeping all your Istio configuration in Git. When something goes wrong, you just revert to the previous commit:

```bash
# See recent changes
git log --oneline -10

# Revert the last commit
git revert HEAD

# Or checkout a specific file from a previous commit
git checkout HEAD~1 -- virtualservices/my-vs.yaml

# Apply the reverted config
kubectl apply -f virtualservices/my-vs.yaml
```

If you're using GitOps with a tool like Argo CD or Flux, the rollback is even cleaner:

```bash
# Argo CD: sync to a previous commit
argocd app sync istio-config --revision abc1234

# Or rollback to the previous sync
argocd app rollback istio-config
```

## Emergency Deletion

Sometimes the fastest rollback is just deleting the problematic resource:

```bash
# Delete a VirtualService that's causing issues
kubectl delete virtualservice broken-vs -n my-namespace
```

Without the VirtualService, Istio falls back to default routing (round-robin to the service's endpoints). This might be exactly what you need to restore traffic flow while you fix the configuration.

For AuthorizationPolicies that are blocking traffic:

```bash
# Delete the policy to allow all traffic
kubectl delete authorizationpolicy restrictive-policy -n my-namespace
```

## Rollback Using Snapshots

You can create lightweight snapshots before making changes:

```bash
#!/bin/bash
# snapshot-before-change.sh

SNAPSHOT_DIR="snapshots/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SNAPSHOT_DIR"

# Snapshot specific resources you're about to change
kubectl get virtualservice -n my-namespace -o yaml > "$SNAPSHOT_DIR/virtualservices.yaml"
kubectl get destinationrule -n my-namespace -o yaml > "$SNAPSHOT_DIR/destinationrules.yaml"

echo "Snapshot saved to $SNAPSHOT_DIR"
echo "To rollback: kubectl apply -f $SNAPSHOT_DIR/"
```

Then if you need to rollback:

```bash
kubectl apply -f snapshots/20260224-153000/
```

## Rollback Specific Resource Types

Different Istio resources have different rollback considerations.

**VirtualService rollback:**
```bash
# Save current state
kubectl get virtualservice my-vs -n my-namespace -o yaml > my-vs-backup.yaml

# Make your change
kubectl apply -f my-vs-new.yaml

# If something breaks, rollback
kubectl apply -f my-vs-backup.yaml
```

**DestinationRule rollback:**
```bash
# Be careful - DestinationRules and VirtualServices often go together
# Rolling back one without the other can cause issues
kubectl apply -f old-destinationrule.yaml
kubectl apply -f old-virtualservice.yaml
```

**AuthorizationPolicy rollback:**
```bash
# Emergency: delete to allow all traffic
kubectl delete authorizationpolicy my-policy -n my-namespace

# Or apply the previous version
kubectl apply -f old-authorizationpolicy.yaml
```

**PeerAuthentication rollback:**
```bash
# If you changed mTLS mode and broke connectivity
# Revert to the previous mode
kubectl apply -f old-peerauthentication.yaml

# Emergency: set to PERMISSIVE to allow both mTLS and plaintext
cat <<EOF | kubectl apply -f -
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

## Canary Configuration Changes

The best rollback is one you never need. Use canary deployments for configuration changes:

```yaml
# Instead of changing the main VirtualService,
# create one that routes a small percentage to the new config
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: my-namespace
spec:
  hosts:
    - my-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-service
            subset: v2
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 95
        - destination:
            host: my-service
            subset: v2
          weight: 5
```

Test with the canary header first:

```bash
kubectl exec deploy/sleep -- curl -H "x-canary: true" http://my-service:8080/test
```

Then gradually increase the weight.

## Validating Before Applying

Prevent the need for rollbacks by validating configuration before it goes live:

```bash
# Dry run against the API server
kubectl apply -f new-virtualservice.yaml --dry-run=server

# Use istioctl analyze to check for issues
istioctl analyze -f new-virtualservice.yaml

# Validate the YAML syntax
istioctl validate -f new-virtualservice.yaml
```

## Automated Rollback with Flagger

For fully automated canary rollbacks, consider using Flagger with Istio:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-service
  namespace: my-namespace
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  service:
    port: 8080
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

Flagger automatically rolls back if the success rate drops below 99% or latency exceeds 500ms.

## Building a Rollback Culture

A few organizational practices that make rollbacks smoother:

1. Always save the current state before making changes
2. Make changes in small, incremental steps
3. Have a "break glass" procedure documented for emergency rollbacks
4. Test rollback procedures regularly, not just during incidents
5. Use `istioctl analyze` before every apply

Configuration rollback is a skill that improves with practice. The teams that handle incidents well are the ones that have rollback procedures baked into their workflow, not as an afterthought but as a core part of how they operate.
