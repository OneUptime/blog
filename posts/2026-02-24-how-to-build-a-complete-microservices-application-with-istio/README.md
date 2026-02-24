# How to Build a Complete Microservices Application with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Microservices, Kubernetes, Service Mesh, Architecture

Description: Build a production-ready microservices application from scratch with Istio providing traffic management, security, and observability.

---

Building a microservices application with Istio means you get traffic management, security, and observability without baking those concerns into your application code. Instead of every service implementing its own retry logic, TLS, and metrics, the mesh handles all of that. Here's a walkthrough of building a complete application on Istio.

## Application Architecture

We'll build an e-commerce application with these services:

- **Frontend**: Web UI that serves the storefront
- **Product Service**: Manages product catalog
- **Cart Service**: Handles shopping carts
- **Order Service**: Processes orders
- **Payment Service**: Handles payments
- **Notification Service**: Sends emails and notifications

Each service runs in its own Kubernetes deployment with an Istio sidecar.

## Step 1: Set Up the Cluster and Istio

```bash
# Create the cluster
kind create cluster --name ecommerce --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
- role: worker
EOF

# Install Istio
istioctl install --set profile=default -y

# Create the application namespace with sidecar injection
kubectl create namespace ecommerce
kubectl label namespace ecommerce istio-injection=enabled
```

## Step 2: Deploy the Services

### Product Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
  namespace: ecommerce
spec:
  replicas: 2
  selector:
    matchLabels:
      app: product-service
      version: v1
  template:
    metadata:
      labels:
        app: product-service
        version: v1
    spec:
      containers:
      - name: product-service
        image: product-service:v1
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "product-db.ecommerce.svc.cluster.local"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: product-service
  namespace: ecommerce
spec:
  selector:
    app: product-service
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

### Cart Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cart-service
  namespace: ecommerce
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cart-service
      version: v1
  template:
    metadata:
      labels:
        app: cart-service
        version: v1
    spec:
      containers:
      - name: cart-service
        image: cart-service:v1
        ports:
        - containerPort: 8080
        env:
        - name: REDIS_HOST
          value: "cart-redis.ecommerce.svc.cluster.local"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: cart-service
  namespace: ecommerce
spec:
  selector:
    app: cart-service
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

Deploy similar manifests for the other services. The pattern is the same: Deployment + Service, with proper labels and health probes.

## Step 3: Configure the Ingress Gateway

Expose the application through the Istio Ingress Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: ecommerce-gateway
  namespace: ecommerce
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: ecommerce-tls
    hosts:
    - "shop.example.com"
    - "api.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ecommerce-routes
  namespace: ecommerce
spec:
  hosts:
  - "shop.example.com"
  - "api.example.com"
  gateways:
  - ecommerce-gateway
  http:
  - match:
    - uri:
        prefix: /api/products
      headers:
        ":authority":
          exact: api.example.com
    route:
    - destination:
        host: product-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /api/cart
    route:
    - destination:
        host: cart-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /api/orders
    route:
    - destination:
        host: order-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /
      headers:
        ":authority":
          exact: shop.example.com
    route:
    - destination:
        host: frontend
        port:
          number: 3000
```

## Step 4: Add Traffic Management

### Timeouts and Retries

Configure sensible defaults for each service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: product-service
  namespace: ecommerce
spec:
  hosts:
  - product-service
  http:
  - route:
    - destination:
        host: product-service
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: ecommerce
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
    timeout: 30s
    retries:
      attempts: 2
      perTryTimeout: 10s
      retryOn: 5xx,reset,connect-failure
```

Note the different timeout values. Product catalog lookups should be fast, but payment processing can take longer.

### Circuit Breakers

Protect services from cascading failures:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-service
  namespace: ecommerce
spec:
  host: product-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Step 5: Secure the Mesh

### Enforce mTLS

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: ecommerce
spec:
  mtls:
    mode: STRICT
```

### Authorization Policies

Define which services can talk to which:

```yaml
# Only frontend and api gateway can reach product-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: product-service-policy
  namespace: ecommerce
spec:
  selector:
    matchLabels:
      app: product-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/ecommerce/sa/frontend"
        - "cluster.local/ns/ecommerce/sa/order-service"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/products/*"]
---
# Only order-service can reach payment-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-service-policy
  namespace: ecommerce
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/ecommerce/sa/order-service"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/payments"]
```

This implements the principle of least privilege. The notification service can't directly access the payment service, and the product service can't process orders.

## Step 6: Set Up Observability

Enable access logging and tracing:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: ecommerce-telemetry
  namespace: ecommerce
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10
  accessLogging:
  - providers:
    - name: otel
```

## Step 7: Canary Deployments

When deploying a new version, use Istio to gradually shift traffic:

```yaml
# Deploy v2 alongside v1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service-v2
  namespace: ecommerce
spec:
  replicas: 1
  selector:
    matchLabels:
      app: product-service
      version: v2
  template:
    metadata:
      labels:
        app: product-service
        version: v2
    spec:
      containers:
      - name: product-service
        image: product-service:v2
        ports:
        - containerPort: 8080
---
# Route 10% of traffic to v2
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: product-service-canary
  namespace: ecommerce
spec:
  hosts:
  - product-service
  http:
  - route:
    - destination:
        host: product-service
        subset: v1
      weight: 90
    - destination:
        host: product-service
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-service-versions
  namespace: ecommerce
spec:
  host: product-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Monitor error rates and latency for v2 vs v1. If v2 looks good, gradually increase the weight until you're at 100%.

## Validation

After deploying everything, verify the setup:

```bash
# Check all pods are running with sidecars
kubectl get pods -n ecommerce

# Verify configuration
istioctl analyze -n ecommerce

# Check proxy status
istioctl proxy-status

# Test the application
curl -k https://shop.example.com/

# Verify mTLS is working
istioctl authn tls-check product-service.ecommerce.svc.cluster.local
```

This gives you a complete microservices application with traffic management, security, and observability, all handled by the mesh. Your application code stays focused on business logic, and Istio handles the infrastructure concerns.
