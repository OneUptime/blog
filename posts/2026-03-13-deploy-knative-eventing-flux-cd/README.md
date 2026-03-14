# How to Deploy Knative Eventing with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Knative, Eventing, Event-Driven, Serverless, CloudEvents

Description: Deploy Knative Eventing for event-driven architecture using Flux CD to build loosely coupled, scalable event-driven applications on Kubernetes.

---

## Introduction

Knative Eventing provides a Kubernetes-native eventing infrastructure built on the CloudEvents specification. It enables loosely coupled event producers and consumers through Brokers, Triggers, Channels, and Subscriptions - making it straightforward to build event-driven microservices that scale independently.

Managing Knative Eventing through Flux CD ensures the eventing infrastructure and your application's event topology are both version-controlled. Adding a new event source or subscriber becomes a pull request, not a manual `kubectl apply` command.

This guide covers deploying Knative Eventing with the MT-Channel-Based Broker using Flux CD and wiring up an event flow.

## Prerequisites

- Kubernetes cluster with Knative Serving deployed (or standalone Eventing)
- Flux CD v2 bootstrapped to your Git repository
- Basic understanding of the CloudEvents specification

## Step 1: Deploy Knative Eventing Core

```yaml
# clusters/my-cluster/knative-eventing/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: knative-eventing
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/knative/eventing
  ref:
    tag: knative-v1.14.0
  ignore: |
    /*
    !/config/core/
    !/config/post-install/
    !/config/channels/multitenant-channel-based-broker/
---
# clusters/my-cluster/knative-eventing/kustomization-eventing.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: knative-eventing
  namespace: flux-system
spec:
  interval: 10m
  path: ./config/core
  prune: false   # Never prune CRDs in eventing namespace
  sourceRef:
    kind: GitRepository
    name: knative-eventing
```

## Step 2: Deploy the MT-Channel-Based Broker

```yaml
# clusters/my-cluster/knative-eventing/kustomization-broker.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: knative-eventing-broker
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: knative-eventing
  path: ./config/channels/multitenant-channel-based-broker
  prune: true
  sourceRef:
    kind: GitRepository
    name: knative-eventing
```

## Step 3: Create an Event Broker and Trigger

```yaml
# clusters/my-cluster/apps/eventing/broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default
  namespace: event-apps
  annotations:
    eventing.knative.dev/broker.class: MTChannelBasedBroker
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: config-br-default-channel
    namespace: knative-eventing
  # Deliver undeliverable events to a dead-letter sink
  delivery:
    deadLetterSink:
      ref:
        apiVersion: v1
        kind: Service
        name: event-dead-letter
    backoffDelay: "PT2S"
    backoffPolicy: exponential
    timeout: "PT10S"
    retry: 3
---
# clusters/my-cluster/apps/eventing/trigger-order-processor.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-processor
  namespace: event-apps
spec:
  broker: default
  # Filter to only receive order.created events
  filter:
    attributes:
      type: com.example.order.created
      source: /orders/api
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
```

## Step 4: Create an Event Source

```yaml
# clusters/my-cluster/apps/eventing/pingsource.yaml
# PingSource sends periodic CloudEvents (useful for scheduled tasks)
apiVersion: sources.knative.dev/v1
kind: PingSource
metadata:
  name: heartbeat-source
  namespace: event-apps
spec:
  # Send every minute
  schedule: "*/1 * * * *"
  contentType: application/json
  data: '{"heartbeat": "ping", "version": "v1"}'
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: default
```

## Step 5: Create the Flux Kustomization for Apps

```yaml
# clusters/my-cluster/apps/eventing/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - broker.yaml
  - trigger-order-processor.yaml
  - pingsource.yaml
---
# clusters/my-cluster/flux-kustomization-eventing-apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: eventing-apps
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: knative-eventing-broker
  path: ./clusters/my-cluster/apps/eventing
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify Event Flow

```bash
# Check eventing components
flux get kustomizations knative-eventing knative-eventing-broker

# Verify Broker is ready
kubectl get broker default -n event-apps
# Expected: READY=True

# Check Trigger status
kubectl get trigger order-processor -n event-apps

# Send a test event to the broker
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -X POST http://broker-ingress.knative-eventing.svc.cluster.local/event-apps/default \
  -H "Content-Type: application/json" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: com.example.order.created" \
  -H "Ce-Source: /orders/api" \
  -H "Ce-Id: test-123" \
  -d '{"orderId": "12345", "item": "widget"}'
```

## Best Practices

- Always configure a dead-letter sink on Brokers so undeliverable events are captured for debugging rather than silently dropped.
- Use CloudEvents attribute filters in Triggers to route events precisely - avoid catch-all triggers that process every event in a busy broker.
- Use `dependsOn` in Flux Kustomizations to ensure the Broker is ready before creating Triggers and Sources that depend on it.
- Apply `prune: false` on CRD and operator Kustomizations to prevent Flux from deleting Knative infrastructure on accidental manifest removal.
- Use ApiServerSource to react to Kubernetes API events, enabling powerful internal automation workflows driven by cluster state changes.

## Conclusion

Knative Eventing deployed and managed through Flux CD gives teams a production-grade event-driven platform on Kubernetes where the entire event topology - brokers, triggers, and sources - is defined in Git. Adding new event consumers is a pull request, and the cluster automatically wires up the event flow on reconciliation.
