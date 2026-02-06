# How to Correlate Kubernetes Network Policy Violations with Application Traces Using OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Network Policy, Security

Description: Learn how to correlate Kubernetes network policy violations with application-level OpenTelemetry traces for faster incident response.

Kubernetes Network Policies control which pods can communicate with each other. When a request gets blocked by a network policy, the application sees a connection timeout or reset, but the error message gives no indication that a network policy caused it. This makes debugging painful.

By correlating Kubernetes network policy violation events with OpenTelemetry application traces, you can instantly understand why a request failed. This post shows you how to build that correlation.

## The Problem

When a network policy blocks a connection, here is what happens from the application's perspective:

1. Service A tries to call Service B.
2. The network plugin (Calico, Cilium, etc.) drops the packet.
3. Service A gets a connection timeout after several seconds.
4. The OpenTelemetry span shows an error, but the error says "connection timed out" with no mention of network policies.

Meanwhile, the network policy violation shows up in the CNI logs, completely disconnected from the application trace.

## Collecting Network Policy Events

First, you need to get network policy violations into your telemetry pipeline. Cilium is a good example because it provides a Hubble API that you can query for policy drops:

```yaml
# Deploy the OpenTelemetry Collector with Cilium Hubble receiver
# otel-collector-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-network
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector-network
  template:
    metadata:
      labels:
        app: otel-collector-network
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          volumeMounts:
            - name: config
              mountPath: /etc/otel
            - name: hubble-sock
              mountPath: /var/run/cilium
          args: ["--config=/etc/otel/config.yaml"]
      volumes:
        - name: config
          configMap:
            name: otel-network-config
        - name: hubble-sock
          hostPath:
            path: /var/run/cilium
```

The Collector config processes Hubble flow logs and converts policy drops into OTel log records:

```yaml
# otel-network-config.yaml
receivers:
  filelog:
    include:
      - /var/log/cilium/hubble/*.log
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%fZ'

processors:
  # Only keep policy drop events
  filter/policy_drops:
    logs:
      include:
        match_type: strict
        record_attributes:
          - key: verdict
            value: "DROPPED"

  # Extract relevant fields for correlation
  transform/enrich:
    log_statements:
      - context: log
        statements:
          - set(attributes["k8s.network_policy.verdict"], "dropped")
          - set(attributes["k8s.source.pod"], attributes["source.pod_name"])
          - set(attributes["k8s.source.namespace"], attributes["source.namespace"])
          - set(attributes["k8s.destination.pod"], attributes["destination.pod_name"])
          - set(attributes["k8s.destination.namespace"], attributes["destination.namespace"])
          - set(attributes["k8s.destination.port"], attributes["destination.port"])
          - set(severity_text, "WARN")

exporters:
  otlp:
    endpoint: "otel-backend.observability.svc.cluster.local:4317"
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [filter/policy_drops, transform/enrich]
      exporters: [otlp]
```

## Application-Side Instrumentation

On the application side, add pod metadata to your spans so they can be correlated with network events:

```python
import os
import socket
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource

# Build a resource that identifies this pod
resource = Resource.create({
    "k8s.pod.name": os.environ.get("POD_NAME", socket.gethostname()),
    "k8s.namespace.name": os.environ.get("POD_NAMESPACE", "default"),
    "k8s.node.name": os.environ.get("NODE_NAME", "unknown"),
    "service.name": os.environ.get("SERVICE_NAME", "my-service"),
})
```

When making outbound calls, record the destination information on the span:

```python
import requests
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

def call_downstream_service(service_name, path, payload):
    """
    Makes an HTTP call to a downstream service and records
    enough metadata on the span for network policy correlation.
    """
    url = f"http://{service_name}.default.svc.cluster.local{path}"

    with tracer.start_as_current_span("http.client") as span:
        span.set_attribute("http.url", url)
        span.set_attribute("peer.service", service_name)
        span.set_attribute("k8s.destination.service", service_name)

        try:
            response = requests.post(url, json=payload, timeout=5)
            span.set_attribute("http.status_code", response.status_code)
            return response.json()

        except requests.exceptions.ConnectionError as e:
            # This is where network policy blocks show up
            # as connection errors
            span.set_attribute("error", True)
            span.set_attribute("error.type", "ConnectionError")
            span.set_attribute(
                "error.possible_cause",
                "network_policy_or_dns_failure"
            )
            span.add_event("connection.failed", {
                "destination.service": service_name,
                "destination.path": path,
                "error.message": str(e),
            })
            raise

        except requests.exceptions.Timeout:
            span.set_attribute("error", True)
            span.set_attribute("error.type", "Timeout")
            span.set_attribute(
                "error.possible_cause",
                "network_policy_drop_or_service_overload"
            )
            raise
```

## Building the Correlation Query

The key to correlation is matching the pod names, namespaces, and timestamps between the network policy events and the application traces. Here is a query you can run in your observability backend:

```sql
-- Find application spans that correspond to network policy drops
-- by matching source pod, destination service, and time window
SELECT
  t.trace_id,
  t.span_name,
  t.attributes['peer.service'] AS destination_service,
  t.start_time AS request_time,
  n.attributes['k8s.source.pod'] AS source_pod,
  n.attributes['k8s.destination.pod'] AS dest_pod,
  n.attributes['k8s.destination.port'] AS dest_port
FROM traces t
JOIN logs n ON
  -- Match the source pod
  t.resource_attributes['k8s.pod.name'] = n.attributes['k8s.source.pod']
  -- Match within a time window (network drop happens during the span)
  AND n.timestamp BETWEEN t.start_time AND t.end_time
  -- Only network policy drops
  AND n.attributes['k8s.network_policy.verdict'] = 'dropped'
WHERE
  t.attributes['error'] = true
  AND t.start_time > NOW() - INTERVAL '1 hour'
ORDER BY t.start_time DESC;
```

## Automated Annotation

For a more proactive approach, you can build a small service that watches for network policy drops and annotates the corresponding traces:

```python
# This runs as a sidecar or separate service
# It watches for network policy events and adds
# links to the affected traces

def annotate_trace_with_policy_violation(trace_id, policy_event):
    """
    When we detect a network policy drop that matches
    an active trace, add an event to that trace explaining
    what happened.
    """
    span_context = trace.SpanContext(
        trace_id=int(trace_id, 16),
        span_id=0,  # Will be looked up
        is_remote=True,
    )
    # Use the OTel API to add context
    # In practice, you would use your backend's API
    # to annotate the trace
    print(f"Trace {trace_id} was affected by network policy drop: "
          f"{policy_event['source']} -> {policy_event['destination']}")
```

## Summary

Network policy violations are one of the hardest things to debug in Kubernetes because the application never gets a clear error message. By collecting network policy events through the OpenTelemetry Collector and correlating them with application traces using pod metadata and timestamps, you can reduce investigation time from hours to minutes. The key is making sure both your application spans and your network events carry enough metadata (pod names, namespaces, timestamps) to join them together.
