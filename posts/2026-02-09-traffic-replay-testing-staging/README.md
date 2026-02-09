# How to Build Production Traffic Replay Testing Pipelines Against Kubernetes Staging Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Traffic Replay, Testing, Staging

Description: Build traffic replay pipelines that capture production traffic patterns and replay them against staging clusters to validate changes with realistic workloads before deploying to production.

---

Synthetic tests and manual QA catch obvious bugs but miss subtle issues that only appear under production traffic patterns. Traffic replay testing captures real production requests and replays them against staging environments, validating that changes handle actual user behavior correctly before production deployment.

The challenge is capturing production traffic without impacting performance, storing it efficiently, and replaying it accurately against staging with appropriate rate limits and data anonymization. Done correctly, traffic replay provides high-fidelity testing that catches issues missed by traditional testing approaches.

This technique is especially valuable for API services, databases, and systems where production traffic patterns are complex and difficult to simulate accurately with synthetic tests.

## Capturing Production Traffic

Capture traffic using service mesh sidecars, network proxies, or application instrumentation without adding latency to production requests.

Using Envoy sidecar for traffic capture:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-config
  namespace: production
data:
  envoy.yaml: |
    admin:
      address:
        socket_address:
          address: 127.0.0.1
          port_value: 9901

    static_resources:
      listeners:
      - name: listener_0
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
              access_log:
              - name: envoy.access_loggers.file
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                  path: /var/log/envoy/access.log
                  json_format:
                    timestamp: "%START_TIME%"
                    method: "%REQ(:METHOD)%"
                    path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
                    status: "%RESPONSE_CODE%"
                    duration: "%DURATION%"
                    request_body: "%DYNAMIC_METADATA(envoy.lua:request_body)%"
              http_filters:
              - name: envoy.filters.http.lua
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                  inline_code: |
                    function envoy_on_request(request_handle)
                      local body = request_handle:body():getBytes(0, 10000)
                      request_handle:streamInfo():dynamicMetadata():set("envoy.lua", "request_body", body)
                    end
              - name: envoy.filters.http.router
              route_config:
                name: local_route
                virtual_hosts:
                - name: backend
                  domains: ["*"]
                  routes:
                  - match:
                      prefix: "/"
                    route:
                      cluster: local_service
      clusters:
      - name: local_service
        connect_timeout: 0.25s
        type: LOGICAL_DNS
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: local_service
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 127.0.0.1
                    port_value: 8081
```

Deploy with application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: envoy
        image: envoyproxy/envoy:v1.25.0
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: envoy-config
          mountPath: /etc/envoy
        - name: logs
          mountPath: /var/log/envoy
      - name: app
        image: api-service:v1.0.0
        ports:
        - containerPort: 8081
      - name: log-shipper
        image: fluent/fluent-bit:latest
        volumeMounts:
        - name: logs
          mountPath: /var/log/envoy
      volumes:
      - name: envoy-config
        configMap:
          name: envoy-config
      - name: logs
        emptyDir: {}
```

## Storing Captured Traffic

Store captured traffic in a format suitable for replay:

```python
import json
import gzip
from datetime import datetime
from kafka import KafkaProducer

class TrafficCapture:
    def __init__(self, kafka_brokers):
        self.producer = KafkaProducer(
            bootstrap_servers=kafka_brokers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            compression_type='gzip'
        )

    def capture_request(self, method, path, headers, body, response_status, duration):
        """Capture a request for later replay."""
        capture = {
            'timestamp': datetime.utcnow().isoformat(),
            'method': method,
            'path': path,
            'headers': self.sanitize_headers(headers),
            'body': self.sanitize_body(body),
            'response_status': response_status,
            'duration_ms': duration
        }

        # Send to Kafka for storage
        self.producer.send('traffic-capture', value=capture)

    def sanitize_headers(self, headers):
        """Remove sensitive headers."""
        sensitive = ['authorization', 'cookie', 'x-api-key']
        return {k: v for k, v in headers.items()
                if k.lower() not in sensitive}

    def sanitize_body(self, body):
        """Anonymize sensitive data in request body."""
        # Implement your anonymization logic
        # Example: Replace email addresses, credit cards, etc.
        return body

    def flush(self):
        self.producer.flush()
```

Store in S3 for long-term retention:

```bash
#!/bin/bash
# archive-traffic-logs.sh

DATE=$(date -d "yesterday" +%Y-%m-%d)
LOG_DIR="/var/log/traffic-capture"
ARCHIVE_BUCKET="s3://traffic-replay-archives"

# Compress logs
tar -czf traffic-${DATE}.tar.gz ${LOG_DIR}/${DATE}/*.json

# Upload to S3
aws s3 cp traffic-${DATE}.tar.gz ${ARCHIVE_BUCKET}/${DATE}/

# Clean up old local files
find ${LOG_DIR} -mtime +7 -delete
```

## Building the Replay Engine

Create a replay engine that reads captured traffic and sends requests to staging:

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type CapturedRequest struct {
    Timestamp      string            `json:"timestamp"`
    Method         string            `json:"method"`
    Path           string            `json:"path"`
    Headers        map[string]string `json:"headers"`
    Body           string            `json:"body"`
    ResponseStatus int               `json:"response_status"`
    DurationMs     float64           `json:"duration_ms"`
}

type ReplayEngine struct {
    targetURL    string
    rateLimiter  *time.Ticker
    client       *http.Client
}

func NewReplayEngine(targetURL string, requestsPerSecond int) *ReplayEngine {
    interval := time.Second / time.Duration(requestsPerSecond)
    return &ReplayEngine{
        targetURL:   targetURL,
        rateLimiter: time.NewTicker(interval),
        client: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

func (re *ReplayEngine) ReplayRequest(captured CapturedRequest) error {
    // Wait for rate limiter
    <-re.rateLimiter.C

    // Build request
    url := re.targetURL + captured.Path
    req, err := http.NewRequest(captured.Method, url, bytes.NewBufferString(captured.Body))
    if err != nil {
        return err
    }

    // Add headers
    for k, v := range captured.Headers {
        req.Header.Set(k, v)
    }
    req.Header.Set("X-Replay-Test", "true")

    // Send request
    start := time.Now()
    resp, err := re.client.Do(req)
    duration := time.Since(start)

    if err != nil {
        return fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()

    // Compare results
    if resp.StatusCode != captured.ResponseStatus {
        fmt.Printf("Status mismatch: expected %d, got %d for %s %s\n",
            captured.ResponseStatus, resp.StatusCode, captured.Method, captured.Path)
    }

    if duration.Milliseconds() > int64(captured.DurationMs*1.5) {
        fmt.Printf("Slow request: %dms (production: %.0fms) for %s %s\n",
            duration.Milliseconds(), captured.DurationMs, captured.Method, captured.Path)
    }

    return nil
}

func (re *ReplayEngine) ReplayFromFile(filename string) error {
    file, err := os.Open(filename)
    if err != nil {
        return err
    }
    defer file.Close()

    decoder := json.NewDecoder(file)
    for {
        var captured CapturedRequest
        if err := decoder.Decode(&captured); err == io.EOF {
            break
        } else if err != nil {
            return err
        }

        if err := re.ReplayRequest(captured); err != nil {
            fmt.Printf("Error replaying request: %v\n", err)
        }
    }

    return nil
}

func main() {
    engine := NewReplayEngine("http://staging.example.com", 100)
    if err := engine.ReplayFromFile("traffic-capture.json"); err != nil {
        fmt.Printf("Replay failed: %v\n", err)
    }
}
```

## Kubernetes Job for Traffic Replay

Deploy replay as a Kubernetes job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: traffic-replay
  namespace: staging
spec:
  parallelism: 5
  completions: 1
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: replay
        image: traffic-replay:v1.0.0
        env:
        - name: TARGET_URL
          value: "http://api-service.staging.svc.cluster.local"
        - name: RATE_LIMIT
          value: "1000"
        - name: TRAFFIC_DATE
          value: "2026-02-08"
        command:
        - /replay
        - --target=$(TARGET_URL)
        - --rate=$(RATE_LIMIT)
        - --source=s3://traffic-replay-archives/$(TRAFFIC_DATE)/
        volumeMounts:
        - name: aws-credentials
          mountPath: /root/.aws
      volumes:
      - name: aws-credentials
        secret:
          secretName: aws-credentials
```

## Comparing Replay Results

Analyze differences between production and staging responses:

```python
import json
from difflib import unified_diff

class ResultComparison:
    def __init__(self):
        self.mismatches = []
        self.performance_degradations = []

    def compare_response(self, production, staging):
        """Compare production and staging responses."""
        # Status code comparison
        if production['status'] != staging['status']:
            self.mismatches.append({
                'path': production['path'],
                'production_status': production['status'],
                'staging_status': staging['status']
            })

        # Performance comparison
        perf_degradation = (staging['duration'] - production['duration']) / production['duration']
        if perf_degradation > 0.5:  # 50% slower
            self.performance_degradations.append({
                'path': production['path'],
                'production_duration': production['duration'],
                'staging_duration': staging['duration'],
                'degradation_percent': perf_degradation * 100
            })

    def generate_report(self):
        """Generate comparison report."""
        report = {
            'total_requests': len(self.mismatches) + len(self.performance_degradations),
            'status_mismatches': len(self.mismatches),
            'performance_issues': len(self.performance_degradations),
            'mismatches': self.mismatches,
            'performance_degradations': self.performance_degradations
        }

        return json.dumps(report, indent=2)
```

## Automating Replay in CI/CD

Integrate traffic replay into deployment pipelines:

```yaml
# .github/workflows/staging-validation.yaml
name: Staging Validation with Traffic Replay

on:
  push:
    branches: [main]

jobs:
  replay-traffic:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Deploy to Staging
      run: |
        kubectl apply -f k8s/staging/

    - name: Wait for Deployment
      run: |
        kubectl rollout status deployment/api-service -n staging

    - name: Run Traffic Replay
      run: |
        kubectl create job traffic-replay-${GITHUB_SHA} \
          --from=cronjob/traffic-replay -n staging

    - name: Wait for Replay Completion
      run: |
        kubectl wait --for=condition=complete \
          job/traffic-replay-${GITHUB_SHA} -n staging \
          --timeout=600s

    - name: Analyze Results
      run: |
        kubectl logs job/traffic-replay-${GITHUB_SHA} -n staging | \
          python analyze-replay.py > replay-report.json

    - name: Upload Report
      uses: actions/upload-artifact@v3
      with:
        name: replay-report
        path: replay-report.json

    - name: Fail if Issues Found
      run: |
        ISSUES=$(jq '.status_mismatches + .performance_issues' replay-report.json)
        if [ $ISSUES -gt 10 ]; then
          echo "Found $ISSUES issues in replay"
          exit 1
        fi
```

Traffic replay testing provides high-fidelity validation of changes by exercising staging environments with real production traffic patterns. By capturing requests, anonymizing sensitive data, replaying against staging, and comparing results, you catch issues that traditional testing misses. This approach is particularly valuable for complex systems where production behavior is difficult to simulate accurately with synthetic tests.
