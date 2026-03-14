# Troubleshooting gRPC Traffic in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, gRPC, Troubleshooting

Description: Learn how to troubleshoot gRPC traffic policies in Cilium for Kubernetes. This guide covers practical resolution techniques with real examples and commands.

---

## Introduction

Troubleshooting gRPC traffic policies issues in Cilium requires a systematic approach to identify whether problems stem from policy misconfiguration, agent health, or network connectivity. This guide provides practical diagnostic steps for the most common issues.

When gRPC-aware security controls are not working as expected, the impact can range from broken application connectivity to security policy gaps. Understanding Cilium's diagnostic tools and the typical failure modes helps you resolve issues quickly and minimize downtime.

This guide covers the complete troubleshooting workflow from initial diagnosis through verification of the fix.

## Prerequisites

- Kubernetes cluster with Cilium (v1.14+) installed
- `cilium` CLI and Hubble CLI available
- `kubectl` access to the cluster
- Familiarity with CiliumNetworkPolicy resources
- Access to Cilium agent logs

## Initial Diagnosis

Start by assessing the overall health of your Cilium deployment:

```bash
# Check Cilium agent health on all nodes
kubectl -n kube-system get pods -l k8s-app=cilium -o wide
```

```bash
# View Cilium agent logs for errors
kubectl -n kube-system logs ds/cilium -c cilium-agent --tail=100 | grep -i error
```

```mermaid
graph TD
    A[Issue Detected] --> B[Check Cilium Agent Status]
    B --> C{Agent Healthy?}
    C -->|No| D[Restart Cilium Agent]
    C -->|Yes| E[Check Endpoint Status]
    E --> F{Endpoints Ready?}
    F -->|No| G[Review Endpoint Logs]
    F -->|Yes| H[Analyze Hubble Flows]
    H --> I{Drops Found?}
    I -->|Yes| J[Review Policy Selectors]
    I -->|No| K[Check Application Configuration]
    J --> L[Fix Policy and Reapply]
    D --> B
    G --> L
    K --> L
    L --> M[Verify Fix]
```

## Common Issues and Solutions

### Issue 1: Endpoints Not Ready

When endpoints are stuck in a non-ready state, policies cannot be enforced correctly.

```bash
# Check endpoint status for failures
cilium endpoint list -o json | jq '.[] | select(.status.state != "ready")'

# Get detailed status for a problematic endpoint
cilium endpoint get <ENDPOINT_ID> -o json | \
  jq '{state: .status.state, health: .status.health, policy: .status.policy}'

# Check if the endpoint is being regenerated
kubectl -n kube-system logs ds/cilium -c cilium-agent | \
  grep "endpoint.*regenerat"
```

### Issue 2: Policy Not Matching Expected Traffic

Verify that your policy selectors correctly match the target endpoints:

```bash
# Check labels on target pods
kubectl get pods -n production --show-labels

# View the realized policy on a specific endpoint
cilium endpoint list -o json | \
  jq '.[] | select(.status.labels.id | any(contains("app="))) | {
    id: .id,
    labels: .status.labels.id,
    ingress_enforcing: .status.policy.realized."l4-ingress",
    egress_enforcing: .status.policy.realized."l4-egress"
  }'
```

```yaml
# Verify your policy selectors are correct
# This is the expected policy format:
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: grpc-service-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: grpc-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: grpc-client
      toPorts:
        - ports:
            - port: "50051"
              protocol: TCP
          rules:
            http:
              - method: "POST"
                path: "/myservice.MyService/GetData"
              - method: "POST"
                path: "/myservice.MyService/ListItems"
              - method: "POST"
                path: "/grpc.health.v1.Health/Check" 
```

### Issue 3: Hubble Shows Unexpected Drops

When Hubble reports drops that should be allowed, investigate the flow details:

```bash
# Get detailed drop information
hubble observe --verdict DROPPED --namespace production --output json | \
  jq '.flow | {
    src: .source.labels,
    dst: .destination.labels,
    port: (.l4.TCP.destination_port // .l4.UDP.destination_port),
    drop_reason: .drop_reason_desc,
    identity: .source.identity
  }' | head -30

# Check if the source identity is recognized
cilium identity list | grep <IDENTITY_ID>
```

## Analyzing Agent Logs

Cilium agent logs contain valuable diagnostic information:

```bash
# Search for policy-related errors
kubectl -n kube-system logs ds/cilium -c cilium-agent --tail=200 | \
  grep -iE "error|warn|fail" | grep -i policy

# Check for BPF map issues
kubectl -n kube-system logs ds/cilium -c cilium-agent --tail=200 | \
  grep -i "bpf\|map"

# View recent endpoint regeneration events
kubectl -n kube-system logs ds/cilium -c cilium-agent --tail=200 | \
  grep "regenerat"
```

## Verification

After applying fixes, confirm the issue is resolved:

```bash
# Verify the fix resolved the issue
cilium endpoint health
```

```bash
# Confirm no more unexpected drops
hubble observe --verdict DROPPED --last 50
```

```bash
# Run connectivity test to validate
cilium connectivity test
```

## Troubleshooting

- **Cilium agent CrashLoopBackOff**: Check resource limits and node capacity. Review crash logs with `kubectl -n kube-system logs ds/cilium -c cilium-agent --previous`.
- **Policy changes not propagating**: Force endpoint regeneration with `cilium endpoint regenerate all` (use with caution).
- **Hubble relay unavailable**: Check Hubble relay pod status with `kubectl -n kube-system get pods -l app.kubernetes.io/name=hubble-relay`.
- **Stale endpoint data**: Delete and recreate the affected pod to force a new endpoint allocation.

## Conclusion

Effective troubleshooting of gRPC traffic policies in Cilium follows a consistent pattern: check agent health, verify endpoint status, analyze Hubble flows, and review policy selectors. By building familiarity with these diagnostic tools and common failure patterns, you can resolve most issues within minutes. Always verify your fixes with connectivity tests and Hubble flow monitoring before considering the issue resolved.
