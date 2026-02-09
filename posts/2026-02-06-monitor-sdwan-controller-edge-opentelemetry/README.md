# How to Monitor SD-WAN Controller and Edge Device Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SD-WAN, Network Monitoring, Edge Computing, Telecommunications

Description: Monitor SD-WAN controller and edge device performance including tunnel health, path selection, and SLA metrics with OpenTelemetry.

SD-WAN has become the go-to architecture for enterprise WAN connectivity. It abstracts the underlying transport (MPLS, broadband, LTE) and dynamically routes traffic based on application policies. When the SD-WAN controller or edge devices misbehave, entire branch offices lose connectivity or experience degraded application performance. In this post, we will instrument both the controller and edge devices with OpenTelemetry.

## SD-WAN Components to Monitor

An SD-WAN deployment has several components that need observability:

- **Controller/Orchestrator**: Centralized management plane that pushes policies
- **Edge devices (CPE)**: Branch-side routers that enforce policies and build tunnels
- **Overlay tunnels**: IPsec/GRE tunnels between edge devices
- **Underlay transports**: MPLS, broadband, LTE/5G links
- **Application classification**: DPI-based traffic identification

## Instrumenting the SD-WAN Controller

```python
# sdwan_controller_metrics.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import time

tracer = trace.get_tracer("sdwan.controller")
meter = metrics.get_meter("sdwan.controller")

# Controller health metrics
managed_edges = meter.create_gauge(
    "sdwan.controller.managed_edges",
    description="Number of edge devices managed by this controller",
    unit="{device}",
)

policy_push_latency = meter.create_histogram(
    "sdwan.controller.policy_push_latency",
    description="Time to push a policy update to all affected edges",
    unit="ms",
)

policy_push_failures = meter.create_counter(
    "sdwan.controller.policy_push_failures",
    description="Number of failed policy pushes",
    unit="{failure}",
)

edge_status_counter = meter.create_counter(
    "sdwan.controller.edge_status_changes",
    description="Edge device status transitions",
    unit="{event}",
)

# Controller API performance
api_latency = meter.create_histogram(
    "sdwan.controller.api_latency",
    description="Controller API response time",
    unit="ms",
)


def push_policy_update(policy_id: str, affected_edges: list):
    """Push a policy update to affected edge devices."""
    with tracer.start_as_current_span("sdwan.controller.push_policy") as span:
        start = time.time()

        span.set_attributes({
            "sdwan.policy_id": policy_id,
            "sdwan.affected_edge_count": len(affected_edges),
        })

        success_count = 0
        failure_count = 0

        for edge in affected_edges:
            with tracer.start_as_current_span("sdwan.controller.push_to_edge") as edge_span:
                edge_span.set_attributes({
                    "sdwan.edge.id": edge.device_id,
                    "sdwan.edge.site": edge.site_name,
                    "sdwan.edge.model": edge.model,
                })

                try:
                    result = send_policy_to_edge(edge, policy_id)
                    edge_span.set_attribute("sdwan.push.result", result.status)
                    edge_span.set_attribute("sdwan.push.config_version",
                                           result.config_version)

                    if result.status == "applied":
                        success_count += 1
                    else:
                        failure_count += 1
                        edge_span.set_status(StatusCode.ERROR,
                            f"Policy not applied: {result.reason}")

                except TimeoutError:
                    failure_count += 1
                    edge_span.set_status(StatusCode.ERROR, "Edge unreachable")
                    policy_push_failures.add(1, {
                        "edge_id": edge.device_id,
                        "reason": "timeout",
                    })

        elapsed = (time.time() - start) * 1000
        policy_push_latency.record(elapsed)

        span.set_attributes({
            "sdwan.push.success_count": success_count,
            "sdwan.push.failure_count": failure_count,
            "sdwan.push.duration_ms": elapsed,
        })
```

## Instrumenting Edge Device Telemetry

Edge devices report tunnel health, transport quality, and application performance. Here is a collector that gathers this data.

```python
# sdwan_edge_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("sdwan.edge")

# Tunnel health metrics
tunnel_status = meter.create_gauge(
    "sdwan.edge.tunnel.status",
    description="Tunnel operational status (1=up, 0=down)",
    unit="{status}",
)

tunnel_latency = meter.create_histogram(
    "sdwan.edge.tunnel.latency",
    description="Overlay tunnel latency (BFD-measured)",
    unit="ms",
)

tunnel_jitter = meter.create_histogram(
    "sdwan.edge.tunnel.jitter",
    description="Overlay tunnel jitter",
    unit="ms",
)

tunnel_packet_loss = meter.create_histogram(
    "sdwan.edge.tunnel.packet_loss",
    description="Overlay tunnel packet loss percentage",
    unit="%",
)

# Transport link metrics
transport_bandwidth_used = meter.create_gauge(
    "sdwan.edge.transport.bandwidth_used",
    description="Bandwidth utilization on each transport link",
    unit="bit/s",
)

transport_bandwidth_total = meter.create_gauge(
    "sdwan.edge.transport.bandwidth_total",
    description="Total available bandwidth per transport",
    unit="bit/s",
)

# Application-aware routing decisions
path_selection_counter = meter.create_counter(
    "sdwan.edge.path_selection",
    description="Path selection decisions by application and transport",
    unit="{decision}",
)

sla_violation_counter = meter.create_counter(
    "sdwan.edge.sla_violations",
    description="Application SLA policy violations",
    unit="{violation}",
)


def collect_edge_telemetry(edge_device):
    """Collect and export telemetry from an SD-WAN edge device."""
    common_attrs = {
        "sdwan.edge.id": edge_device.device_id,
        "sdwan.edge.site": edge_device.site_name,
        "sdwan.edge.region": edge_device.region,
    }

    # Collect tunnel metrics from BFD (Bidirectional Forwarding Detection)
    for tunnel in edge_device.get_tunnels():
        tunnel_attrs = {
            **common_attrs,
            "sdwan.tunnel.remote_edge": tunnel.remote_device_id,
            "sdwan.tunnel.transport": tunnel.transport_type,
            "sdwan.tunnel.color": tunnel.color,  # e.g., "mpls", "biz-internet", "lte"
        }

        tunnel_status.set(1 if tunnel.is_up else 0, tunnel_attrs)

        if tunnel.is_up:
            tunnel_latency.record(tunnel.bfd_latency_ms, tunnel_attrs)
            tunnel_jitter.record(tunnel.bfd_jitter_ms, tunnel_attrs)
            tunnel_packet_loss.record(tunnel.bfd_loss_pct, tunnel_attrs)

    # Collect transport utilization
    for transport in edge_device.get_transports():
        transport_attrs = {
            **common_attrs,
            "sdwan.transport.type": transport.type,
            "sdwan.transport.interface": transport.interface_name,
            "sdwan.transport.provider": transport.provider,
        }

        transport_bandwidth_used.set(transport.current_bps, transport_attrs)
        transport_bandwidth_total.set(transport.max_bps, transport_attrs)

    # Collect application SLA data
    for app_policy in edge_device.get_app_sla_status():
        if app_policy.is_violated:
            sla_violation_counter.add(1, {
                **common_attrs,
                "sdwan.app.name": app_policy.app_name,
                "sdwan.app.sla_class": app_policy.sla_class,
                "sdwan.app.current_transport": app_policy.current_transport,
                "sdwan.violation.metric": app_policy.violated_metric,
            })
```

## Collector Configuration for SD-WAN

```yaml
# otel-collector-sdwan.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Compute derived metrics
  transform:
    metric_statements:
      - context: datapoint
        statements:
          # Flag transports over 80% utilization
          - set(attributes["sdwan.transport.congested"], "true")
            where metric.name == "sdwan.edge.transport.bandwidth_used"
            and Double() > attributes["threshold_bps"]

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, transform]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Critical Alerts

- **Tunnel down**: Any tunnel going down should trigger an immediate alert. Include the tunnel color and transport type for fast triage.
- **All tunnels on a single transport down**: Indicates a transport provider outage. Check if other edge devices on the same provider are also affected.
- **SLA violations exceeding 5 per minute per edge**: The edge device is struggling to find compliant paths. May need to adjust SLA thresholds or add transport capacity.
- **Policy push failure rate above 5%**: Edge devices are not receiving their configuration. Check controller-to-edge connectivity.
- **Transport utilization above 85% sustained**: Congestion is imminent. Consider adding bandwidth or adjusting traffic engineering policies.

## Putting It All Together

With both the controller and edge devices instrumented, you get a top-down and bottom-up view of your SD-WAN. The controller traces show you policy propagation and management plane health. The edge metrics show you the real-time data plane performance. When a branch office reports slow application performance, you can check the edge device's tunnel quality, see which transport is being used, verify the SLA policy is being enforced correctly, and trace back to any recent policy changes from the controller. That full-stack visibility is what makes OpenTelemetry valuable for SD-WAN operations.
