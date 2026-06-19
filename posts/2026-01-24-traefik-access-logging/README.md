# How to Configure Access Logging in Traefik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traefik, Logging, Observability, Monitoring, DevOps

Description: Set up access logging in Traefik with custom formats, filtering, and integration with log aggregation systems for comprehensive request visibility.

---

Access logs record every request that passes through your proxy. They are essential for debugging issues, analyzing traffic patterns, and meeting compliance requirements. Traefik provides flexible access logging with customizable formats, filtering options, and various output destinations.

This guide covers configuring Traefik access logs from basic setup to production-ready configurations with JSON formatting and log shipping.

## Enabling Access Logs

Access logging is disabled by default. Enable it in Traefik's static configuration:

```yaml
# traefik-config.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    # Enable access logging
    accessLog: {}

    # Entry points
    entryPoints:
      web:
        address: ":80"
      websecure:
        address: ":443"

    providers:
      kubernetesCRD: {}
```

With the default configuration, logs go to stdout in Traefik's extended Common Log Format:

```text
10.0.0.1 - - [25/Jan/2026:10:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0" 1 "api-router@kubernetescrd" "https://10.1.0.5:8080" 45ms
```

## JSON Log Format

For log aggregation systems, JSON format is much easier to parse:

```yaml
# traefik-json-logs.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      # Output format: json, common, or genericCLF
      format: json

      # Fields to include in each log entry
      fields:
        defaultMode: keep
        names:
          ClientUsername: drop  # Remove sensitive data
        headers:
          defaultMode: keep
          names:
            Authorization: drop  # Never log auth headers
            Cookie: drop         # Don't log cookies

    entryPoints:
      web:
        address: ":80"
      websecure:
        address: ":443"
```

JSON output looks like this:

```json
{
  "ClientAddr": "10.0.0.1:54321",
  "ClientHost": "10.0.0.1",
  "ClientPort": "54321",
  "DownstreamContentSize": 1234,
  "DownstreamStatus": 200,
  "Duration": 45678900,
  "RequestAddr": "api.example.com",
  "RequestHost": "api.example.com",
  "RequestMethod": "GET",
  "RequestPath": "/api/users",
  "RequestProtocol": "HTTP/1.1",
  "ServiceAddr": "10.1.0.5:8080",
  "ServiceName": "api-service@kubernetes",
  "StartUTC": "2026-01-25T10:00:00.000000000Z",
  "entryPointName": "websecure",
  "level": "info",
  "msg": "",
  "time": "2026-01-25T10:00:00Z"
}
```

## Logging to Files

For systems that ship logs from files, configure a file destination:

```yaml
# traefik-file-logs.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      filePath: /var/log/traefik/access.log
      format: json
      bufferingSize: 100  # Buffer this many entries before writing
```

Mount a volume for log persistence:

```yaml
# traefik-deployment-logs.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  namespace: traefik
spec:
  template:
    spec:
      containers:
        - name: traefik
          volumeMounts:
            - name: logs
              mountPath: /var/log/traefik
      volumes:
        - name: logs
          emptyDir: {}
        # Or use persistent storage
        # - name: logs
        #   persistentVolumeClaim:
        #     claimName: traefik-logs
```

## Field Selection and Filtering

Control which fields appear in logs:

```yaml
# field-selection.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      format: json
      fields:
        # Default behavior for standard fields
        defaultMode: keep

        # Override specific fields
        names:
          ClientHost: keep       # Always include
          ClientPort: drop       # Never include
          RequestCount: keep     # Include request count
          Duration: keep         # Include timing

        # Control header logging
        headers:
          defaultMode: drop      # Don't log headers by default
          names:
            User-Agent: keep     # Keep user agent
            X-Request-ID: keep   # Keep request correlation ID
            Content-Type: keep   # Keep content type
            Authorization: drop  # Never log auth
```

## Filtering Requests

Use status-code and duration filters to reduce noise:

```yaml
# log-filtering.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      format: json
      filters:
        # Only log requests that took longer than 10ms
        minDuration: 10ms

        # Only log certain status codes
        statusCodes:
          - "200-299"
          - "400-499"
          - "500-599"

        # Retry attempts get logged separately
        retryAttempts: true
```

For more selective filtering, disable access logs on specific routers:

```yaml
# selective-logging.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: health-check
  namespace: default
spec:
  entryPoints:
    - web
  routes:
    - match: Path(`/healthz`)
      kind: Rule
      observability:
        accessLogs: false
      services:
        - name: health-service
          port: 80
```

## Adding Custom Fields

Include application-specific data in logs:

```yaml
# custom-fields.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      format: json
      fields:
        defaultMode: keep
        headers:
          defaultMode: drop
          names:
            # Log correlation ID from upstream
            X-Request-ID: keep
            # Log tenant identifier
            X-Tenant-ID: keep
            # Log authenticated user
            X-User-ID: keep
```

Your application or authentication middleware should set these headers.

## Log Rotation

When writing to files, configure rotation to manage disk space:

```yaml
# log-rotation.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      filePath: /var/log/traefik/access.log
      format: json
```

Use a sidecar container for log rotation. Make sure the rotation tool either sends Traefik a `USR1` signal after rotating the file or uses a copy/truncate strategy:

```yaml
# sidecar-rotation.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  namespace: traefik
spec:
  template:
    spec:
      containers:
        - name: traefik
          # ... traefik config ...
          volumeMounts:
            - name: logs
              mountPath: /var/log/traefik

        # Log rotation sidecar
        - name: logrotate
          image: blacklabelops/logrotate
          env:
            - name: LOGS_DIRECTORIES
              value: /var/log/traefik
            - name: LOGROTATE_SIZE
              value: 100M
            - name: LOGROTATE_CRONSCHEDULE
              value: "0 * * * *"
          volumeMounts:
            - name: logs
              mountPath: /var/log/traefik

      volumes:
        - name: logs
          emptyDir: {}
```

## Shipping Logs to Aggregation Systems

### Using Fluentd Sidecar

```yaml
# fluentd-sidecar.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  namespace: traefik
spec:
  template:
    spec:
      containers:
        - name: traefik
          volumeMounts:
            - name: logs
              mountPath: /var/log/traefik

        - name: fluentd
          image: fluent/fluentd:v1.16
          volumeMounts:
            - name: logs
              mountPath: /var/log/traefik
              readOnly: true
            - name: fluentd-position
              mountPath: /fluentd/pos
            - name: fluentd-config
              mountPath: /fluentd/etc

      volumes:
        - name: logs
          emptyDir: {}
        - name: fluentd-position
          emptyDir: {}
        - name: fluentd-config
          configMap:
            name: fluentd-config

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: traefik
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/traefik/access.log
      pos_file /fluentd/pos/access.log.pos
      tag traefik.access
      <parse>
        @type json
      </parse>
    </source>

    <match traefik.**>
      @type elasticsearch
      host elasticsearch.logging.svc
      port 9200
      index_name traefik-access
    </match>
```

### Using stdout with Kubernetes Logging

The simplest approach for Kubernetes is logging to stdout and using your cluster's logging solution:

```yaml
# stdout-logging.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      # No filePath means stdout
      format: json
      fields:
        defaultMode: keep
```

Kubernetes captures stdout and integrates with your logging stack (Loki, ELK, CloudWatch, etc.).

## Sample Queries for Log Analysis

Once logs are in your aggregation system, run queries like:

```sql
-- Find slow requests (Elasticsearch/OpenSearch)
GET traefik-access/_search
{
  "query": {
    "range": {
      "Duration": {
        "gte": 1000000000
      }
    }
  }
}

-- Count errors by service (Loki LogQL)
sum by (ServiceName) (
  count_over_time({job="traefik"} | json | DownstreamStatus >= 500 [1h])
)

-- Request rate by router (PromQL from metrics)
sum by (router) (rate(traefik_router_requests_total[5m]))
```

## Performance Considerations

Access logging adds overhead. Mitigate it with:

1. **Buffering**: Set `bufferingSize` to batch writes
2. **Filtering**: Use status-code and duration filters, and disable access logs on low-value routers
3. **Sampling**: For very high traffic, sample logs in your log pipeline
4. **Async shipping**: Use sidecars or async agents for log shipping

```yaml
# performance-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
  namespace: traefik
data:
  traefik.yaml: |
    accessLog:
      format: json
      bufferingSize: 100
      filters:
        statusCodes:
          - "400-599"  # Only log errors
        minDuration: 100ms  # Only log slow requests
```

---

Access logs provide visibility into every request hitting your infrastructure. Configure them thoughtfully: capture enough detail for debugging and compliance, but filter out noise that clutters your logs and increases costs. JSON format with structured fields makes log analysis significantly easier.
