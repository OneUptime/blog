# How to Configure K6 Operator for Distributed Load Testing of Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, K6, Load Testing, Performance Testing, Distributed Testing

Description: Learn how to deploy and configure the K6 operator for running distributed load tests against Kubernetes services, scaling test execution across multiple pods for high-throughput testing.

---

K6 provides powerful load testing capabilities, and the K6 operator brings these tests into Kubernetes as native resources. The operator enables distributed test execution across multiple pods, allowing you to generate massive load from within your cluster while treating load tests as Kubernetes workloads.

In this guide, we'll deploy the K6 operator, create distributed load tests that scale across pods, and collect metrics from tests running in parallel across your cluster.

## Understanding K6 Operator Architecture

The K6 operator watches for K6 custom resources that define load test specifications. When you create a K6 resource, the operator spawns K6 runner pods that execute your test script in parallel. The operator handles test orchestration, result aggregation, and cleanup automatically.

Distributed testing splits virtual users across multiple pods, enabling tests that exceed single-pod capacity. The operator manages pod creation, starts tests simultaneously, and collects results from all runners. This approach generates authentic load patterns that stress your services realistically.

The K6 operator supports standard K6 scripts with full access to K6 modules, thresholds, and custom metrics. Tests run as Kubernetes Jobs, inheriting familiar Job semantics like restart policies and resource limits.

## Installing the K6 Operator

Deploy the operator to your cluster:

```bash
# Install operator via manifests
kubectl create namespace k6-operator-system
kubectl apply -f https://github.com/grafana/k6-operator/releases/download/v0.0.14/bundle.yaml

# Verify operator is running
kubectl get pods -n k6-operator-system

# Expected output:
# NAME                               READY   STATUS    RESTARTS   AGE
# k6-operator-controller-manager-xxx 2/2     Running   0          1m
```

Alternatively, install using Helm:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install k6-operator grafana/k6-operator --namespace k6-operator-system --create-namespace
```

## Creating Your First K6 Test

Write a K6 test script:

```javascript
// k6-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const response = http.get('http://test-service.default.svc.cluster.local');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Store the script in a ConfigMap:

```yaml
# k6-script-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k6-test-script
  namespace: default
data:
  test.js: |
    import http from 'k6/http';
    import { check, sleep } from 'k6';

    export let options = {
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
      },
    };

    export default function () {
      const response = http.get('http://test-service.default.svc.cluster.local');

      check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
      });

      sleep(1);
    }
```

Apply the ConfigMap:

```bash
kubectl apply -f k6-script-configmap.yaml
```

## Running a Basic Load Test

Create a K6 custom resource:

```yaml
# k6-test.yaml
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: k6-sample-test
  namespace: default
spec:
  parallelism: 1
  script:
    configMap:
      name: k6-test-script
      file: test.js
  runner:
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"
```

Execute the test:

```bash
kubectl apply -f k6-test.yaml

# Watch test execution
kubectl get k6 k6-sample-test -w

# View test logs
kubectl logs -l k6_cr=k6-sample-test -f
```

## Configuring Distributed Load Testing

Scale test execution across multiple pods:

```yaml
# distributed-k6-test.yaml
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: distributed-load-test
  namespace: default
spec:
  # Run test across 10 pods
  parallelism: 10

  script:
    configMap:
      name: k6-test-script
      file: test.js

  # Arguments passed to k6
  arguments: --out json=results.json

  runner:
    image: grafana/k6:latest
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"

    # Spread pods across nodes
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
              - key: k6_cr
                operator: In
                values:
                - distributed-load-test
            topologyKey: kubernetes.io/hostname
```

This configuration creates 10 K6 runner pods that execute the test in parallel, distributing virtual users across all runners. Total load equals single-pod load multiplied by parallelism factor.

Execute distributed test:

```bash
kubectl apply -f distributed-k6-test.yaml

# Monitor all test pods
kubectl get pods -l k6_cr=distributed-load-test -w

# Aggregate view from all pods
kubectl logs -l k6_cr=distributed-load-test --all-containers=true -f
```

## Testing with Different Load Profiles

Create multiple test scenarios:

```yaml
# k6-scenarios-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k6-scenarios
  namespace: default
data:
  spike-test.js: |
    import http from 'k6/http';
    export let options = {
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 1000 },
        { duration: '10s', target: 0 },
      ],
    };
    export default function () {
      http.get('http://test-service.default.svc.cluster.local');
    }

  stress-test.js: |
    import http from 'k6/http';
    export let options = {
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 400 },
        { duration: '10m', target: 0 },
      ],
    };
    export default function () {
      http.get('http://test-service.default.svc.cluster.local');
    }
```

Run different test types:

```bash
# Spike test
kubectl apply -f - <<EOF
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: spike-test
spec:
  parallelism: 5
  script:
    configMap:
      name: k6-scenarios
      file: spike-test.js
EOF

# Stress test
kubectl apply -f - <<EOF
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: stress-test
spec:
  parallelism: 10
  script:
    configMap:
      name: k6-scenarios
      file: stress-test.js
EOF
```

## Integrating with Prometheus

Export K6 metrics to Prometheus:

```yaml
# k6-prometheus-test.yaml
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: k6-prometheus-test
spec:
  parallelism: 5
  script:
    configMap:
      name: k6-test-script
      file: test.js
  runner:
    env:
    - name: K6_PROMETHEUS_RW_SERVER_URL
      value: "http://prometheus-pushgateway.monitoring.svc:9091/metrics/job/k6"
    - name: K6_PROMETHEUS_RW_PUSH_INTERVAL
      value: "5s"
```

Query K6 metrics in Prometheus:

```promql
# Request duration percentiles
k6_http_req_duration{percentile="95"}

# Request rate
rate(k6_http_reqs[1m])

# Failed requests
rate(k6_http_req_failed[5m])
```

## Scheduling Recurring Load Tests

Use CronJob to run tests regularly:

```yaml
# k6-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: k6-load-test
  namespace: default
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              cat <<EOF | kubectl apply -f -
              apiVersion: k6.io/v1alpha1
              kind: K6
              metadata:
                name: scheduled-test-$(date +%s)
              spec:
                parallelism: 5
                script:
                  configMap:
                    name: k6-test-script
                    file: test.js
              EOF
          restartPolicy: OnFailure
          serviceAccountName: k6-runner
```

Create ServiceAccount with permissions:

```yaml
# k6-runner-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: k6-runner
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: k6-runner
  namespace: default
rules:
- apiGroups: ["k6.io"]
  resources: ["k6s"]
  verbs: ["create", "get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: k6-runner
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: k6-runner
subjects:
- kind: ServiceAccount
  name: k6-runner
```

## Collecting and Analyzing Results

Extract test results:

```bash
# Get test status
kubectl describe k6 k6-sample-test

# View aggregated results
kubectl logs -l k6_cr=k6-sample-test --tail=100 | grep "summary"

# Export results to file
kubectl logs -l k6_cr=k6-sample-test > test-results.log
```

Parse results programmatically:

```bash
# Extract key metrics
kubectl logs -l k6_cr=k6-sample-test | grep -A 10 "checks"
kubectl logs -l k6_cr=k6-sample-test | grep -A 10 "http_req_duration"
```

## Cleanup and Resource Management

Clean up completed tests:

```bash
# Delete specific test
kubectl delete k6 k6-sample-test

# Delete all K6 tests
kubectl delete k6 --all

# Cleanup completed test pods
kubectl delete pods -l k6_cr --field-selector=status.phase=Succeeded
```

Configure automatic cleanup:

```yaml
# k6-with-cleanup.yaml
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: auto-cleanup-test
spec:
  parallelism: 5
  script:
    configMap:
      name: k6-test-script
      file: test.js
  # Cleanup after 1 hour
  cleanup: "ttlSecondsAfterFinished: 3600"
```

## Conclusion

The K6 operator brings distributed load testing into Kubernetes as a native workflow, enabling teams to generate realistic load patterns from within clusters. Parallel test execution across pods provides the scale needed to stress modern cloud-native applications while Kubernetes orchestration handles test lifecycle management.

This approach integrates load testing into development workflows, making performance validation a standard practice rather than an afterthought. Treat load tests as code, version them alongside applications, and run them automatically to catch performance regressions early.

For production load testing, start with baseline tests to understand normal behavior, gradually increase load to find breaking points, and integrate load tests into CI/CD pipelines to validate performance with every deployment.
