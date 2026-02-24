# How to Deploy Your First Application on Istio Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Deployment, Kubernetes, Beginner, Service Mesh

Description: A beginner-friendly guide to deploying your first real application on Istio with sidecar injection, traffic routing, and basic observability.

---

You have Istio installed and running. Now what? Deploying your first real application onto the mesh is where things get practical. This guide takes you through deploying a multi-service application, configuring ingress, and setting up the basic traffic management and observability features that make Istio worth running.

## Setting Up Your Namespace

Create a dedicated namespace for your application and enable automatic sidecar injection:

```bash
kubectl create namespace my-first-app
kubectl label namespace my-first-app istio-injection=enabled
```

Verify the label:

```bash
kubectl get namespace my-first-app --show-labels | grep istio
```

## Deploying a Backend API

Start with a simple backend service. This example uses a basic REST API:

```yaml
# backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: my-first-app
  labels:
    app: backend-api
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-api
      version: v1
  template:
    metadata:
      labels:
        app: backend-api
        version: v1
    spec:
      containers:
        - name: api
          image: hashicorp/http-echo
          args:
            - "-text=Hello from the backend API v1"
            - "-listen=:8080"
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 50m
              memory: 32Mi
            limits:
              cpu: 200m
              memory: 64Mi
          livenessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 3
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: my-first-app
  labels:
    app: backend-api
spec:
  selector:
    app: backend-api
  ports:
    - port: 8080
      targetPort: 8080
      name: http
```

```bash
kubectl apply -f backend.yaml
```

## Deploying a Frontend

Now add a frontend that calls the backend:

```yaml
# frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: my-first-app
  labels:
    app: frontend
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
      version: v1
  template:
    metadata:
      labels:
        app: frontend
        version: v1
    spec:
      containers:
        - name: frontend
          image: nginx:1.25-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 32Mi
            limits:
              cpu: 200m
              memory: 64Mi
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: my-first-app
  labels:
    app: frontend
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
      name: http
```

```bash
kubectl apply -f frontend.yaml
```

## Verifying Sidecar Injection

Check that your pods have sidecars:

```bash
kubectl get pods -n my-first-app
```

Each pod should show 2/2 in the READY column:

```
NAME                           READY   STATUS    RESTARTS   AGE
backend-api-7c9b5d8f4-abc12   2/2     Running   0          30s
backend-api-7c9b5d8f4-def34   2/2     Running   0          30s
frontend-5d4c6b8f7-ghi56      2/2     Running   0          20s
frontend-5d4c6b8f7-jkl78      2/2     Running   0          20s
```

Confirm the sidecar is present:

```bash
kubectl get pod -n my-first-app -l app=frontend -o jsonpath='{.items[0].spec.containers[*].name}'
```

Output should be: `frontend istio-proxy`

## Configuring Ingress

Create a Gateway to accept external traffic and a VirtualService to route it:

```yaml
# ingress.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: app-gateway
  namespace: my-first-app
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "myapp.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routes
  namespace: my-first-app
spec:
  hosts:
    - "myapp.example.com"
  gateways:
    - app-gateway
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: backend-api
            port:
              number: 8080
    - route:
        - destination:
            host: frontend
            port:
              number: 80
```

```bash
kubectl apply -f ingress.yaml
```

Test it:

```bash
INGRESS_IP=$(kubectl get svc -n istio-system istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test frontend
curl -H "Host: myapp.example.com" http://${INGRESS_IP}/

# Test backend API
curl -H "Host: myapp.example.com" http://${INGRESS_IP}/api
```

## Adding a DestinationRule

Define traffic policies for your services:

```yaml
# destination-rules.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-api
  namespace: my-first-app
spec:
  host: backend-api
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: frontend
  namespace: my-first-app
spec:
  host: frontend
  subsets:
    - name: v1
      labels:
        version: v1
```

```bash
kubectl apply -f destination-rules.yaml
```

## Setting Up Retries and Timeouts

Add resilience to your routing:

```yaml
# resilient-routing.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-internal
  namespace: my-first-app
spec:
  hosts:
    - backend-api
  http:
    - route:
        - destination:
            host: backend-api
            subset: v1
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure,retriable-4xx
```

```bash
kubectl apply -f resilient-routing.yaml
```

## Verifying mTLS

By default, Istio uses mTLS in PERMISSIVE mode (accepts both plain and encrypted). Check the current state:

```bash
kubectl exec -n my-first-app deploy/frontend -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ssl.handshake
```

To enforce strict mTLS:

```yaml
# strict-mtls.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-first-app
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f strict-mtls.yaml
```

Now only encrypted traffic is accepted between services in this namespace.

## Checking Proxy Configuration

See what configuration istiod pushed to your proxies:

```bash
# Check listeners
istioctl proxy-config listener deploy/frontend -n my-first-app

# Check routes
istioctl proxy-config routes deploy/frontend -n my-first-app

# Check clusters (upstream endpoints)
istioctl proxy-config cluster deploy/frontend -n my-first-app

# Check if everything is in sync
istioctl proxy-status
```

## Viewing Access Logs

If your mesh has access logging enabled, check the sidecar logs:

```bash
kubectl logs -n my-first-app deploy/frontend -c istio-proxy --tail=20
```

You will see lines showing every request that passed through the proxy, including response codes and timing.

## Deploying a Second Version

Deploy v2 of the backend:

```yaml
# backend-v2.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api-v2
  namespace: my-first-app
  labels:
    app: backend-api
    version: v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend-api
      version: v2
  template:
    metadata:
      labels:
        app: backend-api
        version: v2
    spec:
      containers:
        - name: api
          image: hashicorp/http-echo
          args:
            - "-text=Hello from the backend API v2"
            - "-listen=:8080"
          ports:
            - containerPort: 8080
```

```bash
kubectl apply -f backend-v2.yaml
```

Update the DestinationRule to include v2:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-api
  namespace: my-first-app
spec:
  host: backend-api
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

Send 10% of traffic to v2:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-internal
  namespace: my-first-app
spec:
  hosts:
    - backend-api
  http:
    - route:
        - destination:
            host: backend-api
            subset: v1
          weight: 90
        - destination:
            host: backend-api
            subset: v2
          weight: 10
```

## Running Analysis

Before wrapping up, check for any configuration issues:

```bash
istioctl analyze -n my-first-app
```

Fix any warnings or errors that come up.

## Wrapping Up

You now have a working multi-service application on Istio with ingress routing, mTLS, traffic splitting, retries, and circuit breaking. The patterns you just set up - DestinationRules for traffic policy, VirtualServices for routing, and PeerAuthentication for security - are the same patterns you will use for any application on the mesh. Start simple, add complexity as needed, and use `istioctl analyze` often to catch misconfigurations early.
