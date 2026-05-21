# How to Validate Istio Security Configuration for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Kubernetes, mTLS, Production

Description: Step-by-step guide to validating your Istio security configuration before deploying to production, covering mTLS, authorization policies, and more.

---

Security misconfigurations in Istio are some of the most dangerous issues you can have in production. A poorly configured authorization policy can expose sensitive endpoints to the entire cluster, and a lax mTLS setting can leave traffic unencrypted on the wire. The tricky part is that these problems are silent. Everything looks fine until someone discovers the gap.

Here is how to systematically validate your Istio security configuration before it hits production.

## Validate mTLS Enforcement

The first thing to check is whether mTLS is actually enforced across your mesh. You might think you have it configured, but overrides at the namespace or workload level can weaken it.

Start by listing all PeerAuthentication policies:

```bash
kubectl get peerauthentication -A -o yaml
```

Look for any policy that sets mode to PERMISSIVE or DISABLE. In production, you generally want STRICT for mesh and namespace policies:

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

For mesh-wide policy, put this in your Istio root namespace. In many installations that is `istio-system`, but use the root namespace configured for your mesh.

Now verify that it is actually working. Deploy a test pod without a sidecar and try to reach a service in the mesh:

```bash
kubectl run test-no-sidecar --image=curlimages/curl --restart=Never --labels="sidecar.istio.io/inject=false" --command -- sleep 3600

kubectl exec test-no-sidecar -- curl -s http://my-service.production.svc.cluster.local:8080
```

If STRICT mTLS is working, this request should fail because the test pod cannot present a valid client certificate.

Clean up after testing:

```bash
kubectl delete pod test-no-sidecar
```

## Validate Authorization Policies

Authorization policies define who can talk to whom. A missing policy or an overly broad one is a security risk.

First, check for namespaces without any authorization policy:

```bash
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  count=$(kubectl get authorizationpolicy -n "$ns" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null | wc -w)
  if [ "$count" -eq 0 ]; then
    echo "WARNING: Namespace $ns has 0 authorization policies"
  fi
done
```

Every production namespace should have a default-deny policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec: {}
```

Then verify that each allow policy uses specific principals, not wildcards:

```bash
kubectl get authorizationpolicy -A -o yaml | grep -A5 "source:"
```

Watch out for policies that use `principals: ["*"]` or have no `from` field at all. A wildcard principal matches any non-empty authenticated principal, and a missing `from` field allows any source for that rule.

## Validate Request Authentication

If you use JWT authentication at the mesh level, validate that RequestAuthentication resources are correctly configured:

```bash
kubectl get requestauthentication -A
```

Check that the JWKS URI is reachable from inside the cluster:

```bash
kubectl run jwt-test --image=curlimages/curl --restart=Never --command -- curl -s https://your-auth-provider.com/.well-known/jwks.json
kubectl logs jwt-test
kubectl delete pod jwt-test
```

A sample RequestAuthentication that validates JWTs:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://your-auth-provider.com/"
      jwksUri: "https://your-auth-provider.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

Make sure you combine this with an AuthorizationPolicy that actually requires a valid token:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://your-auth-provider.com/*"]
```

Without the authorization policy, RequestAuthentication only validates tokens that are present but does not reject requests without tokens.

## Validate TLS on Gateways

Your ingress gateways handle external traffic and need proper TLS configuration:

```bash
kubectl get gateways.networking.istio.io -A -o yaml | grep -A10 "tls:"
```

Make sure the TLS mode is set correctly. For production, you typically want SIMPLE or MUTUAL:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: production-tls-cert
      hosts:
        - "app.example.com"
```

Verify the TLS certificate is valid and not expiring soon:

```bash
kubectl get secret production-tls-cert -n istio-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout | grep -A2 "Validity"
```

## Check for Insecure Configuration Patterns

Run istioctl analyze to catch security issues:

```bash
istioctl analyze --all-namespaces 2>&1 | grep -i "security\|auth\|tls\|mtls"
```

Also check for these specific anti-patterns:

1. Services listening on port 80 without TLS redirect:

```bash
kubectl get gateways.networking.istio.io -A -o yaml | grep "protocol: HTTP"
```

If you have HTTP listeners, make sure they redirect to HTTPS:

```yaml
servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
      - "app.example.com"
```

2. Services with sidecar injection disabled:

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} containers: {range .spec.containers[*]}{.name} {end}{"\n"}{end}' | grep -v istio-proxy | grep -v "istio-system\|kube-system"
```

In sidecar mode, any production pod missing the istio-proxy container is not protected by the mesh sidecar.

## Validate Egress Security

Check what outbound traffic policies you have. The default ALLOW_ANY lets pods reach any external service:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A5 outboundTrafficPolicy
```

For production, consider REGISTRY_ONLY mode and explicitly define ServiceEntry resources for external services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
    - api.external-service.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Automated Security Validation Script

Put all these checks into a script that runs as part of your CI/CD pipeline:

```bash
#!/bin/bash
set -e

echo "Checking mTLS enforcement..."
PERMISSIVE=$(kubectl get peerauthentication -A -o yaml | grep "mode: PERMISSIVE" | wc -l)
DISABLE=$(kubectl get peerauthentication -A -o yaml | grep "mode: DISABLE" | wc -l)
if [ "$PERMISSIVE" -gt 0 ] || [ "$DISABLE" -gt 0 ]; then
  echo "FAIL: Found $PERMISSIVE PERMISSIVE and $DISABLE DISABLE mTLS policies"
  exit 1
fi

echo "Checking default-deny policies..."
for ns in production staging; do
  DENY=$(kubectl get authorizationpolicy -n "$ns" -o yaml | grep "name: deny-all" | wc -l)
  if [ "$DENY" -eq 0 ]; then
    echo "FAIL: Namespace $ns missing default-deny policy"
    exit 1
  fi
done

echo "Running istioctl analyze..."
ISSUES=$(istioctl analyze --all-namespaces 2>&1 | grep "Error" | wc -l)
if [ "$ISSUES" -gt 0 ]; then
  echo "FAIL: istioctl analyze found $ISSUES errors"
  exit 1
fi

echo "All security checks passed"
```

Run this script before every production deployment. Security validation should never be a manual process because people forget things under pressure. Automate it, and make it a hard gate in your deployment pipeline.
