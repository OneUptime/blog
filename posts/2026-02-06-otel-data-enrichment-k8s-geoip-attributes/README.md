# How to Build a Data Enrichment Pipeline That Adds Kubernetes Metadata, GeoIP, and Custom Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Enrichment, Kubernetes, GeoIP, Collector

Description: Build an OpenTelemetry Collector pipeline that enriches telemetry with Kubernetes metadata, GeoIP data, and custom business attributes automatically.

Raw telemetry is only half the story. A trace that says "request took 500ms" becomes much more useful when it also tells you the Kubernetes pod, the deployment version, the geographic location of the client, and which business unit owns the service. The OpenTelemetry Collector has processors that can add all of this context automatically.

## The Enrichment Pipeline

We will chain three types of enrichment:

1. **Kubernetes metadata** - pod name, namespace, node, deployment, labels
2. **GeoIP data** - country, city, and ASN based on client IP
3. **Custom attributes** - business unit, cost center, SLA tier from a static mapping

```
[OTLP Receiver] --> [k8s_attributes] --> [geoip] --> [transform] --> [Exporter]
```

## Kubernetes Metadata Enrichment

The `k8sattributes` processor queries the Kubernetes API to resolve pod IPs to rich metadata. It is the single most impactful enrichment you can add.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  # Enrich with Kubernetes metadata
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    # Extract these fields from Kubernetes
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
        - k8s.statefulset.name
        - k8s.container.name
      # Also grab specific pod labels and annotations
      labels:
        - tag_name: app.team
          key: team
          from: pod
        - tag_name: app.version
          key: app.kubernetes.io/version
          from: pod
      annotations:
        - tag_name: app.oncall
          key: oncall-contact
          from: pod
    # Use the source IP to find the pod
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip
      - sources:
          - from: connection
```

For this to work, the collector's service account needs RBAC permissions:

```yaml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "namespaces", "nodes"]
    verbs: ["get", "watch", "list"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: otel-collector
  apiGroup: rbac.authorization.k8s.io
```

## GeoIP Enrichment

The `geoip` processor resolves IP addresses to geographic information using a MaxMind database:

```yaml
processors:
  geoip:
    context: resource
    # Path to the MaxMind GeoLite2 database
    providers:
      maxmind:
        database_path: /etc/otel/GeoLite2-City.mmdb
    # Which attribute holds the IP to resolve
    field: net.peer.ip
```

After processing, your spans will have attributes like:

```
geo.city_name: "San Francisco"
geo.country_name: "United States"
geo.country_iso_code: "US"
geo.region_name: "California"
geo.postal_code: "94103"
geo.location.lat: 37.7749
geo.location.lon: -122.4194
```

## Custom Attribute Enrichment with Transform Processor

For business-specific attributes, use the `transform` processor with OTTL:

```yaml
processors:
  transform/business:
    trace_statements:
      - context: resource
        statements:
          # Map service names to business units
          - set(attributes["business.unit"], "payments")
            where attributes["service.name"] == "payment-service"
          - set(attributes["business.unit"], "platform")
            where attributes["service.name"] == "auth-service"
          - set(attributes["business.unit"], "platform")
            where attributes["service.name"] == "user-service"

          # Set SLA tier based on namespace
          - set(attributes["sla.tier"], "gold")
            where attributes["k8s.namespace.name"] == "production"
          - set(attributes["sla.tier"], "silver")
            where attributes["k8s.namespace.name"] == "staging"
          - set(attributes["sla.tier"], "bronze")
            where attributes["k8s.namespace.name"] == "development"

          # Add cost center for chargeback
          - set(attributes["cost.center"], "CC-1001")
            where attributes["business.unit"] == "payments"
          - set(attributes["cost.center"], "CC-2001")
            where attributes["business.unit"] == "platform"
```

## Putting It All Together

Here is the complete pipeline configuration:

```yaml
exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

  batch:
    send_batch_size: 512
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - k8sattributes        # First: resolve pod metadata
        - geoip                 # Second: resolve geo location
        - transform/business    # Third: add business attributes
        - batch                 # Last: batch for export
      exporters: [otlp]
```

The order matters. Kubernetes metadata should come first because later processors might reference the namespace or service name for their logic.

## Verifying the Enrichment

After deploying, check that attributes are being added by enabling the debug exporter temporarily:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes, geoip, transform/business, batch]
      exporters: [otlp, debug]
```

You should see spans with a rich set of resource attributes including pod names, geographic data, and your custom business fields. This enriched data makes queries, dashboards, and alerts significantly more powerful.
