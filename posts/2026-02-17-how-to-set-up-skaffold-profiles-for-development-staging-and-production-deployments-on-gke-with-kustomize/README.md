# How to Set Up Skaffold Profiles for Development Staging and Production Deployments on GKE with Kustomize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Skaffold, GKE, Kustomize, Kubernetes, DevOps, CI/CD

Description: Learn how to configure Skaffold profiles with Kustomize overlays to manage development, staging, and production deployments on GKE from a single codebase.

---

Every application needs to behave differently across environments. In development, you want hot reloading and debug logging. In staging, you want to mirror production closely but with reduced resources. In production, you want high availability, strict resource limits, and minimal logging.

Managing three different sets of Kubernetes manifests and build configurations is a maintenance burden. Skaffold profiles combined with Kustomize overlays let you manage all environments from a single codebase. You define the base configuration once and layer on environment-specific changes.

## Project Structure

Here is how the project is organized.

```text
my-service/
  src/
    main.go
  Dockerfile
  Dockerfile.dev
  skaffold.yaml
  k8s/
    base/
      deployment.yaml
      service.yaml
      kustomization.yaml
    overlays/
      dev/
        kustomization.yaml
        patches/
          deployment-patch.yaml
      staging/
        kustomization.yaml
        patches/
          deployment-patch.yaml
      production/
        kustomization.yaml
        patches/
          deployment-patch.yaml
          hpa.yaml
```

## Base Kubernetes Manifests

The base directory contains the default manifests that all environments share.

```yaml
# k8s/base/deployment.yaml - Base deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          image: my-service
          ports:
            - containerPort: 8080
          env:
            - name: PORT
              value: "8080"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

```yaml
# k8s/base/service.yaml - Base service
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: ClusterIP
  selector:
    app: my-service
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# k8s/base/kustomization.yaml - Base kustomization
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

## Development Overlay

The development overlay adds debug-friendly settings.

```yaml
# k8s/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
# Add a dev suffix to all resource names
nameSuffix: -dev
# Set the namespace
namespace: development
# Apply patches
patches:
  - path: patches/deployment-patch.yaml
```

```yaml
# k8s/overlays/dev/patches/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: my-service
          # Minimal resources for development
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          env:
            - name: LOG_LEVEL
              value: "debug"
            - name: ENVIRONMENT
              value: "development"
```

## Staging Overlay

Staging mirrors production more closely but with fewer replicas and resources.

```yaml
# k8s/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
nameSuffix: -staging
namespace: staging
patches:
  - path: patches/deployment-patch.yaml
```

```yaml
# k8s/overlays/staging/patches/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: my-service
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          env:
            - name: LOG_LEVEL
              value: "info"
            - name: ENVIRONMENT
              value: "staging"
```

## Production Overlay

Production gets the full treatment: more replicas, higher resource limits, and an HPA.

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - patches/hpa.yaml
namespace: production
patches:
  - path: patches/deployment-patch.yaml
```

```yaml
# k8s/overlays/production/patches/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: my-service
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "1000m"
          env:
            - name: LOG_LEVEL
              value: "warn"
            - name: ENVIRONMENT
              value: "production"
      # Anti-affinity to spread pods across nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: my-service
                topologyKey: kubernetes.io/hostname
```

```yaml
# k8s/overlays/production/patches/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## The Skaffold Configuration

Now the `skaffold.yaml` ties everything together with profiles.

```yaml
# skaffold.yaml - Multi-environment configuration
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-service

# Default build configuration
build:
  artifacts:
    - image: my-service
      docker:
        dockerfile: Dockerfile

# Default deploy uses the base kustomization
deploy:
  kustomize:
    paths:
      - k8s/base

# Environment-specific profiles
profiles:
  # Development profile - local builds, file sync, dev overlay
  - name: dev
    build:
      artifacts:
        - image: my-service
          docker:
            dockerfile: Dockerfile.dev
          sync:
            manual:
              - src: 'src/**/*.go'
                dest: /app
      local:
        push: false
    deploy:
      kustomize:
        paths:
          - k8s/overlays/dev
    portForward:
      - resourceType: service
        resourceName: my-service-dev
        port: 80
        localPort: 8080

  # Staging profile - Cloud Build, staging overlay
  - name: staging
    build:
      googleCloudBuild:
        projectId: my-project
        machineType: E2_HIGHCPU_8
      artifacts:
        - image: us-central1-docker.pkg.dev/my-project/my-repo/my-service
          docker:
            dockerfile: Dockerfile
    deploy:
      kustomize:
        paths:
          - k8s/overlays/staging

  # Production profile - Cloud Build, production overlay
  - name: production
    build:
      googleCloudBuild:
        projectId: my-project
        machineType: E2_HIGHCPU_8
      artifacts:
        - image: us-central1-docker.pkg.dev/my-project/my-repo/my-service
          docker:
            dockerfile: Dockerfile
    deploy:
      kustomize:
        paths:
          - k8s/overlays/production
```

## Using the Profiles

```bash
# Development - local build, file sync, port forwarding
skaffold dev -p dev

# Staging - build with Cloud Build, deploy staging overlay
skaffold run -p staging --kube-context=gke_my-project_us-central1_staging-cluster

# Production - build with Cloud Build, deploy production overlay
skaffold run -p production --kube-context=gke_my-project_us-central1_production-cluster
```

## The Development Dockerfile

The development Dockerfile includes extra tools for debugging and hot reloading.

```dockerfile
# Dockerfile.dev - Development image with hot reload
FROM golang:1.22-alpine

# Install air for hot reloading
RUN go install github.com/cosmtrek/air@latest

WORKDIR /app

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

EXPOSE 8080

# Use air for hot reloading during development
CMD ["air"]
```

## Previewing Kustomize Output

Before deploying, you can preview what Kustomize will generate.

```bash
# Preview the dev overlay
skaffold render -p dev

# Preview the production overlay
skaffold render -p production

# Or use kustomize directly
kubectl kustomize k8s/overlays/production
```

## CI/CD Pipeline

Here is how to use Skaffold profiles in a Cloud Build CI/CD pipeline.

```yaml
# cloudbuild.yaml - Deploy to staging and production
steps:
  # Deploy to staging
  - name: 'gcr.io/k8s-skaffold/skaffold:v2.10.0'
    id: 'deploy-staging'
    entrypoint: 'skaffold'
    args:
      - 'run'
      - '-p'
      - 'staging'
      - '--kube-context=gke_${PROJECT_ID}_us-central1_staging-cluster'
    env:
      - 'CLOUDSDK_COMPUTE_REGION=us-central1'

  # Run integration tests against staging
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'integration-tests'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Wait for rollout to complete
        kubectl rollout status deployment/my-service-staging -n staging
        # Run tests against staging
        curl -f https://staging.example.com/health || exit 1

  # Deploy to production (only after staging tests pass)
  - name: 'gcr.io/k8s-skaffold/skaffold:v2.10.0'
    id: 'deploy-production'
    entrypoint: 'skaffold'
    args:
      - 'run'
      - '-p'
      - 'production'
      - '--kube-context=gke_${PROJECT_ID}_us-central1_production-cluster'
```

## Wrapping Up

Skaffold profiles with Kustomize overlays give you a clean way to manage multiple environments from a single codebase. The base manifests define the common structure, Kustomize overlays customize per environment, and Skaffold profiles control how images are built and where they deploy. This eliminates environment drift and makes it easy to promote changes from development through staging to production.
