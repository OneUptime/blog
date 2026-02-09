# How to Monitor 5G Core Network Function (AMF, SMF, UPF) Performance with OpenTelemetry and NWDAF Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, 5G, NWDAF, Telecommunications, Network Functions

Description: Learn how to monitor 5G core network functions like AMF, SMF, and UPF using OpenTelemetry with NWDAF integration for real-time analytics.

The 5G core network is built on a service-based architecture (SBA) where each network function (NF) exposes services through well-defined APIs. Monitoring the performance of these functions is critical for maintaining quality of service. In this post, we will walk through how to instrument AMF (Access and Mobility Management Function), SMF (Session Management Function), and UPF (User Plane Function) with OpenTelemetry, and feed that data into NWDAF (Network Data Analytics Function) for intelligent analysis.

## Understanding the 5G Core NF Monitoring Landscape

Each network function in the 5G core has distinct performance indicators:

- **AMF**: Registration success rate, handover latency, N1/N2 message processing time
- **SMF**: PDU session establishment time, policy enforcement latency, session modification rate
- **UPF**: Packet throughput, GTP tunnel setup time, buffering queue depth

NWDAF sits as the analytics layer in the 3GPP architecture and can consume telemetry from these NFs to provide load-level predictions and anomaly detection.

## Setting Up the OpenTelemetry Collector for 5G NFs

First, configure the OpenTelemetry Collector to receive metrics from your 5G core NFs. Most modern 5G cores expose Prometheus-compatible endpoints, which the collector can scrape.

```yaml
# otel-collector-config.yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        # Scrape AMF metrics endpoint
        - job_name: 'amf-metrics'
          scrape_interval: 10s
          static_configs:
            - targets: ['amf-service:9090']
              labels:
                nf_type: 'AMF'
                nf_instance_id: 'amf-001'

        # Scrape SMF metrics endpoint
        - job_name: 'smf-metrics'
          scrape_interval: 10s
          static_configs:
            - targets: ['smf-service:9090']
              labels:
                nf_type: 'SMF'
                nf_instance_id: 'smf-001'

        # Scrape UPF metrics endpoint
        - job_name: 'upf-metrics'
          scrape_interval: 5s  # UPF needs tighter intervals for throughput monitoring
          static_configs:
            - targets: ['upf-service:9090']
              labels:
                nf_type: 'UPF'
                nf_instance_id: 'upf-001'

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

  # Add 3GPP-specific resource attributes
  resource:
    attributes:
      - key: network.plmn_id
        value: "310260"
        action: upsert
      - key: network.slice.sst
        value: 1
        action: upsert

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false
      cert_file: /certs/client.crt
      key_file: /certs/client.key

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [batch, resource]
      exporters: [otlp]
```

## Instrumenting AMF Registration Flows

If you have access to the AMF application code (common with open-source cores like Open5GS or free5GC), you can add custom spans around the registration procedure.

```go
package amf

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

var (
    tracer = otel.Tracer("amf.registration")
    meter  = otel.Meter("amf.registration")
)

// Track registration attempts and outcomes
var (
    registrationCounter metric.Int64Counter
    registrationLatency metric.Float64Histogram
)

func initMetrics() {
    var err error

    // Count successful and failed registrations
    registrationCounter, err = meter.Int64Counter(
        "amf.registration.count",
        metric.WithDescription("Number of UE registration attempts"),
        metric.WithUnit("{registration}"),
    )
    if err != nil {
        panic(err)
    }

    // Measure the time from initial request to registration complete
    registrationLatency, err = meter.Float64Histogram(
        "amf.registration.latency",
        metric.WithDescription("Time to complete UE registration"),
        metric.WithUnit("ms"),
        metric.WithExplicitBucketBoundaries(10, 25, 50, 100, 250, 500, 1000),
    )
    if err != nil {
        panic(err)
    }
}

// HandleRegistrationRequest processes a UE registration request
func HandleRegistrationRequest(ctx context.Context, supi string, sliceInfo SliceInfo) error {
    ctx, span := tracer.Start(ctx, "amf.registration.request")
    defer span.End()

    // Attach subscriber and slice context to the span
    span.SetAttributes(
        attribute.String("ue.supi", supi),
        attribute.Int("slice.sst", sliceInfo.SST),
        attribute.String("slice.sd", sliceInfo.SD),
    )

    start := time.Now()

    // Step 1: Authentication with AUSF
    err := authenticateUE(ctx, supi)
    if err != nil {
        registrationCounter.Add(ctx, 1, metric.WithAttributes(
            attribute.String("result", "auth_failed"),
        ))
        span.RecordError(err)
        return err
    }

    // Step 2: Security context setup
    err = setupSecurityContext(ctx, supi)
    if err != nil {
        registrationCounter.Add(ctx, 1, metric.WithAttributes(
            attribute.String("result", "security_failed"),
        ))
        span.RecordError(err)
        return err
    }

    // Record successful registration
    elapsed := float64(time.Since(start).Milliseconds())
    registrationLatency.Record(ctx, elapsed)
    registrationCounter.Add(ctx, 1, metric.WithAttributes(
        attribute.String("result", "success"),
    ))

    return nil
}
```

## Feeding Data into NWDAF

NWDAF consumes analytics data through the Nnwdaf interface. You can bridge OpenTelemetry data to NWDAF by building an exporter that translates OTLP metrics into the 3GPP-defined event subscription format.

```python
# nwdaf_bridge.py
import requests
from opentelemetry.sdk.metrics.export import MetricReader

class NWDAFMetricBridge:
    """Bridges OpenTelemetry metrics to NWDAF analytics subscription format."""

    def __init__(self, nwdaf_endpoint: str, nf_instance_id: str):
        self.nwdaf_endpoint = nwdaf_endpoint
        self.nf_instance_id = nf_instance_id

    def send_load_level(self, nf_type: str, cpu_usage: float,
                         memory_usage: float, active_sessions: int):
        """Send NF load level info per 3GPP TS 29.520."""
        payload = {
            "nfInstanceId": self.nf_instance_id,
            "nfType": nf_type,
            "nfLoadLevelInformation": {
                "nfCpuUsage": int(cpu_usage),
                "nfMemoryUsage": int(memory_usage),
                "nfStorageUsage": 0,
                "currentLoad": active_sessions,
            }
        }

        # Post to NWDAF analytics info endpoint
        resp = requests.post(
            f"{self.nwdaf_endpoint}/nnwdaf-analyticsinfo/v1/analytics",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        resp.raise_for_status()
```

## Key Metrics to Track

Here is a summary of the most important metrics you should capture for each NF:

| Network Function | Metric Name | Unit | Description |
|---|---|---|---|
| AMF | `amf.registration.latency` | ms | Time for full registration procedure |
| AMF | `amf.handover.success_rate` | ratio | Successful inter-gNB handovers |
| SMF | `smf.pdu_session.setup_time` | ms | PDU session establishment duration |
| SMF | `smf.policy.enforcement_latency` | ms | Time to apply PCF policy rules |
| UPF | `upf.throughput.uplink` | bytes/s | Uplink data throughput |
| UPF | `upf.throughput.downlink` | bytes/s | Downlink data throughput |
| UPF | `upf.gtp.tunnel_setup_time` | ms | GTP-U tunnel creation time |

## Wrapping Up

Combining OpenTelemetry instrumentation with NWDAF gives you two layers of visibility: raw telemetry data for debugging and alerting, and ML-driven analytics from NWDAF for capacity planning and anomaly detection. Start by scraping existing Prometheus endpoints from your 5G core, then progressively add custom instrumentation to the NFs that matter most to your SLA targets. The combination of distributed tracing across NF-to-NF interactions and fine-grained metrics gives you the full picture of your 5G core health.
