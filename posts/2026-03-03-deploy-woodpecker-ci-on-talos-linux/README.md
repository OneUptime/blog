# How to Deploy Woodpecker CI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Woodpecker CI, CI/CD, Kubernetes, Open Source

Description: Step-by-step guide to deploying Woodpecker CI on Talos Linux for a lightweight, open-source CI/CD solution with Kubernetes-native execution.

---

Woodpecker CI is a community-driven, open-source continuous integration platform that forked from Drone CI. It keeps the simplicity of Drone's YAML-based pipeline configuration while adding community-requested features and maintaining a fully open-source codebase. Woodpecker's lightweight design makes it an excellent choice for teams running Talos Linux clusters who want a capable CI/CD system without the overhead of more complex platforms.

This guide covers deploying Woodpecker CI on Talos Linux, connecting it to your Git provider, and building pipelines.

## Why Woodpecker CI

Woodpecker stands out for a few reasons. First, it is completely open source with no enterprise-only features behind a paywall. Second, the pipeline configuration is straightforward YAML that lives in your repository. Third, it supports multiple execution backends including Kubernetes, Docker, and local execution. For Talos Linux users, the Kubernetes backend means builds run as pods in your cluster, scaling naturally with your workload.

## Prerequisites

You will need:

- A Talos Linux cluster with kubectl configured
- Helm v3 installed
- A Git provider account (GitHub, GitLab, Gitea, Forgejo, or Bitbucket)
- An OAuth application configured on your Git provider
- A domain name for the Woodpecker server

## Setting Up OAuth

For GitHub, create an OAuth App with the callback URL set to `https://woodpecker.example.com/authorize`.

For Gitea or Forgejo, create an OAuth2 Application with the redirect URI set to `https://woodpecker.example.com/authorize`.

## Deploying Woodpecker Server

```bash
# Add the Woodpecker Helm repository
helm repo add woodpecker https://woodpecker-ci.org/

# Update the chart cache
helm repo update

# Create the namespace
kubectl create namespace woodpecker
```

Create secrets for the deployment.

```bash
# Generate a shared secret for server-agent communication
WOODPECKER_AGENT_SECRET=$(openssl rand -hex 32)

# Create the secrets
kubectl create secret generic woodpecker-secrets \
  --namespace woodpecker \
  --from-literal=WOODPECKER_GITHUB_CLIENT="your-github-client-id" \
  --from-literal=WOODPECKER_GITHUB_SECRET="your-github-client-secret" \
  --from-literal=WOODPECKER_AGENT_SECRET="${WOODPECKER_AGENT_SECRET}"
```

Deploy the Woodpecker server using Helm.

```yaml
# woodpecker-values.yaml
server:
  # Server configuration
  env:
    WOODPECKER_HOST: "https://woodpecker.example.com"
    WOODPECKER_OPEN: "false"
    WOODPECKER_ADMIN: "yourgithubusername"
    WOODPECKER_GITHUB: "true"

  # Reference secrets
  extraSecretNamesForEnvFrom:
    - woodpecker-secrets

  # Resource allocation
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 512Mi

  # Persistent storage
  persistentVolume:
    enabled: true
    size: 10Gi
    storageClass: local-path

  # Ingress
  ingress:
    enabled: true
    hosts:
      - host: woodpecker.example.com
        paths:
          - path: /
            backend:
              serviceName: woodpecker-server
              servicePort: 80
    tls:
      - hosts:
          - woodpecker.example.com
        secretName: woodpecker-tls

agent:
  # Agent configuration for Kubernetes backend
  env:
    WOODPECKER_BACKEND: "kubernetes"
    WOODPECKER_BACKEND_K8S_NAMESPACE: "woodpecker"
    WOODPECKER_BACKEND_K8S_VOLUME_SIZE: "10G"

  # Reference the agent secret
  extraSecretNamesForEnvFrom:
    - woodpecker-secrets

  # Number of agent replicas
  replicaCount: 2

  # Agent resources
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 512Mi
```

```bash
# Install Woodpecker
helm install woodpecker \
  woodpecker/woodpecker \
  --namespace woodpecker \
  -f woodpecker-values.yaml

# Verify all pods are running
kubectl get pods -n woodpecker
```

## RBAC for Kubernetes Backend

The Woodpecker agent needs permissions to create and manage pods for builds.

```yaml
# woodpecker-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: woodpecker-agent
  namespace: woodpecker

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: woodpecker-agent
  namespace: woodpecker
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["create", "delete", "get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["create", "delete", "get"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["create", "delete", "get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: woodpecker-agent
  namespace: woodpecker
subjects:
  - kind: ServiceAccount
    name: woodpecker-agent
    namespace: woodpecker
roleRef:
  kind: Role
  name: woodpecker-agent
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f woodpecker-rbac.yaml
```

## Writing Woodpecker Pipelines

Create a `.woodpecker.yaml` file in your repository root.

```yaml
# .woodpecker.yaml
steps:
  # Step 1: Run tests
  - name: test
    image: golang:1.22
    commands:
      - go mod download
      - go test -v -race ./...

  # Step 2: Lint the code
  - name: lint
    image: golangci/golangci-lint:latest
    commands:
      - golangci-lint run ./...

  # Step 3: Build the binary
  - name: build
    image: golang:1.22
    commands:
      - go build -ldflags="-s -w" -o app ./cmd/server
    when:
      branch: main

  # Step 4: Build and push container image
  - name: publish
    image: woodpeckerci/plugin-docker-buildx
    settings:
      repo: registry.example.com/myapp
      tags:
        - latest
        - "${CI_COMMIT_SHA:0:8}"
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
    when:
      branch: main
      event: push
```

## Multi-Pipeline Configuration

Woodpecker supports multiple pipeline files for complex projects.

```yaml
# .woodpecker/test.yaml
when:
  event: [push, pull_request]

steps:
  - name: unit-tests
    image: golang:1.22
    commands:
      - go test -v ./...

  - name: integration-tests
    image: golang:1.22
    commands:
      - go test -v -tags=integration ./...
    when:
      branch: main
```

```yaml
# .woodpecker/deploy.yaml
when:
  branch: main
  event: push

depends_on:
  - test

steps:
  - name: deploy-staging
    image: bitnami/kubectl:latest
    commands:
      - kubectl apply -f k8s/staging/
    environment:
      KUBECONFIG:
        from_secret: kubeconfig_staging

  - name: deploy-production
    image: bitnami/kubectl:latest
    commands:
      - kubectl apply -f k8s/production/
    environment:
      KUBECONFIG:
        from_secret: kubeconfig_production
    when:
      event: manual
```

## Using Services in Pipelines

Woodpecker can spin up service containers that your tests can connect to.

```yaml
# .woodpecker.yaml with services
steps:
  - name: test
    image: golang:1.22
    commands:
      - go test -v ./...
    environment:
      DATABASE_URL: "postgres://test:test@database:5432/testdb?sslmode=disable"
      REDIS_URL: "redis://cache:6379"

services:
  - name: database
    image: postgres:16
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb

  - name: cache
    image: redis:7-alpine
```

## Managing Secrets

Add secrets through the Woodpecker web UI or API.

```bash
# Using the Woodpecker CLI
woodpecker secret add \
  --repository myorg/myapp \
  --name docker_username \
  --value your-username

woodpecker secret add \
  --repository myorg/myapp \
  --name docker_password \
  --value your-password
```

Secrets can be scoped to specific events and images for additional security.

```yaml
# Secret usage in pipeline
steps:
  - name: deploy
    image: bitnami/kubectl:latest
    commands:
      - echo $KUBECONFIG_DATA | base64 -d > /tmp/kubeconfig
      - kubectl --kubeconfig=/tmp/kubeconfig apply -f k8s/
    environment:
      KUBECONFIG_DATA:
        from_secret: kubeconfig
```

## Kubernetes Backend Configuration

Fine-tune the Kubernetes backend for your Talos Linux cluster.

```yaml
# Woodpecker agent configuration for Kubernetes backend
agent:
  env:
    WOODPECKER_BACKEND: "kubernetes"
    WOODPECKER_BACKEND_K8S_NAMESPACE: "woodpecker-builds"
    WOODPECKER_BACKEND_K8S_STORAGE_CLASS: "local-path"
    WOODPECKER_BACKEND_K8S_VOLUME_SIZE: "10G"
    WOODPECKER_BACKEND_K8S_POD_LABELS: "ci=woodpecker"
    WOODPECKER_BACKEND_K8S_POD_ANNOTATIONS: "sidecar.istio.io/inject=false"
    # Resource defaults for build pods
    WOODPECKER_BACKEND_K8S_POD_RESOURCES_LIMITS_CPU: "2"
    WOODPECKER_BACKEND_K8S_POD_RESOURCES_LIMITS_MEMORY: "2Gi"
    WOODPECKER_BACKEND_K8S_POD_RESOURCES_REQUESTS_CPU: "500m"
    WOODPECKER_BACKEND_K8S_POD_RESOURCES_REQUESTS_MEMORY: "512Mi"
```

## Monitoring and Maintenance

```bash
# Check Woodpecker server logs
kubectl logs -n woodpecker -l app=woodpecker-server

# Check agent logs
kubectl logs -n woodpecker -l app=woodpecker-agent

# Monitor build pods
kubectl get pods -n woodpecker-builds -w
```

## Wrapping Up

Woodpecker CI on Talos Linux gives you a fully open-source, lightweight CI/CD platform that runs natively on Kubernetes. The pipeline syntax is clean and intuitive, the Kubernetes backend handles scaling automatically, and the entire system is simple enough to understand and maintain without dedicated CI/CD engineering. For teams running Talos Linux who want a CI/CD solution that matches the simplicity and transparency of their infrastructure, Woodpecker is an excellent choice.
