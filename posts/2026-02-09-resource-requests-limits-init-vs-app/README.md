# How to Set Resource Requests and Limits for Init Containers vs App Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, Resource Management

Description: Learn how Kubernetes calculates effective resource requests and limits when using init containers, and how to properly size both init and app containers to avoid scheduling issues and resource waste.

---

Init containers run before app containers, but how do their resource requests affect scheduling? Kubernetes uses specific rules to calculate effective pod resources when init containers are present. This guide explains the math and best practices.

## How Init Container Resources Work

Init containers run sequentially before app containers. At any moment, either init containers OR app containers are running, never both. Kubernetes uses this fact to calculate the pod's effective resource request.

The effective request is the maximum of:

- Sum of all app container requests
- Maximum of any single init container request

This ensures the pod can fit the largest resource consumer.

## Basic Example

Consider a pod with init containers and app containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-phase-app
spec:
  initContainers:
  - name: download-data
    image: downloader:latest
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
  - name: process-data
    image: processor:latest
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
  - name: sidecar
    image: sidecar:latest
    resources:
      requests:
        cpu: "200m"
        memory: "512Mi"
```

Calculate effective requests:

- App container total: 500m + 200m = 700m CPU, 1Gi + 512Mi = 1.5Gi memory
- Max init container: 2 CPU (from process-data), 4Gi memory

Effective pod request: max(700m, 2) = 2 CPU, max(1.5Gi, 4Gi) = 4Gi memory

The scheduler reserves 2 CPU and 4Gi memory for this pod.

## Why This Matters

If you don't account for init container resources, pods might:

- Fail to schedule on nodes with limited capacity
- Cause resource fragmentation
- Trigger unexpected evictions

Understanding the calculation helps you size containers correctly.

## Setting Requests for Heavy Init Containers

If init containers do heavy processing (database migrations, large downloads), set high requests:

```yaml
initContainers:
- name: migrate-db
  image: migrations:latest
  resources:
    requests:
      cpu: "4"
      memory: "8Gi"
    limits:
      cpu: "4"
      memory: "8Gi"
containers:
- name: app
  image: app:latest
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
```

Effective request: 4 CPU, 8Gi (from init container)

The pod reserves 8Gi during migration, but only uses 2Gi once the app runs. This is wasteful but necessary for correctness.

## Optimizing Init Container Requests

If init containers are lightweight, set minimal requests:

```yaml
initContainers:
- name: config-loader
  image: busybox
  command: ["sh", "-c", "cp /config/* /app/config/"]
  resources:
    requests:
      cpu: "100m"
      memory: "64Mi"
    limits:
      cpu: "200m"
      memory: "128Mi"
containers:
- name: app
  image: app:latest
  resources:
    requests:
      cpu: "2"
      memory: "4Gi"
```

Effective request: 2 CPU, 4Gi (from app container)

The init container doesn't affect scheduling.

## Resource Limits for Init Containers

Limits work the same way as requests. The effective limit is:

- Max of all app container limits
- Max of any single init container limit

```yaml
initContainers:
- name: setup
  image: setup:latest
  resources:
    limits:
      cpu: "2"
      memory: "4Gi"
containers:
- name: app
  image: app:latest
  resources:
    limits:
      cpu: "1"
      memory: "2Gi"
- name: sidecar
  image: sidecar:latest
  resources:
    limits:
      cpu: "500m"
      memory: "1Gi"
```

Effective limit: max(2, 1 + 0.5) = 2 CPU, max(4Gi, 2Gi + 1Gi) = 4Gi

The pod can use up to 2 CPU and 4Gi at any moment.

## QoS Class with Init Containers

QoS class calculation includes init containers. For Guaranteed QoS:

- All init containers must have requests = limits
- All app containers must have requests = limits
- All requests and limits must be set

Example Guaranteed pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  initContainers:
  - name: init
    image: init:latest
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

This gets Guaranteed QoS even though effective request is 2 CPU, 4Gi (from app).

## Handling Database Migrations

Database migrations often need more resources than the app:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  initContainers:
  - name: migrate
    image: app:latest
    command: ["rake", "db:migrate"]
    env:
    - name: DATABASE_URL
      value: "postgres://..."
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
  containers:
  - name: web
    image: app:latest
    command: ["rails", "server"]
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
```

The init container gets more resources for the migration, then the app runs with smaller resources.

## Avoiding Resource Waste

Large init container requests can waste resources. Consider alternatives:

### Option 1: Run migrations as a Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: app:latest
        command: ["rake", "db:migrate"]
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
      restartPolicy: OnFailure
```

Run the Job separately, then deploy the app without the init container.

### Option 2: Use a Startup Hook

If your app supports it, run migrations in a startup hook with the app's resources.

### Option 3: Lower Init Container Requests

If the init workload is predictable, set lower requests and rely on limits:

```yaml
initContainers:
- name: migrate
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "4"
      memory: "8Gi"
```

The effective request is lower, but the container can burst up to limits.

## Multiple Init Containers with Different Needs

When init containers have varying resource needs, the max dominates:

```yaml
initContainers:
- name: download
  resources:
    requests:
      cpu: "100m"
      memory: "512Mi"
- name: extract
  resources:
    requests:
      cpu: "2"
      memory: "1Gi"
- name: process
  resources:
    requests:
      cpu: "500m"
      memory: "8Gi"
containers:
- name: app
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
```

Max init CPU: 2 (extract)
Max init memory: 8Gi (process)
App total: 1 CPU, 2Gi

Effective: 2 CPU, 8Gi

The process init container dominates memory allocation.

## Sidecar Init Containers

Kubernetes 1.28+ supports sidecar init containers that run alongside app containers. They use different resource calculation:

```yaml
initContainers:
- name: sidecar-init
  image: sidecar:latest
  restartPolicy: Always  # Makes it a sidecar
  resources:
    requests:
      cpu: "200m"
      memory: "256Mi"
containers:
- name: app
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
```

Sidecar init containers add to app container totals:
Effective request: 1 + 0.2 = 1.2 CPU, 2Gi + 256Mi = 2.25Gi

## Monitoring Init Container Resource Usage

Check init container metrics:

```bash
kubectl top pod my-app --containers
```

This shows current usage, but init containers have already completed. Check historical data in Prometheus:

```promql
container_memory_working_set_bytes{container="init-container-name"}
```

## Best Practices

- Set accurate requests for init containers based on actual needs
- Consider running heavy tasks as Jobs instead
- Use lower requests with higher limits for bursty init workloads
- Monitor init container actual usage
- Document why init containers need specific resources
- Test init container performance with different request values
- Use sidecar init containers (1.28+) when init logic needs to run alongside the app
- Avoid setting init requests higher than necessary

## Real-World Example: Config Hydration

A common pattern is hydrating config from a secret store:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
spec:
  initContainers:
  - name: fetch-secrets
    image: vault:latest
    command:
    - sh
    - -c
    - |
      vault kv get -format=json secret/app > /config/secrets.json
    volumeMounts:
    - name: config
      mountPath: /config
    resources:
      requests:
        cpu: "100m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"
  containers:
  - name: app
    image: app:latest
    volumeMounts:
    - name: config
      mountPath: /app/config
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
  volumes:
  - name: config
    emptyDir: {}
```

The init container has minimal resource needs, so it doesn't affect effective requests.

## Conclusion

Understanding how Kubernetes calculates effective resource requests with init containers prevents scheduling surprises and resource waste. Set init container requests based on actual needs, consider running heavy workloads as Jobs, and monitor usage to tune values. Remember that the scheduler reserves resources for the maximum of init or app containers, so oversized init containers can block scheduling even if app containers are small.
