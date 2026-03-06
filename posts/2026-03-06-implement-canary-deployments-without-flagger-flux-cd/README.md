# How to Implement Canary Deployments Without Flagger in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubernetes, canary deployments, gitops, traffic splitting, nginx ingress

Description: A practical guide to implementing manual canary deployments with Flux CD without using Flagger, using native Kubernetes resources and ingress controllers.

---

## Introduction

Canary deployments release a new version of your application to a small subset of users before rolling it out to the entire fleet. While Flagger automates this process, you can implement canary deployments manually with Flux CD using native Kubernetes resources, Nginx Ingress, or Istio.

This guide walks through practical canary deployment patterns using only Flux CD and standard Kubernetes primitives.

## Prerequisites

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- Nginx Ingress Controller installed
- A Git repository connected to Flux

## Repository Structure

```
clusters/
  my-cluster/
    canary.yaml
apps/
  myapp/
    kustomization.yaml
    namespace.yaml
    stable/
      deployment.yaml
      service.yaml
    canary/
      deployment.yaml
      service.yaml
    ingress.yaml
```

## Flux Kustomization

```yaml
# clusters/my-cluster/canary.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-canary
  namespace: flux-system
spec:
  interval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/myapp
  prune: true
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp-stable
      namespace: myapp
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp-canary
      namespace: myapp
```

## Step 1: Deploy the Stable Version

Start with the stable version handling all traffic:

```yaml
# apps/myapp/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
---
# apps/myapp/stable/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-stable
  namespace: myapp
  labels:
    app: myapp
    track: stable
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
      track: stable
  template:
    metadata:
      labels:
        app: myapp
        track: stable
      annotations:
        # Track the version for monitoring
        app.kubernetes.io/version: "1.0.0"
    spec:
      containers:
        - name: myapp
          image: myregistry.io/myapp:v1.0.0
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: VERSION
              value: "1.0.0"
            - name: TRACK
              value: "stable"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
# apps/myapp/stable/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-stable
  namespace: myapp
spec:
  selector:
    app: myapp
    track: stable
  ports:
    - port: 80
      targetPort: 8080
      name: http
```

## Step 2: Deploy the Canary Version

Deploy the new version with minimal replicas:

```yaml
# apps/myapp/canary/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  namespace: myapp
  labels:
    app: myapp
    track: canary
spec:
  # Start with just 1 replica for the canary
  replicas: 1
  selector:
    matchLabels:
      app: myapp
      track: canary
  template:
    metadata:
      labels:
        app: myapp
        track: canary
      annotations:
        app.kubernetes.io/version: "2.0.0"
    spec:
      containers:
        - name: myapp
          # New version to test
          image: myregistry.io/myapp:v2.0.0
          ports:
            - containerPort: 8080
              name: http
          env:
            - name: VERSION
              value: "2.0.0"
            - name: TRACK
              value: "canary"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
# apps/myapp/canary/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-canary
  namespace: myapp
spec:
  selector:
    app: myapp
    track: canary
  ports:
    - port: 80
      targetPort: 8080
      name: http
```

## Step 3: Configure Traffic Splitting with Nginx Ingress

```yaml
# apps/myapp/ingress.yaml
# Primary ingress handles most traffic
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-primary
  namespace: myapp
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-stable
                port:
                  number: 80
---
# Canary ingress gets a percentage of traffic
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-canary
  namespace: myapp
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    # Start with 5% of traffic going to the canary
    nginx.ingress.kubernetes.io/canary-weight: "5"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-canary
                port:
                  number: 80
```

## Progressive Traffic Shifting Through Git Commits

Increase canary traffic by updating the ingress annotation:

### Phase 1: 5% Traffic (Initial Canary)

```yaml
# Commit message: "canary: deploy v2.0.0 at 5% traffic"
annotations:
  nginx.ingress.kubernetes.io/canary: "true"
  nginx.ingress.kubernetes.io/canary-weight: "5"
```

### Phase 2: 20% Traffic (After Monitoring)

```yaml
# Commit message: "canary: increase v2.0.0 to 20% traffic"
annotations:
  nginx.ingress.kubernetes.io/canary: "true"
  nginx.ingress.kubernetes.io/canary-weight: "20"
```

### Phase 3: 50% Traffic (High Confidence)

```yaml
# Commit message: "canary: increase v2.0.0 to 50% traffic"
annotations:
  nginx.ingress.kubernetes.io/canary: "true"
  nginx.ingress.kubernetes.io/canary-weight: "50"
```

### Phase 4: Promote Canary to Stable

```yaml
# Commit message: "promote: v2.0.0 becomes stable"
# Update stable deployment to use the new image
# apps/myapp/stable/deployment.yaml
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: myapp
          image: myregistry.io/myapp:v2.0.0

# Remove canary deployment
# apps/myapp/canary/deployment.yaml
spec:
  replicas: 0
```

## Canary with Istio VirtualService

For more granular traffic control without Nginx:

```yaml
# apps/myapp/istio/virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
  namespace: myapp
spec:
  hosts:
    - myapp.example.com
  gateways:
    - myapp-gateway
  http:
    - route:
        - destination:
            host: myapp-stable
            port:
              number: 80
          weight: 95
        - destination:
            host: myapp-canary
            port:
              number: 80
          weight: 5
      # Add timeout and retries for resilience
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,reset,connect-failure
```

## Pod-Based Canary (Without Ingress)

Use a single Service that selects both stable and canary pods. Traffic distribution is proportional to the number of pods:

```yaml
# apps/myapp/unified-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: myapp
spec:
  # Select pods from both stable and canary
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# Stable: 9 replicas = 90% traffic
# apps/myapp/stable/deployment.yaml
spec:
  replicas: 9

# Canary: 1 replica = 10% traffic
# apps/myapp/canary/deployment.yaml
spec:
  replicas: 1
```

To shift traffic, adjust replica counts:

```yaml
# 70/30 split
# Stable: 7 replicas
# Canary: 3 replicas

# 50/50 split
# Stable: 5 replicas
# Canary: 5 replicas

# Full promotion
# Stable: 0 replicas (then update image and scale back up)
# Canary: 10 replicas
```

## Automated Rollback on Failure

Create a monitoring CronJob that checks canary health and triggers rollback:

```yaml
# apps/myapp/canary-monitor.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: canary-health-check
  namespace: myapp
spec:
  schedule: "*/2 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 1
      template:
        spec:
          serviceAccountName: canary-monitor
          restartPolicy: Never
          containers:
            - name: monitor
              image: bitnami/kubectl:1.29
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Check canary pod health
                  CANARY_READY=$(kubectl get deployment myapp-canary \
                    -n myapp \
                    -o jsonpath='{.status.readyReplicas}')
                  CANARY_DESIRED=$(kubectl get deployment myapp-canary \
                    -n myapp \
                    -o jsonpath='{.spec.replicas}')

                  # Check if canary pods are crashing
                  RESTART_COUNT=$(kubectl get pods \
                    -n myapp \
                    -l track=canary \
                    -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}')

                  echo "Canary ready: $CANARY_READY/$CANARY_DESIRED"
                  echo "Restart count: $RESTART_COUNT"

                  # Rollback if pods are not ready or restarting frequently
                  if [ "$CANARY_READY" != "$CANARY_DESIRED" ] || [ "$RESTART_COUNT" -gt "3" ]; then
                    echo "Canary is unhealthy. Scaling down canary."
                    kubectl scale deployment myapp-canary \
                      -n myapp \
                      --replicas=0
                    echo "Canary scaled to 0. Manual intervention required."
                  else
                    echo "Canary is healthy."
                  fi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: canary-monitor
  namespace: myapp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: canary-monitor
  namespace: myapp
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "deployments/scale"]
    verbs: ["get", "list", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: canary-monitor
  namespace: myapp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: canary-monitor
subjects:
  - kind: ServiceAccount
    name: canary-monitor
    namespace: myapp
```

## Monitoring the Canary

```yaml
# apps/myapp/monitoring/prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: canary-alerts
  namespace: monitoring
spec:
  groups:
    - name: canary.rules
      rules:
        - alert: CanaryHighErrorRate
          expr: |
            sum(rate(http_requests_total{track="canary",status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{track="canary"}[5m]))
            > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Canary error rate exceeds 5%"
            description: "Consider rolling back the canary deployment"
        - alert: CanaryHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_seconds_bucket{track="canary"}[5m])) by (le)
            ) > 2
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Canary p99 latency exceeds 2 seconds"
```

## Flux Notifications for Canary Events

```yaml
# clusters/my-cluster/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: canary-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: myapp-canary
  summary: "Canary deployment status change"
```

## Summary

Implementing canary deployments without Flagger in Flux CD is straightforward with the right patterns:

- Deploy stable and canary versions as separate Deployments with distinct labels
- Use Nginx Ingress canary annotations for percentage-based traffic splitting
- Progressively increase canary traffic through Git commits
- Use the pod-ratio approach for simple setups without ingress-level splitting
- Monitor canary health with Prometheus alerts and automated health checks
- Promote the canary by updating the stable deployment image and scaling down the canary
- Every traffic shift is a Git commit, providing a complete audit trail and easy rollback
