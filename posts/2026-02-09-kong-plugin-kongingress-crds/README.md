# How to Use Kong KongPlugin and KongIngress CRDs for Policy Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kong, API Gateway

Description: Master Kong's Custom Resource Definitions (KongPlugin and KongIngress CRDs) to configure advanced policies, customize proxy behavior, and manage API gateway settings in Kubernetes environments.

---

Kong Ingress Controller extends Kubernetes Ingress capabilities using Custom Resource Definitions (CRDs) that provide fine-grained control over proxy behavior and policy configuration. The two most important CRDs are KongPlugin for adding functionality and KongIngress for customizing proxy settings. This guide will show you how to leverage these CRDs effectively.

## Understanding Kong CRDs

Kong Ingress Controller introduces several CRDs to bridge Kubernetes-native resources with Kong's powerful gateway features. The main CRDs include:

- **KongPlugin**: Defines plugin configurations that can be applied to services, routes, or globally
- **KongIngress**: Customizes proxy behavior for routes, services, and upstreams
- **KongConsumer**: Represents API consumers for authentication
- **KongClusterPlugin**: Global plugins that apply across namespaces
- **TCPIngress**: Layer 4 TCP routing configuration

These CRDs allow you to configure Kong using kubectl and integrate with GitOps workflows.

## Working with KongPlugin CRD

The KongPlugin CRD allows you to configure any Kong plugin and apply it to your services. Each plugin configuration is a Kubernetes resource that can be version controlled and managed like any other Kubernetes object.

### Basic KongPlugin Structure

Here's the anatomy of a KongPlugin resource:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: <plugin-name>
  namespace: <namespace>
spec:
  plugin: <kong-plugin-identifier>
  config:
    <plugin-specific-configuration>
  disabled: false
  protocols:
  - http
  - https
  run_on: first
  ordering:
    before:
      access:
      - <other-plugin-name>
```

### Request Transformation Plugin

Configure request transformation to modify incoming requests:

```yaml
# request-transformer.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: add-headers
  namespace: production
config:
  add:
    headers:
    - "X-Request-ID:$(uuid)"
    - "X-Forwarded-By:kong-gateway"
    querystring:
    - "source:api-gateway"
  remove:
    headers:
    - "X-Internal-Auth"
  replace:
    headers:
    - "User-Agent:Kong-Proxy/2.8"
plugin: request-transformer
```

Apply to a service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: production
  annotations:
    konghq.com/plugins: add-headers
spec:
  selector:
    app: backend-api
  ports:
  - port: 80
    targetPort: 8080
```

### CORS Plugin Configuration

Enable Cross-Origin Resource Sharing (CORS):

```yaml
# cors-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: cors-policy
  namespace: default
config:
  origins:
  - "https://app.example.com"
  - "https://admin.example.com"
  methods:
  - GET
  - POST
  - PUT
  - DELETE
  - PATCH
  - OPTIONS
  headers:
  - Authorization
  - Content-Type
  - X-Custom-Header
  exposed_headers:
  - X-Request-ID
  - X-RateLimit-Remaining
  credentials: true
  max_age: 3600
  preflight_continue: false
plugin: cors
```

### IP Restriction Plugin

Implement IP whitelisting or blacklisting:

```yaml
# ip-restriction.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: internal-only
  namespace: default
config:
  allow:
  - 10.0.0.0/8        # Internal network
  - 172.16.0.0/12     # Docker network
  - 192.168.1.100     # Specific admin IP
  deny:
  - 0.0.0.0/0         # Deny all others
plugin: ip-restriction
```

### Response Caching Plugin

Configure intelligent response caching:

```yaml
# proxy-cache.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: cache-responses
  namespace: default
config:
  strategy: memory           # Use memory cache
  memory:
    dictionary_name: kong_db_cache
  content_type:
  - "application/json"
  - "text/plain"
  cache_ttl: 300            # Cache for 5 minutes
  cache_control: false
  request_method:
  - GET
  - HEAD
  response_code:
  - 200
  - 301
  - 404
  vary_headers:
  - Authorization
  - Accept-Language
plugin: proxy-cache
```

## Working with KongIngress CRD

The KongIngress CRD provides fine-grained control over proxy behavior, route handling, and upstream configuration. It complements standard Kubernetes Ingress resources by adding Kong-specific options.

### KongIngress Structure

A KongIngress resource has three main sections:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: custom-proxy-settings
  namespace: default
route:
  # Route-level configurations
  methods:
  - GET
  - POST
  strip_path: true
  preserve_host: false
  protocols:
  - http
  - https
  https_redirect_status_code: 301
  regex_priority: 0
proxy:
  # Proxy-level configurations
  protocol: http
  connect_timeout: 60000
  read_timeout: 60000
  write_timeout: 60000
  retries: 5
  path: /
upstream:
  # Upstream/load balancing configurations
  algorithm: round-robin
  hash_on: none
  hash_fallback: none
  hash_on_cookie_path: /
  slots: 10000
  healthchecks:
    active:
      healthy:
        interval: 10
        successes: 2
      unhealthy:
        interval: 5
        tcp_failures: 3
        http_failures: 3
    passive:
      healthy:
        successes: 5
      unhealthy:
        tcp_failures: 2
        http_failures: 5
```

### Applying KongIngress to an Ingress

Associate KongIngress with a standard Kubernetes Ingress:

```yaml
# standard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  namespace: default
  annotations:
    konghq.com/override: custom-proxy-settings
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
            name: backend-service
            port:
              number: 80
```

### Custom Timeout Configuration

Configure timeouts for slow backend services:

```yaml
# timeout-config.yaml
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: long-running-timeout
  namespace: default
proxy:
  protocol: http
  connect_timeout: 120000    # 2 minutes
  read_timeout: 300000       # 5 minutes
  write_timeout: 300000      # 5 minutes
  retries: 3
```

Apply to a service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: batch-processor
  namespace: default
  annotations:
    konghq.com/override: long-running-timeout
spec:
  selector:
    app: batch-processor
  ports:
  - port: 80
    targetPort: 8080
```

### Advanced Health Check Configuration

Implement comprehensive health checking:

```yaml
# health-checks.yaml
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: strict-health-checks
  namespace: default
upstream:
  algorithm: consistent-hashing
  hash_on: ip
  hash_fallback: none
  slots: 10000
  healthchecks:
    active:
      type: http
      http_path: /health
      https_verify_certificate: true
      concurrency: 10
      healthy:
        interval: 5
        http_statuses:
        - 200
        - 302
        successes: 2
      unhealthy:
        interval: 3
        http_statuses:
        - 429
        - 500
        - 503
        tcp_failures: 2
        http_failures: 3
        timeouts: 2
    passive:
      type: http
      healthy:
        http_statuses:
        - 200
        - 201
        - 202
        - 203
        - 204
        - 205
        - 206
        - 207
        - 208
        - 226
        - 300
        - 301
        - 302
        - 303
        - 304
        - 305
        - 306
        - 307
        - 308
        successes: 5
      unhealthy:
        http_statuses:
        - 429
        - 500
        - 503
        tcp_failures: 2
        http_failures: 5
        timeouts: 3
```

## Combining KongPlugin and KongIngress

You can apply both plugins and custom proxy settings to create sophisticated configurations:

```yaml
# Complete service configuration
apiVersion: v1
kind: Service
metadata:
  name: production-api
  namespace: production
  annotations:
    konghq.com/override: production-proxy-config
    konghq.com/plugins: rate-limit, auth-plugin, cors-policy, cache-responses
spec:
  selector:
    app: production-api
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: production-proxy-config
  namespace: production
proxy:
  protocol: http
  connect_timeout: 60000
  read_timeout: 60000
  write_timeout: 60000
  retries: 5
upstream:
  algorithm: least-connections
  healthchecks:
    active:
      healthy:
        interval: 10
        successes: 2
      unhealthy:
        interval: 5
        http_failures: 3
```

## Plugin Ordering and Execution

Control plugin execution order using the ordering field:

```yaml
# plugin-ordering.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: custom-auth
  namespace: default
plugin: custom-auth-plugin
ordering:
  before:
    access:
    - rate-limiting     # Run before rate limiting
  after:
    access:
    - cors             # Run after CORS
```

## Global Plugins with KongClusterPlugin

Apply plugins globally across all services using KongClusterPlugin:

```yaml
# global-logging.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: global-http-log
  annotations:
    kubernetes.io/ingress.class: kong
  labels:
    global: "true"
config:
  http_endpoint: http://log-collector.monitoring.svc.cluster.local:8080/logs
  method: POST
  content_type: application/json
  timeout: 10000
  keepalive: 60000
  flush_timeout: 2
  retry_count: 10
plugin: http-log
```

## Testing and Validation

Verify your CRD configurations:

```bash
# List all KongPlugins
kubectl get kongplugins -A

# Check KongIngress resources
kubectl get kongingress -A

# Describe a specific plugin
kubectl describe kongplugin rate-limit -n default

# Validate plugin syntax
kubectl apply --dry-run=client -f plugin.yaml

# Check Kong configuration sync
kubectl logs -n kong -l app.kubernetes.io/name=ingress-kong | grep "successfully synced"
```

## Troubleshooting Common Issues

Common problems and solutions:

**Plugin not applying**: Verify the annotation exactly matches the plugin name:
```bash
# Check annotation
kubectl get service backend-api -o jsonpath='{.metadata.annotations}'

# Verify plugin exists
kubectl get kongplugin rate-limit
```

**Configuration errors**: Check Kong Ingress Controller logs:
```bash
kubectl logs -n kong -l app.kubernetes.io/name=ingress-kong --tail=100
```

**Health checks failing**: Test the health endpoint directly:
```bash
kubectl port-forward service/backend-api 8080:80
curl http://localhost:8080/health
```

## Conclusion

Kong's KongPlugin and KongIngress CRDs provide powerful, Kubernetes-native ways to configure advanced API gateway policies and proxy behavior. By mastering these CRDs, you can build sophisticated API management solutions that integrate seamlessly with your Kubernetes workflows and GitOps practices. The declarative nature of these resources makes configuration reproducible, version-controlled, and easy to manage across multiple environments.
