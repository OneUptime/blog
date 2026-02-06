# How to Set Up an Agent-to-Gateway Pipeline Using OTel Arrow for High-Efficiency Telemetry Transport

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Gateway, Pipeline

Description: Set up an agent-to-gateway pipeline using OTel Arrow for high-efficiency telemetry transport across your infrastructure.

The agent-to-gateway pattern is the most common production architecture for OpenTelemetry. Agents run on each host (as sidecars or DaemonSets), collect telemetry from local applications, and forward it to a centralized gateway Collector. The gateway handles enrichment, routing, and export to backends. By using OTel Arrow for the agent-to-gateway link, you reduce the network traffic on that hop significantly, which is especially valuable when agents and gateways are in different availability zones or regions.

## Architecture

```
[App] --> [Agent Collector] --OTel Arrow--> [Gateway Collector] --OTLP--> [Backend]
[App] --> [Agent Collector] --OTel Arrow-->        |
[App] --> [Agent Collector] --OTel Arrow-->        |
```

The Arrow protocol is used between agents and the gateway where bandwidth savings matter most. The gateway-to-backend link can use standard OTLP since it is typically within the same network.

## Agent Collector Configuration

Each agent Collector runs on the host, receives OTLP from local applications, and exports to the gateway using OTel Arrow:

```yaml
# agent-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Limit memory on the agent (typically resource-constrained)
  memory_limiter:
    check_interval: 5s
    limit_mib: 256
    spike_limit_mib: 64

  # Batch before sending to gateway
  batch:
    timeout: 5s
    send_batch_size: 1000

  # Add host-level resource attributes
  resourcedetection:
    detectors: [env, system]
    system:
      hostname_sources: [os]

exporters:
  otelarrow:
    endpoint: gateway.observability.svc:4317
    tls:
      insecure: true
    arrow:
      num_streams: 2         # Keep low on agents to conserve resources
      max_stream_lifetime: 10m
    sending_queue:
      enabled: true
      num_consumers: 2
      queue_size: 500
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
    timeout: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otelarrow]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otelarrow]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otelarrow]
```

Key points for the agent config:

- `num_streams: 2` keeps resource usage low on the agent. Each stream consumes memory for its Arrow encoder state.
- `sending_queue` with `queue_size: 500` provides buffering if the gateway is temporarily unreachable.
- `resourcedetection` adds host metadata so the gateway knows which host each telemetry record came from.

## Gateway Collector Configuration

The gateway Collector receives Arrow-encoded telemetry from many agents, enriches it with Kubernetes metadata, and exports to the backend:

```yaml
# gateway-config.yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
        keepalive:
          server_parameters:
            max_connection_idle: 120s
            max_connection_age: 600s
            max_connection_age_grace: 30s
          enforcement_policy:
            min_time: 10s
        arrow:
          memory_limit_mib: 256

processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 2048
    spike_limit_mib: 512

  # Enrich with Kubernetes metadata
  k8sattributes:
    auth_type: serviceAccount
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.deployment.name
    pod_association:
      - sources:
          - from: resource_attribute
            name: host.name

  batch:
    timeout: 10s
    send_batch_size: 5000

exporters:
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheusremotewrite:
    endpoint: http://mimir:9009/api/v1/push
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otelarrow]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp/traces]
    metrics:
      receivers: [otelarrow]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otelarrow]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [loki]
```

## Kubernetes Deployment

Deploy the agent as a DaemonSet and the gateway as a Deployment:

```yaml
# agent-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-agent
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-agent
  template:
    metadata:
      labels:
        app: otel-agent
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          ports:
            - containerPort: 4317
              hostPort: 4317
            - containerPort: 4318
              hostPort: 4318
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-agent-config
```

```yaml
# gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-gateway
  namespace: observability
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
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "4"
              memory: 4Gi
          ports:
            - containerPort: 4317
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-gateway-config
```

## Load Balancing the Gateway

Place a Kubernetes Service in front of the gateway Deployment. Since OTel Arrow uses gRPC, use a headless service or a gRPC-aware load balancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gateway
  namespace: observability
spec:
  type: ClusterIP
  ports:
    - port: 4317
      targetPort: 4317
      protocol: TCP
  selector:
    app: otel-gateway
```

With the OTel Arrow stream lifetime set to 10 minutes, agents will reconnect periodically, and the Kubernetes service will distribute new connections across gateway pods.

This architecture gives you efficient bandwidth usage on the agent-to-gateway link, centralized processing at the gateway layer, and clean separation between collection and export concerns.
