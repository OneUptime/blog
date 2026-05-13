# How to Deploy Argo Events with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Argo Events, Event-Driven, Workflow, Automation

Description: Deploy Argo Events event-driven workflow automation using Flux CD to build Kubernetes-native event pipelines that trigger Argo Workflows, Jobs, and other resources.

---

## Introduction

Argo Events is a Kubernetes-native event-driven workflow automation framework. It provides EventSources (Webhooks, Kafka, S3, GitHub, etc.), an event bus for routing, and Sensors that trigger actions when events match defined conditions. Combined with Argo Workflows, it creates powerful data and CI/CD pipeline automation.

Managing Argo Events through Flux CD ensures the event pipeline infrastructure - EventSources, EventBus, and Sensors - is version-controlled. Adding a new event source or trigger is a pull request, not a manual deployment.

This guide covers deploying Argo Events using Flux CD and building a sample event pipeline that triggers an Argo Workflow on a GitHub webhook.

## Prerequisites

- Kubernetes cluster (1.24+)
- Flux CD v2 bootstrapped to your Git repository
- Optionally: Argo Workflows installed for workflow triggers

## Step 1: Create Namespace and HelmRepository

```yaml
# clusters/my-cluster/argo-events/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: argo-events
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/argo-events/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: argo
  namespace: flux-system
spec:
  interval: 12h
  url: https://argoproj.github.io/argo-helm
```

## Step 2: Deploy Argo Events via HelmRelease

```yaml
# clusters/my-cluster/argo-events/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: argo-events
  namespace: argo-events
spec:
  interval: 1h
  chart:
    spec:
      chart: argo-events
      version: "2.4.*"
      sourceRef:
        kind: HelmRepository
        name: argo
        namespace: flux-system
      interval: 12h
  values:
    # Controller configuration
    controller:
      resources:
        requests:
          cpu: 100m
          memory: 64Mi
        limits:
          cpu: 500m
          memory: 256Mi
      metrics:
        enabled: true
    # JetStream EventBus versions supported by the controller config
    configs:
      jetstream:
        versions:
          - version: 2.10.10
            natsImage: nats:2.10.10
            metricsExporterImage: natsio/prometheus-nats-exporter:0.14.0
            configReloaderImage: natsio/nats-server-config-reloader:0.14.0
            startCommand: /nats-server
```

## Step 3: Create the Flux Kustomization for Argo Events

```yaml
# clusters/my-cluster/argo-events/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-argo-events.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: argo-events
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/argo-events
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: argo-events
      namespace: argo-events
```

## Step 4: Create an EventBus

The EventBus is the messaging backbone for Argo Events:

```yaml
# clusters/my-cluster/argo-events-pipelines/eventbus.yaml
apiVersion: argoproj.io/v1alpha1
kind: EventBus
metadata:
  name: default
  namespace: argo-events
spec:
  jetstream:
    version: 2.10.10
    replicas: 3
    persistence:
      storageClassName: fast-ssd
      accessMode: ReadWriteOnce
      volumeSize: 10Gi
```

## Step 5: Create an EventSource and Sensor

```yaml
# clusters/my-cluster/argo-events-pipelines/webhook-eventsource.yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: webhook
  namespace: argo-events
spec:
  service:
    ports:
      - port: 12000
        targetPort: 12000
  webhook:
    # Listen for GitHub push events
    github-push:
      port: "12000"
      endpoint: /github
      method: POST
---
# clusters/my-cluster/argo-events-pipelines/workflow-sensor.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argo-events-workflow-trigger
  namespace: argo-events
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argo-events-workflow-trigger
  namespace: argo-workflows
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argo-events-workflow-trigger
  namespace: argo-workflows
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argo-events-workflow-trigger
subjects:
  - kind: ServiceAccount
    name: argo-events-workflow-trigger
    namespace: argo-events
---
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: github-workflow-trigger
  namespace: argo-events
spec:
  template:
    serviceAccountName: argo-events-workflow-trigger
  eventBusName: default
  dependencies:
    - name: github-push
      eventSourceName: webhook
      eventName: github-push
  triggers:
    - template:
        name: trigger-ci-workflow
        k8s:
          operation: create
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: ci-build-
                namespace: argo-workflows
              spec:
                entrypoint: build-and-test
                serviceAccountName: argo-workflow-sa
                templates:
                  - name: build-and-test
                    container:
                      image: myregistry/ci-builder:latest
                      command: ["make", "test"]
                      resources:
                        requests:
                          cpu: "1"
                          memory: "2Gi"
```

Add a Kustomization for the pipeline manifests and make it depend on the Argo Events installation:

```yaml
# clusters/my-cluster/argo-events-pipelines/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - eventbus.yaml
  - webhook-eventsource.yaml
  - workflow-sensor.yaml
---
# clusters/my-cluster/flux-kustomization-argo-events-pipelines.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: argo-events-pipelines
  namespace: flux-system
spec:
  dependsOn:
    - name: argo-events
  interval: 10m
  path: ./clusters/my-cluster/argo-events-pipelines
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

## Step 6: Verify the Event Pipeline

```bash
# Check Argo Events and the pipeline Kustomization are running
flux get kustomizations

# Verify EventBus is healthy
kubectl get eventbus -n argo-events

# Check EventSource pod
kubectl get eventsource -n argo-events
kubectl get pods -n argo-events

# Send a test webhook through the generated ClusterIP service
kubectl -n argo-events port-forward svc/webhook-eventsource-svc 12000:12000 &
PF_PID=$!
trap 'kill $PF_PID' EXIT
sleep 2

curl -X POST http://127.0.0.1:12000/github \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main", "repository": {"name": "my-app"}}'

# Check triggered workflow
kubectl get workflows -n argo-workflows
```

## Best Practices

- Use the JetStream EventBus for production (replicated, persistent) rather than the older native NATS Streaming EventBus. If you use native NATS, configure persistence explicitly.
- Store webhook tokens in Kubernetes Secrets and reference them in EventSource `spec.webhook.*.authSecret` for webhook authentication.
- Use `dependsOn` between Flux Kustomizations to ensure Argo Events is installed before creating EventBus, EventSources, and Sensors. Split the EventBus and EventSources/Sensors into separate Kustomizations if you need strict readiness ordering between them.
- Define Sensors with specific `filters` on event data to ensure triggers fire only for the intended events - avoid overly broad dependency matching.
- Monitor the event pipeline with Kubernetes events, pod logs, and Prometheus metrics to detect stuck sensors or failed trigger operations.

## Conclusion

Argo Events deployed and managed through Flux CD provides a powerful, GitOps-governed event-driven automation platform. Every event pipeline - from EventSource to Sensor to triggered action - is defined in Git, making it straightforward to audit, test, and iterate on your event-driven automation workflows without manual cluster access.
