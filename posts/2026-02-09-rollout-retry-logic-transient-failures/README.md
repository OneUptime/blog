# How to Implement Rollout Retry Logic for Transient Deployment Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Resilience

Description: Learn how to implement intelligent retry logic for Kubernetes deployments to handle transient failures like temporary network issues, registry timeouts, and resource constraints without aborting rollouts.

---

Your deployment fails because the container registry had a temporary timeout. Or a pod couldn't schedule because a node was briefly full. These transient issues resolve themselves quickly, but they cause deployment failures and trigger unnecessary rollbacks.

Retry logic helps deployments succeed despite temporary problems.

## Types of Transient Failures

**Image pull errors**: Registry timeouts, rate limiting, temporary network issues.

**Scheduling failures**: Temporary resource constraints, node maintenance.

**Health check failures**: Application slow to start, dependencies temporarily unavailable.

**Network issues**: Service mesh initialization delays, DNS resolution delays.

These failures are temporary and resolve with retries, unlike permanent failures that require fixing.

## Kubernetes Built-In Retry

Kubernetes automatically retries pod creation with exponential backoff:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  progressDeadlineSeconds: 600  # Keep trying for 10 minutes
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v2.0.0
        imagePullPolicy: Always  # Always try to pull
```

Kubernetes retries failed pods automatically, but with basic logic. For more control, implement custom retry logic.

## Image Pull Retry

Configure image pull backoff:

```yaml
spec:
  template:
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v2.0.0
        imagePullPolicy: IfNotPresent  # Use cache if available
      # Configure pull secret
      imagePullSecrets:
      - name: registry-credentials
      # Restart policy for image pull failures
      restartPolicy: Always
```

Add multiple registry mirrors for redundancy:

```yaml
# /etc/containerd/config.toml on nodes
[plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
  endpoint = ["https://registry-1.docker.io", "https://mirror.gcr.io"]
```

## Intelligent Retry Controller

Build a controller that retries deployments on transient failures:

```javascript
const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const watch = new k8s.Watch(kc);

async function watchDeployments() {
  const req = await watch.watch('/apis/apps/v1/deployments',
    {},
    (type, deployment) => {
      if (type === 'MODIFIED') {
        handleDeploymentUpdate(deployment);
      }
    },
    (err) => {
      console.error('Watch error:', err);
      setTimeout(watchDeployments, 5000);
    }
  );
}

async function handleDeploymentUpdate(deployment) {
  const conditions = deployment.status.conditions || [];

  // Check for progress deadline exceeded
  const progressing = conditions.find(c => c.type === 'Progressing');

  if (progressing && progressing.status === 'False' &&
      progressing.reason === 'ProgressDeadlineExceeded') {

    // Check if failure is transient
    const isTransient = await checkIfTransientFailure(deployment);

    if (isTransient) {
      console.log(`Detected transient failure for ${deployment.metadata.name}, retrying...`);
      await retryDeployment(deployment);
    } else {
      console.log(`Permanent failure for ${deployment.metadata.name}, not retrying`);
    }
  }
}

async function checkIfTransientFailure(deployment) {
  const namespace = deployment.metadata.namespace;
  const selector = deployment.spec.selector.matchLabels;

  // Get pods for this deployment
  const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
  const pods = await k8sCoreApi.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${selector.app}`
  );

  // Check pod failure reasons
  const transientReasons = [
    'ImagePullBackOff',
    'ErrImagePull',
    'CreateContainerConfigError',
    'InsufficientMemory',
    'InsufficientCPU'
  ];

  for (const pod of pods.body.items) {
    const containerStatuses = pod.status.containerStatuses || [];

    for (const status of containerStatuses) {
      if (status.state.waiting) {
        const reason = status.state.waiting.reason;

        if (transientReasons.includes(reason)) {
          return true;
        }
      }
    }
  }

  return false;
}

async function retryDeployment(deployment) {
  const name = deployment.metadata.name;
  const namespace = deployment.metadata.namespace;

  // Get current retry count
  const retryCount = parseInt(
    deployment.metadata.annotations?.['retry-count'] || '0'
  );

  const maxRetries = 3;

  if (retryCount >= maxRetries) {
    console.log(`Max retries (${maxRetries}) reached for ${name}`);
    return;
  }

  // Increment retry count
  await k8sApi.patchNamespacedDeployment(
    name,
    namespace,
    {
      metadata: {
        annotations: {
          'retry-count': String(retryCount + 1),
          'retry-timestamp': new Date().toISOString()
        }
      }
    },
    undefined,
    undefined,
    undefined,
    undefined,
    { headers: { 'Content-Type': 'application/merge-patch+json' } }
  );

  // Trigger a new rollout by updating an annotation
  await k8sApi.patchNamespacedDeployment(
    name,
    namespace,
    {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString()
            }
          }
        }
      }
    },
    undefined,
    undefined,
    undefined,
    undefined,
    { headers: { 'Content-Type': 'application/merge-patch+json' } }
  );

  console.log(`Retry ${retryCount + 1}/${maxRetries} initiated for ${name}`);
}

watchDeployments();
```

## Exponential Backoff for Retries

Implement exponential backoff between retries:

```javascript
async function retryWithBackoff(deployment) {
  const retryCount = parseInt(
    deployment.metadata.annotations?.['retry-count'] || '0'
  );

  // Calculate backoff: 30s, 60s, 120s, 240s
  const backoffSeconds = Math.min(30 * Math.pow(2, retryCount), 300);

  console.log(`Waiting ${backoffSeconds}s before retry ${retryCount + 1}`);

  setTimeout(async () => {
    await retryDeployment(deployment);
  }, backoffSeconds * 1000);
}
```

## Argo Rollouts Retry Strategy

Configure automatic retries in Argo Rollouts:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v2.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 2m}
      - setWeight: 25
      - pause: {duration: 2m}
      analysis:
        templates:
        - templateName: success-rate
        # Retry on analysis failure
        args:
        - name: service-name
          value: web-app
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
  - name: success-rate
    interval: 30s
    count: 5
    successCondition: result >= 0.95
    failureLimit: 3  # Allow 3 failures before aborting
    inconclusiveLimit: 2  # Allow 2 inconclusive results
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(http_requests_total{status!~"5.."}[2m]))
          /
          sum(rate(http_requests_total[2m]))
```

## Health Check Retry Logic

Configure readiness probe retry:

```yaml
spec:
  template:
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v2.0.0
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          successThreshold: 1
          failureThreshold: 10  # Allow 10 failures (100 seconds)
          timeoutSeconds: 5
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
          failureThreshold: 3
```

## Retry with Circuit Breaker

Prevent infinite retries with circuit breaker:

```javascript
class DeploymentRetryCircuitBreaker {
  constructor() {
    this.failures = new Map();
    this.threshold = 5;
    this.timeout = 300000; // 5 minutes
  }

  async attemptRetry(deployment) {
    const key = `${deployment.metadata.namespace}/${deployment.metadata.name}`;

    if (!this.failures.has(key)) {
      this.failures.set(key, { count: 0, firstFailure: Date.now() });
    }

    const state = this.failures.get(key);

    // Reset if timeout passed
    if (Date.now() - state.firstFailure > this.timeout) {
      this.failures.set(key, { count: 0, firstFailure: Date.now() });
      state.count = 0;
    }

    // Check circuit breaker
    if (state.count >= this.threshold) {
      console.log(`Circuit breaker open for ${key}, not retrying`);
      return false;
    }

    state.count++;
    this.failures.set(key, state);

    console.log(`Retry attempt ${state.count}/${this.threshold} for ${key}`);
    return true;
  }

  reset(deployment) {
    const key = `${deployment.metadata.namespace}/${deployment.metadata.name}`;
    this.failures.delete(key);
  }
}

const circuitBreaker = new DeploymentRetryCircuitBreaker();

async function handleDeploymentFailure(deployment) {
  const canRetry = await circuitBreaker.attemptRetry(deployment);

  if (canRetry) {
    await retryDeployment(deployment);
  } else {
    await sendAlert(deployment, 'Circuit breaker tripped, manual intervention required');
  }
}
```

## Monitoring Retry Metrics

Track retry attempts and success rates:

```javascript
async function retryDeployment(deployment) {
  const start = Date.now();

  try {
    await attemptRetry(deployment);

    const duration = Date.now() - start;
    metrics.histogram('deployment.retry.duration', duration);
    metrics.increment('deployment.retry.success', {
      deployment: deployment.metadata.name
    });

  } catch (err) {
    metrics.increment('deployment.retry.failure', {
      deployment: deployment.metadata.name,
      reason: err.message
    });

    throw err;
  }
}
```

Alert on excessive retries:

```yaml
groups:
- name: deployment_retries
  rules:
  - alert: ExcessiveDeploymentRetries
    expr: |
      rate(deployment_retry_total[5m]) > 5
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High deployment retry rate"
      description: "Deployment {{ $labels.deployment }} is retrying frequently"
```

## Best Practices

**Distinguish transient from permanent failures**. Don't retry permanent failures like invalid YAML.

**Use exponential backoff**. Give transient issues time to resolve.

**Set retry limits**. Don't retry indefinitely.

**Monitor retry patterns**. High retry rates indicate systemic issues.

**Log retry reasons**. Make debugging easier by logging why retries happen.

**Combine with circuit breakers**. Prevent retry storms.

**Alert on circuit breaker trips**. Manual intervention needed when circuit breaker opens.

## Conclusion

Intelligent retry logic makes deployments more resilient to transient failures. Instead of aborting at the first sign of trouble, retries give temporary issues time to resolve while protecting against permanent failures.

Implement retry logic that distinguishes transient from permanent failures, uses exponential backoff, and includes circuit breakers to prevent infinite loops. Combined with monitoring and alerting, retry logic turns fragile deployments into resilient, self-healing systems.
