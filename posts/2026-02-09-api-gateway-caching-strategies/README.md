# How to Configure API Gateway Caching Strategies for Performance Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, Caching, Performance

Description: Implement effective caching strategies in API gateways including response caching, cache invalidation, distributed caching, and conditional requests to optimize performance and reduce backend load.

---

Caching at the API gateway layer reduces backend load, improves response times, and enhances overall system scalability. By caching responses close to clients, you eliminate redundant processing and database queries for frequently accessed data. Modern API gateways provide sophisticated caching capabilities with fine-grained control over what gets cached, for how long, and under what conditions.

## Understanding Gateway Caching

Gateway caching stores HTTP responses in memory or distributed storage based on cache keys derived from request attributes. When identical requests arrive, the gateway returns cached responses without contacting backend services. This works best for read-heavy endpoints serving relatively static or slowly changing data.

Cache keys typically combine the request path, query parameters, and sometimes headers. Two requests with identical cache keys receive the same cached response. Understanding cache key generation is crucial for effective caching strategies.

## NGINX Response Caching

NGINX provides powerful caching capabilities with flexible configuration options.

```nginx
# nginx-cache.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name api.example.com;

    location /api/products {
        proxy_cache api_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_valid 200 304 5m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;

        # Add cache status header for debugging
        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://product-service:8080;
    }

    location /api/users {
        # Don't cache user-specific data
        proxy_cache off;
        proxy_pass http://user-service:8080;
    }
}
```

The `proxy_cache_path` directive creates a cache zone named `api_cache` with 10MB of metadata storage and 1GB of response storage. The `inactive` parameter removes cached items not accessed for 60 minutes.

The `proxy_cache_use_stale` directive serves stale cached responses when backends are unavailable, improving resilience. The `proxy_cache_background_update` directive refreshes stale items asynchronously, ensuring clients always get fast responses.

## Conditional Caching with Variables

Cache selectively based on request attributes.

```nginx
# Cache based on query parameters
map $arg_nocache $skip_cache {
    default 0;
    "1" 1;
}

map $request_method $skip_cache_method {
    default 1;
    GET 0;
    HEAD 0;
}

server {
    location /api/ {
        proxy_cache api_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_valid 200 5m;

        # Skip caching if nocache param is present or method is not GET/HEAD
        proxy_cache_bypass $skip_cache $skip_cache_method;
        proxy_no_cache $skip_cache $skip_cache_method;

        add_header X-Cache-Status $upstream_cache_status;
        proxy_pass http://backend-service:8080;
    }
}
```

This configuration allows clients to bypass cache by adding `?nocache=1` to requests, useful for debugging or forcing fresh data.

## Kong Proxy Caching Plugin

Kong's proxy-cache plugin provides response caching with Redis or in-memory storage.

```bash
# Enable proxy caching with Redis backend
curl -X POST http://kong-admin:8001/plugins \
  --data "name=proxy-cache" \
  --data "config.strategy=redis" \
  --data "config.redis.host=redis.cache.svc.cluster.local" \
  --data "config.redis.port=6379" \
  --data "config.response_code[]=200" \
  --data "config.response_code[]=301" \
  --data "config.response_code[]=404" \
  --data "config.request_method[]=GET" \
  --data "config.request_method[]=HEAD" \
  --data "config.content_type[]=application/json" \
  --data "config.cache_ttl=300" \
  --data "config.cache_control=true"
```

Kong's declarative configuration:

```yaml
# kong-cache-config.yaml
_format_version: "3.0"

plugins:
- name: proxy-cache
  config:
    strategy: redis
    redis:
      host: redis.cache.svc.cluster.local
      port: 6379
      database: 0
      timeout: 2000
    response_code:
    - 200
    - 301
    - 404
    request_method:
    - GET
    - HEAD
    content_type:
    - application/json
    - text/html
    cache_ttl: 300
    cache_control: true
    vary_headers:
    - Accept
    - Accept-Encoding
    vary_query_params:
    - version
    - format

services:
- name: product-service
  url: http://product-service:8080
  routes:
  - name: products-public
    paths:
    - /api/products
  plugins:
  - name: proxy-cache
    config:
      cache_ttl: 600
```

The `cache_control: true` setting respects `Cache-Control` headers from backend services, allowing backends to override default TTL values.

## Vary Headers for Cache Keys

Include request headers in cache keys when responses differ based on headers.

```yaml
# Kong configuration with vary headers
plugins:
- name: proxy-cache
  config:
    vary_headers:
    - Accept-Language
    - Accept-Encoding
    - Authorization
```

This creates separate cache entries for requests with different values for these headers, ensuring clients get appropriate localized or compressed responses.

## Envoy Response Caching

Envoy uses the HTTP cache filter for response caching with configurable validation.

```yaml
# envoy-cache-config.yaml
static_resources:
  listeners:
  - name: main_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          http_filters:
          - name: envoy.filters.http.cache
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.cache.v3.CacheConfig
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.http.cache.simple_http_cache.v3.SimpleHttpCacheConfig
                http_cache_config:
                  max_body_bytes: 1048576
              allowed_vary_headers:
              - match:
                  exact: accept-encoding
              - match:
                  exact: accept-language
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/api/products"
                route:
                  cluster: product_service
                typed_per_filter_config:
                  envoy.filters.http.cache:
                    "@type": type.googleapis.com/envoy.extensions.filters.http.cache.v3.CacheConfig
```

## Cache Invalidation Strategies

Implement cache invalidation to ensure clients receive fresh data after updates.

```nginx
# NGINX cache purge with custom endpoint
location ~ /purge(/.*) {
    allow 10.0.0.0/8;  # Only allow from internal network
    deny all;
    proxy_cache_purge api_cache "$scheme$request_method$host$1";
}
```

Purge cache entries programmatically:

```bash
# Purge specific endpoint
curl -X PURGE http://api-gateway/purge/api/products/123

# Purge with pattern (requires commercial NGINX Plus)
curl -X PURGE http://api-gateway/purge/api/products/*
```

Kong cache invalidation:

```bash
# Invalidate all cached entries for a route
curl -X DELETE http://kong-admin:8001/proxy-cache/route-id

# Invalidate specific cache entry
curl -X DELETE "http://kong-admin:8001/proxy-cache/route-id?cache_key=abc123"
```

## Event-Driven Cache Invalidation

Invalidate cache entries automatically when data changes using event streams.

```python
# cache-invalidator.py
import redis
import requests
from kafka import KafkaConsumer

redis_client = redis.Redis(host='redis', port=6379)
consumer = KafkaConsumer('product-updates', bootstrap_servers='kafka:9092')

for message in consumer:
    product_id = message.value.decode('utf-8')

    # Invalidate NGINX cache
    requests.request(
        'PURGE',
        f'http://api-gateway/purge/api/products/{product_id}'
    )

    # Invalidate Redis cache (Kong)
    pattern = f'*:GET:/api/products/{product_id}*'
    for key in redis_client.scan_iter(match=pattern):
        redis_client.delete(key)

    print(f'Invalidated cache for product {product_id}')
```

## Conditional Requests and ETags

Support conditional requests to minimize bandwidth usage even when cache misses occur.

```nginx
# NGINX ETag support
location /api/ {
    etag on;

    # Handle If-None-Match header
    if ($http_if_none_match = $upstream_http_etag) {
        return 304;
    }

    proxy_pass http://backend-service:8080;
    add_header X-Cache-Status $upstream_cache_status;
}
```

Backend services should include ETag headers:

```python
# Flask example with ETag
from flask import Flask, request, jsonify, make_response
import hashlib

app = Flask(__name__)

@app.route('/api/products/<int:product_id>')
def get_product(product_id):
    product = get_product_from_db(product_id)
    product_json = jsonify(product)

    # Generate ETag from content
    etag = hashlib.md5(product_json.get_data()).hexdigest()

    # Check If-None-Match header
    if request.headers.get('If-None-Match') == etag:
        return '', 304

    response = make_response(product_json)
    response.headers['ETag'] = etag
    response.headers['Cache-Control'] = 'max-age=300'
    return response
```

## Distributed Caching with Redis

Use Redis for shared cache across multiple gateway instances.

```yaml
# redis-cache.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
  namespace: cache
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-cache
  template:
    metadata:
      labels:
        app: redis-cache
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis-cache
  namespace: cache
spec:
  selector:
    app: redis-cache
  ports:
  - port: 6379
    targetPort: 6379
```

## Cache Warming

Pre-populate cache with frequently accessed data to avoid cold start latency.

```bash
# cache-warmer.sh
#!/bin/bash

# List of popular endpoints
ENDPOINTS=(
  "/api/products/featured"
  "/api/products/categories"
  "/api/content/homepage"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Warming cache for $endpoint"
  curl -s "http://api-gateway${endpoint}" > /dev/null
done

echo "Cache warming complete"
```

Schedule cache warming with Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cache-warmer
  namespace: gateway
spec:
  schedule: "*/15 * * * *"  # Every 15 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: warmer
            image: curlimages/curl:latest
            command:
            - sh
            - -c
            - |
              curl -s http://api-gateway/api/products/featured
              curl -s http://api-gateway/api/products/categories
          restartPolicy: OnFailure
```

## Monitoring Cache Performance

Track cache hit rates and performance metrics to optimize caching strategies.

```yaml
# Prometheus queries for cache monitoring

# Cache hit rate
sum(rate(nginx_http_cache_hit[5m])) /
(sum(rate(nginx_http_cache_hit[5m])) + sum(rate(nginx_http_cache_miss[5m])))

# Cache size
nginx_cache_size_bytes

# Stale responses served
rate(nginx_http_cache_stale[5m])
```

Create alerts for low cache hit rates:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cache-alerts
spec:
  groups:
  - name: caching
    rules:
    - alert: LowCacheHitRate
      expr: |
        sum(rate(nginx_http_cache_hit[5m])) /
        (sum(rate(nginx_http_cache_hit[5m])) + sum(rate(nginx_http_cache_miss[5m]))) < 0.5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Cache hit rate below 50%"
```

## Conclusion

API gateway caching significantly improves application performance and reduces backend load. By caching responses at the gateway layer, you eliminate redundant processing for frequently accessed data. Effective caching strategies require careful consideration of what to cache, appropriate TTL values, cache key generation, and invalidation mechanisms. Use distributed caching solutions like Redis for multi-instance gateway deployments, implement event-driven invalidation for real-time consistency, and monitor cache performance metrics to continuously optimize your caching strategy. With proper configuration, gateway caching can handle substantial traffic increases without scaling backend services.
