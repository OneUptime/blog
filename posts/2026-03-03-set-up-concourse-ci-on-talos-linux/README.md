# How to Set Up Concourse CI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Concourse CI, CI/CD, Kubernetes, Pipeline

Description: A complete walkthrough for deploying Concourse CI on Talos Linux with Kubernetes workers for scalable, reproducible CI/CD pipelines.

---

Concourse CI takes a unique approach to continuous integration. Every build runs in a fresh container with no implicit state carried over from previous builds. Pipelines are defined entirely in code, there is no click-and-configure interface, and every resource (Git repos, container images, S3 buckets) is treated as a versioned artifact. This design makes Concourse extremely reproducible and predictable, which pairs well with Talos Linux's own emphasis on immutability and deterministic behavior.

This guide covers deploying Concourse CI on Talos Linux, creating pipelines, and managing the system for production use.

## How Concourse Differs from Other CI/CD Tools

Concourse has three core concepts:

- **Resources** - External things your pipeline interacts with (Git repos, Docker images, S3 buckets, Slack channels)
- **Jobs** - Define what work to do, composed of steps that get/put resources and run tasks
- **Tasks** - The actual work, always running in a container with explicitly defined inputs and outputs

There is no global state, no workspace that persists between builds, and no plugins. If a task needs something, it must declare it as an input. If it produces something, it must declare it as an output. This explicitness eliminates "works on my CI server" problems entirely.

## Prerequisites

Make sure you have the following:

- A Talos Linux cluster with at least 3 worker nodes
- kubectl configured and connected
- Helm v3 installed
- A PostgreSQL database (or willingness to deploy one)
- The `fly` CLI tool for interacting with Concourse

## Installing Concourse with Helm

```bash
# Add the Concourse Helm repository
helm repo add concourse https://concourse-charts.storage.googleapis.com/

# Update the chart cache
helm repo update

# Create the namespace
kubectl create namespace concourse
```

Create a values file for the installation.

```yaml
# concourse-values.yaml
concourse:
  web:
    # External URL for the Concourse web interface
    externalUrl: https://concourse.example.com
    # Authentication
    auth:
      mainTeam:
        localUser: "admin"
    # Kubernetes configuration
    kubernetes:
      enabled: true
      createTeamNamespaces: false

  worker:
    # Workers run builds in containers
    runtime: containerd

# Web node configuration
web:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2
      memory: 2Gi

# Worker configuration
worker:
  replicas: 3
  resources:
    requests:
      cpu: 1
      memory: 2Gi
    limits:
      cpu: 4
      memory: 8Gi
  persistence:
    enabled: true
    size: 100Gi
    storageClass: local-path

# PostgreSQL configuration (using built-in)
postgresql:
  enabled: true
  persistence:
    enabled: true
    size: 20Gi
    storageClass: local-path

# Credentials
secrets:
  localUsers: "admin:changeme"
```

```bash
# Install Concourse
helm install concourse \
  concourse/concourse \
  --namespace concourse \
  -f concourse-values.yaml

# Wait for all pods to be running
kubectl get pods -n concourse -w

# You should see:
# concourse-web pods (2 replicas)
# concourse-worker pods (3 replicas)
# concourse-postgresql pod
```

## Accessing Concourse

Set up ingress or port forwarding to access the web UI.

```yaml
# concourse-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: concourse
  namespace: concourse
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - concourse.example.com
      secretName: concourse-tls
  rules:
    - host: concourse.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: concourse-web
                port:
                  number: 8080
```

```bash
# Or use port forwarding for quick access
kubectl port-forward -n concourse svc/concourse-web 8080:8080

# Install the fly CLI
# Download from the Concourse web interface or:
# macOS
brew install --cask fly

# Log in to Concourse
fly -t talos login -c https://concourse.example.com -u admin -p changeme

# Verify the connection
fly -t talos status
```

## Creating Your First Pipeline

Concourse pipelines are defined in YAML and set using the fly CLI.

```yaml
# ci-pipeline.yaml
resources:
  # Git repository resource
  - name: app-repo
    type: git
    icon: github
    source:
      uri: https://github.com/myorg/myapp.git
      branch: main

  # Container image resource
  - name: app-image
    type: registry-image
    icon: docker
    source:
      repository: registry.example.com/myapp
      username: ((docker-username))
      password: ((docker-password))

jobs:
  # Job 1: Run tests
  - name: test
    plan:
      - get: app-repo
        trigger: true
      - task: run-tests
        config:
          platform: linux
          image_resource:
            type: registry-image
            source:
              repository: golang
              tag: "1.22"
          inputs:
            - name: app-repo
          run:
            path: sh
            args:
              - -exc
              - |
                cd app-repo
                go mod download
                go test -v -race ./...

  # Job 2: Build and push image
  - name: build
    plan:
      - get: app-repo
        passed: [test]
        trigger: true
      - task: build-binary
        config:
          platform: linux
          image_resource:
            type: registry-image
            source:
              repository: golang
              tag: "1.22"
          inputs:
            - name: app-repo
          outputs:
            - name: build-output
          run:
            path: sh
            args:
              - -exc
              - |
                cd app-repo
                go build -o ../build-output/app ./cmd/server
                cp Dockerfile ../build-output/
      - put: app-image
        params:
          build: build-output

  # Job 3: Deploy
  - name: deploy
    plan:
      - get: app-image
        passed: [build]
        trigger: true
      - task: deploy-to-kubernetes
        config:
          platform: linux
          image_resource:
            type: registry-image
            source:
              repository: bitnami/kubectl
              tag: latest
          inputs:
            - name: app-image
          run:
            path: sh
            args:
              - -exc
              - |
                kubectl set image deployment/myapp \
                  app=registry.example.com/myapp:latest \
                  -n production
```

```bash
# Set the pipeline
fly -t talos set-pipeline -p myapp -c ci-pipeline.yaml

# Unpause the pipeline
fly -t talos unpause-pipeline -p myapp

# Trigger the first build manually
fly -t talos trigger-job -j myapp/test -w
```

## Managing Secrets

Concourse supports several credential managers. For Kubernetes, you can use the built-in Kubernetes secrets integration.

```bash
# Create secrets that Concourse can reference with ((variable-name))
kubectl create secret generic docker-username \
  --namespace concourse-main \
  --from-literal=value=your-docker-username

kubectl create secret generic docker-password \
  --namespace concourse-main \
  --from-literal=value=your-docker-password
```

For Vault integration:

```yaml
# Add to concourse-values.yaml
concourse:
  web:
    vault:
      enabled: true
      url: https://vault.example.com
      authBackend: "token"
```

## Scaling Workers on Talos Linux

Concourse workers are where builds actually run. Scale them based on your build volume.

```bash
# Scale workers up
kubectl scale statefulset concourse-worker -n concourse --replicas=5

# Check worker status
fly -t talos workers

# Prune stale workers
fly -t talos prune-worker -w <worker-name>
```

## Resource Type Extensions

Concourse uses resource types to interact with external systems. Add custom resource types for your specific needs.

```yaml
# In your pipeline YAML
resource_types:
  - name: slack-notification
    type: registry-image
    source:
      repository: cfcommunity/slack-notification-resource
      tag: latest

resources:
  - name: notify-slack
    type: slack-notification
    source:
      url: ((slack-webhook-url))

jobs:
  - name: notify
    plan:
      - put: notify-slack
        params:
          text: "Build completed successfully!"
```

## Monitoring Concourse

Monitor Concourse with Prometheus metrics.

```bash
# Concourse exposes metrics on the /api/v1/info endpoint
# Enable Prometheus metrics in the Helm values
concourse:
  web:
    prometheus:
      enabled: true
      port: 9391
```

## Wrapping Up

Concourse CI on Talos Linux delivers a CI/CD platform where reproducibility is the default, not an afterthought. Every build starts from scratch in a fresh container, every input is explicit, and every output is versioned. This approach eliminates flaky builds caused by accumulated state. On Talos Linux, the same principle applies at the infrastructure level - every node boots into the same immutable state. Together, Concourse and Talos create a build system where "it works on CI" actually means something, because the environment is deterministic from the kernel up through the build containers.
