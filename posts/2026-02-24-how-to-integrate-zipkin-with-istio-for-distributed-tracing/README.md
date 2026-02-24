# How to Integrate Zipkin with Istio for Distributed Tracing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Zipkin, Distributed Tracing, Observability, Kubernetes

Description: Complete walkthrough for integrating Zipkin with Istio for distributed tracing, covering deployment, Istio configuration, and production considerations.

---

Zipkin was one of the first open-source distributed tracing systems, inspired by Google's Dapper paper. It's simpler than Jaeger in terms of architecture and configuration, which makes it a solid choice if you want tracing without a lot of operational overhead. Istio has built-in support for sending traces to Zipkin, and the setup is pretty minimal.

## Zipkin Architecture

Zipkin has a straightforward architecture:

```mermaid
graph LR
    A[Envoy Sidecar] -->|HTTP/JSON| B[Zipkin Collector]
    B --> C[Storage]
    C --> D[Zipkin API + UI]
```

The collector receives spans, stores them, and the same process serves both the API and web UI. Storage options include in-memory, MySQL, Cassandra, and Elasticsearch.

## Deploying Zipkin

For development and testing, deploy the Zipkin all-in-one container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: observability
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
          image: openzipkin/zipkin:3.3
          ports:
            - containerPort: 9411
          env:
            - name: STORAGE_TYPE
              value: mem
            - name: JAVA_OPTS
              value: "-Xms256m -Xmx512m"
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: zipkin
  namespace: observability
spec:
  selector:
    app: zipkin
  ports:
    - name: http
      port: 9411
      targetPort: 9411
```

```bash
kubectl create namespace observability
kubectl apply -f zipkin.yaml
```

Verify it's running:

```bash
kubectl get pods -n observability
kubectl port-forward svc/zipkin -n observability 9411:9411
```

Open `http://localhost:9411` to see the Zipkin UI.

## Configuring Istio to Use Zipkin

Istio's Envoy sidecars natively support the Zipkin protocol for trace reporting. Configure it through MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
      - name: zipkin
        zipkin:
          service: zipkin.observability.svc.cluster.local
          port: 9411
```

Then create a Telemetry resource to activate tracing:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: zipkin-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100
```

If you're updating an existing Istio installation, edit the configmap:

```bash
kubectl edit configmap istio -n istio-system
```

Add the extension provider under the `mesh` key, save, and restart istiod:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

Then apply the Telemetry resource. Existing pods need to be restarted to pick up the new configuration:

```bash
kubectl rollout restart deployment -n my-app
```

## Understanding B3 Headers

Zipkin uses the B3 propagation format. Istio's Envoy sidecars generate these headers automatically:

| Header | Description | Example |
|--------|-------------|---------|
| `X-B3-TraceId` | 128-bit trace identifier | `463ac35c9f6413ad48485a3953bb6124` |
| `X-B3-SpanId` | 64-bit span identifier | `0020000000000001` |
| `X-B3-ParentSpanId` | 64-bit parent span ID | `0020000000000000` |
| `X-B3-Sampled` | Sampling decision | `1` (sampled) or `0` (not sampled) |
| `X-B3-Flags` | Debug flag | `1` (force trace) |

There's also a single-header format: `b3: {traceId}-{spanId}-{sampling}-{parentSpanId}`.

Your applications must propagate these headers from incoming requests to any outgoing requests for traces to be connected properly.

## Application Header Propagation

Without header propagation in your application code, you'll see individual spans but not connected traces. Here's how to handle it in common languages:

Java (Spring Boot):

```java
@Component
public class TracePropagationFilter implements Filter {

    private static final String[] TRACE_HEADERS = {
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "x-b3-flags"
    };

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpReq = (HttpServletRequest) req;
        Map<String, String> headers = new HashMap<>();
        for (String header : TRACE_HEADERS) {
            String value = httpReq.getHeader(header);
            if (value != null) {
                headers.put(header, value);
            }
        }
        // Store in ThreadLocal or request context for downstream calls
        TraceContext.setHeaders(headers);
        chain.doFilter(req, res);
    }
}
```

Node.js (Express):

```javascript
const TRACE_HEADERS = [
  'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
  'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags'
];

function traceMiddleware(req, res, next) {
  req.traceHeaders = {};
  for (const header of TRACE_HEADERS) {
    if (req.headers[header]) {
      req.traceHeaders[header] = req.headers[header];
    }
  }
  next();
}

// When making downstream calls
async function callDownstream(req, url) {
  const response = await fetch(url, {
    headers: req.traceHeaders
  });
  return response.json();
}
```

## Production Zipkin with Elasticsearch

For production, switch from in-memory to Elasticsearch storage:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: observability
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
          image: openzipkin/zipkin:3.3
          ports:
            - containerPort: 9411
          env:
            - name: STORAGE_TYPE
              value: elasticsearch
            - name: ES_HOSTS
              value: http://elasticsearch.observability:9200
            - name: ES_INDEX
              value: zipkin
            - name: ES_INDEX_REPLICAS
              value: "1"
            - name: ES_INDEX_SHARDS
              value: "3"
            - name: JAVA_OPTS
              value: "-Xms512m -Xmx1g"
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 2Gi
```

## Index Cleanup

Zipkin stores daily indices. Clean them up with a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: zipkin-index-cleanup
  namespace: observability
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: curlimages/curl:8.5.0
              command:
                - /bin/sh
                - -c
                - |
                  # Delete indices older than 7 days
                  CUTOFF=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)
                  curl -s "http://elasticsearch.observability:9200/_cat/indices/zipkin*" | \
                    awk '{print $3}' | while read idx; do
                      DATE=$(echo $idx | grep -oP '\d{4}-\d{2}-\d{2}' || echo "")
                      if [ -n "$DATE" ] && [ "$DATE" \< "$CUTOFF" ]; then
                        curl -XDELETE "http://elasticsearch.observability:9200/$idx"
                        echo "Deleted $idx"
                      fi
                    done
          restartPolicy: OnFailure
```

## Verifying the Integration

Generate some traffic and check Zipkin:

```bash
# Generate test traffic
for i in $(seq 1 20); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get
done

# Check Zipkin API
kubectl exec -n observability deploy/zipkin -- \
  wget -qO- "http://localhost:9411/api/v2/services"
```

You should see your services listed. Click "Run Query" in the Zipkin UI to see recent traces.

## Zipkin vs Jaeger: When to Choose Zipkin

Both work well with Istio, but they have different strengths:

- **Zipkin** is simpler to deploy and operate. One container, one port, done. The UI is straightforward and the Zipkin protocol is widely supported.
- **Jaeger** has a more feature-rich UI, better support for large-scale deployments with Kafka buffering, and more flexible storage options.

If you're starting out with tracing and want something simple, Zipkin is a great choice. If you're running a large-scale production mesh and need advanced features, Jaeger or Grafana Tempo might be better fits.

## Adjusting Sampling for Production

100% sampling is for development only. For production:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: zipkin-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

Start with 1% and adjust based on your trace volume and Zipkin's capacity. Monitor Zipkin's memory usage and Elasticsearch index sizes to find the right balance.

## Troubleshooting

No traces appearing:

```bash
# Verify Zipkin is reachable from the mesh
kubectl exec deploy/sleep -c istio-proxy -- curl -s http://zipkin.observability:9411/health

# Check Envoy bootstrap config for tracing
istioctl proxy-config bootstrap deploy/sleep -o json | grep -A20 tracing

# Look for trace submission errors in sidecar logs
kubectl logs deploy/sleep -c istio-proxy | grep -i "trace\|zipkin\|span"
```

Disconnected spans (traces with only one span):

This almost always means applications aren't propagating B3 headers. Add a test endpoint that echoes headers back to verify:

```bash
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/headers
```

Check that B3 headers appear in the response.

## Summary

Zipkin integration with Istio is about as simple as distributed tracing gets. Deploy Zipkin, configure Istio's extension provider to point at it, create a Telemetry resource, and make sure your apps propagate B3 headers. Use Elasticsearch for production storage, set up index cleanup, and keep your sampling rate low enough that Zipkin can handle the volume comfortably.
