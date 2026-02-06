# How to Document Your OpenTelemetry Collector Pipeline Architecture for Operations Runbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Operations, Runbooks

Description: Learn how to document your OpenTelemetry Collector pipeline architecture so that on-call engineers can troubleshoot telemetry issues quickly and confidently.

When your telemetry pipeline goes down at 3 AM, the on-call engineer should not have to read the collector source code to figure out what is happening. A well-documented pipeline architecture, embedded in your operations runbooks, is the difference between a 5-minute fix and a 2-hour investigation.

## What to Document

Your documentation needs to answer five questions:

1. What data flows through the pipeline?
2. What components process that data?
3. Where does the data go?
4. What can break?
5. How do you fix it?

## Start with a Pipeline Diagram

Create a visual representation of your collector topology. You do not need fancy tools. A text-based diagram in your runbook works fine:

```
Applications (SDK)
    |
    v  (OTLP gRPC :4317)
+----------------------------+
| Gateway Collector (3 pods) |
|  receivers: otlp           |
|  processors:               |
|    - memory_limiter        |
|    - batch                 |
|    - attributes/redact     |
|    - tail_sampling          |
|  exporters:                |
|    - otlp/traces -> Tempo  |
|    - otlp/metrics -> Mimir |
|    - otlp/logs -> Loki     |
+----------------------------+
    |         |         |
    v         v         v
  Tempo     Mimir     Loki
```

If you use a multi-tier architecture (agent collectors on each node plus a gateway tier), document both tiers and the connection between them.

## Document Each Component

For every receiver, processor, and exporter, write a short entry explaining what it does and why it is there:

```yaml
# Collector pipeline documentation
# Last updated: 2026-02-06

receivers:
  otlp:
    # Receives telemetry from application SDKs via gRPC and HTTP
    # gRPC on port 4317, HTTP on port 4318
    # TLS terminated by the ingress controller, not the collector
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    # Prevents OOM kills by dropping data when memory exceeds thresholds
    # If this triggers, it means the collector is receiving more data
    # than it can process. Scale up the collector deployment.
    check_interval: 1s
    limit_mib: 1500
    spike_limit_mib: 512

  batch:
    # Batches telemetry before export to reduce network calls
    # send_batch_size: number of spans/metrics/logs per batch
    # timeout: max time to wait before sending a partial batch
    send_batch_size: 8192
    timeout: 5s

  attributes/redact:
    # Removes sensitive data from span attributes before export
    # Required for PCI compliance - DO NOT REMOVE
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: user.email
        action: hash

  tail_sampling:
    # Samples traces based on their complete shape
    # Keeps 100% of error traces, 100% of slow traces,
    # and 10% of successful traces
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow-traces
        type: latency
        latency: {threshold_ms: 2000}
      - name: baseline
        type: probabilistic
        probabilistic: {sampling_percentage: 10}
```

## Create a Failure Mode Table

This is the most valuable part of your runbook. List every known failure mode, its symptoms, and the remediation:

```markdown
| Failure Mode | Symptoms | Check | Fix |
|---|---|---|---|
| Collector OOM | Pods restarting, gaps in telemetry | `kubectl describe pod` shows OOMKilled | Increase memory limits or scale horizontally |
| Exporter backpressure | `otelcol_exporter_send_failed_spans` increasing | Check exporter queue size metrics | Verify backend is healthy, increase batch timeout |
| TLS cert expired | All receivers returning connection errors | Check cert expiry: `openssl s_client -connect ...` | Rotate certificates, check cert-manager |
| Sampling dropping too much | Missing traces for important transactions | Check `otelcol_processor_tail_sampling_count` | Adjust sampling policies |
| Memory limiter active | `otelcol_processor_refused_spans` > 0 | Collector memory metrics | Scale collector deployment |
```

## Include Health Check Commands

Your runbook should have copy-paste commands for checking pipeline health:

```bash
# Check collector pod status
kubectl get pods -l app=otel-collector -n observability

# View collector logs for errors
kubectl logs -l app=otel-collector -n observability --tail=100 | grep -i error

# Check collector internal metrics
# The collector exposes its own metrics on port 8888
curl http://localhost:8888/metrics | grep otelcol_receiver_accepted

# Verify the collector is receiving data
curl http://localhost:8888/metrics | grep otelcol_receiver_accepted_spans

# Check exporter health
curl http://localhost:8888/metrics | grep otelcol_exporter_sent_spans

# Calculate drop rate
# If refused > 0, the pipeline is under pressure
curl http://localhost:8888/metrics | grep otelcol_processor_refused
```

## Document Configuration Changes

Every configuration change to the collector should be documented with:

- What changed and when
- Why the change was made
- Who approved it
- How to roll it back

Store your collector configuration in version control and deploy it through your CI/CD pipeline. Never edit collector configs directly on running pods.

```bash
# Rollback procedure for collector config changes
# 1. Find the last working config version
git log --oneline -- collector/config.yaml

# 2. Revert to the previous version
git revert <commit-hash>

# 3. Deploy the reverted config
kubectl apply -f collector/deployment.yaml

# 4. Verify the collector is healthy
kubectl rollout status deployment/otel-collector -n observability
```

## Scaling Documentation

Document your scaling strategy:

- How many spans per second can a single collector pod handle?
- What is the memory-to-throughput ratio?
- When should you add more replicas versus scaling up individual pods?
- Are there specific processors (like tail sampling) that require sticky sessions or state?

Include the Horizontal Pod Autoscaler configuration if you use one:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-collector
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-collector
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

## Keep It Updated

Link your collector configuration repository to your runbook. When the config changes, the runbook should be updated in the same pull request. Make pipeline documentation a required part of your change review process.

Your on-call engineers will thank you the next time the pipeline has an issue at an inconvenient hour.
