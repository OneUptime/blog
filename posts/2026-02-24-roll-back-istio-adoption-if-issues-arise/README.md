# How to Roll Back Istio Adoption if Issues Arise

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Rollback, Troubleshooting, Service Mesh

Description: A comprehensive guide on how to safely roll back Istio adoption at different stages, from removing sidecars to full uninstallation.

---

Things do not always go as planned. Maybe Istio is causing unexpected latency, breaking some legacy service, or consuming too many resources. Whatever the reason, you need a solid rollback plan before you start your Istio adoption. Having an "undo" button ready makes the whole migration less stressful.

This guide covers rollback procedures at every level, from disabling a single feature to completely removing Istio from your cluster.

## Rollback Levels

Think of Istio rollback in layers. Each layer is progressively more aggressive:

1. **Remove specific configuration** - undo a VirtualService or policy
2. **Disable sidecar for specific workloads** - opt individual pods out
3. **Disable sidecar for a namespace** - remove injection for a whole namespace
4. **Remove Istio CRDs and configuration** - clean up all Istio resources
5. **Uninstall Istio completely** - remove the control plane

Start at the lightest level and only go deeper if needed.

## Level 1: Remove Specific Configuration

If a specific Istio resource is causing issues, just delete it:

```bash
# Remove a problematic VirtualService
kubectl delete virtualservice my-service -n my-namespace

# Remove an authorization policy that is blocking traffic
kubectl delete authorizationpolicy my-policy -n my-namespace

# Remove a destination rule causing connection issues
kubectl delete destinationrule my-service -n my-namespace
```

Istio applies configuration changes within seconds. Once you delete the resource, the Envoy proxies revert to their default behavior for that service.

If you are unsure which resource is causing problems, use `istioctl analyze`:

```bash
istioctl analyze -n my-namespace
```

This will highlight misconfigurations and give you actionable warnings.

## Level 2: Disable Sidecar for Specific Workloads

If a specific application does not work well with the Istio sidecar, you can opt it out without affecting other services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: problematic-app
  namespace: my-namespace
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

Apply the change and restart the pod:

```bash
kubectl patch deployment problematic-app -n my-namespace -p '{"spec":{"template":{"metadata":{"annotations":{"sidecar.istio.io/inject":"false"}}}}}'
```

The pod will restart without the sidecar. If the namespace has strict mTLS, other meshed services might not be able to reach this pod. Switch the namespace to permissive mTLS first:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive-mode
  namespace: my-namespace
spec:
  mtls:
    mode: PERMISSIVE
```

## Level 3: Disable Sidecar for a Namespace

To stop sidecar injection for an entire namespace:

```bash
kubectl label namespace my-namespace istio-injection-
```

The dash at the end removes the label. Existing pods still have their sidecars until they are restarted:

```bash
# Restart all deployments to remove sidecars
kubectl rollout restart deployment -n my-namespace
```

Verify sidecars are gone:

```bash
kubectl get pods -n my-namespace -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

You should see only the application container listed for each pod, without `istio-proxy`.

## Level 4: Remove All Istio Configuration

If you need to clean up Istio resources across the cluster but want to keep the control plane running (maybe you still need it for some namespaces):

```bash
# List all Istio resources
kubectl get virtualservices --all-namespaces
kubectl get destinationrules --all-namespaces
kubectl get gateways --all-namespaces
kubectl get authorizationpolicies --all-namespaces
kubectl get peerauthentications --all-namespaces
kubectl get serviceentries --all-namespaces
kubectl get envoyfilters --all-namespaces

# Delete resources in a specific namespace
kubectl delete virtualservices --all -n my-namespace
kubectl delete destinationrules --all -n my-namespace
kubectl delete authorizationpolicies --all -n my-namespace
kubectl delete peerauthentications --all -n my-namespace
```

Before deleting, back up your configuration:

```bash
# Export all Istio resources for backup
for resource in virtualservices destinationrules gateways serviceentries authorizationpolicies peerauthentications envoyfilters; do
  kubectl get $resource --all-namespaces -o yaml > backup-$resource.yaml
done
```

## Level 5: Uninstall Istio Completely

This is the nuclear option. Use it when you have decided to abandon Istio entirely or need a clean start.

### Step 1: Remove Sidecar Injection from All Namespaces

```bash
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "Removing injection from $ns"
  kubectl label namespace $ns istio-injection-
done
```

### Step 2: Restart All Workloads to Remove Sidecars

```bash
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  if [[ "$ns" != "kube-system" && "$ns" != "istio-system" ]]; then
    echo "Restarting deployments in $ns"
    kubectl rollout restart deployment -n $ns 2>/dev/null
  fi
done
```

### Step 3: Delete All Istio Custom Resources

```bash
for resource in virtualservices destinationrules gateways serviceentries authorizationpolicies peerauthentications requestauthentications envoyfilters sidecars telemetries wasmplugins; do
  kubectl delete $resource --all-namespaces --all 2>/dev/null
done
```

### Step 4: Uninstall Istio

If you installed with istioctl:

```bash
istioctl uninstall --purge
```

If you installed with Helm:

```bash
helm uninstall istio-ingressgateway -n istio-system
helm uninstall istiod -n istio-system
helm uninstall istio-base -n istio-system
```

### Step 5: Clean Up the Namespace and CRDs

```bash
kubectl delete namespace istio-system

# Remove Istio CRDs
kubectl get crd | grep istio.io | awk '{print $1}' | xargs kubectl delete crd
```

### Step 6: Verify Cleanup

```bash
# Check no Istio pods are running
kubectl get pods --all-namespaces | grep istio

# Check no Istio CRDs remain
kubectl get crd | grep istio

# Check no Istio webhooks remain
kubectl get mutatingwebhookconfigurations | grep istio
kubectl get validatingwebhookconfigurations | grep istio
```

If any webhooks remain, delete them:

```bash
kubectl delete mutatingwebhookconfigurations istio-sidecar-injector
kubectl delete validatingwebhookconfigurations istio-validator-istio-system
```

Leftover webhooks are a common issue - they will prevent new pods from starting if the webhook endpoint (istiod) no longer exists.

## Common Rollback Scenarios

### Scenario: Latency Spike After Enabling Istio

Check if the latency is from sidecar processing or from mTLS:

```bash
# Check sidecar latency
istioctl proxy-config log <pod-name> --level debug
kubectl logs <pod-name> -c istio-proxy | grep "response_duration"
```

Quick fix: reduce the number of services in the mesh by disabling injection for non-critical namespaces.

### Scenario: Pods Stuck in Init State

This usually means the istio-init container cannot set up iptables rules:

```bash
kubectl logs <pod-name> -c istio-init
```

Quick fix: add the pod annotation to disable sidecar injection for that workload.

### Scenario: External Services Unreachable

If pods cannot reach external APIs after Istio adoption:

```bash
# Check outbound traffic policy
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

Quick fix: set outbound traffic policy to ALLOW_ANY:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: ALLOW_ANY
```

### Scenario: Application Health Checks Failing

Istio rewrites HTTP probes by default. If probes are failing:

```bash
kubectl describe pod <pod-name> | grep -A 5 "Liveness\|Readiness"
```

Quick fix per pod:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

## Pre-Migration Rollback Checklist

Before you start any Istio migration, prepare this checklist:

- [ ] Backed up all Kubernetes manifests for affected services
- [ ] Documented current service-to-service connectivity
- [ ] Noted current latency baselines for key services
- [ ] Tested rollback procedure in staging
- [ ] Confirmed you can remove namespace labels and restart pods
- [ ] Verified that webhooks get cleaned up properly on uninstall
- [ ] Identified team members responsible for executing rollback

Having a rollback plan is not about expecting failure. It is about reducing the anxiety around making big infrastructure changes. When your team knows they can undo any change in minutes, they move forward with more confidence and less hesitation.
