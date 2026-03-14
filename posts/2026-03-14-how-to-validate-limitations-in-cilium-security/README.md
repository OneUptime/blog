# Validating Cilium Security Policy Limitations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, Validation

Description: Learn how to validate that your Cilium security policies account for known limitations and enforce the expected behavior. This guide covers testing strategies and validation tooling.

---

## Introduction

Validating Cilium security policies is essential to confirm that your network security posture is as strong as you intend. Given Cilium's known limitations, validation must go beyond simply applying policies and hoping they work.

A proper validation strategy includes automated connectivity testing, flow analysis, and policy simulation. This ensures that even when Cilium has constraints around certain traffic patterns, your overall security model remains intact.

This guide provides a comprehensive framework for validating your Cilium policies, with particular attention to areas where limitations may create gaps.

## Prerequisites

- A running Kubernetes cluster with Cilium (v1.14+)
- `cilium` CLI and Hubble installed
- `kubectl` access to the cluster
- A staging or test namespace for validation
- Familiarity with CiliumNetworkPolicy syntax

## Setting Up a Validation Environment

Create a dedicated namespace and test workloads to validate policies without affecting production.

```bash
# Create a test namespace for validation
kubectl create namespace cilium-validation

# Deploy test client and server pods
kubectl -n cilium-validation run server \
  --image=nginx:1.25 --labels="app=server,role=backend" \
  --port=80

kubectl -n cilium-validation expose pod server --port=80

kubectl -n cilium-validation run client \
  --image=busybox:1.36 --labels="app=client,role=frontend" \
  --command -- sleep 3600
```

```yaml
# Apply a test CiliumNetworkPolicy to validate
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: validate-ingress
  namespace: cilium-validation
spec:
  endpointSelector:
    matchLabels:
      app: server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: client
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
```

## Running Cilium Connectivity Tests

Cilium provides a built-in connectivity test suite that validates many common scenarios.

```bash
# Run the full connectivity test suite
cilium connectivity test --namespace cilium-validation

# Run specific test scenarios to target known limitation areas
cilium connectivity test --test to-fqdns

# Run DNS-specific validation tests
cilium connectivity test --test dns-only
```

## Validating Policy Enforcement with Hubble

Use Hubble to observe real traffic flows and confirm policies are being enforced.

```bash
# Monitor all flows in the validation namespace
hubble observe --namespace cilium-validation --output compact

# Test allowed traffic and verify it succeeds
kubectl -n cilium-validation exec client -- \
  wget --timeout=5 -q -O - http://server

# Test that unauthorized traffic is blocked
kubectl -n cilium-validation run unauthorized \
  --image=busybox:1.36 --rm -it --restart=Never \
  --labels="app=unauthorized" -- \
  wget --timeout=3 -q -O - http://server

# Verify the drop was recorded
hubble observe --namespace cilium-validation --verdict DROPPED --last 10
```

## Automated Policy Validation Pipeline

Integrate policy validation into your CI/CD pipeline for continuous assurance.

```bash
#!/bin/bash
# validate-cilium-policies.sh
# Run this script in CI to validate Cilium policies

set -euo pipefail

NAMESPACE="cilium-validation"

echo "Step 1: Checking Cilium agent health..."
cilium status || exit 1

echo "Step 2: Applying test policies..."
kubectl apply -f test-policies/ -n "$NAMESPACE"

echo "Step 3: Waiting for policy propagation..."
sleep 10

echo "Step 4: Running connectivity tests..."
cilium connectivity test --namespace "$NAMESPACE"

echo "Step 5: Verifying endpoint policy status..."
ENDPOINTS=$(cilium endpoint list -o json | \
  jq '[.[] | select(.status.policy.realized."l4-ingress" != null)] | length')
echo "Endpoints with active policies: $ENDPOINTS"

echo "Step 6: Checking for unintended drops..."
DROPS=$(hubble observe --namespace "$NAMESPACE" --verdict DROPPED --last 100 -o json | \
  jq '[.flow] | length')
echo "Drops detected: $DROPS"

echo "Validation complete."
```



### Network Segmentation Best Practices

Effective network segmentation goes beyond individual policies. Consider organizing your workloads into security zones based on their sensitivity level and communication requirements.

```bash
# Review all namespace labels for security zone classification
kubectl get namespaces --show-labels

# Identify cross-namespace communication patterns
hubble observe --output json --last 500 | \
  jq '.flow | select(.source.namespace != .destination.namespace) | {
    src_ns: .source.namespace,
    dst_ns: .destination.namespace,
    port: (.l4.TCP.destination_port // .l4.UDP.destination_port)
  }' | sort | uniq -c | sort -rn

# Ensure each namespace has appropriate policy coverage
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  count=$(kubectl get cnp -n "$ns" --no-headers 2>/dev/null | wc -l)
  echo "Namespace $ns: $count policies"
done
```

When designing your segmentation strategy, ensure that each security zone has explicit ingress and egress policies. This defense-in-depth approach ensures that even if one layer of security is compromised, other layers continue to protect your workloads.

## Verification

```bash
# Final verification checklist
# 1. All endpoints have correct identity
cilium endpoint list -o json | jq '.[] | .status.identity.id'

# 2. All policies are in realized state
cilium policy get -o json | jq '.[] | {name: .metadata.name, state: .status}'

# 3. No unexpected drops in production namespaces
hubble observe --namespace production --verdict DROPPED --last 50

# 4. Connectivity test passes
cilium connectivity test
```

## Troubleshooting

- **Connectivity test fails on DNS tests**: Ensure the Cilium DNS proxy is enabled and kube-dns is accessible from the test namespace.
- **Policies in pending state**: Check Cilium agent logs for errors during policy computation.
- **Hubble not showing flows**: Verify Hubble is enabled with `cilium status` and that the Hubble relay is running.
- **Inconsistent validation results**: Ensure all Cilium agents are on the same version and that policies have propagated to all nodes.

## Conclusion

Validating Cilium security policies is a continuous process that should be integrated into your development and deployment workflows. By combining Cilium's connectivity tests, Hubble flow analysis, and automated validation scripts, you can maintain confidence in your security posture even when working within Cilium's known limitations. Regular validation catches policy drift, misconfigurations, and gaps before they become security incidents.
