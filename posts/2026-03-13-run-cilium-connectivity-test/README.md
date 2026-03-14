# Run Cilium Connectivity Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Connectivity, Testing, EBPF

Description: Learn how to run Cilium's built-in connectivity test suite to validate network policy enforcement, pod-to-pod communication, external access, and DNS resolution after installation or upgrades.

---

## Introduction

After installing or upgrading Cilium, verifying that the networking stack works correctly is critical before deploying workloads. The `cilium connectivity test` command runs a comprehensive suite of end-to-end network tests that validate pod connectivity, network policy enforcement, DNS resolution, and external egress - all in a few minutes.

The connectivity test suite deploys test pods into a dedicated namespace, runs hundreds of traffic scenarios between them, and reports which tests pass and fail. This gives you confidence that Cilium is functioning correctly and that no regression was introduced by a configuration change or upgrade.

This guide covers how to run connectivity tests, how to interpret the output, and how to diagnose common failures.

## Prerequisites

- Cilium installed and running (`cilium status` shows OK)
- `cilium` CLI v0.15+ installed
- `kubectl` configured for the target cluster
- Sufficient cluster capacity for test pods (approximately 4 pods per node)
- Internet access from the cluster (for external connectivity tests)

## Step 1: Verify Cilium Status Before Testing

Confirm all Cilium agents are healthy before running connectivity tests.
```bash
# Check overall Cilium status
cilium status --wait

# Verify all DaemonSet pods are running
kubectl get daemonset cilium -n kube-system

# Check that cilium-operator is healthy
kubectl get deployment cilium-operator -n kube-system
```

## Step 2: Run the Full Connectivity Test Suite

Execute the complete connectivity test battery.
```bash
# Run the full connectivity test suite with default settings
cilium connectivity test

# Run tests with verbose output to see individual test results
cilium connectivity test --verbose

# Run tests with a specific timeout (default is 5 minutes)
cilium connectivity test --timeout 10m
```

The test suite covers:
```plaintext
✅ no-policies                     - Basic pod connectivity without any policies
✅ no-policies-extra               - Additional connectivity scenarios
✅ allow-all-except-world          - Ingress allow-all with world-deny
✅ client-ingress                  - Ingress policy enforcement
✅ client-ingress-knp              - Kubernetes NetworkPolicy ingress
✅ echo-ingress                    - Echo server ingress tests
✅ host-port                       - HostPort connectivity
✅ pod-to-world                    - External egress connectivity
✅ pod-to-cidr                     - CIDR-based egress policy
✅ dns-only                        - DNS resolution tests
```

## Step 3: Run a Subset of Tests

Focus on specific test scenarios for faster validation.
```bash
# Run only policy-related tests
cilium connectivity test --test "*-policies*"

# Run only external connectivity tests
cilium connectivity test --test "pod-to-world,pod-to-cidr"

# Skip tests that require internet access (useful in air-gapped environments)
cilium connectivity test --skip-tests "pod-to-world"

# Run tests with multiple workers for faster completion
cilium connectivity test --parallel-tests 4
```

## Step 4: Interpret Test Results

Understand how to read the test output and identify failures.
```bash
# Review the test summary
# A passing run looks like:
# ✅ All X tests (Y scenarios, Z flows) passed, Z warnings, Z failures

# For a failing test, get detailed information
cilium connectivity test --verbose 2>&1 | grep -A 10 "FAIL"

# View test pod logs for troubleshooting
kubectl logs -n cilium-test deployment/client -c client
kubectl logs -n cilium-test deployment/echo-same-node -c echo-same-node
```

## Step 5: Clean Up Test Resources

Remove the test namespace after validation.
```bash
# Delete test pods and namespace
kubectl delete namespace cilium-test

# Or use the cilium CLI cleanup command
cilium connectivity test --cleanup-on-exit
```

## Best Practices

- Run connectivity tests after every Cilium upgrade before workload traffic flows
- Include connectivity tests in CI/CD pipelines for cluster provisioning automation
- Use `--test` flags to run targeted tests during rapid troubleshooting sessions
- Archive test output for audit purposes after major Cilium version upgrades
- Run tests across multiple node pairs to detect node-specific networking issues
- Set `--test-namespace` to avoid conflicts if running tests on a busy cluster

## Conclusion

The Cilium connectivity test suite is one of the most valuable tools for validating Cilium deployments. Running the full suite after installation or upgrades gives you confidence that the networking stack is healthy and that policy enforcement is working as expected. Build connectivity testing into your cluster lifecycle workflows to catch issues before they affect production traffic.
