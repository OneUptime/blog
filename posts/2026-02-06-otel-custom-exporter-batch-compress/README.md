# How to Create a Custom OpenTelemetry Exporter That Batches and Compresses Data for a Non-Standard Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Exporter, Batching, Compression, SDK

Description: Create a custom OpenTelemetry exporter that batches telemetry data and compresses it before sending to a non-standard backend with a proprietary protocol.

When your backend does not speak OTLP and needs a specific wire format with custom batching and compression requirements, the standard exporters will not work. You need a custom exporter that converts OTLP data, batches it according to your backend's expectations, compresses it, and handles the network protocol. This post covers building one in Python and Go.

## When You Need a Custom Exporter

Standard exporters work when your backend speaks OTLP, Zipkin, Jaeger, or Prometheus. You need a custom exporter when:

- Your backend has a proprietary REST or gRPC API
- The data format is specific to your organization
- You need custom compression (not just gzip)
- The authentication scheme is non-standard
- Batching requirements differ from OTLP's default

## Python: Custom Batch-and-Compress Exporter

```python
# custom_exporter.py
import gzip
import json
import time
import logging
import threading
from typing import Sequence
from queue import Queue, Empty

import requests
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult
from opentelemetry.sdk.trace import ReadableSpan

logger = logging.getLogger(__name__)


class CompressedBatchExporter(SpanExporter):
    """
    Custom exporter that:
    1. Converts spans to our backend's JSON format
    2. Batches them into chunks of max_batch_size
    3. Compresses with gzip
    4. Sends via HTTP POST with our auth scheme
    """

    def __init__(
        self,
        endpoint: str,
        api_key: str,
        project_id: str,
        max_batch_size: int = 500,
        compression_level: int = 6,
        timeout: int = 30,
    ):
        self._endpoint = endpoint
        self._api_key = api_key
        self._project_id = project_id
        self._max_batch_size = max_batch_size
        self._compression_level = compression_level
        self._timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
            "Authorization": f"ApiKey {api_key}",
            "X-Project-ID": project_id,
        })
        self._shutdown = False

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        """
        Export a batch of spans. This method is called by the
        BatchSpanProcessor with a collection of finished spans.
        """
        if self._shutdown:
            return SpanExportResult.FAILURE

        try:
            # Convert spans to our backend's format
            events = self._convert_spans(spans)

            # Split into sub-batches if needed
            for i in range(0, len(events), self._max_batch_size):
                batch = events[i:i + self._max_batch_size]
                self._send_batch(batch)

            return SpanExportResult.SUCCESS

        except requests.exceptions.Timeout:
            logger.warning("Export timed out after %ds", self._timeout)
            return SpanExportResult.FAILURE

        except requests.exceptions.ConnectionError as e:
            logger.warning("Connection error during export: %s", e)
            return SpanExportResult.FAILURE

        except Exception as e:
            logger.error("Unexpected export error: %s", e, exc_info=True)
            return SpanExportResult.FAILURE

    def _convert_spans(self, spans: Sequence[ReadableSpan]) -> list:
        """Convert OpenTelemetry spans to our backend's JSON format."""
        events = []
        for span in spans:
            # Extract service name from resource
            service_name = "unknown"
            if span.resource:
                service_name = span.resource.attributes.get(
                    "service.name", "unknown"
                )

            # Calculate duration
            duration_ns = span.end_time - span.start_time
            duration_ms = duration_ns / 1_000_000

            # Build the event object our backend expects
            event = {
                "type": "span",
                "trace_id": format(span.context.trace_id, "032x"),
                "span_id": format(span.context.span_id, "016x"),
                "parent_span_id": (
                    format(span.parent.span_id, "016x")
                    if span.parent else None
                ),
                "service": service_name,
                "operation": span.name,
                "start_time_ms": span.start_time // 1_000_000,
                "duration_ms": round(duration_ms, 3),
                "status": "error" if span.status.is_ok is False else "ok",
                "status_message": span.status.description or "",
                "attributes": dict(span.attributes) if span.attributes else {},
                # Include events (like exceptions)
                "events": [
                    {
                        "name": event.name,
                        "timestamp_ms": event.timestamp // 1_000_000,
                        "attributes": dict(event.attributes) if event.attributes else {},
                    }
                    for event in span.events
                ],
            }
            events.append(event)

        return events

    def _send_batch(self, batch: list):
        """Compress and send a batch of events."""
        # Serialize to JSON
        payload = json.dumps({
            "project_id": self._project_id,
            "events": batch,
            "sent_at": int(time.time() * 1000),
        }).encode("utf-8")

        # Compress with gzip
        compressed = gzip.compress(payload, compresslevel=self._compression_level)

        # Log compression ratio for monitoring
        ratio = len(payload) / max(len(compressed), 1)
        logger.debug(
            "Sending batch: %d events, %d bytes -> %d bytes (%.1fx compression)",
            len(batch), len(payload), len(compressed), ratio,
        )

        # Send the compressed payload
        response = self._session.post(
            f"{self._endpoint}/v1/ingest",
            data=compressed,
            timeout=self._timeout,
        )

        if response.status_code >= 400:
            logger.warning(
                "Backend returned %d: %s",
                response.status_code,
                response.text[:200],
            )
            response.raise_for_status()

    def shutdown(self):
        """Clean up resources."""
        self._shutdown = True
        self._session.close()

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        """Force flush is handled by BatchSpanProcessor, not the exporter."""
        return True
```

## Using the Custom Exporter

```python
# main.py
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry import trace
import os

from custom_exporter import CompressedBatchExporter

# Create the custom exporter
exporter = CompressedBatchExporter(
    endpoint="https://analytics.mycompany.com",
    api_key=os.environ["ANALYTICS_API_KEY"],
    project_id="prod-main",
    max_batch_size=500,
    compression_level=6,
    timeout=30,
)

# Use BatchSpanProcessor for SDK-level batching
# The exporter does additional sub-batching if needed
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(
        exporter,
        max_queue_size=2048,
        max_export_batch_size=512,
        schedule_delay_millis=5000,
    )
)

trace.set_tracer_provider(provider)
```

## Go: Custom Exporter with Zstd Compression

For Go, you can use zstd compression for better ratios:

```go
// exporter.go
package customexporter

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"

    "github.com/klauspost/compress/zstd"
    "go.opentelemetry.io/otel/sdk/trace"
)

type CustomExporter struct {
    endpoint   string
    apiKey     string
    projectID  string
    client     *http.Client
    compressor *zstd.Encoder
}

func NewCustomExporter(endpoint, apiKey, projectID string) (*CustomExporter, error) {
    encoder, err := zstd.NewWriter(nil, zstd.WithEncoderLevel(zstd.SpeedDefault))
    if err != nil {
        return nil, fmt.Errorf("failed to create zstd encoder: %w", err)
    }

    return &CustomExporter{
        endpoint:   endpoint,
        apiKey:     apiKey,
        projectID:  projectID,
        client:     &http.Client{Timeout: 30 * time.Second},
        compressor: encoder,
    }, nil
}

func (e *CustomExporter) ExportSpans(ctx context.Context, spans []trace.ReadOnlySpan) error {
    if len(spans) == 0 {
        return nil
    }

    // Convert to our format
    events := make([]map[string]interface{}, 0, len(spans))
    for _, span := range spans {
        event := map[string]interface{}{
            "trace_id":   span.SpanContext().TraceID().String(),
            "span_id":    span.SpanContext().SpanID().String(),
            "operation":  span.Name(),
            "start_time": span.StartTime().UnixMilli(),
            "duration_ms": float64(span.EndTime().Sub(span.StartTime()).Microseconds()) / 1000,
        }
        events = append(events, event)
    }

    // Serialize
    payload, err := json.Marshal(map[string]interface{}{
        "project_id": e.projectID,
        "events":     events,
    })
    if err != nil {
        return fmt.Errorf("marshal failed: %w", err)
    }

    // Compress with zstd
    compressed := e.compressor.EncodeAll(payload, nil)

    // Send
    req, err := http.NewRequestWithContext(
        ctx, "POST",
        e.endpoint+"/v1/ingest",
        bytes.NewReader(compressed),
    )
    if err != nil {
        return err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Content-Encoding", "zstd")
    req.Header.Set("Authorization", "ApiKey "+e.apiKey)

    resp, err := e.client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("backend returned %d", resp.StatusCode)
    }

    return nil
}

func (e *CustomExporter) Shutdown(ctx context.Context) error {
    e.compressor.Close()
    e.client.CloseIdleConnections()
    return nil
}
```

## Compression Comparison

Different compression algorithms have different trade-offs:

```
Algorithm | Ratio  | Speed     | Best For
----------|--------|-----------|------------------
gzip -1   | 3-5x   | Fast      | CPU-constrained environments
gzip -6   | 5-8x   | Medium    | General purpose (default)
gzip -9   | 6-9x   | Slow      | Network-constrained, CPU available
zstd      | 5-10x  | Fast      | Best ratio-to-speed trade-off
lz4       | 2-3x   | Very fast | Ultra-low latency required
```

For telemetry data (highly repetitive JSON), zstd at default level typically achieves 8-10x compression while being faster than gzip level 6.

## Testing the Exporter

```python
# test_exporter.py
from unittest.mock import patch, MagicMock
from custom_exporter import CompressedBatchExporter
from opentelemetry.sdk.trace.export import SpanExportResult

def test_successful_export(mock_spans):
    with patch("requests.Session.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=200)

        exporter = CompressedBatchExporter(
            endpoint="http://localhost:8080",
            api_key="test-key",
            project_id="test",
        )

        result = exporter.export(mock_spans)
        assert result == SpanExportResult.SUCCESS
        assert mock_post.called

        # Verify the payload was compressed
        call_args = mock_post.call_args
        assert call_args.kwargs.get("data") is not None

def test_handles_timeout():
    with patch("requests.Session.post", side_effect=requests.Timeout):
        exporter = CompressedBatchExporter(
            endpoint="http://localhost:8080",
            api_key="test-key",
            project_id="test",
        )
        result = exporter.export(mock_spans)
        assert result == SpanExportResult.FAILURE
```

## Wrapping Up

Building a custom exporter with batching and compression gives you full control over the wire format and network protocol. The key decisions are choosing the right compression algorithm (zstd is usually the best default), sizing your batches to match your backend's ingestion limits, and handling failures gracefully. Pair your custom exporter with the standard BatchSpanProcessor for SDK-level batching, and let the exporter handle any additional sub-batching your backend requires.
