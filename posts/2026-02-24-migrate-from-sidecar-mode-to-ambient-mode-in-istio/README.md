# How to Migrate from Sidecar Mode to Ambient Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Sidecar, Migration, Kubernetes

Description: A step-by-step migration guide for moving Istio workloads from sidecar mode to ambient mode with zero-downtime strategies and rollback plans.

---

If you are running Istio in sidecar mode and want to move to ambient mode, the good news is that you do not have to do it all at once. Istio supports running both modes simultaneously in the same cluster. You can migrate namespace by namespace, validate each step, and roll back if something goes wrong.

This guide walks through a practical migration strategy that minimizes risk and avoids downtime.

## Before You Start

### Verify Your Istio Version

Ambient mode reached GA in Istio 1.24. Make sure you are running at least that version:

```bash
istioctl version
```

If you need to upgrade, do that first before starting the migration.

### Install Ambient Mode Components

Your existing sidecar installation needs the additional ambient components - ztunnel and istio-cni. You can add them without affecting current sidecar workloads.

Using istioctl:

```bash
istioctl install --set profile=ambient \
  --set components.ingressGateways[0].name=istio-ingressgateway \
  --set components.ingressGateways[0].enabled=true \
  -y
```

Or using Helm (if that is how you installed):

```bash
helm install istio-cni istio/cni -n istio-system --wait
helm install ztunnel istio/ztunnel -n istio-system --wait
```

Verify the new components are running alongside your existing installation:

```bash
kubectl get pods -n istio-system
```

You should see istiod (existing), the sidecar injector webhook (existing), ztunnel (new), and istio-cni (new).

## Migration Strategy: Namespace by Namespace

### Phase 1: Pick a Low-Risk Namespace

Start with a namespace that has:
- Stateless services that can be easily restarted
- Good test coverage
- Low traffic volume
- No complex routing rules (or rules you can easily validate)

### Phase 2: Prepare the Namespace

Before switching, document the current configuration:

```bash
# Save current policies
kubectl get authorizationpolicy -n target-namespace -o yaml > auth-policies-backup.yaml
kubectl get peerauthentication -n target-namespace -o yaml > peer-auth-backup.yaml
kubectl get virtualservice -n target-namespace -o yaml > virtualservice-backup.yaml
kubectl get destinationrule -n target-namespace -o yaml > destinationrule-backup.yaml
```

Review your AuthorizationPolicies. Policies using `selector` need to be updated to use `targetRefs` for ambient mode:

Before (sidecar style):
```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: target-namespace
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/target-namespace/sa/frontend"
```

After (ambient style):
```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: target-namespace
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/target-namespace/sa/frontend"
```

The `targetRefs` approach works with both sidecar and ambient mode, so you can update your policies before the migration.

### Phase 3: Switch PeerAuthentication to PERMISSIVE

If you have STRICT mTLS, temporarily switch to PERMISSIVE. This allows both mTLS (from sidecars) and HBONE (from ztunnel) during the transition:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive
  namespace: target-namespace
spec:
  mtls:
    mode: PERMISSIVE
```

### Phase 4: Disable Sidecar Injection

Remove the sidecar injection label and add the ambient mode label:

```bash
# Remove sidecar injection
kubectl label namespace target-namespace istio-injection-

# Add ambient mode
kubectl label namespace target-namespace istio.io/dataplane-mode=ambient
```

At this point, existing pods still have their sidecars. New pods will not get sidecars (because injection is disabled) and will be part of the ambient mesh instead.

### Phase 5: Roll Pods to Remove Sidecars

Restart deployments to create new pods without sidecars:

```bash
kubectl rollout restart deployment -n target-namespace
```

Monitor the rollout:

```bash
kubectl rollout status deployment -n target-namespace --timeout=300s
```

As new pods come up without sidecars, they are immediately enrolled in the ambient mesh through ztunnel.

### Phase 6: Validate

Check that all workloads are enrolled:

```bash
istioctl ztunnel-config workloads | grep target-namespace
```

Test connectivity:

```bash
kubectl exec deploy/frontend -n target-namespace -- curl -s http://backend:8080/health
```

Check that mTLS is working:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=30 | grep target-namespace
```

Verify your authorization policies are enforced:

```bash
# This should be allowed
kubectl exec deploy/frontend -n target-namespace -- curl -s -o /dev/null -w "%{http_code}" http://backend:8080/

# This should be denied (if you have policies in place)
kubectl exec deploy/unauthorized-service -n target-namespace -- curl -s -o /dev/null -w "%{http_code}" http://backend:8080/ --max-time 5
```

### Phase 7: Deploy Waypoint Proxies (if needed)

If the namespace had VirtualService routing rules, retries, or L7 policies, deploy a waypoint:

```bash
istioctl waypoint apply -n target-namespace --enroll-namespace
```

Verify routing rules work:

```bash
kubectl exec deploy/frontend -n target-namespace -- curl -s http://backend:8080/specific-path
```

### Phase 8: Switch Back to STRICT mTLS

Once everything is validated:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict
  namespace: target-namespace
spec:
  mtls:
    mode: STRICT
```

### Phase 9: Repeat for More Namespaces

Repeat phases 1-8 for each namespace. Start with less critical namespaces and work toward the most critical ones.

## Handling Cross-Namespace Communication

During migration, some namespaces use sidecars and others use ambient. Cross-mode communication works automatically:

- Sidecar-to-ambient: The sidecar sends mTLS traffic, and ztunnel accepts it
- Ambient-to-sidecar: ztunnel sends HBONE/mTLS traffic, and the sidecar accepts it

As long as PeerAuthentication is PERMISSIVE in both namespaces during the transition, traffic flows. Once both sides are migrated, you can switch to STRICT.

## Rolling Back

If something goes wrong during migration:

```bash
# Remove ambient mode label
kubectl label namespace target-namespace istio.io/dataplane-mode-

# Re-enable sidecar injection
kubectl label namespace target-namespace istio-injection=enabled

# Restart pods to get sidecars back
kubectl rollout restart deployment -n target-namespace

# Remove waypoint if deployed
istioctl waypoint delete -n target-namespace

# Restore original policies
kubectl apply -f auth-policies-backup.yaml
kubectl apply -f peer-auth-backup.yaml
```

## Things That Change After Migration

Some behavioral differences between sidecar and ambient mode to be aware of:

1. **Pod resource usage**: Pods use less memory and CPU without sidecars
2. **Startup time**: Pods start faster without waiting for sidecar initialization
3. **Access logging**: Access logs come from ztunnel/waypoint instead of sidecar. Log format may differ
4. **Metrics labels**: Some metric labels change because the proxy is no longer co-located with the workload
5. **Proxy debug commands**: `istioctl proxy-config` works on waypoint proxies but not on individual workloads (use `istioctl ztunnel-config` instead)

## Post-Migration Cleanup

After all namespaces are migrated, you can clean up sidecar-related components:

```bash
# Remove sidecar injector webhook (only after ALL namespaces are migrated)
kubectl delete mutatingwebhookconfiguration istio-sidecar-injector

# Optionally, remove the injector deployment if it is separate
```

Be very careful with this step. Only do it after you have confirmed that no namespace still uses sidecar injection.

The migration from sidecar to ambient is a low-risk operation when done gradually. The ability to run both modes in parallel means you always have a fallback. Take it one namespace at a time, validate thoroughly, and you will end up with a lighter, simpler mesh.
