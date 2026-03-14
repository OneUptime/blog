# Compare L3/L4 Network Policy in the Cilium Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EBPF, Network Policy, Star Wars Demo

Description: A deep dive into L3 and L4 network policy enforcement using the Cilium Star Wars demo, explaining how identity-based IP and port policies work in practice.

---

## Introduction

Layer 3 (L3) and Layer 4 (L4) policies form the foundational layer of Cilium's security model. L3 policies control which endpoints can communicate based on identity (labels), while L4 policies add port and protocol constraints on top of that identity filter.

The Cilium Star Wars demo makes these concepts concrete. By allowing only TIE fighters (org=empire) to reach the Death Star on TCP port 80, the demo shows exactly how identity-based L3/L4 enforcement differs from traditional IP-based firewall rules. Crucially, this identity follows the pod even as its IP address changes.

This post walks through L3/L4 policy in the Star Wars demo in detail, explaining what each policy field does and how to verify enforcement using Cilium's built-in observability tools.

## Prerequisites

- Cilium installed and healthy (`cilium status`)
- Star Wars demo deployed (`kubectl get pods`)
- Hubble enabled for observability
- `kubectl` and `cilium` CLI available

## Step 1: Deploy the Demo Application

Deploy the Star Wars application if not already running.

```bash
# Deploy all Star Wars demo components: deathstar, tiefighter, xwing
kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/http-sw-app.yaml

# Confirm all pods are running
kubectl get pods -l org=empire
kubectl get pods -l org=alliance
```

## Step 2: Understand the L3/L4 Policy Structure

Examine the policy fields in detail before applying it.

```yaml
# sw-l3-l4-policy.yaml
# L3/L4 policy: only Empire ships (org=empire) may reach the Death Star on port 80
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "rule1"
  namespace: default
spec:
  # endpointSelector targets the Death Star pod by its labels
  endpointSelector:
    matchLabels:
      org: empire
      class: deathstar
  ingress:
  # fromEndpoints defines the allowed source identities (L3)
  - fromEndpoints:
    - matchLabels:
        org: empire   # Only pods labeled org=empire are allowed
    toPorts:
    # toPorts constrains allowed destination ports (L4)
    - ports:
      - port: "80"
        protocol: TCP
```

```bash
# Apply the L3/L4 policy
kubectl apply -f sw-l3-l4-policy.yaml
```

## Step 3: Verify Policy Enforcement

Test connectivity from both the allowed and blocked endpoints.

```bash
# TIE fighter is org=empire - should succeed with HTTP 200
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# X-wing is org=alliance - should be dropped at L3 (connection will hang then timeout)
kubectl exec xwing -- curl --max-time 5 -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
```

## Step 4: Observe Policy Decisions with Hubble

Hubble shows the forwarded and dropped flow decisions in real time.

```bash
# Watch flows to the Death Star and see policy verdicts
hubble observe \
  --to-pod default/deathstar \
  --follow \
  --output json | jq '.flow | {source: .source.pod_name, verdict: .verdict, type: .l4}'
```

## Step 5: Inspect the Endpoint Policy

Inspect the policy compiled to the Death Star endpoint to confirm it matches your intent.

```bash
# Get the endpoint ID for the Death Star pod
ENDPOINT_ID=$(cilium endpoint list | grep deathstar | awk '{print $1}')

# View the policy installed on this endpoint
cilium endpoint get $ENDPOINT_ID | jq '.[].spec.policy'
```

## Best Practices

- Use identity-based L3 policies (label selectors) rather than IP-based CIDR rules for pod-to-pod traffic
- Always specify both `fromEndpoints` and `toPorts` together for least-privilege enforcement
- Watch Hubble flows while testing policy changes to immediately see enforcement results
- Combine L3/L4 policies with L7 rules for APIs that require method-level control
- Label pods with structured, consistent labels from the start - policy design depends on label hygiene

## Conclusion

L3/L4 policies in Cilium provide robust, identity-based network segmentation that survives pod restarts and IP address changes. The Star Wars demo makes these concepts approachable, but the same patterns apply directly to production workloads. With Hubble providing real-time visibility into policy decisions, you can confidently enforce and audit network policies at any scale.
