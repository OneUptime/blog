# How to Create Kubernetes Deployments Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Deployments, DevOps, Best Practices

Description: Learn best practices for creating robust Kubernetes Deployments with proper resource management, health checks, and update strategies.

---

Kubernetes Deployments are the standard way to manage stateless applications in production. A well-configured Deployment ensures your application runs reliably, scales efficiently, and updates smoothly. This guide covers essential best practices for creating production-ready Kubernetes Deployments.

## Resource Requests and Limits

Always define resource requests and limits for your containers. Requests guarantee minimum resources, while limits prevent runaway containers from affecting other workloads.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:1.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Set requests based on average usage and limits based on peak usage. Avoid setting CPU limits too low, as this can cause throttling. Memory limits should be set carefully since exceeding them results in OOMKilled pods.

## Health Probes

Kubernetes provides three types of probes to monitor container health: liveness, readiness, and startup probes.

```yaml
containers:
- name: my-app
  image: my-app:1.0.0
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 15
    periodSeconds: 10
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 10
    periodSeconds: 10
    failureThreshold: 30
```

**Liveness probes** restart containers that become unresponsive. **Readiness probes** control traffic routing, ensuring only healthy pods receive requests. **Startup probes** handle slow-starting containers, preventing premature liveness probe failures during initialization.

## Update Strategies

Configure rolling updates to minimize downtime during deployments.

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
  minReadySeconds: 10
  revisionHistoryLimit: 5
```

**maxSurge** controls how many extra pods can be created during updates. **maxUnavailable** sets how many pods can be unavailable. **minReadySeconds** ensures pods are stable before marking them as available. Keep **revisionHistoryLimit** reasonable for rollback capability without consuming excessive resources.

## Pod Disruption Budgets

Protect your application during voluntary disruptions like node drains and cluster upgrades.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

Alternatively, use `maxUnavailable` to specify the maximum number of pods that can be down simultaneously. PDBs ensure your application maintains minimum availability during maintenance operations.

## Affinity and Anti-Affinity Rules

Spread pods across failure domains for high availability.

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: my-app
              topologyKey: kubernetes.io/hostname
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-type
                operator: In
                values:
                - worker
```

**Pod anti-affinity** spreads replicas across different nodes or zones. **Node affinity** controls which nodes can run your pods. Use `preferredDuringScheduling` for soft constraints and `requiredDuringScheduling` for hard constraints.

## Labels and Annotations

Apply consistent labels for organization, selection, and tooling integration.

```yaml
metadata:
  name: my-app
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: my-system
    app.kubernetes.io/managed-by: helm
  annotations:
    description: "Main application backend service"
    owner: "platform-team@example.com"
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
```

Use Kubernetes recommended labels for consistency. Annotations are ideal for metadata that tools consume, such as monitoring configurations, deployment tracking, and documentation.

## Complete Example

Here is a production-ready Deployment incorporating all best practices:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  minReadySeconds: 10
  template:
    metadata:
      labels:
        app: my-app
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: my-app
              topologyKey: kubernetes.io/hostname
      containers:
      - name: my-app
        image: my-app:1.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /healthz
            port: 8080
          failureThreshold: 30
          periodSeconds: 10
```

Following these best practices ensures your Kubernetes Deployments are resilient, observable, and maintainable. Start with these patterns and adjust based on your application's specific requirements and observed behavior in production.
