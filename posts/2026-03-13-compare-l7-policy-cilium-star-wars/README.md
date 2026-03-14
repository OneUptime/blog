# Compare L7 Network Policy in the Cilium Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, eBPF, Network Policy, Star Wars Demo

Description: Explore how Cilium enforces Layer 7 HTTP policies using the Star Wars demo, demonstrating method- and path-level API access control that goes beyond traditional firewalling.

---

## Introduction

Layer 7 (L7) policies represent one of Cilium's most powerful differentiators. While traditional firewalls can only allow or block entire TCP connections, Cilium can inspect HTTP requests and make policy decisions based on the HTTP method, URL path, and headers - all without a sidecar proxy.

The Star Wars demo illustrates this perfectly. Even after restricting the Death Star to Empire ships using an L3/L4 policy, a TIE fighter can still destroy the Death Star by hitting the `/v1/exhaust-port` endpoint. An L7 HTTP policy closes this gap by allowing only specific HTTP methods and paths.

This post walks through Cilium's L7 policy capabilities in the Star Wars demo, explaining the eBPF-based HTTP inspection mechanism and how to apply it to real-world API security scenarios.

## Prerequisites

- Cilium installed with L7 proxy support enabled
- Star Wars demo deployed and L3/L4 policy from previous steps applied
- Hubble enabled for L7 flow visibility
- `kubectl` and `cilium` CLI available

## Step 1: Demonstrate the L7 Gap in L3/L4 Policy

Show that the L3/L4 policy alone doesn't prevent access to dangerous endpoints.

```bash
# TIE fighter can still hit the exhaust port - this is the gap L7 policy fixes
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port

# This returns: "Panic: deathstar exploded!"
# With only L3/L4 policy, any HTTP method to any path is allowed
```

## Step 2: Apply the L7 HTTP Policy

Replace the L3/L4 policy with one that also specifies allowed HTTP methods and paths.

```yaml
# sw-l7-policy.yaml
# L7 policy: restrict Death Star to only the safe landing request endpoint
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "rule1"
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
        # Only allow POST requests to the landing request path
        - method: "POST"
          path: "/v1/request-landing"
```

```bash
# Apply the L7 policy (replaces the existing L3/L4 rule)
kubectl apply -f sw-l7-policy.yaml
```

## Step 3: Verify L7 Enforcement

Test that the allowed path works while the dangerous path is now blocked.

```bash
# Allowed: POST to /v1/request-landing from TIE fighter
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
# Expected: Ship landed

# Blocked: PUT to /v1/exhaust-port - now returns 403 Forbidden
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
# Expected: 403 Forbidden (policy violation, not a connection drop)

# Still blocked: X-wing (org=alliance) - dropped at L3
kubectl exec xwing -- curl --max-time 5 -XPOST deathstar.default.svc.cluster.local/v1/request-landing
```

## Step 4: Observe L7 Flows with Hubble

Hubble provides L7-level visibility, showing HTTP method, path, and response code.

```bash
# Observe L7 HTTP flows with full request details
hubble observe \
  --to-pod default/deathstar \
  --follow \
  --type l7 \
  --output json | jq '.flow | {source: .source.pod_name, http: .l7.http}'
```

## Step 5: Understand How L7 Proxy Works

Cilium's L7 enforcement uses an embedded Envoy proxy transparently intercept traffic.

```bash
# Check that the Envoy proxy is running as part of the Cilium DaemonSet
kubectl -n kube-system exec -ti ds/cilium -- cilium-dbg proxy list

# View L7 proxy statistics
kubectl -n kube-system exec -ti ds/cilium -- cilium-dbg proxy stats
```

## Best Practices

- Use L7 policies for any service with a sensitive or destructive API endpoint
- Be explicit about both `method` and `path` in L7 rules to prevent method confusion attacks
- Test L7 policies with Hubble to confirm HTTP-level verdicts (403 vs connection drop)
- Combine L3/L4 identity with L7 path rules for defense in depth
- Remember that L7 policy adds slight latency due to proxy interception - measure it in your environment

## Conclusion

Cilium's L7 HTTP policy transforms network security from connection-level to API-level control. The Star Wars demo demonstrates how a single dangerous endpoint can be closed with a simple path and method rule, without deploying any additional proxies. This capability is directly applicable to production APIs where certain operations must be strictly limited to authorized callers using authorized methods.
