# How to Use Dapr with Score Workload Specification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Score, Workload, Platform Engineering, Portability

Description: Learn how to use Score workload specification to describe Dapr-enabled services in a platform-agnostic way and generate Kubernetes or Docker Compose configurations automatically.

---

Score is a CNCF sandbox project that provides a developer-centric workload specification format. Instead of writing Kubernetes YAML or Docker Compose directly, developers write a `score.yaml` file that describes what their service needs. Score translates this into platform-specific configurations, including Dapr annotations.

## What Score Solves

Developers should not need to know Kubernetes internals to run their service. A Score file describes the workload's needs at a high level:

```yaml
# score.yaml - developer writes this
apiVersion: score.dev/v1b1
metadata:
  name: order-service
containers:
  order-service:
    image: myrepo/order-service:latest
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
resources:
  state:
    type: dapr-state-store
  events:
    type: dapr-pubsub
```

The Score CLI then generates the target platform's YAML with Dapr annotations included.

## Installing the Score CLI

```bash
# Install score-k8s
brew install score-spec/tap/score-k8s

# Verify
score-k8s --version
```

## Initializing Score for Kubernetes

```bash
# Initialize in your project directory
score-k8s init

# This creates .score-k8s/ directory with default provisioners
ls .score-k8s/
# zz-default.provisioners.yaml
```

## Custom Dapr Provisioner

Create a provisioner that maps Score resource types to Dapr components:

```yaml
# .score-k8s/dapr-provisioners.yaml
- uri: template://dapr-state-store
  type: dapr-state-store
  description: "Dapr state store component"
  outputs: |
    component-name: {{ .Uid }}
  manifests: |
    - apiVersion: dapr.io/v1alpha1
      kind: Component
      metadata:
        name: {{ .Uid }}
        namespace: {{ .Namespace }}
      spec:
        type: state.redis
        version: v1
        metadata:
          - name: redisHost
            value: "redis.infra:6379"

- uri: template://dapr-pubsub
  type: dapr-pubsub
  description: "Dapr pub/sub component"
  outputs: |
    component-name: {{ .Uid }}
  manifests: |
    - apiVersion: dapr.io/v1alpha1
      kind: Component
      metadata:
        name: {{ .Uid }}
        namespace: {{ .Namespace }}
      spec:
        type: pubsub.kafka
        version: v1
        metadata:
          - name: brokers
            value: "kafka.infra:9092"
```

## Generating Kubernetes Manifests

```bash
# Generate Kubernetes YAML from score.yaml
score-k8s generate score.yaml

# Output is a single manifests file
cat manifests.yaml
```

The generated deployment will include Dapr annotations automatically:

```yaml
# Generated deployment.yaml (excerpt)
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
```

## Docker Compose for Local Development

Generate a Docker Compose file for local development using score-compose:

```bash
# Install score-compose
brew install score-spec/tap/score-compose

# Initialize and generate compose.yaml
score-compose init
score-compose generate score.yaml
docker compose up
```

Dapr in Docker Compose mode uses Redis and Zipkin containers started by `dapr init`.

## Benefits of Score + Dapr

- Developers write a single `score.yaml` regardless of target environment
- Platform team owns the provisioners that inject Dapr annotations and components
- Dev/prod parity: same workload spec, different backing components
- New engineers do not need to learn Dapr YAML structure to deploy services

## Summary

Score workload specification combined with Dapr lets developers describe their service needs in a platform-agnostic format while platform teams control how those needs translate to Dapr components and Kubernetes annotations through custom provisioners. This separation reduces cognitive load for application developers and centralizes Dapr configuration expertise in the platform team.
