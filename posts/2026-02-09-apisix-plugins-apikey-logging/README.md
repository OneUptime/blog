# How to Implement APISIX Plugins for API Key Authentication and Request Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: APISIX, API Security, Logging

Description: Learn how to configure APISIX plugins for API key authentication and comprehensive request logging, securing APIs while maintaining observability across distributed systems.

---

APISIX's plugin system provides extensible request processing through Lua-based plugins executed in NGINX workers. The key-auth plugin secures APIs with simple token-based authentication, while logging plugins capture detailed request information for audit, debugging, and analytics. These plugins run efficiently at the gateway layer, centralizing security and observability concerns.

## Understanding APISIX Plugins

Plugins execute in a defined order during request processing:

1. Rewrite phase - Modify requests before routing
2. Access phase - Authentication and authorization
3. Before_proxy phase - Pre-proxy modifications
4. Header_filter phase - Modify response headers
5. Body_filter phase - Modify response body
6. Log phase - Logging and metrics

Multiple plugins can run in each phase, with execution order determined by plugin priority.

## Configuring API Key Authentication

Enable the key-auth plugin globally or per-route. First, create a consumer with an API key:

```bash
# Create consumer with API key
curl http://127.0.0.1:9180/apisix/admin/consumers \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -X PUT -d '{
  "username": "mobile-app",
  "plugins": {
    "key-auth": {
      "key": "mobile-app-secret-key-12345"
    }
  }
}'

# Create another consumer
curl http://127.0.0.1:9180/apisix/admin/consumers \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -X PUT -d '{
  "username": "web-app",
  "plugins": {
    "key-auth": {
      "key": "web-app-secret-key-67890"
    }
  }
}'
```

Enable key-auth on a route:

```bash
curl http://127.0.0.1:9180/apisix/admin/routes/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -X PUT -d '{
  "uri": "/api/*",
  "plugins": {
    "key-auth": {}
  },
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "backend-service.default.svc.cluster.local:8080": 1
    }
  }
}'
```

## Using Kubernetes CRDs for API Key Auth

Configure via ApisixConsumer and ApisixRoute CRDs:

```yaml
# api-key-consumer.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixConsumer
metadata:
  name: mobile-app
  namespace: default
spec:
  authParameter:
    keyAuth:
      value:
        key: mobile-app-secret-key-12345
---
apiVersion: apisix.apache.org/v2
kind: ApisixConsumer
metadata:
  name: web-app
  namespace: default
spec:
  authParameter:
    keyAuth:
      value:
        key: web-app-secret-key-67890
```

Store keys in Kubernetes Secrets:

```yaml
# api-key-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-key
  namespace: default
type: Opaque
stringData:
  key: mobile-app-secret-key-12345
---
apiVersion: apisix.apache.org/v2
kind: ApisixConsumer
metadata:
  name: mobile-app-secure
  namespace: default
spec:
  authParameter:
    keyAuth:
      secretRef:
        name: mobile-app-key
```

Enable authentication on routes:

```yaml
# authenticated-route.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: protected-api
  namespace: default
spec:
  http:
  - name: api-with-auth
    match:
      paths:
      - /api/*
    plugins:
    - name: key-auth
      enable: true
    backends:
    - serviceName: backend-service
      servicePort: 8080
```

## Testing API Key Authentication

Test without API key:

```bash
APISIX_IP=$(kubectl get svc apisix-gateway -n apisix -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Request without key (should fail)
curl -i http://${APISIX_IP}/api/data
# HTTP/1.1 401 Unauthorized
# {"message":"Missing API key found in request"}
```

Test with valid API key:

```bash
# Request with valid key (should succeed)
curl -i -H "apikey: mobile-app-secret-key-12345" \
  http://${APISIX_IP}/api/data
# HTTP/1.1 200 OK
```

Custom header name:

```yaml
plugins:
- name: key-auth
  enable: true
  config:
    header: X-API-Key  # Custom header name
```

```bash
curl -H "X-API-Key: mobile-app-secret-key-12345" \
  http://${APISIX_IP}/api/data
```

## HTTP Logger Plugin

Send request logs to HTTP endpoints:

```yaml
# http-logger-route.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: api-with-logging
  namespace: default
spec:
  http:
  - name: logged-api
    match:
      paths:
      - /api/*
    plugins:
    - name: http-logger
      enable: true
      config:
        uri: http://log-collector.default.svc.cluster.local:8080/logs
        batch_max_size: 100
        max_retry_count: 3
        retry_delay: 1
        buffer_duration: 10
        inactive_timeout: 5
        include_req_body: false
        concat_method: json
    backends:
    - serviceName: backend-service
      servicePort: 8080
```

Log format includes:

```json
{
  "request": {
    "url": "http://api.example.com/api/users",
    "method": "GET",
    "headers": {
      "host": "api.example.com",
      "user-agent": "curl/7.68.0"
    },
    "querystring": {}
  },
  "response": {
    "status": 200,
    "headers": {
      "content-type": "application/json"
    }
  },
  "server": {
    "hostname": "apisix-pod-xyz"
  },
  "start_time": 1643723400,
  "latency": 0.045,
  "upstream_latency": 0.042,
  "apisix_latency": 0.003,
  "client_ip": "10.244.0.5",
  "service_id": "1",
  "route_id": "1"
}
```

## File Logger Plugin

Write logs to files:

```yaml
plugins:
- name: file-logger
  enable: true
  config:
    path: /var/log/apisix/access.log
```

Configure log rotation via ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apisix-config
  namespace: apisix
data:
  config.yaml: |
    plugins:
      - file-logger
    plugin_attr:
      file-logger:
        path: /var/log/apisix/access.log
        max_size: 104857600  # 100MB
        max_backups: 5
```

## Syslog Plugin

Send logs to syslog servers:

```yaml
plugins:
- name: syslog
  enable: true
  config:
    host: syslog-server.default.svc.cluster.local
    port: 514
    facility: local7
    severity: info
    max_retry_count: 3
    retry_delay: 1
```

## TCP Logger Plugin

Stream logs via TCP:

```yaml
plugins:
- name: tcp-logger
  enable: true
  config:
    host: log-aggregator.default.svc.cluster.local
    port: 5140
    timeout: 1000
    tls: false
    batch_max_size: 100
```

## Kafka Logger Plugin

Send logs to Kafka:

```yaml
plugins:
- name: kafka-logger
  enable: true
  config:
    broker_list:
      - kafka-broker-1.kafka.svc.cluster.local:9092
      - kafka-broker-2.kafka.svc.cluster.local:9092
    kafka_topic: api-logs
    producer_type: async
    required_acks: 1
    key: route_id
    timeout: 3
    batch_max_size: 200
    buffer_duration: 60
    max_retry_count: 2
    retry_delay: 1
```

## Custom Log Format

Customize logged fields:

```yaml
plugins:
- name: http-logger
  enable: true
  config:
    uri: http://logs.example.com/api
    log_format:
      host: $host
      client_ip: $remote_addr
      request_time: $request_time
      method: $request_method
      uri: $request_uri
      status: $status
      size: $body_bytes_sent
      referer: $http_referer
      user_agent: $http_user_agent
      upstream_addr: $upstream_addr
      upstream_status: $upstream_status
      request_id: $request_id
```

## Combining Auth and Logging

Use both plugins together:

```yaml
# secure-logged-route.yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: secure-api
  namespace: default
spec:
  http:
  - name: protected-logged-api
    match:
      paths:
      - /api/*
    plugins:
    - name: key-auth
      enable: true
    - name: http-logger
      enable: true
      config:
        uri: http://log-collector:8080/logs
        include_req_body: false
        concat_method: json
    backends:
    - serviceName: backend-service
      servicePort: 8080
```

Consumer identity is logged automatically:

```json
{
  "consumer": {
    "consumer_name": "mobile-app"
  },
  "request": {
    "method": "GET",
    "uri": "/api/users"
  }
}
```

## ClickHouse Logger

Send logs to ClickHouse for analytics:

```yaml
plugins:
- name: clickhouse-logger
  enable: true
  config:
    endpoint_addrs:
      - "http://clickhouse:8123"
    database: apisix
    logtable: access_logs
    user: default
    password: ""
    timeout: 3
    batch_max_size: 1000
    inactive_timeout: 5
```

## Best Practices

**Rotate API keys regularly** - Implement key rotation policies and expiration.

**Use Secrets for keys** - Store API keys in Kubernetes Secrets, never in plain YAML.

**Monitor authentication failures** - Alert on repeated 401 responses indicating attacks.

**Sample high-volume logs** - Use sampling for very high traffic endpoints to reduce overhead.

**Buffer logs efficiently** - Configure appropriate batch sizes and timeouts for your log volume.

**Secure log transmission** - Use TLS for log transport to prevent tampering.

**Index logs properly** - Ensure log collectors index relevant fields for fast queries.

**Set log retention policies** - Balance storage costs with compliance requirements.

## Conclusion

APISIX plugins for authentication and logging provide essential API Gateway functionality with minimal performance overhead. The key-auth plugin offers simple, effective authentication suitable for service-to-service communication and programmatic API access. Logging plugins enable comprehensive observability by capturing request details at the gateway layer, centralizing logs from multiple backends. By combining these plugins with APISIX's high performance and flexible configuration, teams can build secure, observable API infrastructures that scale from small deployments to enterprise-scale systems.
