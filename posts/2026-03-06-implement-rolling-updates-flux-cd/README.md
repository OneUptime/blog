# How to Implement Rolling Updates with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Rolling Updates, Deployments, GitOps, Zero Downtime

Description: A practical guide to implementing zero-downtime rolling updates in Kubernetes using Flux CD with proper health checks, resource budgets, and rollback strategies.

---

## Introduction

Rolling updates are the default deployment strategy in Kubernetes, gradually replacing old pods with new ones to achieve zero-downtime deployments. When managed through Flux CD, rolling updates become automated, version-controlled, and easily reversible through Git.

This guide covers how to configure and optimize rolling updates with Flux CD, including update strategies, health checks, Pod Disruption Budgets, and rollback patterns.

## Prerequisites

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  my-cluster/
    apps.yaml
apps/
  myapp/
    kustomization.yaml
    namespace.yaml
    deployment.yaml
    service.yaml
    hpa.yaml
    pdb.yaml
```

## Flux Kustomization

```yaml
# clusters/my-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/myapp
  prune: true
  wait: true
  timeout: 10m
  # Force apply to handle conflicts during rolling updates
  force: false
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
```

## Configuring Rolling Update Strategy

```yaml
# apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  labels:
    app: myapp
    app.kubernetes.io/managed-by: flux
spec:
  replicas: 6
  # Revision history for rollbacks
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Maximum number of pods that can be created above desired count
      # 2 means up to 8 pods can exist during the update (6 + 2)
      maxSurge: 2
      # Maximum number of pods that can be unavailable during the update
      # 1 means at least 5 pods are always available
      maxUnavailable: 1
  # Minimum time a pod must be ready before it is considered available
  minReadySeconds: 30
  # Deadline for the deployment to make progress
  progressDeadlineSeconds: 600
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        # Track the deployed version
        app.kubernetes.io/version: "1.5.0"
    spec:
      # Spread pods across nodes for high availability
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: myapp
      # Graceful shutdown period
      terminationGracePeriodSeconds: 60
      containers:
        - name: myapp
          image: myregistry.io/myapp:v1.5.0
          ports:
            - containerPort: 8080
              name: http
          # Readiness probe gates traffic to the pod
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            successThreshold: 2
            failureThreshold: 3
            timeoutSeconds: 5
          # Liveness probe restarts unhealthy pods
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 15
            failureThreshold: 3
            timeoutSeconds: 5
          # Startup probe for slow-starting applications
          startupProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30
            timeoutSeconds: 3
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
          # Handle SIGTERM gracefully
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  # Wait for existing connections to drain
                  - "sleep 15"
```

## Pod Disruption Budget

Ensure minimum availability during rolling updates and node maintenance:

```yaml
# apps/myapp/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp
  namespace: myapp
spec:
  # At least 4 pods must always be available
  minAvailable: 4
  selector:
    matchLabels:
      app: myapp
  # Allow disruptions to unblock stuck updates after 60 seconds
  unhealthyPodEvictionPolicy: AlwaysAllow
```

Alternative PDB using maxUnavailable:

```yaml
# apps/myapp/pdb-alternative.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp
  namespace: myapp
spec:
  # At most 1 pod can be unavailable at any time
  maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
```

## Service Configuration for Zero Downtime

```yaml
# apps/myapp/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
      name: http
  # Session affinity helps during rolling updates
  # to keep users on the same pod version
  sessionAffinity: None
```

## Horizontal Pod Autoscaler

Configure autoscaling that works well with rolling updates:

```yaml
# apps/myapp/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 6
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    # Scale up quickly
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    # Scale down slowly to avoid disruption
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

## Triggering a Rolling Update via Git

To trigger a rolling update, simply update the image tag in your Git repository:

```yaml
# Before: apps/myapp/deployment.yaml
containers:
  - name: myapp
    image: myregistry.io/myapp:v1.5.0

# After: apps/myapp/deployment.yaml (new commit)
containers:
  - name: myapp
    image: myregistry.io/myapp:v2.0.0
```

Flux detects the change, applies it, and Kubernetes performs the rolling update.

## Automated Image Updates

Use Flux Image Automation to trigger rolling updates automatically:

```yaml
# clusters/my-cluster/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: myregistry.io/myapp
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      # Automatically update to latest patch version
      range: ">=1.5.0 <2.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: |
        Automated image update: {{ range .Changed.Changes }}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end }}
    push:
      branch: main
  update:
    path: ./apps/myapp
    strategy: Setters
```

Add the image policy marker to the deployment:

```yaml
# apps/myapp/deployment.yaml
containers:
  - name: myapp
    image: myregistry.io/myapp:v1.5.0 # {"$imagepolicy": "flux-system:myapp"}
```

## Different Rolling Update Configurations

### Conservative Update (High Availability)

```yaml
# Prioritize availability - always have enough capacity
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 2        # Create 2 new pods before removing old ones
    maxUnavailable: 0  # Never have fewer pods than desired
minReadySeconds: 60    # Wait a full minute before considering a pod ready
```

### Fast Update (Quick Rollout)

```yaml
# Prioritize speed - update as fast as possible
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: "50%"        # Create up to 50% extra pods
    maxUnavailable: "25%"  # Allow 25% of pods to be unavailable
minReadySeconds: 10        # Short readiness wait
```

### Percentage-Based Update

```yaml
# Use percentages for dynamic scaling
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: "25%"
    maxUnavailable: "25%"
```

## Rollback Through Git

To rollback, revert the Git commit:

```bash
# Find the commit that changed the image
git log --oneline apps/myapp/deployment.yaml

# Revert the change
git revert <commit-hash>
git push
```

Flux detects the revert and rolls back the deployment automatically.

## Monitoring Rolling Updates

```yaml
# apps/monitoring/rolling-update-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: deployment-alerts
  namespace: monitoring
spec:
  groups:
    - name: deployment.rules
      rules:
        - alert: DeploymentRolloutStuck
          # Alert if a deployment has not completed within 15 minutes
          expr: |
            kube_deployment_status_condition{condition="Progressing",status="false"} == 1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Deployment {{ $labels.deployment }} rollout is stuck"
            description: "The deployment has not made progress for 15 minutes."
        - alert: DeploymentReplicaMismatch
          # Alert if desired and available replicas do not match
          expr: |
            kube_deployment_spec_replicas
            != kube_deployment_status_available_replicas
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Deployment {{ $labels.deployment }} replica mismatch"
        - alert: HighPodRestartRate
          # Alert if pods are restarting frequently during rollout
          expr: |
            rate(kube_pod_container_status_restarts_total[15m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High restart rate for {{ $labels.container }}"
```

## Flux Notifications for Deployment Events

```yaml
# clusters/my-cluster/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
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
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: myapp
  summary: "Application deployment update"
```

## Kustomize Overlays for Update Strategies

Use different update strategies per environment:

```yaml
# apps/myapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: myapp
    patch: |
      - op: replace
        path: /spec/strategy/rollingUpdate/maxSurge
        value: 2
      - op: replace
        path: /spec/strategy/rollingUpdate/maxUnavailable
        value: 0
      - op: replace
        path: /spec/minReadySeconds
        value: 60
      - op: replace
        path: /spec/replicas
        value: 10

# apps/myapp/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: myapp
    patch: |
      - op: replace
        path: /spec/strategy/rollingUpdate/maxSurge
        value: "50%"
      - op: replace
        path: /spec/strategy/rollingUpdate/maxUnavailable
        value: "50%"
      - op: replace
        path: /spec/minReadySeconds
        value: 5
      - op: replace
        path: /spec/replicas
        value: 2
```

## Summary

Implementing rolling updates with Flux CD provides zero-downtime deployments with full GitOps control:

- Configure `maxSurge` and `maxUnavailable` to balance speed and availability
- Set `minReadySeconds` to ensure new pods are truly ready before marking them available
- Use startup, readiness, and liveness probes to gate traffic to healthy pods
- Apply Pod Disruption Budgets to maintain minimum availability during updates
- Add `preStop` lifecycle hooks for graceful connection draining
- Use Flux Image Automation for automatic rolling updates on new image tags
- Rollback by reverting Git commits for a simple and auditable process
- Monitor deployments with Prometheus alerts to catch stuck rollouts
- Customize update strategies per environment using Kustomize overlays
