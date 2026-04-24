# How to Set Up Automated Testing for Rancher Deployments - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Testing, Automation, Ci-cd, Helm, Kubernetes

Description: A guide to setting up automated testing pipelines for Rancher cluster deployments, covering smoke tests, integration tests, and deployment validation.

## Overview

Automated testing for Kubernetes deployments in Rancher ensures that cluster configurations, Helm charts, and application deployments work correctly before reaching production. This guide covers implementing smoke tests, integration tests, Helm chart testing, and deployment validation pipelines using Kind for local testing and Rancher for staging/production validation.

## Test Strategy Layers

A comprehensive Rancher deployment testing strategy includes:

1. **Unit tests**: Test Helm chart values and Kubernetes manifest generation
2. **Smoke tests**: Verify basic cluster functionality after provisioning
3. **Integration tests**: Test application behavior in a real cluster
4. **End-to-end tests**: Validate complete deployment pipelines

## Helm Chart Testing with Helm Test

Helm provides a built-in testing mechanism using test hooks:

```yaml
# templates/tests/connection-test.yaml

apiVersion: v1
kind: Pod
metadata:
  name: "{{ .Release.Name }}-test-connection"
  labels:
    helm.sh/chart: {{ include "myapp.chart" . }}
  annotations:
    "helm.sh/hook": test
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['{{ .Release.Name }}-service:{{ .Values.service.port }}/health']
  restartPolicy: Never
```

```bash
# Run Helm tests after deployment
helm install myapp ./charts/myapp --wait
helm test myapp
# Runs the test pods and reports pass/fail
```

## Cluster Smoke Tests

After provisioning a new cluster, run a set of smoke tests to validate basic functionality:

```bash
#!/bin/bash
# smoke-test-cluster.sh - Run after cluster provisioning

KUBECONFIG="$1"
FAILED=0

run_test() {
  local TEST_NAME="$1"
  local TEST_CMD="$2"

  if eval "${TEST_CMD}" > /dev/null 2>&1; then
    echo "PASS: ${TEST_NAME}"
  else
    echo "FAIL: ${TEST_NAME}"
    FAILED=$((FAILED + 1))
  fi
}

# Test 1: Nodes are ready
run_test "All nodes ready" \
  "kubectl --kubeconfig=${KUBECONFIG} wait --for=condition=Ready nodes --all --timeout=120s"

# Test 2: Core DNS is working
run_test "CoreDNS resolves kubernetes.default" \
  "kubectl --kubeconfig=${KUBECONFIG} run dns-test --image=busybox --restart=Never --rm -i --command -- nslookup kubernetes.default"

# Test 3: Can create and delete a pod
kubectl --kubeconfig=${KUBECONFIG} run test-pod \
  --image=nginx:latest --restart=Never > /dev/null 2>&1
run_test "Pod scheduling works" \
  "kubectl --kubeconfig=${KUBECONFIG} wait --for=condition=Ready pod/test-pod --timeout=120s"
kubectl --kubeconfig=${KUBECONFIG} delete pod test-pod > /dev/null 2>&1

# Test 4: Storage provisioner works
kubectl --kubeconfig=${KUBECONFIG} apply -f - > /dev/null << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: smoke-test-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
EOF

run_test "Storage provisioner works" \
  "kubectl --kubeconfig=${KUBECONFIG} wait --for=jsonpath='{.status.phase}'=Bound pvc/smoke-test-pvc --timeout=120s"
kubectl --kubeconfig=${KUBECONFIG} delete pvc smoke-test-pvc > /dev/null 2>&1

# Test 5: ClusterIP service creation
run_test "Service creation works" \
  "kubectl --kubeconfig=${KUBECONFIG} create service clusterip test-svc --tcp=80:80 --dry-run=server"

# Report results
if [ "${FAILED}" -eq 0 ]; then
  echo ""
  echo "All smoke tests passed!"
  exit 0
else
  echo ""
  echo "${FAILED} smoke test(s) failed!"
  exit 1
fi
```

## Integration Testing with Kind

Use Kind for local integration tests before deploying to Rancher:

```yaml
# .github/workflows/test-deployment.yml
name: Test Deployment
on:
  pull_request:
    paths:
      - 'charts/**'
      - 'manifests/**'

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Kind cluster
        uses: helm/kind-action@v1.14.0
        with:
          cluster_name: test-cluster
          config: .kind/cluster-config.yaml

      - name: Install dependencies
        run: |
          # Install cert-manager
          kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml
          kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=120s

          # Install local-path provisioner for dynamic PVCs in Kind
          kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml

      - name: Deploy application
        run: |
          helm install myapp ./charts/myapp \
            --values ./charts/myapp/values-test.yaml \
            --wait --timeout=5m

      - name: Run smoke tests
        run: ./scripts/smoke-test-cluster.sh ~/.kube/config

      - name: Run integration tests
        run: |
          # Run integration tests against the deployed application
          kubectl apply -f tests/integration/
          kubectl wait --for=condition=complete job/integration-test --timeout=300s
          kubectl logs job/integration-test

      - name: Run Helm tests
        run: helm test myapp

      - name: Cleanup
        if: always()
        run: kind delete cluster --name test-cluster
```

## Deployment Validation in Rancher

After deploying to a Rancher-managed cluster, run validation tests:

```python
#!/usr/bin/env python3
# validate-deployment.py
import subprocess
import sys
import time

def validate_deployment(namespace: str, deployment_name: str, timeout: int = 300):
    """Validate a deployment is healthy"""
    print(f"Validating deployment: {namespace}/{deployment_name}")

    start_time = time.time()
    while time.time() - start_time < timeout:
        result = subprocess.run(
            ['kubectl', 'rollout', 'status', 'deployment', deployment_name,
             '-n', namespace, '--timeout=30s'],
            capture_output=True, text=True
        )

        if result.returncode == 0:
            print(f"PASS: Deployment {deployment_name} is healthy")
            return True

        print(f"Waiting for {deployment_name} to be healthy...")
        time.sleep(10)

    print(f"FAIL: Deployment {deployment_name} did not become healthy within {timeout}s")
    return False


def run_post_deploy_tests(namespace: str):
    """Run a test job after deployment"""
    subprocess.run(
        ['kubectl', 'delete', 'job', 'post-deploy-test', '-n', namespace, '--ignore-not-found'],
        check=True
    )

    test_job = f"""
apiVersion: batch/v1
kind: Job
metadata:
  name: post-deploy-test
  namespace: {namespace}
  labels:
    test-type: post-deploy
spec:
  template:
    spec:
      containers:
        - name: tester
          image: registry.example.com/integration-tests:latest
          env:
            - name: TARGET_URL
              value: http://webapp.{namespace}.svc/api/v1/health
      restartPolicy: Never
  backoffLimit: 0
"""
    subprocess.run(['kubectl', 'apply', '-f', '-'], input=test_job, text=True, check=True)

    # Wait for job completion
    result = subprocess.run(
        ['kubectl', 'wait', '--for=condition=complete', 'job/post-deploy-test',
         '-n', namespace, '--timeout=300s'],
        capture_output=True, text=True
    )
    return result.returncode == 0


if __name__ == '__main__':
    namespace = sys.argv[1] if len(sys.argv) > 1 else 'production'
    deployments = ['webapp', 'api-service', 'worker']

    all_passed = True
    for deployment in deployments:
        if not validate_deployment(namespace, deployment):
            all_passed = False

    if not run_post_deploy_tests(namespace):
        all_passed = False
        print("FAIL: Post-deployment tests failed")

    sys.exit(0 if all_passed else 1)
```

## Rancher Fleet Deployment Testing

Test Fleet bundles before applying to production clusters:

```yaml
# fleet.yaml - Configure staged validation rollouts
defaultNamespace: testing

rolloutStrategy:
  maxUnavailable: 0
  maxUnavailablePartitions: 0
  partitions:
    # Test on a canary cluster first
    - name: canary
      clusterSelector:
        matchLabels:
          fleet-role: canary
    # Then all production clusters
    - name: production
      clusterSelector:
        matchLabels:
          env: production
```

## Conclusion

Automated testing for Rancher deployments should cover multiple layers: Helm chart tests validate chart correctness, smoke tests verify cluster health after provisioning, integration tests validate application behavior in real clusters, and deployment validation confirms rollouts succeed. Kind provides fast, ephemeral test environments for CI/CD pipelines, while Rancher Fleet rollout partitions provide staged rollouts gated by BundleDeployment readiness. Invest in building this testing infrastructure early - the time saved debugging production issues will far outweigh the implementation cost.
