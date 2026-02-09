# How to Set Up K3s with Traefik for Edge API Gateway with Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, K3s, Traefik, Edge Computing, API Gateway

Description: Learn how to configure K3s with Traefik as an edge API gateway with built-in rate limiting for resource-constrained environments and edge deployments.

---

K3s ships with Traefik as the default ingress controller, making it an excellent choice for edge API gateway deployments. When you combine K3s's lightweight footprint with Traefik's powerful routing and middleware capabilities, you get a production-ready edge gateway that includes rate limiting out of the box.

In this guide, we'll configure K3s with Traefik to serve as an edge API gateway with rate limiting capabilities. This setup is perfect for edge locations, IoT gateways, and resource-constrained environments where you need robust API management without the overhead of heavy gateway solutions.

## Understanding K3s and Traefik Integration

K3s automatically installs and configures Traefik during cluster initialization. Unlike standard Kubernetes distributions where you manually install an ingress controller, K3s handles this for you. The default Traefik installation includes the core functionality needed for API gateway operations, including routing, middleware, and service mesh capabilities.

Traefik operates as both an ingress controller and an API gateway. It watches Kubernetes resources and automatically configures routes based on IngressRoute custom resources. The middleware system in Traefik allows you to add rate limiting, authentication, circuit breakers, and other API gateway features to your routes.

## Installing K3s with Traefik

Start by installing K3s on your edge node. K3s requires minimal system resources, making it suitable for edge deployments running on devices with 512MB RAM or more.

```bash
# Install K3s with default Traefik ingress
curl -sfL https://get.k3s.io | sh -

# Verify K3s is running
sudo systemctl status k3s

# Check that Traefik is deployed
kubectl get pods -n kube-system | grep traefik

# Get kubeconfig for kubectl access
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config
```

The default installation creates a Traefik deployment in the kube-system namespace. This deployment runs with a minimal resource footprint suitable for edge environments.

## Configuring Traefik for API Gateway Operations

While K3s installs Traefik automatically, you need to customize it for API gateway use cases. Create a HelmChartConfig resource to modify Traefik's configuration without reinstalling K3s.

```yaml
# traefik-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    # Enable Traefik dashboard for monitoring
    dashboard:
      enabled: true
      domain: traefik.local

    # Configure ports for API gateway
    ports:
      web:
        port: 80
        exposedPort: 80
      websecure:
        port: 443
        exposedPort: 443
      metrics:
        port: 9100
        exposedPort: 9100

    # Enable access logs for API gateway monitoring
    logs:
      access:
        enabled: true
        format: json

    # Configure middleware plugins
    experimental:
      plugins:
        enabled: true

    # Resource limits for edge deployment
    resources:
      requests:
        cpu: "100m"
        memory: "50Mi"
      limits:
        cpu: "500m"
        memory: "250Mi"
```

Apply this configuration to update Traefik's settings:

```bash
kubectl apply -f traefik-config.yaml

# Wait for Traefik to restart with new config
kubectl rollout status deployment/traefik -n kube-system
```

## Implementing Rate Limiting Middleware

Traefik includes built-in rate limiting middleware that you can apply to any route. Rate limiting at the edge prevents downstream services from being overwhelmed and protects against abuse.

Create a RateLimit middleware that enforces request limits per client:

```yaml
# rate-limit-middleware.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: default
spec:
  rateLimit:
    # Average requests per second
    average: 100
    # Maximum burst size
    burst: 50
    # Time period for rate calculation
    period: 1s
    # Source for rate limit identification (IP address)
    sourceCriterion:
      ipStrategy:
        depth: 1
```

This configuration allows 100 requests per second on average with burst capacity for 50 additional requests. The `sourceCriterion` uses the client IP address for rate limit enforcement.

Apply the middleware:

```bash
kubectl apply -f rate-limit-middleware.yaml
```

## Creating API Gateway Routes with Rate Limiting

Deploy a sample API service and configure an IngressRoute that applies rate limiting. This demonstrates how to expose backend services through the Traefik gateway with protection.

```yaml
# api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-backend
  namespace: default
spec:
  selector:
    app: api-backend
  ports:
    - port: 8080
      targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-backend
  template:
    metadata:
      labels:
        app: api-backend
    spec:
      containers:
      - name: api
        image: hashicorp/http-echo:latest
        args:
          - "-text=API Response"
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "50m"
            memory: "32Mi"
          limits:
            cpu: "200m"
            memory: "128Mi"
```

Now create the IngressRoute with rate limiting:

```yaml
# api-ingress-route.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: api-gateway
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`api.edge.local`) && PathPrefix(`/api`)
    kind: Rule
    services:
    - name: api-backend
      port: 8080
    middlewares:
    - name: rate-limit
```

Deploy both resources:

```bash
kubectl apply -f api-service.yaml
kubectl apply -f api-ingress-route.yaml
```

## Advanced Rate Limiting Strategies

For more sophisticated API gateway scenarios, implement different rate limits for different routes or API endpoints. Create multiple middleware instances with varying limits:

```yaml
# tiered-rate-limits.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: rate-limit-public
  namespace: default
spec:
  rateLimit:
    average: 10
    burst: 5
    period: 1s
---
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: rate-limit-premium
  namespace: default
spec:
  rateLimit:
    average: 1000
    burst: 200
    period: 1s
```

Apply different rate limits based on request paths or headers:

```yaml
# multi-tier-ingress.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: api-gateway-tiered
  namespace: default
spec:
  entryPoints:
    - web
  routes:
  # Public API with strict limits
  - match: Host(`api.edge.local`) && PathPrefix(`/public`)
    kind: Rule
    services:
    - name: api-backend
      port: 8080
    middlewares:
    - name: rate-limit-public
  # Premium API with higher limits
  - match: Host(`api.edge.local`) && PathPrefix(`/premium`)
    kind: Rule
    services:
    - name: api-backend
      port: 8080
    middlewares:
    - name: rate-limit-premium
```

## Monitoring Rate Limit Metrics

Traefik exposes Prometheus metrics that include rate limiting information. Enable metrics collection to monitor rate limit enforcement:

```yaml
# metrics-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: traefik-metrics
  namespace: kube-system
  labels:
    app: traefik
spec:
  selector:
    app.kubernetes.io/name: traefik
  ports:
  - name: metrics
    port: 9100
    targetPort: 9100
```

Access rate limit metrics at the Traefik metrics endpoint:

```bash
# Forward metrics port locally
kubectl port-forward -n kube-system svc/traefik-metrics 9100:9100

# Query rate limit metrics
curl http://localhost:9100/metrics | grep rate
```

Key metrics to monitor include `traefik_service_requests_total` and `traefik_entrypoint_requests_total` which show request counts that you can correlate with rate limit configurations.

## Testing Rate Limit Enforcement

Verify that rate limiting works correctly by generating traffic that exceeds configured limits:

```bash
# Test rate limiting with multiple requests
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Host: api.edge.local" \
    http://EDGE_NODE_IP/api
  sleep 0.01
done
```

When rate limits are exceeded, Traefik returns HTTP 429 (Too Many Requests) responses. Monitor the response codes to verify enforcement.

## Combining Rate Limiting with Other Middleware

Traefik's middleware chain allows you to combine rate limiting with authentication, circuit breakers, and other API gateway features. Stack multiple middleware components:

```yaml
# combined-middleware.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: api-protection
  namespace: default
spec:
  chain:
    middlewares:
    - name: rate-limit
    - name: auth-headers
    - name: compression
```

This approach creates comprehensive API gateway protection at the edge without requiring separate gateway infrastructure.

## Conclusion

K3s with Traefik provides a complete edge API gateway solution with rate limiting capabilities in a lightweight package. The default Traefik installation in K3s requires minimal configuration to function as an API gateway, while the middleware system enables sophisticated rate limiting strategies.

This setup works well for edge deployments where you need API gateway functionality without the resource overhead of enterprise API management platforms. The combination of K3s's efficiency and Traefik's flexibility makes it suitable for IoT gateways, edge computing nodes, and distributed API infrastructures.

For production edge deployments, consider implementing TLS termination, authentication middleware, and comprehensive monitoring alongside rate limiting to create a robust API gateway layer at the edge of your network.
