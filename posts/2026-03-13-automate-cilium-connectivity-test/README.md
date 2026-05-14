# Automate Cilium Connectivity Tests in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Connectivity, Testing, eBPF

Description: Learn how to automate Cilium's built-in connectivity test suite in your CI/CD pipeline to continuously validate network policy enforcement and pod-to-pod connectivity after cluster changes.

---

## Introduction

Cilium ships with a comprehensive connectivity test suite that validates end-to-end network connectivity, network policy enforcement, and service routing across your cluster. Running these tests manually is useful during installation, but to maintain confidence over time, they should be automated as part of your CI/CD pipeline and run after any cluster upgrade, node change, or Cilium configuration update.

The `cilium connectivity test` command deploys a set of test pods into a dedicated namespace and runs a structured series of connectivity checks - testing direct pod-to-pod communication, service endpoints, DNS resolution, and network policy enforcement. Automating this gives you continuous validation that your CNI layer is functioning correctly.

## Prerequisites

- Kubernetes cluster with Cilium installed
- A `cilium` CLI release compatible with the Cilium version installed in your cluster
- `kubectl` configured with cluster access
- CI/CD system (GitHub Actions, GitLab CI, or similar)
- Cluster access from your CI runner

## Step 1: Run a Manual Connectivity Test First

Before automating, understand what the connectivity test does by running it manually.

```bash
# Run the full Cilium connectivity test suite

# This deploys test pods to a namespace derived from 'cilium-test' and runs all checks
cilium connectivity test

# Run a quick subset for faster feedback (useful for CI)
cilium connectivity test --test pod-to-pod --test pod-to-service

# Run tests with verbose output for debugging
cilium connectivity test --verbose
```

## Step 2: Create a Connectivity Test Script

Wrap the connectivity test in a script that handles timeouts, cleanup, and exit codes for CI consumption.

```bash
#!/bin/bash
# scripts/run-cilium-connectivity-test.sh
# Runs Cilium connectivity tests and exits with a non-zero code on failure
# Designed for use in CI/CD pipelines

set -euo pipefail

# Configuration
TIMEOUT=${CONNECTIVITY_TEST_TIMEOUT:-300}   # 5 minute timeout
TEST_NAMESPACE="cilium-test"
CILIUM_NAMESPACE=${CILIUM_NAMESPACE:-kube-system}

echo "=== Starting Cilium Connectivity Tests ==="
echo "Timeout: ${TIMEOUT}s"

# Ensure Cilium is healthy before running connectivity tests
echo "Checking Cilium status..."
cilium --namespace "${CILIUM_NAMESPACE}" status --wait --wait-duration "${TIMEOUT}s"

# Run the connectivity test suite with a timeout
# --test-namespace sets the namespace prefix used for test pods
# --junit-file generates a JUnit XML report for CI systems
cilium --namespace "${CILIUM_NAMESPACE}" connectivity test \
  --test-namespace "${TEST_NAMESPACE}" \
  --timeout "${TIMEOUT}s" \
  --junit-file connectivity-test-results.xml \
  --all-flows || TEST_EXIT_CODE=$?

TEST_EXIT_CODE=${TEST_EXIT_CODE:-0}

# Clean up connectivity test artifacts after completion
echo "Cleaning up connectivity test artifacts..."
if ! cilium --namespace "${CILIUM_NAMESPACE}" connectivity test --cleanup --test-namespace "${TEST_NAMESPACE}"; then
  echo "WARNING: Failed to clean up Cilium connectivity test artifacts"
fi

if [ "${TEST_EXIT_CODE}" -ne 0 ]; then
  echo "ERROR: Cilium connectivity tests FAILED with exit code ${TEST_EXIT_CODE}"
  exit "${TEST_EXIT_CODE}"
fi

echo "=== Cilium Connectivity Tests PASSED ==="
```

## Step 3: Configure GitHub Actions Workflow

Add the connectivity test to your CI pipeline as a post-deployment validation step.

```yaml
# .github/workflows/cilium-connectivity-test.yml
# Runs Cilium connectivity tests after cluster upgrades or Cilium configuration changes
name: Cilium Connectivity Tests

on:
  workflow_dispatch:                    # Allow manual triggering
  push:
    paths:
      - 'clusters/**'                   # Trigger when cluster config changes
      - '.github/workflows/cilium-connectivity-test.yml'
  schedule:
    - cron: '0 6 * * *'                # Run daily at 6 AM UTC

jobs:
  connectivity-test:
    runs-on: ubuntu-latest
    env:
      CILIUM_CLI_VERSION: v0.19.2 # Set to a CLI release compatible with your Cilium version
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v5
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Install Cilium CLI
        run: |
          CLI_ARCH=amd64
          if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
          curl -L --fail --remote-name-all \
            "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz"{,.sha256sum}
          sha256sum --check "cilium-linux-${CLI_ARCH}.tar.gz.sha256sum"
          sudo tar xzvfC "cilium-linux-${CLI_ARCH}.tar.gz" /usr/local/bin
          rm "cilium-linux-${CLI_ARCH}.tar.gz"{,.sha256sum}

      - name: Run connectivity tests
        run: |
          chmod +x scripts/run-cilium-connectivity-test.sh
          ./scripts/run-cilium-connectivity-test.sh
        timeout-minutes: 10

      - name: Upload test results
        if: always()                     # Upload results even on failure
        uses: actions/upload-artifact@v4
        with:
          name: connectivity-test-results
          path: connectivity-test-results.xml

      - name: Publish test report
        if: always()
        uses: mikepenz/action-junit-report@v5
        with:
          report_paths: connectivity-test-results.xml
```

## Step 4: Run Targeted Tests for Faster Feedback

For CI runs triggered by frequent changes, run a targeted subset of tests to reduce pipeline time.

```bash
# Run policy-focused tests by matching current connectivity test names
cilium connectivity test --test ccnp-client-to-client --test pod-to-cidr --test from-cidr-to-pod

# Run service and external connectivity tests only
cilium connectivity test --test pod-to-service --test pod-to-world

# Skip specific tests by using negation patterns with --test
cilium connectivity test --test '!host-to-pod' --test '!pod-to-remote-nodeport'
```

## Best Practices

- Run the full connectivity test suite nightly; run targeted tests on each pull request.
- Store the JUnit XML results as CI artifacts to track test history over time.
- Always run `cilium status --wait` before connectivity tests to ensure Cilium agents are healthy.
- Use `--timeout` to prevent CI jobs from hanging indefinitely on stuck tests.
- Clean up the Cilium connectivity test artifacts after each run to prevent resource accumulation.
- Pin the `cilium` CLI version in your CI pipeline to a release compatible with the installed Cilium version.

## Conclusion

Automating Cilium connectivity tests transforms a manual post-install check into continuous network policy validation. By integrating the connectivity test suite into your CI/CD pipeline with proper JUnit reporting and cleanup, you catch CNI regressions before they impact production workloads.
