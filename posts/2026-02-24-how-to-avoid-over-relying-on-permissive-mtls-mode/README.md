# How to Avoid Over-Relying on Permissive mTLS Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Security, Kubernetes, Zero Trust

Description: Why staying in Istio permissive mTLS mode is a security risk and how to plan a migration to strict mode with minimal disruption to production services.

---

Permissive mTLS mode was designed as a migration tool. It lets services accept both encrypted (mTLS) and plain-text traffic, which is perfect when you are gradually rolling out sidecars. The problem is that many teams enable permissive mode and then leave it that way forever. It becomes the permanent state of the mesh, and nobody wants to touch it because "it works."

But permissive mode means your mesh encryption is optional, not enforced. Any compromised pod, any service without a sidecar, or any misconfigured deployment can send unencrypted traffic to your services. Here is how to break the habit and move to strict mTLS.

## Understanding the Risk

When PeerAuthentication is set to PERMISSIVE, here is what happens:

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

With this configuration:
- Pods with sidecars can communicate with mTLS (good)
- Pods without sidecars can still communicate in plain text (bad for production)
- A compromised pod can bypass mTLS entirely by sending plain HTTP (bad)
- You cannot prove in an audit that all traffic is encrypted (really bad)

Check your current state:

```bash
kubectl get peerauthentication -A -o yaml | grep "mode:"
```

If you see PERMISSIVE anywhere, you have work to do.

## Why Teams Stay in Permissive Mode

There are usually a few real reasons:

1. Some services do not have sidecars yet
2. External services call into the mesh without client certificates
3. Health checks from Kubernetes come in as plain HTTP
4. Nobody tested what breaks when switching to strict

Each of these has a solution. Let us work through them.

## Step 1: Find Services Without Sidecars

You cannot enforce mTLS if some services do not have sidecars. Find them:

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {range .spec.containers[*]}{.name} {end}{"\n"}{end}' | grep -v istio-proxy | grep -v "kube-system\|istio-system"
```

For each pod without a sidecar, decide whether to:
- Add sidecar injection (the right answer for most services)
- Exclude it from the mesh with a documented exception

Enable injection for namespaces that should be in the mesh:

```bash
kubectl label namespace production istio-injection=enabled
kubectl rollout restart deployment -n production
```

## Step 2: Handle External Traffic

External services calling into your mesh do not have Istio certificates. This is the correct use case for port-level PERMISSIVE overrides on specific workloads:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: external-facing-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: external-api
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
```

This keeps the mesh-facing ports in STRICT mode while allowing external traffic on a specific port. Better yet, route external traffic through the ingress gateway which handles TLS termination.

## Step 3: Fix Kubernetes Health Checks

Kubernetes probes (liveness, readiness, startup) are sent by the kubelet, which does not participate in mTLS. Istio handles this automatically by rewriting probe paths, but verify it is working:

```bash
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[?(@.name=="istio-proxy")].env[?(@.name=="ISTIO_KUBE_APP_PROBERS")].value}{"\n"}{end}'
```

If probe rewriting is not working, you can configure it explicitly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
    spec:
      containers:
        - name: my-service
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
```

## Step 4: Test Strict Mode Per Namespace

Do not switch everything to STRICT at once. Start with one namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: test-namespace
spec:
  mtls:
    mode: STRICT
```

Then test every service in that namespace:

```bash
# Test service-to-service within the namespace
kubectl exec deploy/sleep -n test-namespace -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.test-namespace:8000/get

# Test cross-namespace communication
kubectl exec deploy/sleep -n other-namespace -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.test-namespace:8000/get

# Test from outside the mesh (should fail with STRICT)
kubectl run no-sidecar --image=curlimages/curl --labels="sidecar.istio.io/inject=false" --restart=Never -- curl -s -m5 http://httpbin.test-namespace:8000/get
echo $?  # Should be non-zero (connection failed)
kubectl delete pod no-sidecar
```

## Step 5: Monitor for Connection Failures

After enabling STRICT in a namespace, watch for connection issues:

```bash
# Watch for connection refused or TLS errors in proxy logs
kubectl logs -n test-namespace -l app=httpbin -c istio-proxy --tail=100 | grep -i "tls\|ssl\|connection\|refused"

# Check for increased error rates in metrics
curl -s "http://localhost:9090/api/v1/query?query=sum(rate(istio_requests_total{response_code=~'5.*',destination_workload_namespace='test-namespace'}[5m]))" | jq '.data.result[0].value[1]'
```

If you see failures, identify the source and either add a sidecar to it or create a specific PeerAuthentication exception.

## Step 6: Roll Out to Production Namespaces

Once testing passes, apply STRICT mode to production namespaces one at a time:

```bash
for ns in production-api production-frontend production-workers; do
  echo "Enabling STRICT mTLS for $ns"
  kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: $ns
spec:
  mtls:
    mode: STRICT
EOF

  # Monitor for 15 minutes
  sleep 900

  # Check error rate
  ERRORS=$(kubectl logs -n "$ns" -c istio-proxy --tail=1000 -l app --since=15m 2>/dev/null | grep -c "error")
  echo "$ns: $ERRORS errors in last 15 minutes"
done
```

## Step 7: Set Mesh-Wide STRICT

Once all namespaces are in STRICT mode individually, set it at the mesh level:

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

Then remove the individual namespace policies (they are no longer needed):

```bash
kubectl delete peerauthentication strict-mtls -n production-api
kubectl delete peerauthentication strict-mtls -n production-frontend
# etc.
```

## Verify the Migration

Run a comprehensive check:

```bash
#!/bin/bash
echo "=== mTLS Verification ==="

# Check mesh-wide policy
MESH_MODE=$(kubectl get peerauthentication -n istio-system default -o jsonpath='{.spec.mtls.mode}' 2>/dev/null)
echo "Mesh-wide mTLS mode: ${MESH_MODE:-NOT SET}"

# Check for namespace overrides
echo "Namespace overrides:"
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  MODE=$(kubectl get peerauthentication -n "$ns" -o jsonpath='{.items[*].spec.mtls.mode}' 2>/dev/null)
  if [ -n "$MODE" ]; then
    echo "  $ns: $MODE"
  fi
done

# Check for PERMISSIVE anywhere
PERMISSIVE=$(kubectl get peerauthentication -A -o yaml | grep "mode: PERMISSIVE" | wc -l | tr -d ' ')
if [ "$PERMISSIVE" -gt 0 ]; then
  echo "WARNING: Found $PERMISSIVE PERMISSIVE policies"
else
  echo "All policies are STRICT"
fi
```

## Prevent Regression

Add a CI/CD check that blocks deployment of PERMISSIVE PeerAuthentication policies:

```bash
#!/bin/bash
for file in "$@"; do
  if grep -q "mode: PERMISSIVE" "$file"; then
    echo "ERROR: $file contains PERMISSIVE mTLS mode"
    echo "PERMISSIVE mode is not allowed in production."
    echo "Use port-level exceptions if needed."
    exit 1
  fi
done
```

The migration from PERMISSIVE to STRICT requires planning and patience, but it is absolutely necessary for production security. Do it namespace by namespace, monitor each step, and do not let urgency push you into skipping the testing phase. Your future self will thank you during the next security audit.
