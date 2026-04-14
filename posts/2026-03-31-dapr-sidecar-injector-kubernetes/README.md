# How to Understand the Dapr Sidecar Injector on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar Injector, Kubernetes, Admission Webhook, Control Plane

Description: Learn how the Dapr Sidecar Injector webhook intercepts pod creation, reads Dapr annotations, and automatically adds the daprd sidecar container to your pods.

---

## What Is the Dapr Sidecar Injector?

The Dapr Sidecar Injector is a Kubernetes Mutating Admission Webhook that runs in the `dapr-system` namespace. When a pod with the `dapr.io/enabled: "true"` annotation is created, the injector intercepts the pod creation request and adds the `daprd` container to the pod spec before the pod is scheduled.

```mermaid
sequenceDiagram
    participant Dev as kubectl apply
    participant API as Kubernetes API Server
    participant Injector as Sidecar Injector\n(MutatingWebhookConfiguration)
    participant Sched as Scheduler
    participant Node as Node (kubelet)
    Dev->>API: Create Pod (with dapr.io/enabled: true)
    API->>Injector: Admission review request
    Injector->>Injector: Read dapr.io/* annotations
    Injector->>Injector: Build daprd container spec
    Injector->>API: Mutated pod spec (add daprd container)
    API->>Sched: Schedule mutated pod
    Sched->>Node: Start pod (app + daprd)
```

## How the Webhook Is Registered

The Sidecar Injector registers a `MutatingWebhookConfiguration` in Kubernetes:

```bash
kubectl get mutatingwebhookconfigurations
```

Output includes:

```text
NAME                             WEBHOOKS   AGE
dapr-sidecar-injector            1          30d
```

```bash
kubectl describe mutatingwebhookconfiguration dapr-sidecar-injector
```

The webhook fires on `CREATE` operations for pods. By default, the webhook's `namespaceSelector` is empty, so it applies to all namespaces. Injection only occurs when a pod has the annotation `dapr.io/enabled: "true"`. You can customize the `namespaceSelector` in the Helm values to restrict which namespaces the webhook applies to.

## What the Injector Adds to a Pod

When the injector processes a pod, it adds:

1. The `daprd` sidecar container
2. Environment variables (`DAPR_HTTP_PORT`, `DAPR_GRPC_PORT`, `APP_PROTOCOL`)
3. Volume mounts for certificates and components
4. Liveness (TCP socket) and readiness (HTTP) probes for the sidecar

The resulting pod spec looks like:

```yaml
spec:
  containers:
  - name: order-service     # your app container (unchanged)
    image: myregistry/order-service:latest
  - name: daprd             # injected sidecar
    image: daprio/dapr:1.14.0
    args:
    - /daprd
    - --app-id
    - order-service
    - --app-port
    - "3000"
    - --dapr-http-port
    - "3500"
    - --dapr-grpc-port
    - "50001"
    - --sentry-address
    - dapr-sentry.dapr-system.svc.cluster.local:443
    - --control-plane-address
    - dapr-api.dapr-system.svc.cluster.local:443
    - --placement-host-address
    - dapr-placement-server.dapr-system.svc.cluster.local:50005
    ports:
    - name: dapr-http
      containerPort: 3500
    - name: dapr-grpc
      containerPort: 50001
    - name: dapr-internal
      containerPort: 50002
    - name: dapr-metrics
      containerPort: 9090
    livenessProbe:
      tcpSocket:
        port: 3501
      initialDelaySeconds: 3
      periodSeconds: 6
    readinessProbe:
      httpGet:
        path: /v1.0/healthz
        port: 3501
      initialDelaySeconds: 3
      periodSeconds: 6
```

## Minimal Annotation to Enable Injection

The only required annotation is:

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "order-service"
```

## Restricting Injection to Specific Namespaces

By default, the sidecar injector webhook applies to all namespaces. You can restrict it to specific namespaces by customizing the `namespaceSelector` in the Helm values. For example, to only inject sidecars in namespaces labeled `dapr-injection: enabled`:

```yaml
# Helm values
dapr_sidecar_injector:
  namespaceSelector:
    matchLabels:
      dapr-injection: enabled
```

Then label the target namespace:

```bash
kubectl label namespace default dapr-injection=enabled
```

Note that even with namespace-level filtering, each pod still requires the `dapr.io/enabled: "true"` annotation for the sidecar to be injected.

## Verifying Injection

After deploying a pod with the annotation:

```bash
# Check that the daprd container is present
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].name}'
```

Expected output:

```text
order-service daprd
```

Check that the sidecar is running:

```bash
kubectl logs <pod-name> -c daprd --tail=20
```

## Troubleshooting Injection

### Sidecar Not Injected

1. Verify the annotation is present and correct:

```bash
kubectl describe pod <pod-name> | grep "dapr.io"
```

2. Check if the namespace is excluded:

```bash
kubectl describe mutatingwebhookconfiguration dapr-sidecar-injector | grep -A5 namespaceSelector
```

3. Check the injector logs:

```bash
kubectl logs -n dapr-system -l app=dapr-sidecar-injector --tail=50
```

### Pod Stuck in Init

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name> -c daprd
```

### Sidecar Crashing

```bash
kubectl logs <pod-name> -c daprd
```

## Injector Configuration

The injector is configured through the `dapr-system` ConfigMap or Helm values:

```yaml
# Helm values
dapr_sidecar_injector:
  replicaCount: 1
  image:
    name: daprio/dapr
  resources:
    requests:
      cpu: 100m
      memory: 64Mi
    limits:
      cpu: 500m
      memory: 256Mi
  webhookFailurePolicy: Ignore  # Ignore or Fail
```

Set `webhookFailurePolicy: Ignore` if you want pods to start even when the injector is unavailable (they will start without the sidecar).

## Sidecar Injector in High Availability

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_sidecar_injector.replicaCount=2
```

Multiple replicas of the injector work independently; Kubernetes distributes admission requests across them.

## Summary

The Dapr Sidecar Injector is a Mutating Admission Webhook that intercepts pod creation requests. When a pod carries the `dapr.io/enabled: "true"` annotation, the injector adds the `daprd` container with all required ports, environment variables, probes, and control plane addresses. The injector reads the full set of `dapr.io/*` annotations to configure the injected sidecar. The webhook's namespace scope can be customized via Helm values to restrict which namespaces it applies to.
