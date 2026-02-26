# How to Use k6 Load Tests with ArgoCD Hooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, k6, Performance Testing

Description: Learn how to run k6 load tests as ArgoCD PostSync hooks to automatically validate application performance after every deployment with threshold-based pass/fail criteria.

---

k6 is one of the best load testing tools available for Kubernetes environments. It is fast, scriptable in JavaScript, and has built-in threshold support that makes it perfect for automated pass/fail testing. When you combine k6 with ArgoCD PostSync hooks, you get automatic performance validation after every deployment.

This guide covers everything from basic k6 setup as an ArgoCD hook to advanced scenarios with custom metrics, distributed testing, and result reporting.

## Why k6 for ArgoCD PostSync Testing

k6 has several properties that make it ideal for PostSync hooks:

- **Threshold-based exit codes** - k6 exits with code 99 when thresholds fail, which causes the ArgoCD sync to fail
- **Lightweight** - The k6 binary runs efficiently in a small container
- **JavaScript scripting** - Easy to write and maintain test scripts
- **Built-in metrics** - HTTP request duration, throughput, error rate, and more out of the box
- **Prometheus output** - Send results directly to your monitoring stack

## Basic k6 PostSync Hook

Start with a simple load test that validates your API performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k6-test-script
data:
  test.js: |
    import http from 'k6/http';
    import { check, sleep } from 'k6';

    // Test configuration
    export const options = {
      // Ramp up to 30 virtual users over 30 seconds,
      // hold for 1 minute, then ramp down
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 30 },
        { duration: '15s', target: 0 },
      ],

      // Pass/fail thresholds
      thresholds: {
        // 95th percentile response time under 500ms
        http_req_duration: ['p(95)<500'],
        // Less than 1% error rate
        http_req_failed: ['rate<0.01'],
        // At least 10 requests per second throughput
        http_reqs: ['rate>10'],
      },
    };

    const BASE_URL = __ENV.BASE_URL || 'http://api-service.default.svc:8080';

    export default function () {
      // GET request to list endpoint
      const listRes = http.get(`${BASE_URL}/api/v1/items`);
      check(listRes, {
        'list returns 200': (r) => r.status === 200,
        'list returns array': (r) => Array.isArray(r.json()),
      });

      // GET request to single item
      const getRes = http.get(`${BASE_URL}/api/v1/items/1`);
      check(getRes, {
        'get returns 200': (r) => r.status === 200,
      });

      sleep(0.5);
    }
---
apiVersion: batch/v1
kind: Job
metadata:
  name: k6-load-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/sync-wave: "2"
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 300
  template:
    spec:
      restartPolicy: Never
      initContainers:
        - name: wait-for-service
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              until wget -q -O /dev/null http://api-service.default.svc:8080/health 2>/dev/null; do
                echo "Waiting for service..."
                sleep 2
              done
              echo "Service is ready"
      containers:
        - name: k6
          image: grafana/k6:0.49.0
          command:
            - k6
            - run
            - /scripts/test.js
          env:
            - name: BASE_URL
              value: "http://api-service.default.svc:8080"
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 512Mi
          volumeMounts:
            - name: scripts
              mountPath: /scripts
      volumes:
        - name: scripts
          configMap:
            name: k6-test-script
```

## Testing Multiple Endpoints with Scenarios

k6 scenarios let you test different parts of your API simultaneously with independent configurations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k6-scenario-test
data:
  test.js: |
    import http from 'k6/http';
    import { check, sleep } from 'k6';
    import { Trend, Counter } from 'k6/metrics';

    // Custom metrics per endpoint
    const apiLatency = new Trend('api_latency', true);
    const authLatency = new Trend('auth_latency', true);
    const apiErrors = new Counter('api_errors');

    export const options = {
      scenarios: {
        // Scenario 1: API reads (high traffic)
        api_reads: {
          executor: 'constant-vus',
          vus: 20,
          duration: '2m',
          exec: 'apiReads',
        },
        // Scenario 2: API writes (lower traffic)
        api_writes: {
          executor: 'constant-vus',
          vus: 5,
          duration: '2m',
          exec: 'apiWrites',
        },
        // Scenario 3: Authentication flow
        auth_flow: {
          executor: 'per-vu-iterations',
          vus: 10,
          iterations: 5,
          exec: 'authFlow',
        },
      },
      thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.01'],
        api_latency: ['p(95)<300'],
        auth_latency: ['p(95)<800'],
        api_errors: ['count<5'],
      },
    };

    const BASE_URL = __ENV.BASE_URL || 'http://api-service.default.svc:8080';
    const AUTH_URL = __ENV.AUTH_URL || 'http://auth-service.default.svc:8081';

    // Scenario 1: Read operations
    export function apiReads() {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/v1/items?limit=20`);
      apiLatency.add(Date.now() - start);

      const ok = check(res, {
        'list status 200': (r) => r.status === 200,
        'list has items': (r) => r.json().length > 0,
      });

      if (!ok) apiErrors.add(1);
      sleep(0.3);
    }

    // Scenario 2: Write operations
    export function apiWrites() {
      const payload = JSON.stringify({
        name: `loadtest-item-${Date.now()}`,
        type: 'performance-test',
      });

      const start = Date.now();
      const res = http.post(`${BASE_URL}/api/v1/items`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      apiLatency.add(Date.now() - start);

      check(res, {
        'create returns 201': (r) => r.status === 201,
      });

      sleep(1);
    }

    // Scenario 3: Auth flow
    export function authFlow() {
      const start = Date.now();

      // Get token
      const tokenRes = http.post(`${AUTH_URL}/token`, JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'loadtest',
        client_secret: __ENV.AUTH_SECRET || 'test-secret',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

      authLatency.add(Date.now() - start);

      check(tokenRes, {
        'token response 200': (r) => r.status === 200,
        'token present': (r) => r.json().access_token !== undefined,
      });

      if (tokenRes.status === 200) {
        const token = tokenRes.json().access_token;

        // Use token to access protected resource
        const protectedRes = http.get(`${BASE_URL}/api/v1/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        check(protectedRes, {
          'protected endpoint accessible': (r) => r.status === 200,
        });
      }

      sleep(2);
    }
```

## Sending k6 Results to Prometheus and Grafana

Track performance trends across deployments by pushing k6 metrics to Prometheus:

```yaml
containers:
  - name: k6
    image: grafana/k6:0.49.0
    command:
      - k6
      - run
      - --out
      - experimental-prometheus-rw
      - --tag
      - deployment=$(DEPLOYMENT_VERSION)
      - /scripts/test.js
    env:
      - name: BASE_URL
        value: "http://api-service.default.svc:8080"
      - name: K6_PROMETHEUS_RW_SERVER_URL
        value: "http://prometheus.monitoring.svc:9090/api/v1/write"
      - name: K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM
        value: "true"
      - name: K6_PROMETHEUS_RW_PUSH_INTERVAL
        value: "5s"
      - name: DEPLOYMENT_VERSION
        valueFrom:
          fieldRef:
            fieldPath: metadata.labels['app.kubernetes.io/version']
```

With metrics in Prometheus, you can build Grafana dashboards that show performance trends across deployments, making it easy to spot regressions.

## Distributed k6 Testing with k6-operator

For larger load tests, use the k6-operator to distribute the load across multiple pods:

```bash
# Install k6-operator
helm install k6-operator \
  grafana/k6-operator \
  --namespace k6-operator \
  --create-namespace
```

Then use a TestRun resource instead of a Job:

```yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: distributed-load-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/sync-wave: "2"
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
spec:
  parallelism: 4
  script:
    configMap:
      name: k6-test-script
      file: test.js
  arguments: --out experimental-prometheus-rw
  runner:
    env:
      - name: BASE_URL
        value: "http://api-service.default.svc:8080"
      - name: K6_PROMETHEUS_RW_SERVER_URL
        value: "http://prometheus.monitoring.svc:9090/api/v1/write"
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

This runs 4 k6 instances in parallel, effectively multiplying your load generation capacity.

## Environment-Specific Load Profiles

Different environments need different load levels. Use environment variables to parameterize your test:

```javascript
// test.js
export const options = {
  stages: JSON.parse(__ENV.K6_STAGES || JSON.stringify([
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '15s', target: 0 },
  ])),
  thresholds: {
    http_req_duration: [
      `p(95)<${__ENV.MAX_P95 || 500}`,
      `p(99)<${__ENV.MAX_P99 || 1000}`,
    ],
    http_req_failed: [`rate<${__ENV.MAX_ERROR_RATE || 0.01}`],
  },
};
```

Then configure per environment:

```yaml
# Staging: moderate load
env:
  - name: K6_STAGES
    value: '[{"duration":"30s","target":30},{"duration":"2m","target":30},{"duration":"15s","target":0}]'
  - name: MAX_P95
    value: "500"

# Production: lighter load, stricter thresholds
env:
  - name: K6_STAGES
    value: '[{"duration":"15s","target":10},{"duration":"1m","target":10},{"duration":"15s","target":0}]'
  - name: MAX_P95
    value: "200"
```

## Handling k6 Test Results

k6 exit codes tell you exactly what happened:

- **Exit code 0** - All thresholds passed
- **Exit code 99** - One or more thresholds failed
- **Exit code 1** - Script error

You can add a result handler that parses the output and sends structured notifications:

```yaml
containers:
  - name: k6
    image: grafana/k6:0.49.0
    command:
      - sh
      - -c
      - |
        # Run k6 and capture output
        k6 run --summary-export=/tmp/results.json /scripts/test.js 2>&1 | tee /tmp/k6-output.txt
        K6_EXIT=$?

        # Send results summary to Slack
        if [ $K6_EXIT -ne 0 ]; then
          SUMMARY=$(grep -A 20 "THRESHOLDS" /tmp/k6-output.txt || echo "Threshold check failed")
          curl -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
              \"text\": \"k6 Load Test FAILED after deployment\",
              \"attachments\": [{
                \"color\": \"danger\",
                \"text\": \"$(echo "$SUMMARY" | head -20)\"
              }]
            }"
        fi

        exit $K6_EXIT
```

## Cleanup: Removing Load Test Data

Load tests create test data. Add a cleanup step:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: k6-cleanup
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/sync-wave: "3"
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: cleanup
          image: curlimages/curl:8.5.0
          command:
            - sh
            - -c
            - |
              # Clean up load test data
              curl -X DELETE \
                "http://api-service.default.svc:8080/api/v1/items?type=performance-test"
              echo "Test data cleaned up"
```

For a broader look at load testing strategies with ArgoCD, including non-k6 approaches, see our guide on [load testing after ArgoCD deployment](https://oneuptime.com/blog/post/2026-02-26-argocd-load-testing-after-deployment/view). You can also use OneUptime to correlate k6 test results with real user experience metrics to validate that your performance thresholds match actual user expectations.

## Best Practices

1. **Keep PostSync load tests short** - 2 to 3 minutes is enough to catch regressions. Save longer soak tests for a separate pipeline.
2. **Set resource limits on k6 pods** - k6 can consume significant CPU. Limit it to prevent impacting your application.
3. **Use realistic scenarios** - Match your test traffic pattern to actual user behavior.
4. **Track trends, not just pass/fail** - Store metrics in Prometheus to spot gradual performance degradation.
5. **Tag results with deployment version** - Makes it easy to correlate performance changes with code changes.
6. **Clean up test data** - Load tests that create data should clean up after themselves.
7. **Do not test in production on first deploy** - Validate in staging first, then run lighter checks in production.

k6 and ArgoCD PostSync hooks form a powerful combination for automated performance validation. Every deployment gets tested, results are tracked over time, and performance regressions are caught before they impact users.
