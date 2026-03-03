# How to Use Talos Linux in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CI/CD, DevOps, Kubernetes, Automation

Description: Learn how to integrate Talos Linux clusters into your CI/CD pipelines for automated testing, deployment validation, and infrastructure-as-code workflows.

---

Testing against a real Kubernetes cluster in your CI/CD pipeline catches issues that unit tests and mocked environments miss. Network policies, resource limits, RBAC configurations, and storage behavior all need a real cluster to validate properly. Talos Linux makes this practical because clusters can be created and destroyed programmatically, they boot fast, and their configuration is entirely declarative.

This guide shows you how to integrate Talos Linux into your CI/CD pipelines, whether you are using GitHub Actions, GitLab CI, Jenkins, or any other CI platform.

## Why Talos Linux for CI/CD

Several properties make Talos well-suited for CI/CD:

- **Fast cluster creation** - A single-node cluster can be ready in 2-3 minutes using the Docker provider
- **Deterministic state** - Every cluster starts from the same machine configuration, no drift
- **No cleanup complexity** - Destroy the cluster and all state is gone, no leftover containers or network interfaces
- **API-driven management** - Everything can be scripted with `talosctl`
- **Multiple providers** - Docker provider for lightweight CI, QEMU for full hardware simulation

## The Docker Provider

The fastest way to run Talos in CI is the Docker provider. It runs Talos nodes as Docker containers, which means no VMs, no nested virtualization, and fast startup times.

```bash
# Create a single-node Talos cluster using Docker
talosctl cluster create \
  --provisioner docker \
  --name ci-cluster \
  --controlplanes 1 \
  --workers 1 \
  --wait-timeout 5m

# Get the kubeconfig
talosctl kubeconfig --force /tmp/ci-kubeconfig --merge=false

# Use the cluster
export KUBECONFIG=/tmp/ci-kubeconfig
kubectl get nodes
```

The Docker provider is ideal for CI because:
- It works anywhere Docker runs (including CI runners)
- Cluster creation takes 1-3 minutes
- Cleanup is instant (just destroy the containers)
- It uses fewer resources than VM-based approaches

## The QEMU Provider

For tests that need real kernel features, network simulation, or disk testing, the QEMU provider runs actual VMs:

```bash
# Create a cluster with QEMU (requires KVM access)
talosctl cluster create \
  --provisioner qemu \
  --name ci-cluster-qemu \
  --controlplanes 1 \
  --workers 1 \
  --cpus 2 \
  --memory 2048 \
  --disk 10240 \
  --wait-timeout 10m
```

The QEMU provider is slower but more realistic. Use it when Docker provider limitations affect your tests.

## Pipeline Structure

A typical CI/CD pipeline with Talos Linux follows this pattern:

```text
1. Create Talos cluster
2. Wait for cluster health
3. Deploy application
4. Run tests
5. Collect results
6. Destroy cluster
```

Here is a reusable shell script that handles the lifecycle:

```bash
#!/bin/bash
# ci-cluster.sh - Manage Talos cluster lifecycle for CI

set -euo pipefail

CLUSTER_NAME="${CI_CLUSTER_NAME:-ci-$(date +%s)}"
KUBECONFIG_PATH="/tmp/${CLUSTER_NAME}-kubeconfig"

create_cluster() {
  echo "Creating Talos cluster: ${CLUSTER_NAME}"
  talosctl cluster create \
    --provisioner docker \
    --name "${CLUSTER_NAME}" \
    --controlplanes 1 \
    --workers 1 \
    --wait-timeout 5m

  talosctl kubeconfig --force "${KUBECONFIG_PATH}" --merge=false
  export KUBECONFIG="${KUBECONFIG_PATH}"

  echo "Waiting for all nodes to be ready..."
  kubectl wait --for=condition=Ready nodes --all --timeout=300s

  echo "Cluster is ready. KUBECONFIG=${KUBECONFIG_PATH}"
}

destroy_cluster() {
  echo "Destroying Talos cluster: ${CLUSTER_NAME}"
  talosctl cluster destroy --name "${CLUSTER_NAME}" || true
  rm -f "${KUBECONFIG_PATH}"
}

# Trap to ensure cleanup on exit
trap destroy_cluster EXIT

case "${1:-}" in
  create) create_cluster ;;
  destroy) destroy_cluster ;;
  *)
    create_cluster
    echo "Cluster running. Press Ctrl+C to destroy."
    wait
    ;;
esac
```

## Installing talosctl in CI

Most CI runners do not have `talosctl` pre-installed. Add an installation step:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Or install a specific version
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/talosctl-linux-amd64
chmod +x talosctl-linux-amd64
sudo mv talosctl-linux-amd64 /usr/local/bin/talosctl

# Verify
talosctl version --client
```

## Integration Testing Pattern

Here is a complete integration test workflow:

```bash
#!/bin/bash
# run-integration-tests.sh
set -euo pipefail

# Step 1: Create cluster
talosctl cluster create \
  --provisioner docker \
  --name integration-test \
  --controlplanes 1 \
  --workers 2 \
  --wait-timeout 5m

# Step 2: Get kubeconfig
export KUBECONFIG=/tmp/integration-kubeconfig
talosctl kubeconfig --force "$KUBECONFIG" --merge=false

# Step 3: Wait for readiness
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Step 4: Deploy application
kubectl apply -f ./manifests/
kubectl rollout status deployment/myapp --timeout=120s

# Step 5: Run tests
# Run your test suite against the cluster
go test ./integration/... -v -timeout 10m
TEST_RESULT=$?

# Step 6: Collect artifacts
kubectl logs deployment/myapp > /tmp/app-logs.txt 2>&1 || true
kubectl get events --sort-by='.lastTimestamp' > /tmp/events.txt 2>&1 || true

# Step 7: Cleanup
talosctl cluster destroy --name integration-test

exit $TEST_RESULT
```

## Parallel Test Execution

Run multiple test suites against separate clusters simultaneously:

```bash
#!/bin/bash
# parallel-tests.sh

PIDS=()

run_test_suite() {
  local suite=$1
  local cluster_name="ci-${suite}-$(date +%s)"

  talosctl cluster create \
    --provisioner docker \
    --name "${cluster_name}" \
    --controlplanes 1 \
    --workers 1 \
    --wait-timeout 5m

  export KUBECONFIG="/tmp/${cluster_name}-kubeconfig"
  talosctl kubeconfig --force "$KUBECONFIG" --merge=false

  # Run the test suite
  go test "./tests/${suite}/..." -v -timeout 10m
  local result=$?

  talosctl cluster destroy --name "${cluster_name}"
  return $result
}

# Run suites in parallel
run_test_suite "networking" &
PIDS+=($!)

run_test_suite "storage" &
PIDS+=($!)

run_test_suite "rbac" &
PIDS+=($!)

# Wait for all and collect results
FAILED=0
for pid in "${PIDS[@]}"; do
  wait "$pid" || FAILED=1
done

exit $FAILED
```

## Custom Cluster Configurations for Testing

Different tests may need different cluster configurations. Use config patches:

```bash
# Test with specific Kubernetes version
talosctl cluster create \
  --provisioner docker \
  --name k8s-129-test \
  --kubernetes-version 1.29.0 \
  --controlplanes 1 \
  --workers 1

# Test with specific CNI
talosctl cluster create \
  --provisioner docker \
  --name cilium-test \
  --controlplanes 1 \
  --workers 1 \
  --config-patch '[{"op": "replace", "path": "/cluster/network/cni/name", "value": "none"}]'

# After cluster is up, install Cilium manually
kubectl apply -f cilium-manifests/
```

## Caching and Speed Optimization

Speed up CI runs by caching Talos images:

```bash
# Pre-pull the Talos container images
docker pull ghcr.io/siderolabs/talos:v1.7.0

# Cache the talosctl binary
# In GitHub Actions, use actions/cache
# In GitLab CI, use the cache directive
```

Use the smallest cluster that satisfies your test requirements. A single control plane node with `allowSchedulingOnControlPlanes` is often enough:

```bash
talosctl cluster create \
  --provisioner docker \
  --name minimal \
  --controlplanes 1 \
  --workers 0 \
  --config-patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'
```

## Handling Failures

CI pipelines need to handle failures gracefully. Always clean up clusters, even when tests fail:

```bash
# Use trap for cleanup
cleanup() {
  talosctl cluster destroy --name "${CLUSTER_NAME}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Now run your tests knowing cleanup will happen
```

## Wrapping Up

Talos Linux transforms CI/CD pipeline testing by making it practical to spin up real Kubernetes clusters on demand. The Docker provider enables fast, lightweight clusters that work in any CI environment with Docker access. The deterministic nature of Talos means your tests run against a known-good cluster state every time, eliminating the flaky behavior that plagues shared test environments. With proper lifecycle management and cleanup, Talos clusters in CI add minimal overhead while providing maximum confidence that your applications work correctly on real Kubernetes.
