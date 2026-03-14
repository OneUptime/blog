# How to Deploy a CloudEvents Router with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, CloudEvents, Event Router, Event-Driven, Serverless

Description: Deploy a CloudEvents-based event router to Kubernetes using Flux CD to route standardized events between producers and consumers with GitOps-managed routing rules.

---

## Introduction

CloudEvents is a CNCF specification for describing event data in a common format. A CloudEvents router sits between event producers and consumers, routing events based on their type, source, or attributes to the appropriate downstream services. This decouples producers from consumers and enables flexible, reconfigurable event pipelines.

Managing a CloudEvents router through Flux CD means your event routing rules - which event types go to which services - are version-controlled. Adding a new consumer or changing routing logic is a pull request, making event pipeline changes auditable and reversible.

This guide covers deploying a Kubernetes-native CloudEvents router (using Knative Eventing's Broker as the routing backbone) and configuring routing rules via Flux CD.

## Prerequisites

- Kubernetes cluster (1.24+)
- Knative Eventing installed (or a standalone CloudEvents router like Triggermesh)
- Flux CD v2 bootstrapped to your Git repository
- Consumer services deployed and ready to receive events

## Step 1: Deploy the Event Router Namespace and Broker

```yaml
# clusters/my-cluster/cloudevents-router/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: event-routing
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/cloudevents-router/broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: main-router
  namespace: event-routing
  annotations:
    eventing.knative.dev/broker.class: MTChannelBasedBroker
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: config-br-default-channel
    namespace: knative-eventing
  delivery:
    deadLetterSink:
      uri: http://dead-letter-collector.event-routing.svc.cluster.local
    retry: 3
    backoffPolicy: exponential
    backoffDelay: PT1S
    timeout: PT10S
```

## Step 2: Define Event Routing Rules (Triggers)

Each Trigger defines a routing rule - a filter and a destination:

```yaml
# clusters/my-cluster/cloudevents-router/triggers.yaml
# Route order.created events to the order processor
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: route-order-created
  namespace: event-routing
spec:
  broker: main-router
  filter:
    attributes:
      type: com.example.order.created
  subscriber:
    uri: http://order-processor.app.svc.cluster.local/events
---
# Route order.created events ALSO to the analytics service (fan-out)
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: route-order-analytics
  namespace: event-routing
spec:
  broker: main-router
  filter:
    attributes:
      type: com.example.order.created
  subscriber:
    uri: http://analytics.app.svc.cluster.local/ingest
---
# Route payment.failed events to the notification service
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: route-payment-failed
  namespace: event-routing
spec:
  broker: main-router
  filter:
    attributes:
      type: com.example.payment.failed
      source: /payment/gateway
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: notification-sender
      namespace: app
```

## Step 3: Create an Event Source

Configure services to publish to the router:

```yaml
# clusters/my-cluster/cloudevents-router/api-source.yaml
# ApiServerSource captures Kubernetes API events
apiVersion: sources.knative.dev/v1
kind: ApiServerSource
metadata:
  name: k8s-events-source
  namespace: event-routing
spec:
  serviceAccountName: event-watcher-sa
  mode: Resource
  resources:
    - apiVersion: v1
      kind: Event
  # Send all Kubernetes Warning events to the broker
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: main-router
```

## Step 4: Create a Dead Letter Collector

```yaml
# clusters/my-cluster/cloudevents-router/dead-letter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dead-letter-collector
  namespace: event-routing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dead-letter-collector
  template:
    metadata:
      labels:
        app: dead-letter-collector
    spec:
      containers:
        - name: collector
          image: gcr.io/knative-releases/knative.dev/eventing/cmd/event_display:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "64Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: dead-letter-collector
  namespace: event-routing
spec:
  selector:
    app: dead-letter-collector
  ports:
    - port: 80
      targetPort: 8080
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/cloudevents-router/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - broker.yaml
  - triggers.yaml
  - dead-letter.yaml
---
# clusters/my-cluster/flux-kustomization-cloudevents-router.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cloudevents-router
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: knative-eventing
  path: ./clusters/my-cluster/cloudevents-router
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Test Event Routing

```bash
# Verify router components
flux get kustomizations cloudevents-router

kubectl get broker main-router -n event-routing
kubectl get triggers -n event-routing

# Send a test event to the broker
BROKER_URL=$(kubectl get broker main-router -n event-routing \
  -o jsonpath='{.status.address.url}')

kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -X POST "$BROKER_URL" \
  -H "Content-Type: application/json" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: com.example.order.created" \
  -H "Ce-Source: /orders/api" \
  -H "Ce-Id: $(uuidgen)" \
  -d '{"orderId": "ORD-001", "amount": 99.99}'

# Verify event was routed (check consumer logs)
kubectl logs -n app deployment/order-processor --tail=20
kubectl logs -n app deployment/analytics --tail=20
```

## Best Practices

- Use specific CloudEvents attribute filters in Triggers rather than wildcard matching to prevent unintended event fan-out.
- Always configure a dead-letter sink on the Broker with retry and backoff policies to handle transient consumer failures without losing events.
- Apply `dependsOn` in Flux Kustomizations to ensure the Broker is ready before Triggers and Sources reference it.
- Use Knative's `EventType` CRD to document the CloudEvents schema for each event type - these become discoverable API contracts for event producers and consumers.
- Monitor Broker and Trigger metrics with Prometheus to detect routing failures, dead-letter accumulation, and event latency issues.

## Conclusion

A CloudEvents router deployed and managed by Flux CD creates a robust, standardized event backbone for your services. Routing rules are version-controlled in Git, making it straightforward to add new consumers, modify routing logic, and audit the full event flow. The combination of CloudEvents standards and GitOps governance gives you a maintainable, observable event-driven architecture.
