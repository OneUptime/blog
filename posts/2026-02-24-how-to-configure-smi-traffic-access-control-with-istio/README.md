# How to Configure SMI Traffic Access Control with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SMI, Traffic Access Control, Kubernetes, Security

Description: Learn how to configure SMI Traffic Access Control policies with Istio to define fine-grained service-to-service communication rules in your mesh.

---

Traffic access control is one of the core capabilities that Service Mesh Interface (SMI) provides. It gives you a way to define which services are allowed to talk to each other, and what kind of traffic is permitted between them. When running Istio as your mesh implementation, SMI TrafficTarget resources get translated into Istio AuthorizationPolicy objects. This gives you a portable way to define access rules while still getting the power of Istio's enforcement engine.

## How SMI Access Control Works

SMI access control revolves around three key resources:

- **TrafficTarget** - the main policy object that ties sources, destinations, and rules together
- **HTTPRouteGroup** - defines what the traffic looks like (HTTP methods, paths, headers)
- **TCPRoute** - defines TCP-level traffic patterns for non-HTTP protocols

The basic model is: a TrafficTarget says "these source identities can send traffic matching these rules to this destination identity." Identity is based on Kubernetes ServiceAccounts, which maps well to how Istio handles workload identity through SPIFFE certificates.

## Prerequisites

You need Istio installed with the SMI adapter running. Make sure your namespace has sidecar injection enabled:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled
```

Install the SMI CRDs and adapter:

```bash
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/adapter.yaml
```

## Setting Up Test Services

Deploy a frontend and backend service with dedicated ServiceAccounts. This is important because SMI access control is identity-based:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: frontend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      serviceAccountName: frontend
      containers:
      - name: frontend
        image: curlimages/curl:7.85.0
        command: ["sleep", "infinity"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-api
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      serviceAccountName: backend-api
      containers:
      - name: backend-api
        image: hashicorp/http-echo:0.2.3
        args: ["-text=hello from backend"]
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
spec:
  selector:
    app: backend-api
  ports:
  - port: 80
    targetPort: 5678
```

Apply this:

```bash
kubectl apply -f services.yaml
```

## Defining HTTP Route Groups

Before creating a TrafficTarget, you need to define what kind of traffic you want to allow. HTTPRouteGroup lets you specify HTTP methods, path prefixes, and headers:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: HTTPRouteGroup
metadata:
  name: api-routes
spec:
  matches:
  - name: health-check
    pathRegex: "/health"
    methods:
    - GET
  - name: read-data
    pathRegex: "/api/v1/.*"
    methods:
    - GET
  - name: write-data
    pathRegex: "/api/v1/.*"
    methods:
    - POST
    - PUT
```

This defines three named route matches. You can reference individual matches or all of them in your TrafficTarget.

## Creating the TrafficTarget

Now create the access control policy that ties everything together:

```yaml
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: backend-api-access
spec:
  destination:
    kind: ServiceAccount
    name: backend-api
    namespace: default
  sources:
  - kind: ServiceAccount
    name: frontend
    namespace: default
  rules:
  - kind: HTTPRouteGroup
    name: api-routes
    matches:
    - health-check
    - read-data
```

This policy says: the `frontend` ServiceAccount can send GET requests to `/health` and `/api/v1/.*` on any workload running with the `backend-api` ServiceAccount. Note that `write-data` is not included in the matches, so POST and PUT requests will be denied.

```bash
kubectl apply -f traffic-target.yaml
```

## What Istio Creates Behind the Scenes

The SMI adapter translates your TrafficTarget into an Istio AuthorizationPolicy. You can see what was created:

```bash
kubectl get authorizationpolicy -o yaml
```

The generated AuthorizationPolicy will look something like this:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-api-access
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/frontend"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/health", "/api/v1/*"]
```

## Testing the Access Control

Test from the frontend pod:

```bash
FRONTEND_POD=$(kubectl get pod -l app=frontend -o jsonpath='{.items[0].metadata.name}')

# This should work - GET to /health
kubectl exec $FRONTEND_POD -- curl -s http://backend-api/health

# This should work - GET to an API path
kubectl exec $FRONTEND_POD -- curl -s http://backend-api/api/v1/items

# This should be denied - POST is not allowed
kubectl exec $FRONTEND_POD -- curl -s -X POST http://backend-api/api/v1/items -d '{"name":"test"}'
```

The POST request should return an RBAC denied response from Istio's enforcement.

## Allowing Multiple Sources

You can add more source services to a TrafficTarget. Say you have a monitoring service that also needs access:

```yaml
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: backend-api-access
spec:
  destination:
    kind: ServiceAccount
    name: backend-api
    namespace: default
  sources:
  - kind: ServiceAccount
    name: frontend
    namespace: default
  - kind: ServiceAccount
    name: monitoring
    namespace: monitoring
  rules:
  - kind: HTTPRouteGroup
    name: api-routes
    matches:
    - health-check
    - read-data
```

## TCP Traffic Access Control

For non-HTTP services like databases or message queues, use TCPRoute:

```yaml
apiVersion: specs.smi-spec.io/v1alpha4
kind: TCPRoute
metadata:
  name: postgres-route
spec:
  matches:
    ports:
    - 5432
---
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: postgres-access
spec:
  destination:
    kind: ServiceAccount
    name: postgres
    namespace: default
  sources:
  - kind: ServiceAccount
    name: backend-api
    namespace: default
  rules:
  - kind: TCPRoute
    name: postgres-route
```

## Default Deny Behavior

An important thing to understand: once you create any TrafficTarget for a destination, traffic from sources that are NOT listed will be denied by default. This is the "default deny" model. If you had other services trying to reach `backend-api`, they would be blocked.

To verify this, try to call the backend from a pod that is not listed as a source:

```bash
kubectl run test-pod --image=curlimages/curl:7.85.0 --command -- sleep infinity
kubectl exec test-pod -- curl -s --max-time 5 http://backend-api/health
```

This should time out or return a denied response.

## Cross-Namespace Access Control

SMI supports cross-namespace access control by specifying the namespace in source and destination references. This is useful in multi-tenant clusters:

```yaml
apiVersion: access.smi-spec.io/v1alpha3
kind: TrafficTarget
metadata:
  name: cross-namespace-access
  namespace: backend
spec:
  destination:
    kind: ServiceAccount
    name: payment-service
    namespace: backend
  sources:
  - kind: ServiceAccount
    name: checkout
    namespace: frontend
  rules:
  - kind: HTTPRouteGroup
    name: payment-routes
    matches:
    - process-payment
```

## Debugging Access Control Issues

When traffic is unexpectedly blocked, check these things:

```bash
# Check if the TrafficTarget was created properly
kubectl describe traffictarget backend-api-access

# Check what AuthorizationPolicy was generated
kubectl get authorizationpolicy -o yaml

# Check the adapter logs for errors
kubectl logs -n istio-system -l app=smi-adapter-istio

# Verify ServiceAccount assignments
kubectl get pod -o custom-columns='NAME:.metadata.name,SA:.spec.serviceAccountName'
```

A common mistake is forgetting to assign the correct ServiceAccount to your pod spec. Without the right ServiceAccount, the identity won't match and traffic gets denied.

## Cleaning Up

Remove the access control resources:

```bash
kubectl delete traffictarget backend-api-access
kubectl delete httproutegroup api-routes
```

SMI Traffic Access Control gives you a clean, portable way to manage service-to-service authorization. It works well for the common cases of allowing or denying traffic based on service identity and HTTP patterns. For more advanced scenarios like header-based authorization or custom conditions, you may need to drop down to Istio-native AuthorizationPolicy resources directly.
