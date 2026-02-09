# How to Deploy Ambassador Edge Stack with Rate Limiting and Circuit Breaking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ambassador, API Gateway, Kubernetes

Description: Learn how to deploy Ambassador Edge Stack with rate limiting and circuit breaking to protect backend services from overload and improve API resilience in Kubernetes environments.

---

Ambassador Edge Stack builds on Envoy Proxy to provide advanced traffic management capabilities for Kubernetes. Rate limiting prevents API abuse, while circuit breaking protects backends from cascading failures. Together, these patterns create resilient API infrastructure that degrades gracefully under load.

## Understanding Rate Limiting and Circuit Breaking

**Rate limiting** controls the number of requests allowed per time window. It protects against abuse, enforces quotas, and ensures fair usage across API consumers.

**Circuit breaking** monitors backend health and stops sending requests when failure rates exceed thresholds. This prevents cascading failures where slow or failing services overwhelm dependent systems.

The combination creates a safety net: rate limiting controls inbound load, while circuit breaking manages outbound resilience.

## Installing Ambassador Edge Stack

Deploy Ambassador using Helm:

```bash
# Add Ambassador Helm repository
helm repo add datawire https://app.getambassador.io
helm repo update

# Install Ambassador Edge Stack
kubectl create namespace ambassador
kubectl apply -f https://app.getambassador.io/yaml/edge-stack/3.9.0/aes-crds.yaml

helm install ambassador datawire/edge-stack \
  --namespace ambassador \
  --set enableAES=true
```

Verify installation:

```bash
kubectl get pods -n ambassador
kubectl get svc -n ambassador
```

## Configuring Global Rate Limiting

Ambassador's rate limiting uses a centralized rate limit service based on Envoy's rate limit filter. Deploy the rate limit service:

```yaml
# rate-limit-service.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rate-limit-config
  namespace: ambassador
data:
  rate-limit-config.yaml: |
    domain: ambassador
    descriptors:
      # Global rate limit: 100 requests per minute
      - key: generic_key
        value: global
        rate_limit:
          unit: minute
          requests_per_unit: 100

      # Per-user rate limit: 1000 requests per hour
      - key: user_id
        rate_limit:
          unit: hour
          requests_per_unit: 1000

      # Per-IP rate limit: 50 requests per minute
      - key: remote_address
        rate_limit:
          unit: minute
          requests_per_unit: 50
---
apiVersion: v1
kind: Service
metadata:
  name: rate-limit
  namespace: ambassador
spec:
  selector:
    app: rate-limit
  ports:
  - port: 8081
    targetPort: 8081
    name: grpc
  - port: 6070
    targetPort: 6070
    name: debug
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rate-limit
  namespace: ambassador
spec:
  replicas: 2
  selector:
    matchLabels:
      app: rate-limit
  template:
    metadata:
      labels:
        app: rate-limit
    spec:
      containers:
      - name: rate-limit
        image: envoyproxy/ratelimit:master
        ports:
        - containerPort: 8081
          name: grpc
        - containerPort: 6070
          name: debug
        env:
        - name: USE_STATSD
          value: "false"
        - name: LOG_LEVEL
          value: debug
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.ambassador.svc.cluster.local:6379
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: RUNTIME_WATCH_ROOT
          value: "false"
        volumeMounts:
        - name: config
          mountPath: /data/ratelimit/config
      volumes:
      - name: config
        configMap:
          name: rate-limit-config
```

Deploy Redis as backend for rate limiting:

```yaml
# redis-rate-limit.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: ambassador
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: ambassador
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

Apply the configurations:

```bash
kubectl apply -f redis-rate-limit.yaml
kubectl apply -f rate-limit-service.yaml
```

## Configuring Rate Limiting on Mappings

Configure Ambassador to use the rate limit service:

```yaml
# rate-limit-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: RateLimitService
metadata:
  name: rate-limit
  namespace: ambassador
spec:
  service: rate-limit.ambassador:8081
  protocol_version: v3
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-with-rate-limit
  namespace: default
spec:
  prefix: /api/
  service: backend-api:8080
  labels:
    ambassador:
      - request_label:
        - generic_key:
            value: global
      - request_label:
        - remote_address:
            key: remote_address
```

This configuration applies both global and per-IP rate limits to the `/api/` path.

## Per-User Rate Limiting

Extract user identity from headers or JWT claims:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-user-rate-limit
  namespace: default
spec:
  prefix: /protected/
  service: protected-api:8080
  labels:
    ambassador:
      - request_label:
        - user_id:
            header: X-User-ID
      - request_label:
        - generic_key:
            value: protected
```

Update the rate limit configuration:

```yaml
descriptors:
  - key: user_id
    rate_limit:
      unit: minute
      requests_per_unit: 100
  - key: generic_key
    value: protected
    rate_limit:
      unit: minute
      requests_per_unit: 1000
```

## Implementing Circuit Breaking

Circuit breaking in Ambassador is configured per service using the `CircuitBreaker` resource:

```yaml
# circuit-breaker.yaml
apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: ambassador
spec:
  config:
    circuit_breakers:
    - priority: default
      max_connections: 1024
      max_pending_requests: 1024
      max_requests: 1024
      max_retries: 3
    - priority: high
      max_connections: 2048
      max_pending_requests: 2048
      max_requests: 2048
      max_retries: 5
```

Apply circuit breaking to specific services:

```yaml
# service-with-circuit-breaker.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-circuit-breaker
  namespace: default
spec:
  prefix: /api/
  service: backend-api:8080
  circuit_breakers:
  - priority: default
    max_connections: 100
    max_pending_requests: 100
    max_requests: 100
    max_retries: 3
  # Outlier detection for circuit breaking
  outlier_detection:
    consecutive_5xx: 5  # Open circuit after 5 consecutive errors
    interval: 10s  # Check every 10 seconds
    base_ejection_time: 30s  # Keep circuit open for 30 seconds
    max_ejection_percent: 50  # Max 50% of endpoints can be ejected
    enforcing_consecutive_5xx: 100  # Enforce 100% of the time
```

## Advanced Circuit Breaking Configuration

Configure outlier detection with more granular controls:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: advanced-circuit-breaker
  namespace: default
spec:
  prefix: /critical-api/
  service: critical-backend:8080
  outlier_detection:
    # Consecutive errors
    consecutive_5xx: 3
    consecutive_gateway_failure: 3

    # Success rate based detection
    success_rate_minimum_hosts: 5
    success_rate_request_volume: 100
    success_rate_stdev_factor: 1900  # Standard deviations

    # Timings
    interval: 5s
    base_ejection_time: 60s
    max_ejection_time: 300s

    # Enforcement percentages
    enforcing_consecutive_5xx: 100
    enforcing_consecutive_gateway_failure: 100
    enforcing_success_rate: 100

    # Split external and local origin errors
    split_external_local_origin_errors: true
```

## Combining Rate Limiting and Circuit Breaking

Apply both protections to create resilient APIs:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: protected-resilient-api
  namespace: default
spec:
  prefix: /v1/
  service: backend-v1:8080

  # Rate limiting
  labels:
    ambassador:
      - request_label:
        - generic_key:
            value: v1-api
      - request_label:
        - remote_address:
            key: remote_address

  # Circuit breaking
  circuit_breakers:
  - priority: default
    max_connections: 200
    max_pending_requests: 200
    max_requests: 200
    max_retries: 3

  # Outlier detection
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50

  # Retry policy
  retry_policy:
    retry_on: "5xx"
    num_retries: 3
    per_try_timeout: 2s

  # Timeout configuration
  timeout_ms: 5000
```

## Monitoring Rate Limits and Circuit Breakers

Ambassador exposes Prometheus metrics for monitoring:

```yaml
# prometheus-monitoring.yaml
apiVersion: v1
kind: Service
metadata:
  name: ambassador-metrics
  namespace: ambassador
  labels:
    service: ambassador-metrics
spec:
  selector:
    service: ambassador
  ports:
  - name: metrics
    port: 9102
    targetPort: 9102
```

Query important metrics:

```promql
# Rate limit exceeded count
sum(rate(envoy_cluster_ratelimit_over_limit[5m])) by (cluster_name)

# Circuit breaker trips
sum(rate(envoy_cluster_circuit_breakers_default_rq_open[5m])) by (cluster_name)

# Rejected requests due to circuit breaker
sum(rate(envoy_cluster_circuit_breakers_default_rq_pending_open[5m])) by (cluster_name)

# Outlier detection ejections
sum(rate(envoy_cluster_outlier_detection_ejections_active[5m])) by (cluster_name)
```

Create Grafana dashboards to visualize:
- Rate limit utilization per endpoint
- Circuit breaker state (open/closed)
- Request success rates
- Backend health status

## Testing Rate Limiting

Generate load to trigger rate limits:

```bash
# Get Ambassador service IP
AMBASSADOR_IP=$(kubectl get svc ambassador -n ambassador -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Generate requests to trigger rate limit
for i in {1..200}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://${AMBASSADOR_IP}/api/test
done

# You'll see 200 responses followed by 429 (Too Many Requests)
```

## Testing Circuit Breaking

Simulate backend failures:

```bash
# Deploy a test service that returns errors
kubectl run error-backend --image=nginx --port=80
kubectl expose pod error-backend --port=80

# Configure it to return 500 errors
kubectl exec error-backend -- sh -c 'echo "error_page 404 =500 /50x.html;" > /etc/nginx/conf.d/errors.conf'
kubectl exec error-backend -- nginx -s reload

# Create mapping with circuit breaker
cat <<EOF | kubectl apply -f -
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: test-circuit-breaker
spec:
  prefix: /test/
  service: error-backend:80
  outlier_detection:
    consecutive_5xx: 3
    interval: 5s
    base_ejection_time: 30s
EOF

# Generate requests - circuit should open after 3 failures
for i in {1..10}; do
  curl -i http://${AMBASSADOR_IP}/test/
  sleep 1
done
```

## Custom Rate Limit Responses

Customize the response when rate limits are exceeded:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: ambassador
spec:
  config:
    error_response_overrides:
    - on_status_code: 429
      body:
        content_type: application/json
        json_format:
          error: "Rate limit exceeded"
          retry_after: "%RESPONSE_HEADER(retry-after)%"
          message: "Please slow down your requests"
```

## Best Practices

**Start with generous limits** - Monitor actual traffic patterns before tightening limits to avoid false positives.

**Use Redis clustering** - Deploy Redis in cluster mode for high availability and scalability of rate limiting.

**Set appropriate circuit breaker thresholds** - Too sensitive causes unnecessary circuit trips; too lenient fails to protect backends.

**Monitor ejection rates** - High ejection rates indicate systemic backend problems requiring investigation.

**Implement graceful degradation** - Return cached or default responses when circuits are open.

**Test under load** - Validate rate limits and circuit breakers with realistic traffic patterns before production.

**Alert on circuit breaker state** - Open circuits indicate backend problems requiring immediate attention.

## Conclusion

Ambassador Edge Stack provides production-grade rate limiting and circuit breaking that protect APIs from both external abuse and internal failures. Rate limiting enforces usage policies and prevents overload, while circuit breaking isolates failing services to maintain overall system stability. Together, these patterns create resilient API infrastructure that degrades gracefully under stress. By leveraging Envoy's proven traffic management capabilities through Ambassador's Kubernetes-native configuration, teams gain enterprise-grade reliability without operational complexity.
