# How to Implement Multi-Team Observability with Per-Team Collector Instances and Centralized Gateway Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Team, Gateway Routing, Enterprise Observability

Description: Set up a multi-team observability architecture with per-team Collector agents and a centralized gateway for routing and governance.

In large organizations, a single shared Collector instance is a recipe for trouble. One team's misconfiguration can break telemetry for everyone. A noisy service can consume all the resources. The solution is per-team Collector agents that forward to a centralized gateway. This post shows how to build that architecture.

## Architecture

```
Team A namespace:
  Apps -> Agent Collector (team-a) -> |
                                       |
Team B namespace:                      |-> Gateway Collector -> Backend(s)
  Apps -> Agent Collector (team-b) -> |
                                       |
Team C namespace:                      |
  Apps -> Agent Collector (team-c) -> |
```

Each team gets their own Collector agent with team-specific configuration. All agents forward to a shared gateway that handles routing, rate limiting, and export to backends.

## Per-Team Agent Configuration

Deploy an agent Collector per namespace using a Helm values template:

```yaml
# team-agent-values.yaml.tpl
# Template for per-team agent Collectors
image:
  repository: otel/opentelemetry-collector-contrib
  tag: "0.96.0"

mode: daemonset

config:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

  processors:
    batch:
      send_batch_size: 2048
      timeout: 1s

    memory_limiter:
      check_interval: 5s
      limit_mib: {{ .memory_limit_mib }}

    # Tag all telemetry with team identity
    resource:
      attributes:
        - key: team.name
          value: "{{ .team_name }}"
          action: upsert
        - key: team.namespace
          value: "{{ .namespace }}"
          action: upsert
        - key: team.cost_center
          value: "{{ .cost_center }}"
          action: upsert

    # Team-specific sampling
    probabilistic_sampler:
      sampling_percentage: {{ .sampling_pct }}

  exporters:
    # Forward to the centralized gateway
    otlp/gateway:
      endpoint: otel-gateway.observability.svc.cluster.local:4317
      tls:
        insecure: true
      headers:
        X-Team-Name: "{{ .team_name }}"

  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors: [memory_limiter, resource, probabilistic_sampler, batch]
        exporters: [otlp/gateway]
      metrics:
        receivers: [otlp]
        processors: [memory_limiter, resource, batch]
        exporters: [otlp/gateway]
      logs:
        receivers: [otlp]
        processors: [memory_limiter, resource, batch]
        exporters: [otlp/gateway]
```

## Centralized Gateway Configuration

The gateway handles routing, rate limiting, and multi-backend export:

```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16

processors:
  batch:
    send_batch_size: 8192
    timeout: 2s

  memory_limiter:
    check_interval: 5s
    limit_mib: 8192
    spike_limit_mib: 2048

  # Route telemetry based on team attributes
  routing:
    from_attribute: team.name
    table:
      - value: payments
        exporters: [otlphttp/primary, otlphttp/compliance]
      - value: frontend
        exporters: [otlphttp/primary, otlphttp/rum]
      - value: data-platform
        exporters: [otlphttp/primary]
    default_exporters: [otlphttp/primary]

exporters:
  otlphttp/primary:
    endpoint: https://primary-backend:4318
    headers:
      Authorization: "Bearer ${PRIMARY_TOKEN}"

  otlphttp/compliance:
    endpoint: https://compliance-backend:4318
    headers:
      Authorization: "Bearer ${COMPLIANCE_TOKEN}"

  otlphttp/rum:
    endpoint: https://rum-backend:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, routing]
      exporters: [otlphttp/primary]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/primary]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/primary]
```

## Gateway Kubernetes Deployment

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
        - name: gateway
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config", "/etc/otel/config.yaml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-gateway-config
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
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
```

## Provisioning Teams

Automate team provisioning with a script:

```python
# provision_team.py
import subprocess
import yaml

teams = [
    {"name": "payments", "namespace": "payments",
     "cost_center": "CC-100", "sampling_pct": 100,
     "memory_limit_mib": 2048},
    {"name": "catalog", "namespace": "catalog",
     "cost_center": "CC-200", "sampling_pct": 10,
     "memory_limit_mib": 1024},
    {"name": "frontend", "namespace": "frontend",
     "cost_center": "CC-300", "sampling_pct": 50,
     "memory_limit_mib": 1536},
]

for team in teams:
    print(f"Provisioning Collector for team: {team['name']}")

    # Generate values file from template
    with open("team-agent-values.yaml.tpl") as f:
        template = f.read()

    values = template
    for key, val in team.items():
        values = values.replace(f"{{{{ .{key} }}}}", str(val))

    values_file = f"/tmp/values-{team['name']}.yaml"
    with open(values_file, "w") as f:
        f.write(values)

    # Deploy with Helm
    subprocess.run([
        "helm", "upgrade", "--install",
        f"otel-agent-{team['name']}",
        "open-telemetry/opentelemetry-collector",
        "-f", values_file,
        "-n", team["namespace"],
        "--create-namespace"
    ], check=True)

    print(f"  Deployed to namespace: {team['namespace']}")
```

## Benefits of This Architecture

- **Isolation**: One team's noisy Collector cannot starve another team's telemetry.
- **Customization**: Each team can have different sampling rates and processing rules.
- **Governance**: The gateway enforces organization-wide policies like rate limits and routing.
- **Cost attribution**: The `team.cost_center` attribute enables cost tracking per team.

## Wrapping Up

Per-team Collector agents with a centralized gateway give you the best of both worlds: team autonomy for their telemetry configuration and organizational control over routing, compliance, and cost management. Start by deploying the gateway, then gradually onboard teams to their own agent instances.
