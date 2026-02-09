# How to Deploy Gateway Collectors That Enforce Attribute Policies for Regulatory Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gateway Collector, Compliance, Policy Enforcement

Description: Deploy OpenTelemetry Gateway Collectors that enforce attribute policies to meet regulatory compliance requirements.

In a microservices environment, you cannot trust every team to get telemetry attributes right. Some teams will accidentally ship PII in span attributes. Others will forget to add required compliance tags. Some will use inconsistent naming conventions that make cross-service queries impossible.

A Gateway Collector sits between your application-level collectors and your backends. It acts as a policy enforcement point where you can validate, transform, reject, and enrich telemetry data before it reaches storage. For organizations operating under SOC 2, HIPAA, PCI-DSS, or GDPR, this is where you enforce the rules that matter.

## Gateway Collector Architecture

The typical deployment looks like this:

1. **Application-level agents** (sidecar or DaemonSet collectors) send telemetry to the gateway
2. **Gateway Collector** receives all telemetry, applies policies, and forwards to backends
3. **Backends** receive only policy-compliant telemetry data

The gateway runs as a separate Kubernetes Deployment (not a DaemonSet) with its own scaling characteristics. It is a central chokepoint by design, because that is exactly what policy enforcement requires.

## Base Gateway Configuration

Here is the foundation of a Gateway Collector that enforces attribute policies:

```yaml
# gateway-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # Set max message size to prevent abuse
        max_recv_msg_size_mib: 8
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Policy 1: Require mandatory attributes on all spans
  # Reject spans missing required compliance attributes
  filter/require_attributes:
    error_mode: ignore
    spans:
      # Only include spans that have the required attributes
      include:
        match_type: regexp
        attributes:
          - key: service.name
            value: ".+"
          - key: deployment.environment
            value: "^(production|staging|development)$"

  # Policy 2: Enforce attribute naming conventions
  # Rename non-standard attributes to canonical names
  attributes/normalize:
    actions:
      # Normalize user identity attributes
      - key: enduser.id
        from_attribute: user_id
        action: upsert
      - key: enduser.id
        from_attribute: userId
        action: upsert
      - key: enduser.id
        from_attribute: user.id
        action: upsert
      # Clean up the non-standard keys
      - key: user_id
        action: delete
      - key: userId
        action: delete

  # Policy 3: Enforce PII redaction
  transform/redact_pii:
    trace_statements:
      - context: span
        statements:
          # Redact email addresses
          - replace_pattern(attributes["enduser.id"],
              "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
              "[EMAIL-REDACTED]")
          # Redact SSN patterns
          - replace_pattern(attributes["db.statement"],
              "[0-9]{3}-[0-9]{2}-[0-9]{4}",
              "[SSN-REDACTED]")
    log_statements:
      - context: log
        statements:
          - replace_pattern(body,
              "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
              "[EMAIL-REDACTED]")

  # Policy 4: Add compliance metadata
  resource/compliance_tags:
    attributes:
      - key: compliance.gateway_version
        value: "2.1.0"
        action: insert
      - key: compliance.policy_applied
        value: "true"
        action: insert
      - key: compliance.processed_at
        action: insert
        value: ""

  # Policy 5: Limit attribute cardinality to prevent cost explosions
  # and potential data leaks through high-cardinality user data
  transform/limit_cardinality:
    trace_statements:
      - context: span
        statements:
          # Replace high-cardinality URL paths with templates
          - replace_pattern(attributes["url.path"],
              "/users/[0-9a-f-]+",
              "/users/{id}")
          - replace_pattern(attributes["url.path"],
              "/orders/[0-9]+",
              "/orders/{id}")

  batch:
    timeout: 5s
    send_batch_size: 1000

exporters:
  otlp/backend:
    endpoint: https://oneuptime.example.com:4317
    tls:
      cert_file: /etc/ssl/gateway/client.crt
      key_file: /etc/ssl/gateway/client.key

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - attributes/normalize
        - transform/redact_pii
        - filter/require_attributes
        - transform/limit_cardinality
        - resource/compliance_tags
        - batch
      exporters: [otlp/backend]
    logs:
      receivers: [otlp]
      processors:
        - transform/redact_pii
        - resource/compliance_tags
        - batch
      exporters: [otlp/backend]
```

## Deploying the Gateway on Kubernetes

The Gateway Collector should be deployed as a Deployment (not a DaemonSet) with horizontal pod autoscaling. It needs to handle the aggregate telemetry volume from all your services.

This Kubernetes manifest deploys a highly available Gateway Collector:

```yaml
# k8s-gateway-collector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-gateway-collector
  namespace: observability
  labels:
    app: otel-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-gateway
  template:
    metadata:
      labels:
        app: otel-gateway
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 8888
              name: metrics
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
            - name: tls-certs
              mountPath: /etc/ssl/gateway
              readOnly: true
          livenessProbe:
            httpGet:
              path: /
              port: 13133
            initialDelaySeconds: 15
          readinessProbe:
            httpGet:
              path: /
              port: 13133
            initialDelaySeconds: 5
      volumes:
        - name: config
          configMap:
            name: gateway-collector-config
        - name: tls-certs
          secret:
            secretName: gateway-tls
---
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway
  namespace: observability
spec:
  selector:
    app: otel-gateway
  ports:
    - port: 4317
      targetPort: 4317
      name: otlp-grpc
    - port: 4318
      targetPort: 4318
      name: otlp-http
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-gateway-hpa
  namespace: observability
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-gateway-collector
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Configuring Application Collectors to Route Through the Gateway

Point your DaemonSet or sidecar collectors at the gateway instead of directly at the backend:

```yaml
# agent-collector.yaml (DaemonSet or sidecar)
exporters:
  otlp/gateway:
    # Point at the gateway service, not the backend
    endpoint: otel-gateway.observability.svc.cluster.local:4317
    tls:
      insecure: false
      cert_file: /etc/ssl/agent/client.crt
      key_file: /etc/ssl/agent/client.key
```

## Monitoring the Gateway Itself

Your policy enforcement point needs its own monitoring. The collector exposes metrics you should track:

- `otelcol_receiver_accepted_spans` vs `otelcol_receiver_refused_spans` shows how many spans are being rejected by policies
- `otelcol_processor_dropped_spans` tells you if the filter processor is catching policy violations
- `otelcol_exporter_send_failed_spans` indicates backend connectivity issues

Set up alerts on a sudden spike in rejected spans, which could indicate a deployment with broken instrumentation, or on a drop in total throughput, which could mean the gateway itself is having issues.

## Summary

A Gateway Collector is the right place to enforce telemetry policies for regulatory compliance. It gives you a single control point to redact PII, enforce naming conventions, require compliance attributes, and limit cardinality. Deploy it as a scaled Kubernetes Deployment, monitor it carefully, and point all your agent collectors at it instead of directly at the backend. The initial setup takes some effort, but it saves you from having to trust every team and every service to handle compliance correctly on their own.
