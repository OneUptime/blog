# Use L7 Policy in the Cilium Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EBPF, Network Policy, Star Wars Demo

Description: A hands-on guide to applying and validating Layer 7 HTTP-aware network policies using the Cilium Star Wars demo, demonstrating how to restrict API access by HTTP method and path.

---

## Introduction

Layer 7 network policies in Cilium enable security enforcement at the application protocol level - restricting which HTTP methods, paths, headers, or gRPC methods can be used between services. In production environments, this capability allows you to express security requirements that directly map to your API's access control model rather than just IP addresses and ports.

The Star Wars demo provides the perfect hands-on environment to learn L7 policies. After applying an L3/L4 policy, TIE fighters can reach the Death Star, but they can still access the dangerous `/v1/exhaust-port` endpoint. An L7 HTTP policy fixes this by allowing only POST to `/v1/request-landing` - blocking all other methods and paths.

This guide takes you through applying, testing, and extending L7 policies using the Star Wars demo as your sandbox.

## Prerequisites

- Kubernetes cluster with Cilium installed (kernel 4.19.57+)
- Star Wars demo deployed
- L3/L4 policy already applied
- `kubectl` and `cilium` CLI configured
- Hubble enabled for flow observation

## Step 1: Apply the L7 HTTP Policy

Create a CiliumNetworkPolicy that restricts HTTP access on the Death Star.

```yaml
# Apply this L7 policy to restrict Death Star API access by HTTP method and path
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: rule1
  namespace: default
spec:
  description: "L7 policy to restrict Death Star to safe landing requests only"
  endpointSelector:
    matchLabels:
      org: empire
      class: deathstar
  ingress:
  - fromEndpoints:
    - matchLabels:
        org: empire
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        # ALLOW: POST requests to the landing endpoint only
        - method: "POST"
          path: "/v1/request-landing"
```

```bash
# Apply the L7 policy
kubectl apply -f l7-policy.yaml

# Confirm the policy was accepted
kubectl get ciliumnetworkpolicies
```

## Step 2: Test Allowed Traffic

Verify that allowed requests still succeed.

```bash
# This should succeed - TIE fighter POST to /v1/request-landing is allowed
kubectl exec tiefighter -- \
  curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Expected response: "Ship landed"
```

## Step 3: Test Blocked Traffic

Verify that the L7 policy blocks disallowed methods and paths.

```bash
# This should return 403 Forbidden - PUT to exhaust-port is not allowed
kubectl exec tiefighter -- \
  curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port

# Expected: 403 Access denied or connection hang

# This should also fail - X-wing blocked at L3/L4 level
kubectl exec xwing -- \
  curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Expected: connection timeout (not 403 - blocked at IP level, not HTTP)
```

## Step 4: Observe L7 Events in Hubble

Use Hubble to see the HTTP policy enforcement in real time.

```bash
# Start Hubble port-forward
cilium hubble port-forward &

# Watch HTTP flows with verdict information
hubble observe \
  --namespace default \
  --follow \
  --output json | jq '.flow | {src: .source.labels, dst: .destination.labels, verdict: .verdict, http: .l7}'
```

In the Hubble output, you should see:
- `FORWARDED` for TIE fighter POST to `/v1/request-landing`
- `DROPPED` for TIE fighter PUT to `/v1/exhaust-port` with HTTP 403

## Step 5: Extend the Policy with Additional Rules

Add more HTTP rules to build a more complete API access policy.

```yaml
# Extended L7 policy with multiple allowed endpoints
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: rule1
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      org: empire
      class: deathstar
  ingress:
  - fromEndpoints:
    - matchLabels:
        org: empire
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        # Allow landing requests
        - method: "POST"
          path: "/v1/request-landing"
        # Allow status checks (read-only GET)
        - method: "GET"
          path: "/v1/status"
        # Deny everything else - implicit deny since policy is allowlist-based
```

```bash
# Apply the extended policy
kubectl apply -f l7-policy-extended.yaml

# Test the newly allowed endpoint
kubectl exec tiefighter -- \
  curl -s -XGET deathstar.default.svc.cluster.local/v1/status
```

## Best Practices

- L7 policies are allowlist-based - any HTTP request not matching a rule is denied
- Combine L3/L4 and L7 policies: L3/L4 for identity filtering, L7 for API method/path restrictions
- Use Hubble HTTP visibility to audit which API endpoints are accessed and by whom
- Test L7 policies with both allowed and denied requests before deploying to production
- L7 policy adds Envoy proxy overhead - benchmark your latency-sensitive services

## Conclusion

Applying L7 HTTP policies in the Cilium Star Wars demo demonstrates how powerful application-layer network security can be. The ability to allow landing requests while blocking exhaust-port modifications - based purely on HTTP method and path - maps directly to real-world API security requirements. By mastering L7 policy in this sandbox environment, you're prepared to apply the same patterns to production microservices with confidence.
