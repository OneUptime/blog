# How to Run Smoke Tests After Deployment with PostSync Hooks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, PostSync Hooks, Testing

Description: Learn how to configure ArgoCD PostSync hooks to run automated smoke tests after deployment to verify application health and functionality.

---

Deploying new code is only half the battle. The other half is verifying it actually works. ArgoCD PostSync hooks let you run automated smoke tests immediately after a deployment completes, giving you fast feedback on whether the new version is functioning correctly.

Unlike health checks that verify individual resources, smoke tests validate the application end-to-end - checking that APIs respond, pages load, and critical user flows work.

## Basic Smoke Test Hook

A simple smoke test that checks HTTP endpoints:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    metadata:
      labels:
        app: smoke-test
    spec:
      containers:
        - name: smoke-test
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Starting smoke tests..."

              # Wait for service to be ready
              echo "Waiting for service readiness..."
              for i in $(seq 1 30); do
                if curl -sf http://web-app-svc/health > /dev/null 2>&1; then
                  echo "Service is ready"
                  break
                fi
                echo "Attempt $i: service not ready, waiting..."
                sleep 2
              done

              # Test health endpoint
              echo "Test 1: Health endpoint"
              curl -sf http://web-app-svc/health || { echo "FAIL: Health check"; exit 1; }
              echo "PASS"

              # Test API endpoint
              echo "Test 2: API status"
              STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://web-app-svc/api/v1/status)
              [ "$STATUS" = "200" ] || { echo "FAIL: API status returned $STATUS"; exit 1; }
              echo "PASS"

              # Test response body
              echo "Test 3: API response format"
              RESPONSE=$(curl -sf http://web-app-svc/api/v1/status)
              echo "$RESPONSE" | grep -q '"status":"ok"' || { echo "FAIL: Unexpected response: $RESPONSE"; exit 1; }
              echo "PASS"

              echo "All smoke tests passed"
      restartPolicy: Never
  backoffLimit: 1
  activeDeadlineSeconds: 120
```

## Comprehensive API Smoke Test

For REST APIs with multiple endpoints:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: api-smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: smoke-test
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              BASE_URL="http://api-svc:8080"
              FAILURES=0

              # Helper function
              check_endpoint() {
                local name=$1
                local method=$2
                local path=$3
                local expected_status=$4

                echo -n "Testing $name... "
                STATUS=$(curl -sf -o /dev/null -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
                if [ "$STATUS" = "$expected_status" ]; then
                  echo "PASS ($STATUS)"
                else
                  echo "FAIL (expected $expected_status, got $STATUS)"
                  FAILURES=$((FAILURES + 1))
                fi
              }

              # Wait for service
              echo "Waiting for service..."
              sleep 10

              echo "=== Running Smoke Tests ==="
              echo ""

              check_endpoint "Health Check" GET "/health" "200"
              check_endpoint "API Status" GET "/api/v1/status" "200"
              check_endpoint "List Users" GET "/api/v1/users" "200"
              check_endpoint "Auth Required" GET "/api/v1/admin" "401"
              check_endpoint "Not Found" GET "/api/v1/nonexistent" "404"
              check_endpoint "Metrics" GET "/metrics" "200"

              echo ""
              echo "=== Results ==="
              if [ $FAILURES -eq 0 ]; then
                echo "All tests passed"
                exit 0
              else
                echo "$FAILURES test(s) failed"
                exit 1
              fi
      restartPolicy: Never
  backoffLimit: 1
  activeDeadlineSeconds: 180
```

## Using a Dedicated Test Image

For more sophisticated tests, build a dedicated test image:

```dockerfile
# Dockerfile.smoke-tests
FROM python:3.11-slim
WORKDIR /tests
COPY smoke_tests/ .
RUN pip install requests pytest
CMD ["pytest", "-v", "test_smoke.py"]
```

```python
# smoke_tests/test_smoke.py
import os
import requests
import time

BASE_URL = os.getenv("BASE_URL", "http://web-app-svc:8080")

def wait_for_service(url, timeout=60):
    """Wait for the service to be ready."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(f"{url}/health", timeout=5)
            if resp.status_code == 200:
                return True
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(2)
    raise TimeoutError(f"Service at {url} not ready after {timeout}s")

class TestSmoke:
    @classmethod
    def setup_class(cls):
        wait_for_service(BASE_URL)

    def test_health_endpoint(self):
        resp = requests.get(f"{BASE_URL}/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_api_returns_json(self):
        resp = requests.get(f"{BASE_URL}/api/v1/status")
        assert resp.status_code == 200
        assert "application/json" in resp.headers["content-type"]

    def test_database_connectivity(self):
        resp = requests.get(f"{BASE_URL}/api/v1/db-health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["database"] == "connected"

    def test_cache_connectivity(self):
        resp = requests.get(f"{BASE_URL}/api/v1/cache-health")
        assert resp.status_code == 200

    def test_authentication_required(self):
        resp = requests.get(f"{BASE_URL}/api/v1/protected")
        assert resp.status_code == 401

    def test_create_and_read(self):
        # Test basic CRUD
        create_resp = requests.post(
            f"{BASE_URL}/api/v1/test-items",
            json={"name": "smoke-test-item"}
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]

        read_resp = requests.get(f"{BASE_URL}/api/v1/test-items/{item_id}")
        assert read_resp.status_code == 200
        assert read_resp.json()["name"] == "smoke-test-item"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/v1/test-items/{item_id}")
```

The hook manifest using this custom image:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: smoke-test
          image: myorg/smoke-tests:latest
          env:
            - name: BASE_URL
              value: "http://web-app-svc:8080"
      restartPolicy: Never
  backoffLimit: 1
  activeDeadlineSeconds: 300
```

## gRPC Service Smoke Tests

For gRPC services, use grpcurl:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: grpc-smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: smoke-test
          image: fullstorydev/grpcurl:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Testing gRPC health..."
              grpcurl -plaintext grpc-svc:50051 grpc.health.v1.Health/Check || {
                echo "FAIL: gRPC health check"
                exit 1
              }

              echo "Testing ListUsers RPC..."
              grpcurl -plaintext \
                -d '{"page_size": 1}' \
                grpc-svc:50051 api.v1.UserService/ListUsers || {
                echo "FAIL: ListUsers RPC"
                exit 1
              }

              echo "All gRPC smoke tests passed"
      restartPolicy: Never
  backoffLimit: 1
```

## Handling Test Failures

When PostSync smoke tests fail, the sync is marked as "Failed." However, the application resources are already deployed. This means:

1. The new version is running in the cluster
2. The smoke test detected an issue
3. ArgoCD shows the sync as "Failed"

What you do next depends on your strategy:

**Manual investigation and rollback:**
```bash
# Check smoke test logs
kubectl logs -n my-app -l app=smoke-test

# If the issue is real, rollback
argocd app rollback my-app
```

**Automatic rollback on failure:**
You can combine smoke tests with ArgoCD rollback by using a SyncFail hook:

```yaml
# SyncFail hook that reverts to previous version
apiVersion: batch/v1
kind: Job
metadata:
  name: auto-rollback
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      serviceAccountName: argocd-rollback-sa
      containers:
        - name: rollback
          image: argoproj/argocd:v2.9.0
          command:
            - /bin/sh
            - -c
            - |
              # Login to ArgoCD
              argocd login $ARGOCD_SERVER --insecure --username admin --password $ARGOCD_PASS

              # Rollback to previous version
              argocd app rollback my-app

              echo "Rollback triggered"
          env:
            - name: ARGOCD_SERVER
              value: "argocd-server.argocd.svc"
            - name: ARGOCD_PASS
              valueFrom:
                secretKeyRef:
                  name: argocd-initial-admin-secret
                  key: password
      restartPolicy: Never
  backoffLimit: 1
```

## Test Timeouts

Always set `activeDeadlineSeconds` on smoke test Jobs to prevent them from running forever:

```yaml
spec:
  activeDeadlineSeconds: 180   # Kill the test after 3 minutes
  backoffLimit: 1              # Only retry once
```

If your service takes a long time to start (for example, Java applications with slow startup), increase the timeout accordingly. But do not set it too high - a smoke test that takes 10 minutes is not a smoke test.

## Best Practices

1. **Keep smoke tests fast.** They should complete in under 2 minutes. If your tests take longer, they are integration tests, not smoke tests.

2. **Test critical paths only.** Smoke tests verify that the application is alive and its core functionality works. Leave comprehensive testing to your CI pipeline.

3. **Make tests idempotent.** If a smoke test creates test data, clean it up. Tests should be safe to run multiple times.

4. **Use service DNS names.** Always reference services by their Kubernetes DNS name (like `web-app-svc`), not by IP addresses.

5. **Handle startup delays.** Include a readiness wait loop at the beginning of your tests.

## Summary

PostSync smoke tests are your last line of defense before a deployment is considered complete. They catch issues that passed CI but fail in the real cluster environment - things like missing ConfigMaps, incorrect service discovery, database connectivity problems, and permission issues. Keep them fast, focused, and reliable, and your deployment pipeline will catch production issues before your users do.
