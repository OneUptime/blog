# How to Add Workloads to an Ambient Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Kubernetes, Service Mesh, Workloads

Description: How to enroll namespaces and individual workloads into an Istio ambient mesh with verification steps and common patterns.

---

One of the best things about Istio ambient mode is how easy it is to add workloads to the mesh. No sidecar injection, no pod restarts, no deployment changes. You label a namespace and the workloads are immediately part of the mesh with mTLS encryption.

This guide covers the different ways to enroll workloads, how to verify enrollment, and some patterns for gradual rollout.

## Namespace-Level Enrollment

The most common approach is enrolling an entire namespace at once. Every pod in that namespace becomes part of the ambient mesh:

```bash
kubectl label namespace my-app istio.io/dataplane-mode=ambient
```

That is it. Instantly, all pods in `my-app` have their traffic routed through ztunnel. Communication between these pods (and other meshed pods) is encrypted with mTLS.

Verify the label was applied:

```bash
kubectl get namespace my-app --show-labels
```

Output should include `istio.io/dataplane-mode=ambient`.

## Pod-Level Enrollment

If you want to enroll specific pods without enrolling the whole namespace, you can label individual pods:

```bash
kubectl label pod my-pod-abc123 -n my-app istio.io/dataplane-mode=ambient
```

However, pod-level labels are lost when the pod is recreated (which happens on deployment rollouts). For persistent per-pod enrollment, add the label to the pod template in the deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: my-app
spec:
  template:
    metadata:
      labels:
        app: my-service
        istio.io/dataplane-mode: ambient
    spec:
      containers:
        - name: my-service
          image: my-service:v1
```

This approach is useful when you want some pods in a namespace meshed and others not.

## Verifying Enrollment

### Check ztunnel Awareness

The most reliable way to verify enrollment is checking whether ztunnel recognizes your workloads:

```bash
istioctl ztunnel-config workloads
```

This lists all workloads that ztunnel is actively managing. Your enrolled pods should appear with their identity and protocol information:

```text
NAMESPACE    POD NAME           IP          NODE        PROTOCOL
my-app       frontend-abc123    10.0.1.5    node-1      HBONE
my-app       backend-def456     10.0.1.6    node-1      HBONE
my-app       database-ghi789    10.0.2.3    node-2      HBONE
```

The `HBONE` protocol indicates the workload is part of the ambient mesh and traffic is being tunneled.

### Check Connection Encryption

Send traffic between two enrolled pods and verify it is encrypted by checking ztunnel logs:

```bash
# Send a test request
kubectl exec deploy/frontend -n my-app -- curl -s http://backend:8080/health

# Check ztunnel logs for the connection
kubectl logs -l app=ztunnel -n istio-system --tail=30 | grep "my-app"
```

You should see log entries showing mTLS connection establishment between workload identities.

### Use istioctl to Check Status

```bash
istioctl proxy-status
```

With ambient mode, workloads do not show up as individual proxies (since there are no sidecars). Instead, ztunnel instances appear. To see ambient-specific status:

```bash
istioctl ztunnel-config all
```

## Gradual Rollout Pattern

Enrolling everything at once can be risky in production. Here is a safer pattern:

### Phase 1: Start with a Test Namespace

Create a test namespace with non-critical workloads:

```bash
kubectl create namespace ambient-test
kubectl label namespace ambient-test istio.io/dataplane-mode=ambient
```

Deploy test services and verify they work:

```bash
kubectl apply -f test-app.yaml -n ambient-test
```

Run your integration tests against the test namespace.

### Phase 2: Enroll Low-Risk Production Namespaces

Pick namespaces with stateless, easily restartable services:

```bash
kubectl label namespace batch-jobs istio.io/dataplane-mode=ambient
kubectl label namespace internal-tools istio.io/dataplane-mode=ambient
```

Monitor for a few hours or days before proceeding.

### Phase 3: Enroll Critical Namespaces

Once you are confident, enroll your critical production namespaces:

```bash
kubectl label namespace api-gateway istio.io/dataplane-mode=ambient
kubectl label namespace payments istio.io/dataplane-mode=ambient
```

### Phase 4: Enroll Everything

After validation, enroll remaining namespaces:

```bash
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  if [[ "$ns" != "kube-system" && "$ns" != "istio-system" && "$ns" != "kube-public" ]]; then
    kubectl label namespace "$ns" istio.io/dataplane-mode=ambient --overwrite
  fi
done
```

Be careful not to label system namespaces like `kube-system` or `istio-system`. Ambient mode is designed for application workloads.

## Excluding Specific Pods

If you enroll a namespace but need to exclude certain pods, use the label at the pod level to opt out:

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

The `istio.io/dataplane-mode: none` label on the pod overrides the namespace-level ambient label.

## Cross-Namespace Communication

When pods in an ambient namespace communicate with pods in a non-ambient namespace, the behavior depends on the destination:

- **Ambient to Ambient**: Full mTLS, encrypted and authenticated
- **Ambient to non-mesh**: ztunnel sends traffic as plain TCP (no mTLS to the destination)
- **Non-mesh to Ambient**: ztunnel accepts plain TCP traffic (no mTLS from the source)

This means you can gradually enroll namespaces without breaking existing communication. Unencrypted communication still works, but you lose the security benefits for those connections.

To enforce mTLS for all traffic to a namespace, apply a PeerAuthentication policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: my-app
spec:
  mtls:
    mode: STRICT
```

With STRICT mode, only mTLS traffic is accepted. Non-mesh clients will be rejected.

## Monitoring Enrollment Status

Create a quick check to see which namespaces are enrolled:

```bash
kubectl get namespaces -l istio.io/dataplane-mode=ambient
```

To see all namespaces with their mesh status:

```bash
kubectl get namespaces -L istio.io/dataplane-mode -L istio-injection
```

This shows both ambient and sidecar enrollment in one view.

## What Happens Behind the Scenes

When you label a namespace with `istio.io/dataplane-mode=ambient`:

1. istiod notices the label change through its Kubernetes watch
2. istiod notifies ztunnel instances about the new workloads
3. The istio-cni plugin configures traffic interception rules on each node for the affected pods
4. ztunnel starts handling traffic for those pods
5. mTLS is established automatically using certificates from istiod

This entire process takes a few seconds. The workload pods are completely unaware that anything changed - they keep sending and receiving traffic as before, but now it flows through ztunnel and gets encrypted.

Adding workloads to an ambient mesh is designed to be non-disruptive. The only scenario where you might see issues is if you have a STRICT mTLS PeerAuthentication policy that rejects non-mTLS traffic from services that are not yet enrolled. Plan your enrollment order to avoid such conflicts.
