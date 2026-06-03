# How to Run Kubernetes Cluster Conformance Tests Using Sonobuoy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sonobuoy, Testing, Conformance, Cluster Validation

Description: Learn how to use Sonobuoy to run Kubernetes conformance tests that validate cluster functionality, ensure API compliance, and identify configuration issues in your Kubernetes deployments.

---

Sonobuoy provides diagnostic testing for Kubernetes clusters through a standardized framework that runs conformance tests, validates cluster behavior, and generates detailed reports. These tests verify that your cluster meets Kubernetes API specifications and identifies potential issues before they impact workloads.

In this guide, we'll use Sonobuoy to run conformance tests on a Kubernetes cluster, interpret the results, and create custom test plugins that validate cluster-specific requirements. This testing approach ensures your clusters behave correctly and remain compliant with Kubernetes standards.

## Understanding Sonobuoy Architecture

Sonobuoy deploys a test aggregation pod into your cluster that coordinates test execution across nodes. It runs conformance tests using the official Kubernetes e2e test suite, collects results from all test pods, and packages everything into a tarball for analysis.

The tool provides several built-in test modes: non-disruptive-conformance runs the default conformance set while skipping disruptive tests, quick mode runs a single smoke test that creates and removes a pod, conformance-lite skips some long-running tests for faster feedback, and certified-conformance runs the full conformance suite required for Kubernetes certification. You can also create custom plugins that run your own validation tests.

Sonobuoy operates non-destructively by default, creating temporary namespaces and resources that it cleans up after testing completes. This makes the default mode suitable for existing clusters, though certified-conformance can include disruptive tests and is not recommended for production workloads.

## Installing Sonobuoy

Download and install the Sonobuoy CLI:

```bash
# Install on Linux

wget https://github.com/vmware-tanzu/sonobuoy/releases/download/v0.57.3/sonobuoy_0.57.3_linux_amd64.tar.gz
tar -xzf sonobuoy_0.57.3_linux_amd64.tar.gz
sudo mv sonobuoy /usr/local/bin/

# Install on macOS
brew install sonobuoy

# Verify installation
sonobuoy version
```

Ensure you have cluster access:

```bash
kubectl cluster-info
kubectl get nodes
```

## Running Quick Smoke Tests

Start with quick mode to validate basic cluster functionality:

```bash
# Run a quick smoke test
sonobuoy run --mode quick

# Check test status
sonobuoy status

# View logs from test aggregator
sonobuoy logs
```

Monitor test execution:

```bash
# Watch test progress
sonobuoy status --json | jq '.plugins[] | {plugin: .plugin, status: .status}'

# View running test pods
kubectl get pods -n sonobuoy

# Follow aggregator logs
kubectl logs -n sonobuoy sonobuoy -f
```

Wait for tests to complete:

```bash
# Wait for completion (polls every 30s)
sonobuoy wait

# Expected output when complete:
# sonobuoy is still running
# ...
# sonobuoy has completed
```

## Retrieving and Analyzing Results

Extract test results after completion:

```bash
# Retrieve results tarball
results=$(sonobuoy retrieve)

# Extract results
mkdir sonobuoy-results
tar -xzf $results -C sonobuoy-results

# View summary
sonobuoy results $results

# Detailed results by plugin
sonobuoy results $results --plugin e2e

# Failed tests only
sonobuoy results $results --mode detailed | grep FAILED
```

The results tarball contains:

```bash
# Explore results structure
tree sonobuoy-results
# plugins/
#   e2e/
#     results/
#       global/
#         junit_01.xml
#         e2e.log
#   systemd-logs/
#     results/
# meta/
#   info.json
#   query-time.json
```

## Running Full Conformance Tests

Execute the complete CNCF conformance suite:

```bash
# Run full certified conformance (can take hours)
sonobuoy run --mode certified-conformance

# Monitor progress
sonobuoy status --json | jq '.status'
```

Full conformance tests validate:
- API server functionality
- Node and pod lifecycle management
- Service networking and DNS
- Storage provisioning and mounting
- ConfigMaps and Secrets
- RBAC and authentication
- Resource scheduling and limits

These tests ensure your cluster meets Kubernetes certification requirements.

## Customizing Test Execution

Run specific test patterns:

```bash
# Run only networking tests
sonobuoy run --e2e-focus="\\[sig-network\\]"

# Skip flaky tests
sonobuoy run --e2e-skip="\\[Flaky\\]"

# Run the faster built-in conformance-lite mode
sonobuoy run --mode conformance-lite

# Combine options
sonobuoy run \
  --e2e-focus="\\[Conformance\\]" \
  --e2e-skip="\\[Slow\\]|\\[Serial\\]" \
  --plugin-env=e2e.E2E_PARALLEL=true
```

Configure test behavior:

```bash
# Use specific Kubernetes version for tests
sonobuoy run --kubernetes-version=v1.28.0

# Increase test timeout
sonobuoy run --timeout=7200

# Schedule the aggregator on matching nodes
sonobuoy run --aggregator-node-selector=node-type:test
```

## Creating Custom Test Plugins

Build a custom plugin that validates cluster-specific requirements:

```yaml
# custom-plugin.yaml
sonobuoy-config:
  driver: Job
  plugin-name: custom-validation
  result-format: manual
  result-files:
  - sonobuoy_results.yaml

spec:
  name: plugin
  env:
  - name: RESULTS_DIR
    value: /tmp/results

  command: ["/bin/sh", "-c"]
  args:
    - |
      set +e

      # Test 1: Verify cluster DNS
      echo "Testing DNS resolution..."
      if kubectl run sonobuoy-dns-test -n sonobuoy --image=busybox:1.36 --restart=Never --rm -i --quiet -- nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1; then
        dns_status=passed
      else
        dns_status=failed
        kubectl delete pod sonobuoy-dns-test -n sonobuoy --ignore-not-found=true
      fi

      # Test 2: Check cluster connectivity
      echo "Testing API server connectivity..."
      if kubectl get nodes > /dev/null 2>&1; then
        api_status=passed
      else
        api_status=failed
      fi

      # Test 3: Validate persistent storage
      echo "Testing storage classes..."
      if kubectl get storageclass -o jsonpath='{range .items[*]}{.metadata.annotations.storageclass\.kubernetes\.io/is-default-class}{"\n"}{end}' | grep -q true; then
        storage_status=passed
      else
        storage_status=failed
      fi

      overall_status=passed
      if [ "$dns_status" = "failed" ] || [ "$api_status" = "failed" ] || [ "$storage_status" = "failed" ]; then
        overall_status=failed
      fi

      cat > ${RESULTS_DIR}/sonobuoy_results.yaml <<EOF
      name: custom-validation
      status: ${overall_status}
      items:
      - name: dns-resolution
        status: ${dns_status}
      - name: api-connectivity
        status: ${api_status}
      - name: storage-class
        status: ${storage_status}
      EOF

      echo -n sonobuoy_results.yaml > ${RESULTS_DIR}/done

  image: bitnami/kubectl:latest
  volumeMounts:
  - mountPath: /tmp/results
    name: results
```

Run with custom plugin:

```bash
# Generate sonobuoy manifest with custom plugin
sonobuoy gen --plugin custom-plugin.yaml > sonobuoy-custom.yaml

# Deploy
kubectl apply -f sonobuoy-custom.yaml

# Check status
sonobuoy status

# Retrieve results
results=$(sonobuoy retrieve)
sonobuoy results $results --plugin custom-validation
```

## Testing Storage Provisioning

Create a plugin that validates persistent volume functionality:

```yaml
# storage-test-plugin.yaml
sonobuoy-config:
  driver: Job
  plugin-name: storage-validation
  result-format: manual
  result-files:
  - sonobuoy_results.yaml

spec:
  name: plugin
  env:
  - name: RESULTS_DIR
    value: /tmp/results

  command: ["/bin/sh", "-c"]
  args:
    - |
      # Create test PVC
      cat <<EOF | kubectl apply -f -
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: sonobuoy-storage-test
        namespace: sonobuoy
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 1Gi
      EOF

      # Wait for PVC to bind
      i=0
      while [ "$i" -lt 60 ]; do
        status=$(kubectl get pvc sonobuoy-storage-test -n sonobuoy -o jsonpath='{.status.phase}')
        if [ "$status" = "Bound" ]; then
          break
        fi
        i=$((i + 1))
        sleep 1
      done

      if [ "$status" != "Bound" ]; then
        pvc_status=failed
      else
        pvc_status=passed
      fi

      cat > ${RESULTS_DIR}/sonobuoy_results.yaml <<EOF
      name: storage-validation
      status: ${pvc_status}
      items:
      - name: pvc-provisioning
        status: ${pvc_status}
      EOF

      # Cleanup
      kubectl delete pvc sonobuoy-storage-test -n sonobuoy

      echo -n sonobuoy_results.yaml > ${RESULTS_DIR}/done

  image: bitnami/kubectl:latest
  volumeMounts:
  - mountPath: /tmp/results
    name: results
```

## Running Tests in CI/CD Pipelines

Integrate Sonobuoy tests into automated pipelines:

```bash
#!/bin/bash
# run-conformance-ci.sh

set -e

echo "Starting Sonobuoy conformance tests..."

# Run quick smoke tests for faster feedback
sonobuoy run --mode quick --wait

# Retrieve results
results=$(sonobuoy retrieve)

# Check if tests passed
if sonobuoy results "$results" --plugin e2e | grep -q "Failed: 0"; then
  echo "All tests passed!"
  sonobuoy delete --wait
  exit 0
else
  echo "Tests failed:"
  sonobuoy results "$results" --mode detailed --plugin e2e | jq 'select(.status == "failed") | .name'
  sonobuoy delete --wait
  exit 1
fi
```

GitHub Actions workflow:

```yaml
# .github/workflows/conformance-test.yml
name: Cluster Conformance

on:
  pull_request:
    paths:
      - 'infrastructure/**'

jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup cluster
      run: |
        kind create cluster --config kind-config.yaml

    - name: Install Sonobuoy
      run: |
        wget https://github.com/vmware-tanzu/sonobuoy/releases/download/v0.57.3/sonobuoy_0.57.3_linux_amd64.tar.gz
        tar -xzf sonobuoy_0.57.3_linux_amd64.tar.gz
        sudo mv sonobuoy /usr/local/bin/

    - name: Run conformance tests
      run: |
        sonobuoy run --mode quick --wait
        results=$(sonobuoy retrieve)
        sonobuoy results $results

    - name: Upload results
      uses: actions/upload-artifact@v4
      with:
        name: sonobuoy-results
        path: '*_sonobuoy_*.tar.gz'
```

## Analyzing Failed Tests

When tests fail, extract detailed failure information:

```bash
# Get detailed failure report
results=$(sonobuoy retrieve)
sonobuoy results "$results" --mode detailed --plugin e2e > test-failures.json

# Parse failures
jq 'select(.status == "failed") | {name: .name, details: .details}' test-failures.json

# View logs for failed test
mkdir -p sonobuoy-results
tar -xzf "$results" -C sonobuoy-results
cat sonobuoy-results/plugins/e2e/results/global/e2e.log | grep -A 50 "FAILED_TEST_NAME"
```

Common failure categories:
- **DNS issues**: Check CoreDNS deployment and service
- **Network policy failures**: Verify CNI plugin installation
- **Storage tests**: Validate StorageClass and CSI drivers
- **RBAC failures**: Check ClusterRole and ServiceAccount configurations

## Testing Multi-Node Clusters

Sonobuoy collects system logs from all nodes by default, and e2e tests exercise node behavior as required:

```bash
# Run tests that validate node communication
sonobuoy run --e2e-focus="\\[sig-network\\].*Node"

# Check test distribution across nodes
kubectl get pods -n sonobuoy -o wide

# View per-node system logs
results=$(sonobuoy retrieve)
mkdir -p sonobuoy-results
tar -xzf "$results" -C sonobuoy-results
ls sonobuoy-results/plugins/systemd-logs/results/
```

## Cleanup and Resource Management

Clean up Sonobuoy resources:

```bash
# Delete Sonobuoy namespace and resources
sonobuoy delete --wait

# Clean up Sonobuoy resources and dangling e2e namespaces
sonobuoy delete --all --wait

# Verify cleanup
kubectl get namespace sonobuoy
```

## Generating Conformance Reports

Create official conformance reports for certification:

```bash
# Run certified conformance tests
sonobuoy run --mode certified-conformance --wait

# Retrieve results
results=$(sonobuoy retrieve)

# Generate report
sonobuoy results $results --mode report > conformance-report.txt

# Extract necessary files for certification
mkdir -p sonobuoy-results
tar -xzf "$results" -C sonobuoy-results
cp sonobuoy-results/plugins/e2e/results/global/junit_01.xml .
cp sonobuoy-results/plugins/e2e/results/global/e2e.log .
```

## Conclusion

Sonobuoy provides comprehensive cluster validation through standardized conformance tests that ensure Kubernetes clusters function correctly. Regular conformance testing catches configuration issues, validates cluster upgrades, and maintains compliance with Kubernetes specifications.

The tool's plugin architecture enables custom validation tests specific to your environment while the conformance suite provides baseline assurance that core Kubernetes functionality works as expected. This combination gives you confidence in cluster reliability.

For production clusters, run quick smoke tests regularly in CI/CD pipelines, execute full conformance tests before major upgrades, and create custom plugins that validate your specific infrastructure requirements beyond standard Kubernetes functionality.
