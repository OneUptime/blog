# How to Use Dapr Samples Repository for Learning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Learning, SAMPLE, Quickstart, Tutorial

Description: Learn how to use the official Dapr quickstarts and samples repositories to understand building blocks through runnable, hands-on examples.

---

The fastest way to learn Dapr is by running working examples. The Dapr project maintains two key repositories: `dapr/quickstarts` for focused single-feature demos and `dapr/samples` for community-contributed multi-feature apps.

## Cloning the Quickstarts Repository

```bash
git clone https://github.com/dapr/quickstarts.git
cd quickstarts
```

The quickstarts directory structure maps to Dapr building blocks:

```text
quickstarts/
  tutorials/          - Multi-step learning paths
  service_invocation/ - Direct service-to-service calls
  pub_sub/            - Pub/sub messaging
  state_management/   - State store operations
  bindings/           - Input/output bindings
  secrets_management/ - Secret store access
  configuration/      - Configuration API
  actors/             - Virtual actors
  workflows/          - Workflow orchestration
```

## Running a Quickstart

Each quickstart has self-contained instructions. Start with pub/sub as a representative example:

```bash
cd quickstarts/pub_sub/python/sdk

# Terminal 1 - start the order processor (subscriber)
cd order-processor && pip install -r requirements.txt
dapr run --app-id order-processor --app-port 6001 -- python3 app.py

# Terminal 2 - start the checkout service (publisher)
cd checkout && pip install -r requirements.txt
dapr run --app-id checkout -- python3 app.py
```

Watch messages flow between services in the terminal output without any message broker configuration in your code.

## Exploring SDK Variants

Most quickstarts provide examples in multiple languages and communication styles:

```bash
ls quickstarts/service_invocation/
# csharp/      go/      java/      javascript/      python/
# Each has an http/ subdirectory with raw HTTP examples
```

Use the `http` variant to understand the underlying Dapr API calls. Other quickstarts like `pub_sub` and `state_management` provide `sdk` variants that show idiomatic SDK usage.

## Using the Dapr Samples Repository

The samples repository has community-contributed examples covering advanced patterns:

```bash
git clone https://github.com/dapr/samples.git
ls samples/
```

Notable samples include:

- `distributed-calculator` - Multi-language microservices (also available in `dapr/quickstarts/tutorials/`)
- `hello-kubernetes` - Kubernetes deployment walkthrough (located in `dapr/quickstarts/tutorials/`)
- `dapr-traffic-control` - Traffic control system demo using multiple Dapr building blocks (external community sample)

## Modifying Samples for Experimentation

Fork and modify samples to experiment safely:

```bash
git clone https://github.com/dapr/quickstarts.git
cd quickstarts/state_management/python/sdk

# Swap the state store from Redis to an in-memory store
cat ../../resources/statestore.yaml
# Change spec.type from state.redis to state.in-memory
```

```yaml
spec:
  type: state.in-memory
  version: v1
  metadata: []
```

This pattern lets you isolate component behavior from application logic.

## Running Quickstarts in Kubernetes

Each quickstart that supports Kubernetes has deployment manifests in its directory. For example, to deploy the pub/sub quickstart:

```bash
cd quickstarts/tutorials/hello-kubernetes
kubectl apply -f ./deploy
kubectl get pods -w
```

## Summary

The Dapr quickstarts repository provides runnable examples for every building block in multiple languages and SDK styles. Clone the repo, pick the building block you want to learn, run the self-hosted example first, then experiment by swapping components to deepen your understanding of Dapr's portability.
