# How to Configure Kong KongPlugin CRD for Rate Limiting and Request Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kong, Kubernetes, API Gateway

Description: Learn how to use Kong's Kubernetes CRDs to configure rate limiting and request transformation plugins declaratively, managing API policies as native Kubernetes resources.

---

Kong for Kubernetes integrates deeply with Kubernetes through Custom Resource Definitions that represent Kong entities as native Kubernetes objects. The KongPlugin CRD allows you to configure Kong plugins declaratively, managing rate limiting, transformations, authentication, and other API policies using standard kubectl commands and GitOps workflows.

## Understanding Kong Kubernetes CRDs

Kong provides several CRDs that map to its core concepts:

**Ingress** - Standard Kubernetes Ingress with Kong-specific annotations
**KongPlugin** - Configures Kong plugins (rate-limiting, CORS, transformations)
**KongConsumer** - Defines API consumers for authentication
**KongCredential** - Stores credentials (API keys, JWT secrets)
**KongClusterPlugin** - Cluster-wide plugin configuration

These CRDs transform Kong configuration from imperative Admin API calls into declarative Kubernetes manifests, enabling infrastructure-as-code practices and GitOps deployment models.

## Installing Kong Ingress Controller

The Kong Ingress Controller watches Kubernetes resources and translates them into Kong configuration. Deploy it using Helm:

```bash
# Add Kong Helm repository
helm repo add kong https://charts.konghq.com
helm repo update

# Install Kong Ingress Controller
helm install kong kong/kong \
  --namespace kong \
  --create-namespace \
  --set ingressController.enabled=true \
  --set ingressController.installCRDs=true \
  --set proxy.type=LoadBalancer
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep konghq
```

You should see CRDs like `kongplugins.configuration.konghq.com` and `kongconsumers.configuration.konghq.com`.

## Configuring Rate Limiting with KongPlugin

Rate limiting protects your APIs from abuse and ensures fair usage. Kong's rate-limiting plugin supports multiple strategies and scopes.

Create a basic rate limiting plugin:

```yaml
# rate-limit-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-5-per-minute
  namespace: default
config:
  minute: 5
  policy: local
  limit_by: ip
  hide_client_headers: false
plugin: rate-limiting
```

Apply the plugin:

```bash
kubectl apply -f rate-limit-plugin.yaml
```

Attach the plugin to an Ingress:

```yaml
# api-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: default
  annotations:
    konghq.com/plugins: rate-limit-5-per-minute
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-api
            port:
              number: 8080
```

Now requests to `api.example.com/api` are limited to 5 per minute per IP address.

## Advanced Rate Limiting Configurations

Configure tiered rate limits for different endpoints:

```yaml
# rate-limit-strict.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-strict
  namespace: default
config:
  second: 10
  minute: 100
  hour: 1000
  policy: redis
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
    database: 0
  limit_by: consumer
  hide_client_headers: false
plugin: rate-limiting
---
# rate-limit-relaxed.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-relaxed
  namespace: default
config:
  minute: 1000
  hour: 10000
  policy: redis
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
  limit_by: consumer
plugin: rate-limiting
```

Apply different limits to different routes:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress-tiered
  namespace: default
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      # Public endpoints: strict limits
      - path: /public
        pathType: Prefix
        backend:
          service:
            name: public-api
            port:
              number: 8080
        pathType: Prefix
      # Premium endpoints: relaxed limits
      - path: /premium
        pathType: Prefix
        backend:
          service:
            name: premium-api
            port:
              number: 8080
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: public-rate-limit
  namespace: default
config:
  minute: 100
  policy: redis
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
plugin: rate-limiting
```

To apply plugins to specific paths, use Kong's service matching:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: public-api
  namespace: default
  annotations:
    konghq.com/plugins: public-rate-limit
spec:
  selector:
    app: public-api
  ports:
  - port: 8080
```

## Request Transformation Plugins

Kong's request-transformer plugin modifies request headers, query parameters, and body before forwarding to upstream services.

Add authentication headers to upstream requests:

```yaml
# add-auth-header-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: add-auth-header
  namespace: default
config:
  add:
    headers:
    - "X-Internal-Auth: secret-token"
    - "X-Request-ID: $(uuid)"
  remove:
    headers:
    - "X-Forwarded-For"
  replace:
    headers:
    - "Host: internal-backend.local"
plugin: request-transformer
```

Transform request paths:

```yaml
# path-transformer-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: path-transformer
  namespace: default
config:
  add:
    querystring:
    - "api_version: v2"
  rename:
    headers:
    - "Authorization: X-Auth-Token"
  remove:
    querystring:
    - "debug"
plugin: request-transformer
```

Apply multiple transformations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: transformed-api
  namespace: default
  annotations:
    konghq.com/plugins: add-auth-header, path-transformer
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8080
```

## Response Transformation

Modify responses before returning to clients:

```yaml
# response-transformer-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: response-transformer
  namespace: default
config:
  add:
    headers:
    - "X-API-Version: 2.0"
    - "X-Response-Time: $(latency)"
    json:
    - "api_version: 2.0"
  remove:
    headers:
    - "Server"
    - "X-Powered-By"
  replace:
    headers:
    - "Cache-Control: no-cache, no-store, must-revalidate"
plugin: response-transformer
```

## Combining Plugins with Priority

When multiple plugins are applied, execution order matters. Kong uses plugin priority to determine sequence:

```yaml
# Combined plugin configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-plugin-api
  namespace: default
  annotations:
    # Plugins execute in this order based on their built-in priorities:
    # 1. cors (2000)
    # 2. rate-limiting (901)
    # 3. request-transformer (801)
    # 4. response-transformer (800)
    konghq.com/plugins: cors-plugin, rate-limit-5-per-minute, add-auth-header, response-transformer
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

Define custom execution priority (Kong Enterprise):

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: custom-priority-plugin
  namespace: default
config:
  # Plugin-specific configuration
plugin: custom-plugin
priority: 1000  # Higher priority executes first
```

## Using KongClusterPlugin for Global Policies

Apply plugins globally across all routes using KongClusterPlugin:

```yaml
# global-cors-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: global-cors
  labels:
    global: "true"
config:
  origins:
  - "*"
  methods:
  - GET
  - POST
  - PUT
  - DELETE
  - PATCH
  - OPTIONS
  headers:
  - Accept
  - Authorization
  - Content-Type
  - X-Request-ID
  exposed_headers:
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  credentials: true
  max_age: 3600
plugin: cors
```

Apply globally by adding annotation to KongIngress:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: global-settings
  annotations:
    kubernetes.io/ingress.class: kong
proxy:
  plugins:
  - global-cors
```

## Conditional Plugin Execution

Enable plugins based on headers or paths using Kong's advanced routing:

```yaml
# conditional-rate-limit.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: conditional-rate-limit
  namespace: default
config:
  minute: 100
  policy: local
  limit_by: header
  header_name: X-API-Key
  # Only rate limit if X-API-Key header is present
plugin: rate-limiting
```

## Plugin Configuration from Secrets

Store sensitive plugin configuration in Kubernetes Secrets:

```yaml
# redis-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-credentials
  namespace: default
type: Opaque
stringData:
  host: redis.default.svc.cluster.local
  port: "6379"
  password: "redispassword"
---
# rate-limit-with-secret.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-redis-secret
  namespace: default
config:
  minute: 1000
  policy: redis
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
    password:
      valueFrom:
        secretKeyRef:
          name: redis-credentials
          key: password
plugin: rate-limiting
```

## Monitoring Plugin Effectiveness

View rate limiting in action:

```bash
# Make repeated requests to trigger rate limit
for i in {1..10}; do
  curl -i http://api.example.com/api
  sleep 1
done

# Check rate limit headers in response
# X-RateLimit-Limit-Minute: 5
# X-RateLimit-Remaining-Minute: 3
```

When rate limit is exceeded, Kong returns HTTP 429:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit-Minute: 5
X-RateLimit-Remaining-Minute: 0
Retry-After: 42

{"message":"API rate limit exceeded"}
```

Monitor plugin metrics using Prometheus:

```yaml
# prometheus-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: prometheus
config:
  per_consumer: true
plugin: prometheus
```

Query Kong metrics:

```bash
# Get Prometheus metrics
kubectl port-forward -n kong svc/kong-proxy 8100:8100
curl http://localhost:8100/metrics
```

## Best Practices

**Use Redis for distributed rate limiting** - Local policy works for single nodes, but Redis enables consistent limits across all Kong replicas.

**Start with conservative limits** - Begin with higher limits and reduce based on monitoring data to avoid disrupting legitimate users.

**Combine rate limiting with caching** - Use Kong's caching plugins to reduce upstream load and allow higher rate limits.

**Monitor bypass attempts** - Alert on repeated 429 responses from the same IPs.

**Document plugin configurations** - Maintain clear documentation of which plugins apply to which routes.

**Version control CRDs** - Store all KongPlugin manifests in Git for audit trails and rollback capability.

**Test plugin impacts** - Verify transformations don't break client expectations before production deployment.

## Conclusion

Kong's Kubernetes CRDs transform API gateway management into a declarative, version-controlled process. By representing rate limiting, transformations, and other policies as native Kubernetes resources, you gain all the benefits of infrastructure-as-code: reproducibility, auditability, and automated deployment pipelines. The KongPlugin CRD specifically enables granular control over API behavior without manual Admin API configuration, making Kong an ideal choice for teams practicing GitOps and seeking to manage API policies alongside application code.
