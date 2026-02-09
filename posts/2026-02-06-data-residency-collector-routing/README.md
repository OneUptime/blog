# How to Implement Data Residency Controls Using OpenTelemetry Collector Routing by Region

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Residency, Regional Routing, GDPR

Description: Implement data residency controls by routing OpenTelemetry telemetry to region-specific backends using collector pipelines.

Data residency laws require that certain data stays within specific geographic boundaries. The EU's GDPR, Germany's Bundesdatenschutzgesetz, China's PIPL, and Brazil's LGPD all have provisions about where personal data can be stored and processed. If your telemetry data contains personal information (user IDs, IP addresses, session data), it falls under these requirements.

OpenTelemetry's Collector architecture is well-suited for this problem. You can configure routing rules that inspect telemetry attributes and send data to the correct regional backend based on the data subject's location or the originating service's region.

## The Routing Problem

Consider a global SaaS application deployed across US, EU, and APAC regions. Telemetry from the EU region containing personal data of EU users must stay in an EU-hosted backend. But your global operations team still needs aggregated, anonymized metrics from all regions for capacity planning.

The solution involves two layers:

1. **Regional routing** - Send raw telemetry to region-specific backends
2. **Anonymized aggregation** - Forward scrubbed, aggregated data to a global backend

## Tagging Telemetry with Region Information

First, every service needs to declare which region it operates in and which data residency rules apply. Add these as resource attributes.

Set resource attributes via environment variables in your Kubernetes deployments:

```yaml
# k8s-deployment-eu.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: app
spec:
  template:
    spec:
      containers:
        - name: user-service
          image: myapp/user-service:latest
          env:
            # OpenTelemetry resource attributes for regional routing
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: >-
                service.name=user-service,
                deployment.environment=production,
                cloud.region=eu-west-1,
                data_residency.region=eu,
                data_residency.classification=personal

            # Point at the regional collector
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.observability:4317"
```

## Regional Routing Collector Configuration

The core of this setup is a Collector that routes telemetry to different backends based on the `data_residency.region` resource attribute. The `routing` connector in the OpenTelemetry Collector Contrib distribution handles this.

Here is the full collector configuration with regional routing:

```yaml
# regional-routing-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  # The routing connector inspects attributes and forwards
  # to the appropriate pipeline
  routing:
    table:
      - statement: route()
          where resource.attributes["data_residency.region"] == "eu"
        pipelines: [traces/eu, logs/eu, metrics/eu]
      - statement: route()
          where resource.attributes["data_residency.region"] == "us"
        pipelines: [traces/us, logs/us, metrics/us]
      - statement: route()
          where resource.attributes["data_residency.region"] == "apac"
        pipelines: [traces/apac, logs/apac, metrics/apac]
    default_pipelines: [traces/us, logs/us, metrics/us]

processors:
  batch/regional:
    timeout: 5s
    send_batch_size: 500

  # Strip personal data for the global aggregation pipeline
  transform/anonymize:
    trace_statements:
      - context: span
        statements:
          - delete_key(attributes, "enduser.id")
          - delete_key(attributes, "http.client_ip")
          - delete_key(attributes, "net.peer.ip")
          - replace_pattern(attributes["url.path"],
              "/users/[^/]+", "/users/{id}")
    metric_statements:
      - context: datapoint
        statements:
          - delete_key(attributes, "enduser.id")

  batch/global:
    timeout: 30s
    send_batch_size: 2000

exporters:
  # EU regional backend - hosted in eu-west-1
  otlp/eu:
    endpoint: https://telemetry-eu.example.com:4317
    tls:
      cert_file: /etc/ssl/certs/eu-collector.crt
      key_file: /etc/ssl/private/eu-collector.key

  # US regional backend - hosted in us-east-1
  otlp/us:
    endpoint: https://telemetry-us.example.com:4317
    tls:
      cert_file: /etc/ssl/certs/us-collector.crt
      key_file: /etc/ssl/private/us-collector.key

  # APAC regional backend - hosted in ap-southeast-1
  otlp/apac:
    endpoint: https://telemetry-apac.example.com:4317
    tls:
      cert_file: /etc/ssl/certs/apac-collector.crt
      key_file: /etc/ssl/private/apac-collector.key

  # Global aggregated backend - anonymized data only
  otlp/global:
    endpoint: https://telemetry-global.example.com:4317

service:
  pipelines:
    # Ingestion pipeline - receives everything, routes by region
    traces/ingress:
      receivers: [otlp]
      exporters: [routing]

    logs/ingress:
      receivers: [otlp]
      exporters: [routing]

    metrics/ingress:
      receivers: [otlp]
      exporters: [routing]

    # EU regional pipelines
    traces/eu:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/eu]

    logs/eu:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/eu]

    metrics/eu:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/eu]

    # US regional pipelines
    traces/us:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/us]

    logs/us:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/us]

    metrics/us:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/us]

    # APAC regional pipelines
    traces/apac:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/apac]

    logs/apac:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/apac]

    metrics/apac:
      receivers: [routing]
      processors: [batch/regional]
      exporters: [otlp/apac]
```

## Handling Cross-Region Traces

The tricky part of regional routing is distributed traces that cross regional boundaries. A user in the EU might trigger an API call that fans out to a service running in the US region. The trace has spans from both regions.

You have two options:

1. **Duplicate the trace to both regions**: Both regional backends get the full trace, which is useful for debugging but may violate data residency if EU personal data lands in the US backend.

2. **Split the trace by region**: Each regional backend only gets the spans that originated in its region. Trace continuity is maintained via trace IDs, but you need to query both backends to see the complete trace.

Option 2 is the safer choice for strict data residency compliance. The collector config above already handles this because routing is per-span, not per-trace.

## Validating Data Residency at the Network Level

Collector configuration alone is not enough. You should also enforce data residency at the network level:

```yaml
# NetworkPolicy to prevent EU collector from sending to non-EU backends
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: eu-collector-egress
  namespace: observability
spec:
  podSelector:
    matchLabels:
      app: otel-collector
      region: eu
  policyTypes:
    - Egress
  egress:
    # Only allow egress to the EU telemetry backend
    - to:
        - ipBlock:
            cidr: 10.1.0.0/16  # EU backend subnet
      ports:
        - port: 4317
          protocol: TCP
```

## Testing Your Routing Rules

Before going to production, validate that routing works correctly. Send test telemetry with different region attributes and verify it arrives at the correct backend:

```python
# Test script to validate regional routing
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

def send_test_span(region):
    """Send a test span with a specific region attribute."""
    resource = Resource.create({
        "service.name": "routing-test",
        "data_residency.region": region,
    })
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(
            endpoint="otel-collector.observability:4317"
        ))
    )
    tracer = provider.get_tracer("routing-test")

    with tracer.start_as_current_span(f"test-{region}") as span:
        span.set_attribute("test.region", region)
        span.set_attribute("test.timestamp", datetime.utcnow().isoformat())

    provider.shutdown()

# Test each region
for region in ["eu", "us", "apac"]:
    send_test_span(region)
    print(f"Sent test span for region: {region}")
```

## Conclusion

Data residency compliance with OpenTelemetry comes down to three things: tagging your telemetry with region information at the source, routing based on those tags at the collector level, and enforcing network boundaries as a backstop. The routing connector in the OpenTelemetry Collector makes the middle piece straightforward. Combine it with proper resource attributes and network policies, and you have a telemetry pipeline that respects geographic data boundaries while still giving your global team the anonymized operational visibility they need.
