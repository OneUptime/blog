# How to Monitor EHR System (Epic, Cerner) Integration Performance with OpenTelemetry Custom Receivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, EHR, Epic, Cerner

Description: Build custom OpenTelemetry receivers to monitor the performance of Epic and Cerner EHR system integrations in real time.

Integrating with Electronic Health Record (EHR) systems like Epic and Cerner is one of the most complex parts of building healthcare software. These systems expose APIs, message queues, and proprietary protocols, and when something goes wrong, you need to know exactly where the bottleneck is. Was it the Epic FHIR API returning slowly? Was the Cerner HL7 feed backed up? Did your transformation layer choke on a large bundle?

This post covers building custom OpenTelemetry receivers that pull performance data directly from your EHR integration points and convert them into traces and metrics your observability stack can use.

## Why Custom Receivers?

Epic and Cerner integrations do not speak OTLP natively. Your integration engine (Mirth Connect, Rhapsody, or custom code) sits between your systems and the EHR, and it is the perfect place to capture telemetry. A custom OpenTelemetry Collector receiver can poll these integration engines, scrape their metrics endpoints, or consume their log streams.

## Building a Custom Receiver for Epic API Monitoring

Let us build a custom receiver in Go that monitors Epic FHIR API response times by wrapping the HTTP client:

```go
package epicreceiver

import (
    "context"
    "net/http"
    "time"

    "go.opentelemetry.io/collector/component"
    "go.opentelemetry.io/collector/consumer"
    "go.opentelemetry.io/collector/pdata/pmetric"
    "go.opentelemetry.io/collector/receiver"
)

// Config holds the configuration for the Epic receiver
type Config struct {
    // EpicBaseURL is the base URL of the Epic FHIR API
    EpicBaseURL string `mapstructure:"epic_base_url"`
    // PollInterval controls how often we check the API health
    PollInterval time.Duration `mapstructure:"poll_interval"`
    // Endpoints is the list of FHIR endpoints to monitor
    Endpoints []string `mapstructure:"endpoints"`
}

type epicReceiver struct {
    config       *Config
    nextConsumer consumer.Metrics
    client       *http.Client
    cancel       context.CancelFunc
}

func newEpicReceiver(cfg *Config, next consumer.Metrics) *epicReceiver {
    return &epicReceiver{
        config:       cfg,
        nextConsumer: next,
        client: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

// Start begins polling the Epic API endpoints
func (r *epicReceiver) Start(ctx context.Context, host component.Host) error {
    pollCtx, cancel := context.WithCancel(ctx)
    r.cancel = cancel

    go r.pollLoop(pollCtx)
    return nil
}

func (r *epicReceiver) pollLoop(ctx context.Context) {
    ticker := time.NewTicker(r.config.PollInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            r.collectMetrics(ctx)
        }
    }
}
```

## Collecting Metrics from Each EHR Endpoint

The core metric collection function measures response time and status for each configured FHIR endpoint:

```go
func (r *epicReceiver) collectMetrics(ctx context.Context) {
    metrics := pmetric.NewMetrics()
    rm := metrics.ResourceMetrics().AppendEmpty()

    // Set resource attributes identifying this as an EHR integration
    rm.Resource().Attributes().PutStr("ehr.system", "epic")
    rm.Resource().Attributes().PutStr("ehr.base_url", r.config.EpicBaseURL)

    sm := rm.ScopeMetrics().AppendEmpty()
    sm.Scope().SetName("ehr.epic.receiver")

    for _, endpoint := range r.config.Endpoints {
        url := r.config.EpicBaseURL + endpoint

        start := time.Now()
        resp, err := r.client.Get(url)
        duration := time.Since(start)

        // Record response time metric
        latencyMetric := sm.Metrics().AppendEmpty()
        latencyMetric.SetName("ehr.api.response_time_ms")
        latencyMetric.SetUnit("ms")

        gauge := latencyMetric.SetEmptyGauge()
        dp := gauge.DataPoints().AppendEmpty()
        dp.SetDoubleValue(float64(duration.Milliseconds()))
        dp.SetTimestamp(pmetric.Timestamp(time.Now().UnixNano()))
        dp.Attributes().PutStr("ehr.endpoint", endpoint)

        if err != nil {
            dp.Attributes().PutStr("ehr.status", "error")
            dp.Attributes().PutStr("ehr.error", err.Error())
        } else {
            dp.Attributes().PutInt("http.status_code", int64(resp.StatusCode))
            dp.Attributes().PutStr("ehr.status", "ok")
            resp.Body.Close()
        }
    }

    // Send metrics to the next consumer in the pipeline
    r.nextConsumer.ConsumeMetrics(ctx, metrics)
}
```

## Collector Configuration for the Custom Receiver

Once your custom receiver is compiled into the collector, configure it alongside standard receivers:

```yaml
# otel-collector-config.yaml
receivers:
  # Custom Epic EHR receiver
  epic:
    epic_base_url: "https://epic.yourhospital.org/interconnect-fhir-r4"
    poll_interval: 30s
    endpoints:
      - "/api/FHIR/R4/metadata"
      - "/api/FHIR/R4/Patient"
      - "/api/FHIR/R4/Observation"
      - "/api/FHIR/R4/Encounter"

  # Custom Cerner EHR receiver (similar pattern)
  cerner:
    cerner_base_url: "https://fhir.cerner.com/r4/tenant-id"
    poll_interval: 30s
    endpoints:
      - "/metadata"
      - "/Patient"
      - "/Condition"

processors:
  batch:
    timeout: 10s

  # Add EHR-specific resource attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
      - key: service.name
        value: ehr-integration-monitor
        action: insert

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"

service:
  pipelines:
    metrics:
      receivers: [epic, cerner]
      processors: [resource, batch]
      exporters: [otlp]
```

## Monitoring Mirth Connect Integration Engine

Many hospitals use Mirth Connect as their integration engine. You can scrape Mirth's REST API for channel statistics:

```python
import requests
import time
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up the meter for Mirth Connect metrics
reader = PeriodicExportingMetricReader(OTLPMetricExporter(endpoint="localhost:4317"))
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)
meter = metrics.get_meter("mirth-connect-monitor", "1.0.0")

# Create instruments for tracking channel performance
channel_message_count = meter.create_counter(
    "mirth.channel.messages_total",
    description="Total messages processed per channel",
    unit="messages"
)

channel_error_count = meter.create_counter(
    "mirth.channel.errors_total",
    description="Total errors per channel",
    unit="errors"
)

channel_queue_depth = meter.create_up_down_counter(
    "mirth.channel.queue_depth",
    description="Current queue depth per channel",
    unit="messages"
)

def poll_mirth_statistics(mirth_url, api_key):
    """Poll Mirth Connect for channel statistics and record as OTel metrics."""
    headers = {"X-Requested-With": "OpenTelemetry", "Authorization": f"Bearer {api_key}"}
    resp = requests.get(f"{mirth_url}/api/channels/statistics", headers=headers)
    stats = resp.json()

    for channel in stats.get("list", {}).get("channelStatistics", []):
        channel_id = channel["channelId"]
        channel_name = channel.get("channelName", channel_id)
        attrs = {"mirth.channel.id": channel_id, "mirth.channel.name": channel_name}

        received = int(channel.get("received", 0))
        errored = int(channel.get("error", 0))
        queued = int(channel.get("queued", 0))

        channel_message_count.add(received, attrs)
        channel_error_count.add(errored, attrs)
        channel_queue_depth.add(queued, attrs)
```

## What to Alert On

With these metrics flowing into your observability backend, set up alerts for the scenarios that actually matter in EHR integrations: API response times exceeding 5 seconds (Epic SLAs typically require sub-second responses for reads), error rates above 1% on any endpoint, and Mirth Connect queue depths that keep growing (indicating a downstream system is not consuming messages). These are the early warning signs that an integration is about to cause clinical workflow disruptions.
