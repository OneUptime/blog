# How to Migrate from Sidecar Mode to Ambient Mode in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Sidecar, Migration, Kubernetes

Description: A step-by-step migration guide for moving Istio workloads from sidecar mode to ambient mode with zero-downtime strategies and rollback plans.

---

If you are running Istio in sidecar mode and want to move to ambient mode, the good news is that you do not have to do it all at once. Istio supports running both modes simultaneously in the same cluster. You can migrate namespace by namespace, validate each step, and roll back if something goes wrong.

This guide walks through a practical migration strategy that minimizes risk and avoids downtime for L4-only configurations. If you use L7 policies or routing, plan for a maintenance window because there is currently a brief enforcement gap during migration.

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
istioctl upgrade --set profile=ambient
```

Or using Helm (if that is how you installed):

```bash
helm upgrade istio-base istio/base -n istio-system
helm upgrade istiod istio/istiod -n istio-system --set profile=ambient
helm upgrade --install istio-cni istio/cni -n istio-system --set profile=ambient --wait
helm upgrade --install ztunnel istio/ztunnel -n istio-system --wait
```

Verify the new components are running alongside your existing installation:

```bash
kubectl get pods -n istio-system
```

You should see istiod (existing), istio-cni (updated or new), and ztunnel (new). The sidecar injection webhook is managed by istiod rather than running as a separate pod.

Restart sidecar-injected workloads before migrating any namespace so sidecars pick up the ambient profile's HBONE support:

```bash
kubectl rollout restart deployment -n sidecar-namespace
kubectl rollout status deployment -n sidecar-namespace
```

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

Review your AuthorizationPolicies. L4 policies that only match source principals, namespaces, IP ranges, or destination ports can keep using `selector` and are enforced by ztunnel. Policies with L7 rules, such as HTTP methods, paths, headers, or `CUSTOM`/`AUDIT` actions, need to be updated to use `targetRefs` and enforced by a waypoint:

Before (sidecar style):
```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-get
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
      to:
        - operation:
            methods: ["GET"]
```

After (ambient style):
```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-get
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
      to:
        - operation:
            methods: ["GET"]
```

Keep the old selector-based L7 policy active until the pod restart, but delete it immediately after the pods come up without sidecars. Leaving selector-based L7 policies active after sidecars are removed can cause ztunnel to enforce the remaining L4 portion in a way that blocks traffic.

### Phase 3: Switch PeerAuthentication to PERMISSIVE

STRICT mTLS is not a blocker for ambient mode, but temporarily switching namespace policies to PERMISSIVE can make the transition easier if you still have non-mesh clients or need to allow plaintext while validating:

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

Add the ambient mode label first, verify enrollment, and then remove the sidecar injection label:

```bash
# Add ambient mode
kubectl label namespace target-namespace istio.io/dataplane-mode=ambient

# Verify enrollment
istioctl ztunnel-config workloads -n istio-system | grep target-namespace

# Remove sidecar injection
kubectl label namespace target-namespace istio-injection-
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
istioctl ztunnel-config workloads -n istio-system | grep target-namespace
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

If the namespace had L7 policies or routing rules, do this before Phase 5: deploy and activate a waypoint before restarting workloads without sidecars:

```bash
istioctl waypoint apply -n target-namespace
kubectl label namespace target-namespace istio.io/use-waypoint=waypoint
```

For stable ambient L7 traffic management, migrate `VirtualService` routing to Gateway API `HTTPRoute`. `VirtualService` support with waypoints is alpha.

Verify routing rules work:

```bash
kubectl exec deploy/frontend -n target-namespace -- curl -s http://backend:8080/specific-path
```

### Phase 8: Switch Back to STRICT mTLS

Once everything is validated, you can switch back to STRICT mTLS if you want to reject traffic that bypasses the mesh. Ambient mode already uses mTLS between mesh workloads through ztunnel:

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

During migration, some namespaces use sidecars and others use ambient. Cross-mode communication works after sidecars have been restarted with the ambient profile's HBONE support:

- Sidecar-to-ambient: The sidecar tunnels traffic to the destination ztunnel using HBONE
- Ambient-to-sidecar: ambient workloads and sidecar workloads interoperate within the same mesh

If the ambient destination uses a waypoint, traffic from sidecar-mode workloads bypasses that waypoint during an incremental migration. L7 policies attached to the waypoint are not enforced for those sidecar sources until they are also migrated.

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
# Remove sidecar injection labels from namespaces that no longer need them
kubectl label namespace target-namespace istio-injection-

# If you used revision-based injection, remove the revision label instead
kubectl label namespace target-namespace istio.io/rev-
```

Be very careful with this step. Only remove injection labels after you have confirmed that no namespace still uses sidecar injection. Do not delete the sidecar injector webhook from the active Istio control plane; it is managed by istiod and sidecars remain a supported Istio data plane mode.

The migration from sidecar to ambient is a low-risk operation when done gradually. The ability to run both modes in parallel means you always have a fallback. Take it one namespace at a time, validate thoroughly, and you will end up with a lighter, simpler mesh.
