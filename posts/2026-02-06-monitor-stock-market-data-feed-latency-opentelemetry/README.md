# How to Monitor Stock Market Data Feed Latency from Exchange to Trading Platform with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Stock Market, Data Feed Latency, Trading Platform

Description: Learn how to measure and monitor stock market data feed latency from exchange to trading platform using OpenTelemetry metrics and traces.

In electronic trading, the time it takes for a market data tick to travel from the exchange to your trading platform can determine whether a trade is profitable or not. Even a few milliseconds of untracked latency can mean the difference between executing at the expected price and getting filled at a worse one. This post walks through how to instrument your market data ingestion pipeline with OpenTelemetry so you can measure, alert on, and troubleshoot feed latency in production.

## Why Feed Latency Monitoring Matters

Market data feeds from exchanges like NYSE, NASDAQ, or CME deliver price updates, order book snapshots, and trade confirmations. Your trading platform consumes these feeds, normalizes the data, and makes it available to trading algorithms. At each stage of this pipeline, latency accumulates. Without proper instrumentation, you cannot tell where delays originate or whether they are network-related, processing-related, or caused by queuing.

## Setting Up the OpenTelemetry SDK

First, configure the OpenTelemetry SDK in your market data handler service. We will use Python here, but the concepts apply to any language.

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Set up tracing
trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanExporter(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)

# Set up metrics
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=5000  # Export every 5 seconds for near-real-time visibility
)
meter_provider = MeterProvider(metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

tracer = trace.get_tracer("market-data-feed")
meter = metrics.get_meter("market-data-feed")
```

## Recording Feed Latency Metrics

The most critical metric is the time between when the exchange timestamps a tick and when your platform finishes processing it. Most exchange feeds include an exchange-originated timestamp in the message header. You compare that to the local clock when you receive and process the message.

```python
import time

# Create a histogram to track end-to-end feed latency in microseconds
feed_latency_histogram = meter.create_histogram(
    name="market_data.feed_latency_us",
    description="Latency from exchange timestamp to platform receipt in microseconds",
    unit="us"
)

# Counter for total ticks processed, broken down by feed and symbol
tick_counter = meter.create_counter(
    name="market_data.ticks_processed",
    description="Total number of market data ticks processed"
)

# Gauge for tracking the current lag (useful for dashboards)
lag_gauge = meter.create_observable_gauge(
    name="market_data.current_lag_us",
    description="Current observed lag for the most recent tick",
    callbacks=[lambda options: get_current_lag()]
)

def process_market_data_tick(tick):
    """Process a single market data tick from the exchange feed."""
    # The exchange provides its own timestamp in the tick payload
    exchange_timestamp_ns = tick.exchange_timestamp_nanos
    receive_timestamp_ns = time.time_ns()

    # Calculate raw network + processing latency
    latency_us = (receive_timestamp_ns - exchange_timestamp_ns) / 1000

    # Record the latency with relevant attributes
    feed_latency_histogram.record(
        latency_us,
        attributes={
            "exchange": tick.exchange,       # e.g., "NYSE", "NASDAQ"
            "feed_type": tick.feed_type,     # e.g., "level1", "level2"
            "symbol": tick.symbol,           # e.g., "AAPL"
        }
    )

    tick_counter.add(1, attributes={
        "exchange": tick.exchange,
        "feed_type": tick.feed_type,
    })

    return latency_us
```

## Tracing the Full Processing Pipeline

Beyond raw latency numbers, you want to understand where time is spent within your platform. A single tick goes through several stages: receive, decode, normalize, enrich, and distribute to consumers.

```python
def handle_incoming_tick(raw_bytes):
    """Full pipeline for handling an incoming market data tick."""
    with tracer.start_as_current_span("tick.receive") as receive_span:
        receive_span.set_attribute("raw_size_bytes", len(raw_bytes))

        # Stage 1: Decode the wire protocol (FIX, ITCH, etc.)
        with tracer.start_as_current_span("tick.decode") as decode_span:
            tick = decode_exchange_message(raw_bytes)
            decode_span.set_attribute("message_type", tick.msg_type)
            decode_span.set_attribute("symbol", tick.symbol)

        # Stage 2: Normalize to internal format
        with tracer.start_as_current_span("tick.normalize"):
            normalized = normalize_tick(tick)

        # Stage 3: Enrich with reference data (lot sizes, tick sizes, etc.)
        with tracer.start_as_current_span("tick.enrich"):
            enriched = enrich_with_reference_data(normalized)

        # Stage 4: Distribute to downstream consumers
        with tracer.start_as_current_span("tick.distribute") as dist_span:
            consumer_count = distribute_to_consumers(enriched)
            dist_span.set_attribute("consumer_count", consumer_count)

        # Record end-to-end latency
        process_market_data_tick(tick)
```

## Detecting Clock Skew

One practical challenge with exchange-to-platform latency measurement is clock synchronization. If your server clock drifts relative to the exchange clock, your latency numbers become unreliable. You should monitor NTP offset as an additional metric.

```python
import subprocess

def get_ntp_offset_ms():
    """Get the current NTP clock offset in milliseconds."""
    result = subprocess.run(
        ["ntpq", "-p"],
        capture_output=True, text=True
    )
    # Parse the offset from ntpq output (simplified)
    for line in result.stdout.splitlines():
        if line.startswith("*"):  # Active peer
            parts = line.split()
            return float(parts[8])  # Offset column in ms
    return 0.0

ntp_offset_gauge = meter.create_observable_gauge(
    name="system.ntp_offset_ms",
    description="NTP clock offset relative to time source",
    callbacks=[lambda options: [
        metrics.Observation(get_ntp_offset_ms())
    ]]
)
```

## Setting Up Alerts

With these metrics flowing into your observability backend, you can set up meaningful alerts. For example, you might alert when the p99 feed latency exceeds 500 microseconds for a Level 1 feed, or when the NTP offset exceeds 1 millisecond. You can also track the tick processing rate and alert if it drops below expected levels during market hours, which could indicate a feed handler crash or network partition.

## Conclusion

Monitoring market data feed latency is not optional for any serious trading operation. With OpenTelemetry, you get vendor-neutral instrumentation that captures both the high-level latency numbers and the detailed per-stage traces you need for root cause analysis. The combination of histograms for latency distribution, counters for throughput, and distributed traces for pipeline visibility gives you a complete picture of your data feed health.
