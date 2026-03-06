# How to Implement Zero-Downtime Deployments with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Zero Downtime, Rolling Updates, Canary, Blue-Green

Description: A practical guide to implementing zero-downtime deployments with Flux CD using rolling updates, canary releases, and blue-green strategies.

---

Zero-downtime deployments ensure your users never experience an outage during a release. Kubernetes provides the building blocks - rolling updates, readiness probes, and pod disruption budgets. Flux CD orchestrates these through GitOps. This guide shows how to configure each strategy.

## Prerequisites for Zero-Downtime

Before any deployment strategy works, your application must support graceful shutdown and health checking.

```yaml
# apps/base/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Allow time for graceful shutdown
      terminationGracePeriodSeconds: 60
      containers:
        - name: my-app
          image: ghcr.io/my-org/my-app:1.0.0
          ports:
            - containerPort: 8080
          # Readiness probe: only receive traffic when ready
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          # Liveness probe: restart if unhealthy
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
          # Startup probe: give slow-starting apps time
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          # Handle SIGTERM gracefully
          lifecycle:
            preStop:
              exec:
                # Wait for load balancer to deregister
                command: ["/bin/sh", "-c", "sleep 15"]
```

## Rolling Update Strategy

The rolling update is Kubernetes' default strategy. It replaces pods gradually, ensuring some pods are always available.

```yaml
# Rolling update configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # At most 1 extra pod during the update
      maxSurge: 1
      # At most 1 pod unavailable during the update
      maxUnavailable: 0
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: ghcr.io/my-org/my-app:1.0.0
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          # minReadySeconds ensures a pod is truly stable
          # before the rollout proceeds
      # Wait 30 seconds after a pod is ready before continuing
  minReadySeconds: 30
```

```yaml
# Pod Disruption Budget to protect availability
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: production
spec:
  # Always keep at least 2 pods running
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

## Flux Health Checks for Rolling Updates

Configure Flux to verify the deployment is healthy after applying changes.

```yaml
# Flux Kustomization with health checks
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./apps/production
  prune: true
  wait: true
  # Wait for all health checks to pass
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
  # Total timeout for the rollout
  timeout: 10m
```

## Canary Deployments with Flagger

Flagger integrates with Flux CD to automate canary deployments. It gradually shifts traffic to the new version while monitoring metrics.

```yaml
# Install Flagger via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: flagger
  namespace: flagger-system
spec:
  interval: 1h
  chart:
    spec:
      chart: flagger
      version: ">=1.0.0"
      sourceRef:
        kind: HelmRepository
        name: flagger
  values:
    # Use Istio, Linkerd, or NGINX as the mesh/ingress provider
    meshProvider: istio
    metricsServer: http://prometheus.monitoring:9090
```

```yaml
# Canary resource for progressive delivery
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  # Service configuration for traffic splitting
  service:
    port: 80
    targetPort: 8080
    # Istio virtual service configuration
    gateways:
      - public-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.my-org.com
  analysis:
    # Canary analysis interval
    interval: 1m
    # Maximum traffic percentage to route to canary
    maxWeight: 50
    # Traffic increment step
    stepWeight: 10
    # Number of successful checks before promotion
    threshold: 5
    # Metrics to evaluate canary health
    metrics:
      - name: request-success-rate
        # Require 99% success rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        # Require p99 latency under 500ms
        thresholdRange:
          max: 500
        interval: 1m
    # Webhooks for custom validation
    webhooks:
      - name: load-test
        url: http://flagger-loadtester.flagger-system/
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.production:80/"
```

```yaml
# The deployment remains standard - Flagger manages the canary
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # When Flux updates this image, Flagger starts canary analysis
          image: ghcr.io/my-org/my-app:1.1.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
```

## Blue-Green Deployments with Flagger

For blue-green deployments, Flagger creates a mirror deployment and switches traffic instantly after validation.

```yaml
# Blue-green canary resource
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  # Use blue-green promotion instead of canary
  progressDeadlineSeconds: 600
  service:
    port: 80
    targetPort: 8080
  analysis:
    # Blue-green specific settings
    interval: 1m
    # Number of checks before switching traffic
    iterations: 10
    # No gradual traffic shift - instant switch
    threshold: 2
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      # Run integration tests against the green (preview) deployment
      - name: integration-tests
        type: pre-rollout
        url: http://flagger-loadtester.flagger-system/
        metadata:
          type: bash
          cmd: "curl -s http://my-app-canary.production:80/api/health | grep ok"
```

## Service Mesh Configuration for Traffic Splitting

If using Istio, configure traffic splitting for canary deployments.

```yaml
# Istio DestinationRule for traffic management
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    # Circuit breaking to prevent cascade failures
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Notifications for Deployment Progress

Get notified about deployment progress and failures.

```yaml
# Flagger alert provider
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack
  namespace: production
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook
---
# Flux notification for reconciliation events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-deployments
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-deployments
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: production-apps
    - kind: HelmRelease
      name: "*"
      namespace: production
```

## HelmRelease with Zero-Downtime Settings

For Helm-based deployments, configure HelmRelease with appropriate remediation.

```yaml
# HelmRelease with zero-downtime configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: ">=1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
  values:
    replicaCount: 3
    strategy:
      type: RollingUpdate
      rollingUpdate:
        maxSurge: 1
        maxUnavailable: 0
    minReadySeconds: 30
  # Wait for the release to be healthy
  install:
    remediation:
      retries: 3
  upgrade:
    # Preserve values from previous release during upgrade
    preserveValues: false
    remediation:
      retries: 3
      # Rollback to the last successful release on failure
      remediateLastFailure: true
    # Clean up on failure
    cleanupOnFail: true
  # Run tests after installation
  test:
    enable: true
    ignoreFailures: false
  # Timeout for the Helm operation
  timeout: 10m
```

## Best Practices

1. Always set `maxUnavailable: 0` in rolling updates to prevent any downtime.
2. Use `minReadySeconds` to ensure pods are stable before continuing the rollout.
3. Configure readiness probes that accurately reflect application readiness.
4. Implement `preStop` lifecycle hooks to allow graceful connection draining.
5. Use Pod Disruption Budgets to protect availability during voluntary disruptions.
6. For canary deployments, define metrics-based analysis with Flagger.
7. Set appropriate timeouts on Flux health checks to match your rollout duration.
8. Monitor deployments with notifications for both success and failure events.
9. Use `remediateLastFailure: true` on HelmReleases to automatically rollback failed upgrades.
