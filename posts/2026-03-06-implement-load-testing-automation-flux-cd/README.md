# How to Implement Load Testing Automation with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, load testing, k6, kubernetes, gitops, performance, automation

Description: A practical guide to automating load tests in your GitOps pipeline using Flux CD and k6-operator for continuous performance validation.

---

## Introduction

Load testing is essential for understanding how your application behaves under stress. By integrating load testing into your Flux CD GitOps pipeline, you can automatically validate performance after every deployment. This guide shows how to use the k6-operator with Flux CD to run load tests declaratively from Git.

## Prerequisites

- A Kubernetes cluster (v1.25+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux
- Basic familiarity with JavaScript (for k6 scripts)

## Installing the k6-operator via Flux

### Add the Grafana Helm Repository

```yaml
# clusters/my-cluster/k6/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

### Deploy the k6-operator

```yaml
# clusters/my-cluster/k6/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: k6-operator
  namespace: k6-operator-system
spec:
  interval: 30m
  chart:
    spec:
      chart: k6-operator
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  install:
    createNamespace: true
  values:
    # Resource limits for the operator itself
    manager:
      resources:
        limits:
          cpu: 100m
          memory: 128Mi
        requests:
          cpu: 50m
          memory: 64Mi
```

## Writing k6 Load Test Scripts

### Basic Load Test Script

Store your k6 scripts in a ConfigMap managed by Flux:

```yaml
# load-tests/scripts/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k6-test-scripts
  namespace: load-testing
data:
  basic-load-test.js: |
    import http from 'k6/http';
    import { check, sleep } from 'k6';
    import { Rate } from 'k6/metrics';

    // Custom metric to track error rate
    const errorRate = new Rate('errors');

    // Test configuration - ramp up, sustain, ramp down
    export const options = {
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
      thresholds: {
        // 95th percentile response time must be under 500ms
        http_req_duration: ['p(95)<500'],
        // Error rate must be below 1%
        errors: ['rate<0.01'],
        // 99% of requests must complete under 1500ms
        http_req_duration: ['p(99)<1500'],
      },
    };

    // Base URL of the application under test
    const BASE_URL = __ENV.TARGET_URL || 'http://my-web-app.default.svc:8080';

    export default function () {
      // Test the health endpoint
      const healthRes = http.get(`${BASE_URL}/health`);
      check(healthRes, {
        'health check returns 200': (r) => r.status === 200,
      });
      errorRate.add(healthRes.status !== 200);

      // Test the main API endpoint
      const apiRes = http.get(`${BASE_URL}/api/v1/items`);
      check(apiRes, {
        'API returns 200': (r) => r.status === 200,
        'API response time < 200ms': (r) => r.timings.duration < 200,
      });
      errorRate.add(apiRes.status !== 200);

      // Simulate user think time
      sleep(1);
    }
```

### Advanced Load Test with POST Requests

```yaml
# load-tests/scripts/configmap-advanced.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k6-advanced-scripts
  namespace: load-testing
data:
  api-load-test.js: |
    import http from 'k6/http';
    import { check, group, sleep } from 'k6';
    import { Counter, Trend } from 'k6/metrics';

    // Custom metrics for detailed tracking
    const createLatency = new Trend('create_item_duration');
    const listLatency = new Trend('list_items_duration');
    const apiErrors = new Counter('api_errors');

    export const options = {
      scenarios: {
        // Scenario for read-heavy traffic
        readers: {
          executor: 'constant-vus',
          vus: 30,
          duration: '10m',
          exec: 'readItems',
        },
        // Scenario for write traffic
        writers: {
          executor: 'constant-arrival-rate',
          rate: 10,            // 10 requests per second
          timeUnit: '1s',
          duration: '10m',
          preAllocatedVUs: 20,
          exec: 'createItem',
        },
      },
      thresholds: {
        'create_item_duration': ['p(95)<1000'],
        'list_items_duration': ['p(95)<300'],
        'api_errors': ['count<50'],
      },
    };

    const BASE_URL = __ENV.TARGET_URL || 'http://my-web-app.default.svc:8080';

    // Read scenario function
    export function readItems() {
      const res = http.get(`${BASE_URL}/api/v1/items`);
      listLatency.add(res.timings.duration);
      check(res, {
        'list items returns 200': (r) => r.status === 200,
      }) || apiErrors.add(1);
      sleep(0.5);
    }

    // Write scenario function
    export function createItem() {
      const payload = JSON.stringify({
        name: `item-${Date.now()}`,
        value: Math.random() * 100,
      });
      const params = {
        headers: { 'Content-Type': 'application/json' },
      };
      const res = http.post(`${BASE_URL}/api/v1/items`, payload, params);
      createLatency.add(res.timings.duration);
      check(res, {
        'create item returns 201': (r) => r.status === 201,
      }) || apiErrors.add(1);
    }
```

## Creating k6 TestRun Resources

### Basic TestRun

```yaml
# load-tests/basic-test-run.yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: basic-load-test
  namespace: load-testing
spec:
  # Number of parallel k6 runner pods
  parallelism: 4
  script:
    configMap:
      name: k6-test-scripts
      file: basic-load-test.js
  runner:
    # Environment variables for the test
    env:
      - name: TARGET_URL
        value: "http://my-web-app.default.svc:8080"
    # Resource limits for each runner pod
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 200m
        memory: 128Mi
```

### TestRun with Results Output

Send results to InfluxDB or Prometheus for analysis:

```yaml
# load-tests/test-run-with-output.yaml
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: load-test-with-metrics
  namespace: load-testing
spec:
  parallelism: 4
  script:
    configMap:
      name: k6-test-scripts
      file: basic-load-test.js
  # Send results to Prometheus via remote write
  arguments: >-
    --out experimental-prometheus-rw
  runner:
    env:
      - name: TARGET_URL
        value: "http://my-web-app.default.svc:8080"
      # Prometheus remote write endpoint
      - name: K6_PROMETHEUS_RW_SERVER_URL
        value: "http://prometheus.monitoring.svc:9090/api/v1/write"
      # Prefix for k6 metrics in Prometheus
      - name: K6_PROMETHEUS_RW_TREND_STATS
        value: "p(95),p(99),min,max,avg"
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
```

## Integrating Load Tests with Flux Deployments

### Kustomization for Load Tests

```yaml
# clusters/my-cluster/load-testing-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: load-tests
  namespace: flux-system
spec:
  interval: 10m
  # Run load tests only after the app is deployed
  dependsOn:
    - name: my-web-app
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./load-tests
  prune: true
  # Wait for tests to complete
  healthChecks:
    - apiVersion: k6.io/v1alpha1
      kind: TestRun
      name: basic-load-test
      namespace: load-testing
  timeout: 30m
```

### Namespace Setup

```yaml
# load-tests/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: load-testing
  labels:
    # Prevent load testing pods from being disrupted
    pod-security.kubernetes.io/enforce: baseline
```

## Setting Up Alerts for Load Test Failures

```yaml
# clusters/my-cluster/k6/load-test-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: load-test-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: load-tests
      namespace: flux-system
  summary: "Load test failed - performance regression detected"
```

## Running Load Tests on a Schedule

Use a CronJob to trigger load tests periodically:

```yaml
# load-tests/scheduled-test.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-load-test
  namespace: load-testing
spec:
  # Run every day at 3 AM UTC
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: k6-runner
          containers:
            - name: k6-trigger
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Delete previous test run if it exists
                  kubectl delete testrun daily-load-test \
                    -n load-testing --ignore-not-found
                  # Apply a fresh test run
                  kubectl apply -f /config/test-run.yaml
              volumeMounts:
                - name: test-config
                  mountPath: /config
          volumes:
            - name: test-config
              configMap:
                name: daily-test-run-config
          restartPolicy: OnFailure
```

## RBAC for Load Testing

```yaml
# load-tests/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: k6-runner
  namespace: load-testing
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: k6-runner
  namespace: load-testing
rules:
  # Permissions to manage test runs
  - apiGroups: ["k6.io"]
    resources: ["testruns"]
    verbs: ["get", "list", "create", "delete"]
  # Permissions to read configmaps with test scripts
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: k6-runner
  namespace: load-testing
subjects:
  - kind: ServiceAccount
    name: k6-runner
    namespace: load-testing
roleRef:
  kind: Role
  name: k6-runner
  apiGroup: rbac.authorization.k8s.io
```

## Best Practices

### Isolate Load Testing Resources

Run load tests in a dedicated namespace with resource quotas to prevent them from affecting production workloads:

```yaml
# load-tests/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: load-testing-quota
  namespace: load-testing
spec:
  hard:
    # Limit total CPU and memory for all load test pods
    requests.cpu: "4"
    requests.memory: 2Gi
    limits.cpu: "8"
    limits.memory: 4Gi
    # Limit number of pods
    pods: "20"
```

### Use Realistic Test Data

Always test with data volumes and patterns that match production. Store test data in ConfigMaps or Secrets managed by Flux.

### Set Meaningful Thresholds

Base your thresholds on actual SLOs. If your SLA guarantees 99th percentile latency under 1 second, set your k6 threshold accordingly.

### Version Your Test Scripts

Keep test scripts in the same Git repository as your application code. This ensures tests evolve alongside the application.

## Conclusion

Automating load tests with Flux CD and the k6-operator ensures that every deployment is validated for performance before it reaches users. By managing test configurations declaratively in Git, you get reproducible, auditable, and automated performance testing as part of your GitOps workflow.
