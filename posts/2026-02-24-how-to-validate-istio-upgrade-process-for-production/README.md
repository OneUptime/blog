# How to Validate Istio Upgrade Process for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Upgrades, Kubernetes, Production, Canary

Description: A hands-on guide to validating your Istio upgrade process for production environments using canary upgrades and pre-flight checks.

---

Upgrading Istio in production is one of those tasks that keeps platform engineers up at night. A botched upgrade can break mTLS, disrupt routing, or cause proxy crashes across your entire fleet. The key to smooth upgrades is having a validated, repeatable process that you have practiced before doing it for real.

Here is how to validate your Istio upgrade process before it touches production traffic.

## Understand Istio's Upgrade Model

Istio supports two upgrade strategies: in-place upgrades and canary upgrades. For production, always use canary upgrades. They let you run two versions of the control plane side by side and gradually migrate workloads.

Check your current version first:

```bash
istioctl version
kubectl get pods -n istio-system -l app=istiod -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[0].image}{"\n"}{end}'
```

## Pre-Flight Checks

Before starting any upgrade, run these validation steps:

```bash
# Check for configuration issues
istioctl analyze --all-namespaces

# Verify all proxies are in sync with control plane
istioctl proxy-status
```

Every proxy should show SYNCED status. If any show STALE or NOT SENT, fix those issues first.

Check the upgrade path compatibility. Istio supports upgrading one minor version at a time (e.g., 1.21 to 1.22, not 1.20 to 1.22):

```bash
CURRENT=$(istioctl version --remote=false)
echo "Current version: $CURRENT"
```

Review the release notes for the target version, especially:
- Deprecated features being removed
- Changes to default behavior
- Required CRD updates

## Validate in a Staging Environment First

Never upgrade production first. Run the complete upgrade on a staging environment that mirrors production:

```bash
# On staging cluster
istioctl install --set revision=canary --set tag=1.22.0

# Verify the canary control plane is running
kubectl get pods -n istio-system -l app=istiod
```

You should see pods for both the existing revision and the canary revision.

## Perform Canary Upgrade

Install the new control plane revision alongside the existing one:

```bash
istioctl install --set revision=1-22-0 -f your-istiooperator.yaml
```

Verify both revisions are running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

You should see pods for both versions. The existing workloads continue using the old control plane.

## Migrate Workloads Gradually

Start with a test namespace. Change the injection label to point to the new revision:

```bash
# Remove old injection label and add new one
kubectl label namespace test-namespace istio-injection- istio.io/rev=1-22-0 --overwrite

# Restart pods to get the new sidecar
kubectl rollout restart deployment -n test-namespace
```

Verify the pods got the new proxy version:

```bash
kubectl get pods -n test-namespace -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[?(@.name=="istio-proxy")].image}{"\n"}{end}'
```

## Validate After Migration

After migrating a namespace, run a complete validation:

```bash
# Check proxy status
istioctl proxy-status | grep test-namespace

# Verify traffic is flowing
kubectl exec deploy/sleep -n test-namespace -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.test-namespace:8000/get

# Check for errors in proxy logs
kubectl logs deploy/httpbin -n test-namespace -c istio-proxy --tail=50 | grep -i error
```

Also verify that cross-namespace communication works between old and new proxy versions:

```bash
# Old proxy calling service with new proxy
kubectl exec deploy/sleep -n old-namespace -- curl -s http://httpbin.test-namespace:8000/get

# New proxy calling service with old proxy
kubectl exec deploy/sleep -n test-namespace -- curl -s http://httpbin.old-namespace:8000/get
```

Both should work. Istio maintains backward compatibility between adjacent proxy versions.

## Monitor During Migration

Keep a close eye on these metrics during the upgrade:

```bash
# Error rate
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds_push_errors

# Push time
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_proxy_convergence_time
```

Set up a dashboard showing:

- Request success rate per namespace
- P99 latency per service
- Proxy connection errors
- istiod CPU and memory usage

If any metric degrades after migrating a namespace, stop the rollout and investigate.

## Validate Gateway Upgrade

Gateways need special attention because they handle external traffic:

```bash
# Check current gateway version
kubectl get pods -n istio-system -l app=istio-ingressgateway -o jsonpath='{.items[0].spec.containers[0].image}'
```

For gateway upgrades, use a canary approach with traffic splitting if possible. If you are using Kubernetes Gateway API:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production
  namespace: istio-system
spec:
  gatewayClassName: istio
  listeners:
    - name: https
      port: 443
      protocol: HTTPS
```

Otherwise, upgrade gateways after all workloads are migrated:

```bash
# The gateway will be upgraded as part of the revision installation
kubectl get pods -n istio-system -l app=istio-ingressgateway
```

## Rollback Procedure

Have a tested rollback plan. If something goes wrong, you can switch workloads back to the old revision:

```bash
# Switch namespace back to old revision
kubectl label namespace test-namespace istio.io/rev- istio-injection=enabled --overwrite

# Restart pods
kubectl rollout restart deployment -n test-namespace

# Verify old proxy version is back
kubectl get pods -n test-namespace -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[?(@.name=="istio-proxy")].image}{"\n"}{end}'
```

Test this rollback procedure before starting the production upgrade. You should be able to roll back within minutes.

## Complete the Upgrade

Once all namespaces are migrated and validated, remove the old control plane:

```bash
# Verify no workloads are using the old revision
istioctl proxy-status | grep -v "1-22-0"

# If nothing shows, it is safe to remove the old revision
istioctl uninstall --revision default
```

Run a final validation:

```bash
istioctl analyze --all-namespaces
istioctl proxy-status
```

## Upgrade Validation Checklist

- [ ] Current version identified
- [ ] Upgrade path confirmed (single minor version jump)
- [ ] Release notes reviewed for breaking changes
- [ ] istioctl analyze shows no errors
- [ ] All proxies synced before starting
- [ ] Staging upgrade completed successfully
- [ ] Canary control plane installed in production
- [ ] Test namespace migrated and validated
- [ ] Cross-version communication verified
- [ ] Production namespaces migrated one at a time
- [ ] Gateways upgraded
- [ ] Rollback procedure tested
- [ ] Old control plane removed
- [ ] Final validation passed

Upgrades should be routine, not heroic. Practice the process regularly, keep your staging environment in sync with production, and never skip the canary phase. The 30 minutes of extra work for a canary upgrade can save you hours of incident response.
