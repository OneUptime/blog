# How to Use Dapr Custom Resource Definitions (CRDs)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CRD, Kubernetes, Configuration, Component

Description: Understand and use Dapr's Custom Resource Definitions including Component, Configuration, Resiliency, Subscription, and HTTPEndpoint CRDs to configure Dapr declaratively.

---

## What are Dapr CRDs?

Dapr extends Kubernetes using Custom Resource Definitions (CRDs) to declare its configuration declaratively alongside application manifests. Instead of using config files or environment variables, Dapr resources are native Kubernetes objects that benefit from version control, RBAC, and GitOps workflows.

## The Core Dapr CRDs

List all Dapr CRDs installed in your cluster:

```bash
kubectl get crd | grep dapr
```

Output:
```text
components.dapr.io
configurations.dapr.io
resiliencies.dapr.io
subscriptions.dapr.io
httpendpoints.dapr.io
```

## Component CRD

Declares a Dapr building block (state store, pub/sub, binding, secret store):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

Apply it with `kubectl apply -f statestore.yaml`.

## Configuration CRD

Controls Dapr runtime behavior per application or namespace:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
  mtls:
    enabled: true
  features:
  - name: HotReload
    enabled: true
```

Reference in a deployment:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Resiliency CRD

Defines retry, timeout, and circuit breaker policies:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
  namespace: default
spec:
  policies:
    retries:
      retryForever:
        policy: exponential
        maxInterval: 15s
        maxRetries: -1
    timeouts:
      fast: 3s
    circuitBreakers:
      simpleCB:
        maxRequests: 1
        interval: 30s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      orders-api:
        retry: retryForever
        timeout: fast
        circuitBreaker: simpleCB
```

## Subscription CRD

Declares a pub/sub topic subscription declaratively:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-sub
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/process
```

## HTTPEndpoint CRD

Names an external HTTP service so apps can invoke it via Dapr service invocation:

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: payments-service
  namespace: default
spec:
  baseUrl: "https://api.payments.example.com"
  headers:
  - name: Authorization
    secretKeyRef:
      name: payments-api-key
      key: token
```

Invoke via Dapr:

```bash
curl http://localhost:3500/v1.0/invoke/payments-service/method/charge
```

## Viewing CRD Status

```bash
# View all Dapr resources in a namespace
kubectl get components,configurations,resiliencies,subscriptions,httpendpoints -n default
```

## Summary

Dapr CRDs - Component, Configuration, Resiliency, Subscription, and HTTPEndpoint - are the primary mechanism for configuring Dapr behavior declaratively in Kubernetes. They integrate naturally with kubectl, Helm, and GitOps workflows, enabling infrastructure-as-code for all Dapr building blocks with namespace-scoped isolation and Kubernetes RBAC enforcement.
