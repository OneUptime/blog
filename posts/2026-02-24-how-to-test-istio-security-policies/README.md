# How to Test Istio Security Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Authorization, mTLS, Testing, Kubernetes

Description: Practical techniques for testing Istio security policies including AuthorizationPolicies, PeerAuthentication, and RequestAuthentication in a Kubernetes cluster.

---

Istio security policies are your service mesh's access control layer. They control which services can talk to each other, enforce mutual TLS, and validate JWT tokens. But if you are not actively testing these policies, you are essentially trusting that your YAML does what you think it does. That is a dangerous assumption.

This guide covers practical methods for testing AuthorizationPolicies, PeerAuthentication, and RequestAuthentication to make sure they actually protect your services.

## Preparing the Test Environment

Set up a dedicated namespace with Istio injection:

```bash
kubectl create namespace security-test
kubectl label namespace security-test istio-injection=enabled
```

Deploy test workloads. You want at least two services with different service accounts so you can test identity-based access control:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: client-a
  namespace: security-test
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: client-b
  namespace: security-test
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-a
  namespace: security-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: client-a
  template:
    metadata:
      labels:
        app: client-a
    spec:
      serviceAccountName: client-a
      containers:
      - name: sleep
        image: curlimages/curl
        command: ["/bin/sleep", "infinity"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-b
  namespace: security-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: client-b
  template:
    metadata:
      labels:
        app: client-b
    spec:
      serviceAccountName: client-b
      containers:
      - name: sleep
        image: curlimages/curl
        command: ["/bin/sleep", "infinity"]
```

Also deploy the `httpbin` sample as the backend service:

```bash
kubectl apply -n security-test -f samples/httpbin/httpbin.yaml
```

## Testing AuthorizationPolicy with ALLOW Rules

Start with a basic ALLOW policy that permits only `client-a` to access `httpbin`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-client-a-only
  namespace: security-test
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/security-test/sa/client-a"]
```

Apply it and test from both clients:

```bash
# Should succeed (200)
kubectl exec -n security-test deploy/client-a -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/200

# Should fail (403)
kubectl exec -n security-test deploy/client-b -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/200
```

Client-a should get a 200 response. Client-b should get a 403 RBAC access denied response.

## Testing DENY Rules

DENY rules take precedence over ALLOW rules. Test that a DENY rule blocks specific traffic even when an ALLOW rule exists:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-delete-method
  namespace: security-test
spec:
  selector:
    matchLabels:
      app: httpbin
  action: DENY
  rules:
  - to:
    - operation:
        methods: ["DELETE"]
```

Now test:

```bash
# GET should still work for client-a
kubectl exec -n security-test deploy/client-a -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/200

# DELETE should be blocked for everyone
kubectl exec -n security-test deploy/client-a -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" -X DELETE http://httpbin:8000/status/200
```

The GET request should return 200, while the DELETE request should return 403.

## Testing PeerAuthentication (mTLS)

PeerAuthentication controls whether services require mutual TLS. Set STRICT mTLS for the namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: security-test
spec:
  mtls:
    mode: STRICT
```

To test this, try sending a request from a pod without an Istio sidecar. Create a pod in a namespace without injection:

```bash
kubectl create namespace no-mesh
kubectl run curl-nomesh -n no-mesh --image=curlimages/curl \
  --command -- /bin/sleep infinity
kubectl wait --for=condition=ready pod/curl-nomesh -n no-mesh --timeout=60s
```

Now try to reach httpbin from outside the mesh:

```bash
# This should fail because the client has no mTLS certificate
kubectl exec -n no-mesh curl-nomesh -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://httpbin.security-test.svc.cluster.local:8000/status/200
```

With STRICT mTLS, this connection should fail because the non-mesh client cannot present a valid mTLS certificate.

From within the mesh, requests should still work:

```bash
kubectl exec -n security-test deploy/client-a -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/200
```

## Testing RequestAuthentication with JWT

RequestAuthentication validates JWT tokens on incoming requests. Here is a policy that requires a valid JWT:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: require-jwt
  namespace: security-test
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  - issuer: "https://accounts.example.com"
    jwksUri: "https://accounts.example.com/.well-known/jwks.json"
```

RequestAuthentication alone only validates tokens that are present. To actually require tokens, pair it with an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: security-test
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["https://accounts.example.com/*"]
```

Test without a token:

```bash
# Should fail (403) - no token provided
kubectl exec -n security-test deploy/client-a -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/200
```

Test with an invalid token:

```bash
# Should fail (401) - invalid token
kubectl exec -n security-test deploy/client-a -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid-token" http://httpbin:8000/status/200
```

## Testing Namespace Isolation

A common security pattern is to deny all traffic by default and only allow specific communication paths. Apply a default-deny policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: security-test
spec: {}
```

An empty spec with no rules means deny everything. Verify that all requests are now blocked:

```bash
kubectl exec -n security-test deploy/client-a -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/200
# Should return 403
```

Then add specific ALLOW rules to open up only the paths you need.

## Scripting a Full Security Test Suite

Combine all your tests into an automated script:

```bash
#!/bin/bash
set -e

PASS=0
FAIL=0

assert_status() {
  local test_name=$1
  local expected=$2
  local pod=$3
  local url=$4
  shift 4
  local extra_args="$@"

  ACTUAL=$(kubectl exec -n security-test deploy/$pod -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" $extra_args "$url" 2>/dev/null)

  if [ "$ACTUAL" = "$expected" ]; then
    echo "PASS: $test_name"
    PASS=$((PASS+1))
  else
    echo "FAIL: $test_name (expected $expected, got $ACTUAL)"
    FAIL=$((FAIL+1))
  fi
}

# Test cases
assert_status "client-a can GET httpbin" "200" "client-a" "http://httpbin:8000/status/200"
assert_status "client-b is blocked" "403" "client-b" "http://httpbin:8000/status/200"
assert_status "DELETE is blocked" "403" "client-a" "http://httpbin:8000/status/200" "-X DELETE"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] || exit 1
```

## Watching for Policy Propagation Delays

One gotcha with security policy testing: there is a delay between applying a policy and it taking effect. Envoy proxies need to receive the updated configuration from Istiod. This usually takes 1-5 seconds, but can take longer under load.

Add retry logic to your tests:

```bash
wait_for_status() {
  local pod=$1
  local url=$2
  local expected=$3
  local retries=20

  for i in $(seq 1 $retries); do
    ACTUAL=$(kubectl exec -n security-test deploy/$pod -c sleep -- \
      curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [ "$ACTUAL" = "$expected" ]; then
      return 0
    fi
    sleep 2
  done
  return 1
}
```

## Wrapping Up

Testing Istio security policies takes discipline, but the alternative is discovering a misconfigured AuthorizationPolicy during an incident. Build a test suite that covers your ALLOW rules, DENY rules, mTLS enforcement, and JWT validation. Automate it in CI so every policy change gets verified. Security policies that are not tested are just hopeful YAML.
