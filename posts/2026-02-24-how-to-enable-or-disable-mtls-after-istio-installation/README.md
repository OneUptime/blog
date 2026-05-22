# How to Enable or Disable mTLS After Istio Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Security, Kubernetes, Service Mesh

Description: How to configure mTLS in Istio after installation including enabling strict mode, disabling for specific services, and troubleshooting mTLS issues.

---

Mutual TLS (mTLS) is one of the core security features of Istio. When enabled, every service-to-service call within the mesh is encrypted and both sides verify each other's identity through certificates. After installing Istio, peer authentication defaults to PERMISSIVE mode, which accepts both encrypted and plaintext traffic. Istio also uses Auto mTLS by default, so sidecars automatically send mTLS to workloads that have sidecars and plaintext to workloads that do not. Changing the server-side policy is something most teams need to do, and getting it right matters.

## Understanding mTLS Modes

Istio has three mTLS modes:

- **PERMISSIVE**: Accepts both plaintext and mTLS traffic. This is the default after installation.
- **STRICT**: Only accepts mTLS traffic. Plaintext connections are rejected.
- **DISABLE**: Does not accept mTLS on the selected workload or port. Traffic must be plaintext, or TLS must be handled by the application itself.

```bash
# Check current mTLS configuration

kubectl get peerauthentication --all-namespaces
```

If no PeerAuthentication resources exist, workloads inherit the default PERMISSIVE mode.

## Enabling STRICT mTLS Mesh-Wide

To enable STRICT mTLS for the entire mesh, create a PeerAuthentication resource in Istio's root namespace. For the default installation, this is usually the istio-system namespace:

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

```bash
kubectl apply -f strict-mtls.yaml
```

Before doing this, make sure every caller to STRICT workloads has a sidecar. Workloads without sidecars cannot send Istio mTLS traffic and will be blocked when they call services that require STRICT mTLS.

Verify all pods have sidecars:

```bash
# Find pods without sidecars in meshed namespaces
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $ns ==="
  kubectl get pods -n $ns -o json | \
    jq -r '.items[] | select(.spec.containers | map(.name) | index("istio-proxy") | not) | .metadata.name'
done
```

## Enabling STRICT mTLS Per-Namespace

If you are not ready for mesh-wide STRICT mode, enable it one namespace at a time:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

The precedence order for mTLS configuration is: workload-specific > namespace-specific > mesh-wide. This means you can have STRICT at the mesh level and PERMISSIVE or DISABLE for specific workloads.

## Disabling mTLS for Specific Services

Sometimes you need to disable mTLS for a specific workload. Common reasons include: the workload receives traffic from clients outside the mesh, it runs a legacy server-first protocol that does not work through the sidecar's protocol detection, or it is a database that handles its own TLS.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: disable-mtls-mysql
  namespace: database
spec:
  selector:
    matchLabels:
      app: mysql
  mtls:
    mode: DISABLE
```

You can also disable mTLS for specific workload ports while keeping it enabled for others. The port number is the workload or container port, not the Kubernetes Service port:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mixed-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: DISABLE  # Disable mTLS on metrics port
```

## Configuring DestinationRules for mTLS

PeerAuthentication controls the server-side mTLS settings (what the service accepts). For client-side settings (what the calling service sends), you use DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mtls-to-external-db
  namespace: production
spec:
  host: external-database.other-namespace.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE  # Send plaintext when calling this service
```

Available TLS modes in DestinationRule:

- `DISABLE`: No TLS
- `SIMPLE`: One-way TLS (client verifies server)
- `MUTUAL`: Mutual TLS with custom certificates
- `ISTIO_MUTUAL`: Mutual TLS using Istio-managed certificates

If TLS settings are not explicitly configured in a DestinationRule, Istio's Auto mTLS decides whether to send Istio mutual TLS based on whether the destination has a sidecar.

## Verifying mTLS is Working

After making changes, verify that mTLS is actually in effect:

```bash
# Check whether the listener requires a TLS transport socket
istioctl proxy-config listeners my-pod -n production --port 8080 -o json | \
  jq '.[].filterChains[].transportSocket'

# Check outbound TLS settings for a destination cluster
istioctl proxy-config clusters my-pod -n production \
  --fqdn my-service.production.svc.cluster.local --port 8080 -o json | \
  jq '.[].transportSocketMatches, .[].transportSocket'
```

You can also check through Envoy stats:

```bash
# Check SSL handshake stats
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep "ssl.handshake"

# Non-zero ssl.handshake means mTLS connections are being established
```

Check with actual traffic:

```bash
# Send a request and check if it uses mTLS
kubectl exec deploy/test-client -c curl -- \
  curl -s http://httpbin.production:8000/headers | \
  jq '.headers["X-Forwarded-Client-Cert"]'
```

When using HTTP, Istio injects the `X-Forwarded-Client-Cert` header into the upstream request when mutual TLS is used. A service such as httpbin can echo that request header back so you can inspect it.

## Common mTLS Issues and Fixes

### Issue: 503 Errors After Enabling STRICT

Services without sidecars cannot communicate with services that require STRICT mTLS.

```bash
# Find the affected services
kubectl logs my-pod -c istio-proxy | grep "503" | tail -5

# Check if the upstream service has a sidecar
kubectl get pod -l app=upstream-service -o jsonpath='{.items[0].spec.containers[*].name}'
```

Fix: Either add a sidecar to the calling service or create a PeerAuthentication exception.

### Issue: External Clients Cannot Reach Sidecar-Protected Services

External clients (outside the mesh) usually cannot send Istio mTLS traffic directly to application sidecars. In a regular Istio deployment, configure ingress through an Istio gateway so the gateway handles the downstream connection and then sends the upstream request into the mesh.

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: app-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "example.com"
```

### Issue: Health Check Probes Failing

Kubernetes health check probes come from the kubelet, which does not have Istio certificates. Istio normally rewrites probes to go through the sidecar agent, but if this is not working:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
```

### Issue: Metrics Scraping Fails with STRICT mTLS

Prometheus needs to scrape metrics from your pods. If STRICT mTLS is enabled, Prometheus needs mTLS certificates or you need to exclude metrics ports:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: metrics-exception
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  portLevelMtls:
    15020:
      mode: PERMISSIVE  # Allow Prometheus to scrape without mTLS
```

## Migration Path: PERMISSIVE to STRICT

Follow this order for a safe transition:

1. Verify all pods in the mesh have sidecars
2. Check that all service-to-service traffic works in PERMISSIVE mode
3. Enable STRICT in one non-critical namespace
4. Monitor for errors for 24-48 hours
5. Enable STRICT in additional namespaces one at a time
6. After all namespaces are STRICT, enable STRICT at the mesh level
7. Remove per-namespace STRICT policies (mesh-wide covers them)

```bash
# Monitor mTLS adoption over time
# This Prometheus query shows the percentage of mTLS vs plaintext
# sum(istio_requests_total{connection_security_policy="mutual_tls"}) / sum(istio_requests_total)
```

Take your time with this transition. A premature switch to STRICT mode is one of the most common causes of outages during Istio adoption. Verify at each step before moving forward.
