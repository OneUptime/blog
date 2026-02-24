# How to Remove Workloads from an Ambient Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Kubernetes, Service Mesh, Operations

Description: How to safely remove namespaces and individual workloads from an Istio ambient mesh without disrupting running applications.

---

Sometimes you need to pull workloads out of the ambient mesh. Maybe you are troubleshooting a connectivity issue, decommissioning a service, or migrating to a different approach. The good news is that removing workloads from ambient mode is just as simple as adding them - no pod restarts required.

But there are some things to watch out for, especially around authorization policies and mTLS requirements. Pulling a workload out of the mesh means it loses its mesh identity, and any policies that depend on that identity will break.

## Removing an Entire Namespace

To remove all workloads in a namespace from the ambient mesh, remove the label:

```bash
kubectl label namespace my-app istio.io/dataplane-mode-
```

The trailing hyphen removes the label. This takes effect immediately. ztunnel stops handling traffic for pods in that namespace, and the istio-cni plugin removes the traffic interception rules.

Verify the label is gone:

```bash
kubectl get namespace my-app --show-labels
```

Confirm workloads are no longer managed by ztunnel:

```bash
istioctl ztunnel-config workloads | grep my-app
```

This should return no results for the `my-app` namespace.

## Removing Individual Pods

If you only want to remove specific pods from the mesh while keeping the namespace enrolled, override the label at the pod level:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-service
  namespace: my-app
spec:
  template:
    metadata:
      labels:
        app: legacy-service
        istio.io/dataplane-mode: none
    spec:
      containers:
        - name: legacy-service
          image: legacy:v1
```

Apply the change:

```bash
kubectl apply -f legacy-service.yaml
```

Since this changes the pod template, it triggers a rolling restart of the deployment. The new pods will come up with the `none` label and will not be part of the ambient mesh, even though the namespace is labeled for ambient mode.

For a quick test without changing the deployment, you can label a running pod directly:

```bash
kubectl label pod legacy-service-abc123 -n my-app istio.io/dataplane-mode=none --overwrite
```

Keep in mind that this label is lost on the next pod restart. For persistent changes, update the deployment's pod template.

## Pre-Removal Checklist

Before removing workloads from the mesh, check these items:

### 1. Check for AuthorizationPolicies

If you have AuthorizationPolicies that reference the workload being removed, those policies may break or behave unexpectedly:

```bash
kubectl get authorizationpolicies -n my-app -o yaml
```

Look for policies that reference the workload as a source or destination. Once removed from the mesh, the workload no longer has a mesh identity, so source-based policies will not match.

### 2. Check PeerAuthentication Policies

If any destination has STRICT mTLS enabled, the removed workload will not be able to communicate with it:

```bash
kubectl get peerauthentication -A
```

If there is a mesh-wide STRICT policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Then removing a workload from the mesh means it can no longer talk to any meshed service. You will need to either change the policy to PERMISSIVE or keep the workload in the mesh.

### 3. Check Waypoint Proxy Dependencies

If the namespace has a waypoint proxy, removing the namespace from ambient mode does not automatically remove the waypoint. Clean it up manually:

```bash
# Check for waypoint proxies
kubectl get gateways -n my-app -l istio.io/waypoint-for

# Remove the waypoint
istioctl waypoint delete -n my-app
```

### 4. Monitor Traffic During Removal

Set up monitoring before making the change. Watch for 5xx errors, connection resets, and latency spikes:

```bash
# If using Prometheus, check for errors
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total{destination_workload_namespace="my-app",response_code=~"5.."}[1m]))'
```

## Removal Sequence for Production

For a production environment, follow this sequence:

### Step 1: Switch to PERMISSIVE mTLS

If you have STRICT mTLS, temporarily switch to PERMISSIVE for the namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive-during-removal
  namespace: my-app
spec:
  mtls:
    mode: PERMISSIVE
```

This allows both mTLS and plaintext traffic, preventing connection failures during the transition.

### Step 2: Update AuthorizationPolicies

Modify any AuthorizationPolicies that reference identities from the namespace being removed. Either remove the specific rules or add IP-based alternatives:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-legacy
  namespace: other-app
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            ipBlocks:
              - "10.0.0.0/16"
```

### Step 3: Remove the Label

```bash
kubectl label namespace my-app istio.io/dataplane-mode-
```

### Step 4: Verify Traffic Still Flows

Test critical communication paths:

```bash
kubectl exec deploy/frontend -n my-app -- curl -s http://backend:8080/health
```

Check from other namespaces that still communicate with `my-app`:

```bash
kubectl exec deploy/api-gateway -n gateway -- curl -s http://frontend.my-app:8080/
```

### Step 5: Clean Up

Remove the temporary PeerAuthentication:

```bash
kubectl delete peerauthentication permissive-during-removal -n my-app
```

Remove any waypoint proxies in the namespace:

```bash
istioctl waypoint delete -n my-app
```

Remove authorization policies that are no longer relevant:

```bash
kubectl delete authorizationpolicy -n my-app --all
```

## Handling Mixed State

During the removal process, you might have a mix of meshed and non-meshed workloads communicating with each other. Here is what to expect:

| Source | Destination | Result |
|--------|-------------|--------|
| Meshed | Meshed | mTLS (encrypted) |
| Meshed | Non-meshed | Plaintext (ztunnel sends without encryption) |
| Non-meshed | Meshed (PERMISSIVE) | Plaintext (accepted) |
| Non-meshed | Meshed (STRICT) | Connection refused |

This is why the PERMISSIVE step is important. It prevents hard failures during the transition.

## Bulk Removal

If you need to remove all namespaces from the ambient mesh (maybe you are uninstalling Istio entirely):

```bash
# Remove ambient labels from all namespaces
kubectl get namespaces -l istio.io/dataplane-mode=ambient -o name | \
  xargs -I {} kubectl label {} istio.io/dataplane-mode-

# Remove all waypoint proxies
istioctl waypoint delete --all -A

# Clean up policies
kubectl delete authorizationpolicy --all -A
kubectl delete peerauthentication --all -A
```

Then you can safely uninstall Istio:

```bash
istioctl uninstall --purge -y
kubectl delete namespace istio-system
```

## Re-Enrolling After Removal

If you removed a workload temporarily for troubleshooting, adding it back is straightforward:

```bash
kubectl label namespace my-app istio.io/dataplane-mode=ambient
```

Traffic encryption resumes immediately. Any previously configured AuthorizationPolicies and PeerAuthentication policies take effect again as soon as the workload rejoins the mesh.

The key takeaway is that removing workloads from ambient mode is operationally simple but requires awareness of the policy implications. Always check your mTLS and authorization policies before removing workloads to avoid unexpected connection failures.
