# How to Monitor Network Slicing Performance for 5G Services (eMBB, URLLC, mMTC) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, 5G, Network Slicing, eMBB, URLLC, mMTC

Description: Monitor 5G network slicing performance for eMBB, URLLC, and mMTC service types using OpenTelemetry metrics and traces.

Network slicing is one of the defining features of 5G. It lets operators run multiple virtual networks on the same physical infrastructure, each tailored to a specific service type. Enhanced Mobile Broadband (eMBB) needs high throughput, Ultra-Reliable Low-Latency Communication (URLLC) demands sub-millisecond latency, and Massive Machine-Type Communication (mMTC) handles millions of low-bandwidth IoT devices. Monitoring these slices individually is essential for meeting SLA commitments.

## Slice Identification

Each network slice is identified by an S-NSSAI (Single Network Slice Selection Assistance Information), which consists of:

- **SST (Slice/Service Type)**: 1 = eMBB, 2 = URLLC, 3 = mMTC
- **SD (Slice Differentiator)**: An optional 3-byte hex value to distinguish slices of the same type

Every metric and trace we collect should carry these attributes for proper slice-level analysis.

## Defining Slice-Specific Metrics

```python
# slice_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("network.slice")

# Throughput per slice - critical for eMBB
slice_throughput = meter.create_histogram(
    "slice.throughput",
    description="Data throughput per network slice",
    unit="bit/s",
)

# Latency per slice - critical for URLLC
slice_latency = meter.create_histogram(
    "slice.packet.latency",
    description="End-to-end packet latency within a slice",
    unit="ms",
)

# Connected devices per slice - critical for mMTC
slice_device_count = meter.create_up_down_counter(
    "slice.devices.connected",
    description="Number of devices connected to this slice",
    unit="{device}",
)

# PDU session count per slice
slice_pdu_sessions = meter.create_up_down_counter(
    "slice.pdu_sessions.active",
    description="Active PDU sessions on this slice",
    unit="{session}",
)

# Packet loss rate per slice
slice_packet_loss = meter.create_histogram(
    "slice.packet.loss_rate",
    description="Packet loss ratio within a slice",
    unit="%",
)

# Slice resource utilization
slice_cpu_usage = meter.create_gauge(
    "slice.resource.cpu_usage",
    description="CPU usage of network functions serving this slice",
    unit="%",
)
```

## Instrumenting Slice-Aware Network Functions

The SMF (Session Management Function) is where slice assignment happens during PDU session establishment. Here is how to instrument it.

```go
package smf

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

var (
    tracer = otel.Tracer("smf.slice")
    meter  = otel.Meter("smf.slice")
)

// SliceAttributes returns the standard OTel attributes for a given slice
func SliceAttributes(sst int, sd string, dnn string) []attribute.KeyValue {
    return []attribute.KeyValue{
        attribute.Int("slice.sst", sst),
        attribute.String("slice.sd", sd),
        attribute.String("slice.s_nssai", formatSNSSAI(sst, sd)),
        attribute.String("session.dnn", dnn),
        attribute.String("slice.type", sliceTypeName(sst)),
    }
}

func sliceTypeName(sst int) string {
    switch sst {
    case 1:
        return "eMBB"
    case 2:
        return "URLLC"
    case 3:
        return "mMTC"
    default:
        return "custom"
    }
}

// EstablishPDUSession handles a new PDU session with slice awareness
func EstablishPDUSession(ctx context.Context, req PDUSessionRequest) error {
    sliceAttrs := SliceAttributes(req.SNSSAI.SST, req.SNSSAI.SD, req.DNN)

    ctx, span := tracer.Start(ctx, "smf.pdu_session.establish")
    defer span.End()

    // Tag the span with slice info
    span.SetAttributes(sliceAttrs...)
    span.SetAttributes(
        attribute.String("ue.supi", req.SUPI),
        attribute.String("session.type", req.SessionType),
    )

    // Select the appropriate UPF based on slice requirements
    upf, err := selectUPFForSlice(ctx, req.SNSSAI)
    if err != nil {
        span.RecordError(err)
        return err
    }
    span.SetAttribute("upf.instance_id", upf.InstanceID)

    // Apply slice-specific QoS policies
    qosProfile, err := applySliceQoS(ctx, req.SNSSAI, req.DNN)
    if err != nil {
        span.RecordError(err)
        return err
    }
    span.SetAttribute("qos.5qi", qosProfile.FiveQI)
    span.SetAttribute("qos.max_bitrate_dl", qosProfile.MaxBitrateDL)
    span.SetAttribute("qos.max_bitrate_ul", qosProfile.MaxBitrateUL)

    return nil
}
```

## Collector Configuration with Slice-Aware Processing

```yaml
# otel-collector-slicing.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s

  # Route metrics to different backends based on slice type
  # URLLC metrics go to a low-latency pipeline for real-time alerting
  routing:
    from_attribute: slice.type
    table:
      - value: "URLLC"
        exporters: [otlp/realtime, otlp/standard]
      - value: "eMBB"
        exporters: [otlp/standard]
      - value: "mMTC"
        exporters: [otlp/standard]

exporters:
  otlp/standard:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false

  otlp/realtime:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false
    # Shorter timeout for URLLC-related alerts
    timeout: 2s

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, routing]
      exporters: [otlp/standard]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/standard]
```

## SLA Monitoring Per Slice Type

Each slice type has different SLA targets. Here are recommended thresholds:

| Slice Type | Metric | SLA Target | Alert Threshold |
|---|---|---|---|
| eMBB | Throughput | > 100 Mbps DL | < 50 Mbps sustained |
| eMBB | Latency | < 10 ms | > 20 ms p99 |
| URLLC | Latency | < 1 ms | > 2 ms p99 |
| URLLC | Reliability | 99.999% | < 99.99% |
| mMTC | Device density | 1M devices/km2 | Connection failures > 1% |
| mMTC | Battery efficiency | > 10 year device life | Signaling overhead > threshold |

## Cross-Slice Correlation

The real power comes when you can correlate issues across slices. If a shared transport link degrades, you will see latency increase across all slices that use it, but the impact will be different for each. A 2ms increase might be acceptable for eMBB but catastrophic for URLLC. By having all slice metrics in a single OpenTelemetry pipeline, you can build dashboards that show this cross-slice impact and quickly identify whether an issue is slice-specific or infrastructure-wide.

With OpenTelemetry handling your slice monitoring, you get the granularity needed to enforce per-slice SLAs while maintaining a unified view of your entire 5G network.
