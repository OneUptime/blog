# How to Deploy Knative Services with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Knative, Serverless, GitOps, Event-Driven

Description: A comprehensive guide to deploying and managing Knative Serving and Eventing resources using Flux CD for serverless workloads on Kubernetes.

---

## Introduction

Knative provides a platform for deploying and managing serverless workloads on Kubernetes. It offers automatic scaling (including scale-to-zero), traffic splitting, and event-driven architectures. By managing Knative resources through Flux CD, you bring GitOps practices to your serverless infrastructure, ensuring consistency, auditability, and automated deployments.

This guide covers installing Knative with Flux, deploying services, configuring traffic management, and setting up event-driven architectures.

## Prerequisites

- Kubernetes cluster v1.26 or later
- Flux CD v2 installed and bootstrapped
- A networking layer (Istio, Kourier, or Contour)
- kubectl access to the cluster

## Installing Knative with Flux

Deploy Knative Serving and Eventing using Flux:

```yaml
# infrastructure/knative/serving-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: knative
  namespace: flux-system
spec:
  interval: 1h
  url: https://knative.github.io/operator
```

```yaml
# infrastructure/knative/serving-install.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: knative-serving
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/knative/serving
  prune: true
  wait: true
  timeout: 5m
```

```yaml
# infrastructure/knative/serving/knative-serving.yaml
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
spec:
  version: "1.14.0"
  ingress:
    kourier:
      enabled: true
  config:
    # Configure the networking layer
    network:
      ingress-class: kourier.ingress.networking.knative.dev
    # Configure autoscaling defaults
    autoscaler:
      container-concurrency-target-default: "100"
      scale-to-zero-grace-period: "30s"
      stable-window: "60s"
```

## Deploying a Basic Knative Service

```yaml
# apps/knative/hello-world/service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-world
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  template:
    metadata:
      annotations:
        # Set autoscaling parameters
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/target: "50"
    spec:
      containers:
        - image: ghcr.io/myorg/hello-world:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: TARGET
              value: "World"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

## Knative Service with Scale-to-Zero

```yaml
# apps/knative/batch-processor/service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: batch-processor
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # Enable scale-to-zero for cost savings
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "20"
        # Scale based on concurrency
        autoscaling.knative.dev/metric: "concurrency"
        autoscaling.knative.dev/target: "10"
        # Wait 60 seconds of idle before scaling to zero
        autoscaling.knative.dev/scale-to-zero-pod-retention-period: "60s"
    spec:
      # Allow longer startup time for cold starts
      timeoutSeconds: 300
      containers:
        - image: ghcr.io/myorg/batch-processor:v2.1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
```

## Traffic Splitting for Canary Deployments

Split traffic between revisions for gradual rollouts:

```yaml
# apps/knative/api-gateway/service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
spec:
  template:
    metadata:
      # Name this revision explicitly
      name: api-gateway-v2
      annotations:
        autoscaling.knative.dev/minScale: "2"
        autoscaling.knative.dev/maxScale: "30"
    spec:
      containers:
        - image: ghcr.io/myorg/api-gateway:v2.0.0
          ports:
            - containerPort: 8080
  traffic:
    # Send 80% to the stable revision
    - revisionName: api-gateway-v1
      percent: 80
    # Send 20% to the new revision for canary testing
    - revisionName: api-gateway-v2
      percent: 20
    # Tag the latest revision for direct access
    - revisionName: api-gateway-v2
      tag: canary
```

## Flux Kustomization for Knative Apps

```yaml
# clusters/my-cluster/knative-apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: knative-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/knative
  prune: true
  wait: true
  # Wait for Knative Serving to be installed
  dependsOn:
    - name: knative-serving
  # Health checks for Knative services
  healthChecks:
    - apiVersion: serving.knative.dev/v1
      kind: Service
      name: hello-world
      namespace: production
```

## Knative Eventing with Flux

Set up event-driven architectures:

```yaml
# infrastructure/knative/eventing/knative-eventing.yaml
apiVersion: operator.knative.dev/v1beta1
kind: KnativeEventing
metadata:
  name: knative-eventing
  namespace: knative-eventing
spec:
  version: "1.14.0"
```

```yaml
# apps/knative/eventing/broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default-broker
  namespace: production
  annotations:
    # Use the in-memory channel for development
    eventing.knative.dev/broker.class: MTChannelBasedBroker
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: config-br-defaults
    namespace: knative-eventing
```

## Event Triggers and Subscribers

```yaml
# apps/knative/eventing/trigger.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-created-trigger
  namespace: production
spec:
  broker: default-broker
  # Filter events by type
  filter:
    attributes:
      type: com.myorg.order.created
      source: order-service
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: payment-trigger
  namespace: production
spec:
  broker: default-broker
  filter:
    attributes:
      type: com.myorg.payment.completed
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: payment-handler
```

## Knative Service with ConfigMap and Secrets

```yaml
# apps/knative/data-service/service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: data-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
    spec:
      containers:
        - image: ghcr.io/myorg/data-service:v1.5.0
          ports:
            - containerPort: 8080
          envFrom:
            # Load configuration from ConfigMap
            - configMapRef:
                name: data-service-config
            # Load secrets
            - secretRef:
                name: data-service-secrets
          volumeMounts:
            - name: config-volume
              mountPath: /etc/config
              readOnly: true
      volumes:
        - name: config-volume
          configMap:
            name: data-service-files
```

## Environment-Specific Knative Configuration

```yaml
# apps/knative/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - hello-world/service.yaml
  - api-gateway/service.yaml
  - batch-processor/service.yaml
```

```yaml
# apps/knative/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: Service
      group: serving.knative.dev
      name: hello-world
    patch: |
      - op: replace
        path: /spec/template/metadata/annotations/autoscaling.knative.dev~1minScale
        # Production keeps minimum instances warm
        value: "3"
```

## Verifying Knative Deployments

```bash
# List all Knative services
kubectl get ksvc --all-namespaces

# Check the URL for a service
kubectl get ksvc hello-world -n production -o jsonpath='{.status.url}'

# View revisions and traffic split
kubectl get revisions -n production
kubectl describe ksvc api-gateway -n production

# Check Flux reconciliation
flux get kustomizations knative-apps
```

## Best Practices

1. Use explicit revision names when configuring traffic splits
2. Start with `minScale: "1"` in production to avoid cold start latency
3. Set appropriate concurrency targets based on your application's capacity
4. Use Knative Eventing for decoupled, event-driven communication
5. Configure health probes in your containers for reliable scaling decisions
6. Version-control all Knative resources alongside application code

## Conclusion

Deploying Knative services through Flux CD combines the power of serverless computing with GitOps best practices. You get automatic scaling, traffic management, and event-driven architectures while maintaining full version control and auditability. This approach enables teams to deploy and manage serverless workloads with confidence across multiple environments.
