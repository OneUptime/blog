# How to Integrate Istio with Zipkin for Tracing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Zipkin, Distributed Tracing, Observability, Kubernetes

Description: A step-by-step guide to integrating Zipkin distributed tracing with Istio for tracking requests across microservices in your mesh.

---

Zipkin is one of the original distributed tracing systems, and Istio has built-in support for sending traces to it. If you're already using Zipkin in your organization or prefer its interface over alternatives like Jaeger, integrating it with Istio is straightforward. The Envoy sidecars natively support the Zipkin protocol, so there's no adapter or translation layer needed.

## How Zipkin Tracing Works with Istio

The tracing flow is simple:

1. A request enters the mesh through a sidecar or gateway
2. The sidecar generates a trace ID (if one doesn't exist) and creates a span
3. The sidecar forwards the request to the upstream with B3 trace headers
4. Each subsequent sidecar in the request path creates its own span with the same trace ID
5. All spans are sent to the Zipkin collector asynchronously
6. Zipkin assembles spans into complete traces for visualization

Istio uses the B3 propagation format by default, which Zipkin understands natively. The trace headers are:

- `x-b3-traceid` - Unique ID for the entire trace
- `x-b3-spanid` - Unique ID for the current span
- `x-b3-parentspanid` - ID of the parent span
- `x-b3-sampled` - Whether this trace should be recorded
- `x-b3-flags` - Debug flag

Your application code needs to forward these headers when making outbound HTTP calls. The sidecars handle span creation and reporting, but header propagation must happen in your application.

## Installing Zipkin

Deploy Zipkin into your cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: istio-system
  labels:
    app: zipkin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
      - name: zipkin
        image: openzipkin/zipkin:latest
        ports:
        - containerPort: 9411
        env:
        - name: STORAGE_TYPE
          value: mem
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: zipkin
  namespace: istio-system
  labels:
    app: zipkin
spec:
  ports:
  - port: 9411
    targetPort: 9411
    name: http-query
  selector:
    app: zipkin
```

Apply it:

```bash
kubectl apply -f zipkin.yaml
```

Verify it's running:

```bash
kubectl get pods -n istio-system -l app=zipkin
kubectl get svc -n istio-system zipkin
```

## Configuring Istio to Send Traces to Zipkin

### Using IstioOperator

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100.0
        zipkin:
          address: zipkin.istio-system.svc:9411
    extensionProviders:
    - name: zipkin
      zipkin:
        service: zipkin.istio-system.svc.cluster.local
        port: 9411
```

Apply with istioctl:

```bash
istioctl install -f istio-config.yaml
```

### Using the Telemetry API

For more granular control, use the Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 100.0
```

This applies to the entire mesh. For per-namespace or per-workload tracing:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: namespace-tracing
  namespace: production
spec:
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 5.0
```

## Verifying the Configuration

Check that the tracing config is in the Envoy bootstrap:

```bash
istioctl pc bootstrap productpage-v1-abc123.default -o json | python3 -c "
import sys, json
data = json.load(sys.stdin)
bootstrap = data.get('bootstrap', data)
tracing = bootstrap.get('tracing', {})
print(json.dumps(tracing, indent=2))
"
```

You should see the Zipkin collector configuration with the address you specified.

## Accessing the Zipkin UI

```bash
istioctl dashboard zipkin
```

Or manually port-forward:

```bash
kubectl port-forward -n istio-system svc/zipkin 9411:9411
```

Open `http://localhost:9411` in your browser.

## Using the Zipkin UI

### Finding Traces

The Zipkin UI has a clean search interface:

1. Select a **Service Name** from the dropdown (these are populated automatically from received spans)
2. Optionally select a **Span Name** (HTTP method + path)
3. Set the **Lookback** period
4. Add **Tags** to filter (e.g., `http.status_code=500`)
5. Set **Min Duration** and **Max Duration**
6. Click **Run Query**

### Reading a Trace

Click on a trace to see the span waterfall. Each row is a span:

```
productpage  |-----------200ms-----------|
  reviews         |-------150ms-------|
    ratings            |---50ms---|
  details        |--30ms--|
```

Click on any span to see details:
- HTTP method and URL
- Response status code
- Duration
- Tags (service name, IP, port)
- Annotations (timestamps for various events)

### Dependency Graph

Zipkin can show a dependency graph of your services. Click the "Dependencies" link in the navigation. This shows which services call which, with line thickness indicating traffic volume.

## Propagating Trace Headers in Your Application

The most common issue with tracing is broken traces - spans that don't connect into a complete tree. This happens when your application doesn't forward trace headers on outbound requests.

### Node.js Example

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

const TRACE_HEADERS = [
  'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
  'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
  'b3', 'traceparent', 'tracestate'
];

app.get('/api', async (req, res) => {
  const headers = {};
  TRACE_HEADERS.forEach(h => {
    if (req.headers[h]) {
      headers[h] = req.headers[h];
    }
  });

  const response = await axios.get('http://backend:8080/data', { headers });
  res.json(response.data);
});

app.listen(8080);
```

### Java Spring Boot Example

```java
@RestController
public class ApiController {

    private static final String[] TRACE_HEADERS = {
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate"
    };

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/api")
    public String api(HttpServletRequest request) {
        HttpHeaders headers = new HttpHeaders();
        for (String header : TRACE_HEADERS) {
            String value = request.getHeader(header);
            if (value != null) {
                headers.set(header, value);
            }
        }

        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
            "http://backend:8080/data",
            HttpMethod.GET, entity, String.class
        );
        return response.getBody();
    }
}
```

### Go Example

```go
func apiHandler(w http.ResponseWriter, r *http.Request) {
    traceHeaders := []string{
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags",
        "b3", "traceparent", "tracestate",
    }

    req, _ := http.NewRequest("GET", "http://backend:8080/data", nil)
    for _, h := range traceHeaders {
        if v := r.Header.Get(h); v != "" {
            req.Header.Set(h, v)
        }
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }
    defer resp.Body.Close()
    io.Copy(w, resp.Body)
}
```

## Production Setup with Persistent Storage

For production, use Zipkin with Elasticsearch or Cassandra instead of in-memory storage.

### Zipkin with Elasticsearch

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
      - name: zipkin
        image: openzipkin/zipkin:latest
        ports:
        - containerPort: 9411
        env:
        - name: STORAGE_TYPE
          value: elasticsearch
        - name: ES_HOSTS
          value: "http://elasticsearch.logging.svc:9200"
        - name: ES_INDEX
          value: zipkin
        - name: ES_INDEX_REPLICAS
          value: "1"
        - name: ES_INDEX_SHARDS
          value: "3"
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 1Gi
```

## Sampling Strategies

For production, reduce the sampling rate significantly:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 1.0
```

You can also force tracing for specific requests by setting the `x-b3-sampled: 1` header. This is useful for debugging specific requests in production without increasing the global sampling rate.

## Troubleshooting

**No traces in Zipkin.** Check the Zipkin pod logs for errors. Then verify that the Envoy sidecars can reach the Zipkin service:

```bash
kubectl exec productpage-v1-abc123 -c istio-proxy -- curl -s http://zipkin.istio-system.svc:9411/api/v2/services
```

**Traces have only one span.** Header propagation is missing. Check your application code.

**High latency on traced requests.** Trace reporting is asynchronous and shouldn't add latency. If you're seeing latency, it might be the trace context creation overhead (minimal) or the Zipkin collector being slow (check its metrics).

## Summary

Zipkin integration with Istio is straightforward because Envoy speaks the Zipkin protocol natively. Deploy Zipkin, configure the mesh to send traces, and make sure your applications propagate trace headers. For production, use persistent storage and keep sampling rates low. The traces you get are invaluable for understanding request flows and diagnosing performance problems across your microservices.
