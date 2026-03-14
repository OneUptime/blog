# Validate a New Cilium Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, CNI, Validation

Description: Learn how to validate a fresh Cilium installation in Kubernetes by running connectivity tests and checking component health to ensure your CNI is functioning correctly.

---

## Introduction

After installing Cilium as your Kubernetes CNI plugin, validating the installation is a critical first step before running production workloads. A misconfigured or incomplete Cilium installation can cause networking failures, policy enforcement issues, and hard-to-debug connectivity problems that only manifest under load.

Cilium ships with a built-in CLI tool and connectivity test suite that performs end-to-end validation of your installation. These tests cover pod-to-pod communication, service connectivity, policy enforcement, and more — giving you confidence that the data plane is working correctly.

This guide walks through a systematic approach to validating a new Cilium installation, from checking component status to running the full connectivity test suite.

## Prerequisites

- Kubernetes cluster with Cilium installed
- `cilium` CLI installed (`cilium-cli`)
- `kubectl` configured to access your cluster
- Cluster nodes in Ready state

## Step 1: Check Cilium Component Status

Verify that all Cilium components are running and healthy before proceeding with connectivity tests.

```bash
# Check Cilium daemonset and deployment status across all nodes
cilium status --wait

# Verify all Cilium pods are Running
kubectl get pods -n kube-system -l k8s-app=cilium

# Check the Cilium operator is healthy
kubectl get pods -n kube-system -l name=cilium-operator
```

## Step 2: Inspect Cilium Agent Health Per Node

Each node runs a Cilium agent pod. Inspect individual agent health to catch node-specific issues.

```bash
# List all Cilium agent pods with their node assignments
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Check detailed status for a specific Cilium agent
kubectl exec -n kube-system ds/cilium -- cilium status --verbose

# Inspect agent logs for errors or warnings
kubectl logs -n kube-system ds/cilium --tail=50
```

## Step 3: Validate Node Connectivity

Confirm that Cilium has established correct tunnel or direct routing between nodes.

```bash
# Show the Cilium endpoint list — each pod gets an endpoint entry
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Check that BPF maps are populated with node routes
kubectl exec -n kube-system ds/cilium -- cilium bpf tunnel list

# Verify node-to-node health probes are passing
kubectl exec -n kube-system ds/cilium -- cilium node list
```

## Step 4: Run the Full Connectivity Test Suite

Cilium CLI provides an automated connectivity test that deploys test pods and validates networking end-to-end.

```bash
# Run the full Cilium connectivity test (deploys test namespace automatically)
cilium connectivity test

# Run a subset of tests for faster validation during initial setup
cilium connectivity test --test pod-to-pod-encryption --test pod-to-service

# Clean up test namespace after validation
cilium connectivity test --cleanup-on-completion
```

## Step 5: Verify Network Policy Enforcement

Confirm that Cilium is enforcing network policies correctly by testing a simple deny-all policy.

```yaml
# test-netpol.yaml — deploy a NetworkPolicy to validate enforcement
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-test
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

```bash
# Apply the test policy and verify Cilium picks it up
kubectl apply -f test-netpol.yaml

# Confirm Cilium endpoint policy is updated
kubectl exec -n kube-system ds/cilium -- cilium endpoint list | grep -i policy

# Remove the test policy when done
kubectl delete -f test-netpol.yaml
```

## Best Practices

- Always run `cilium connectivity test` after any cluster or Cilium upgrade
- Monitor `cilium status` output in your alerting system for health regressions
- Check Cilium agent logs during the first 24 hours after installation for transient errors
- Use `--wait` flag with `cilium status` in automated pipelines to block until healthy
- Keep Cilium CLI version aligned with the installed Cilium version

## Conclusion

Validating a new Cilium installation ensures your cluster networking is functioning correctly before you deploy workloads. By combining `cilium status`, node inspection commands, and the built-in connectivity test suite, you gain confidence that pod networking, service routing, and policy enforcement are all working as expected. Make validation a standard step in your cluster provisioning pipeline.
