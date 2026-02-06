# How to Trace SCADA System Command and Control Flows with OpenTelemetry While Maintaining Air-Gap Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SCADA, Industrial Security, Air-Gap, OT Security

Description: A guide to tracing SCADA command and control flows with OpenTelemetry without compromising air-gap network isolation requirements.

SCADA (Supervisory Control and Data Acquisition) systems control critical infrastructure: water treatment, power grids, manufacturing lines. These systems live behind air-gapped networks for good reason. Connecting them to the internet is a non-starter from a security standpoint. But you still need observability into command flows, especially when operators issue control commands and need to verify they executed correctly across remote terminal units (RTUs).

This post walks through a practical approach to getting OpenTelemetry tracing into a SCADA environment without punching holes in your air gap.

## The Architecture Challenge

In a typical SCADA setup, the Human-Machine Interface (HMI) sends commands to a master station, which communicates with RTUs or PLCs over protocols like Modbus or DNP3. The entire control network is isolated from the corporate IT network.

OpenTelemetry normally expects network connectivity to export telemetry data. We need to work around that constraint.

## Strategy: One-Way Data Diode Export

The key is a data diode, a hardware device that enforces one-way data flow from the OT network to the IT network. Telemetry data flows out; nothing flows back in.

```
[SCADA Network]  -->  [Data Diode]  -->  [IT Network]  -->  [OTel Collector]
   (air-gapped)      (one-way only)      (connected)        (exports to backend)
```

## Instrumenting the SCADA Command Gateway

On the OT side, instrument the command gateway that sits between the HMI and the master station. Here is a Python example:

```python
import time
import json
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult

class FileSpanExporter(SpanExporter):
    """
    Exports spans to a local file instead of over the network.
    The data diode agent picks up these files and transfers them
    to the IT side in one direction only.
    """
    def __init__(self, output_dir="/var/scada/telemetry/outbox"):
        self.output_dir = output_dir

    def export(self, spans):
        for span in spans:
            # Write each span as a JSON file that the diode agent will pick up
            filename = f"{self.output_dir}/{span.context.trace_id}_{span.context.span_id}.json"
            span_data = {
                "trace_id": format(span.context.trace_id, '032x'),
                "span_id": format(span.context.span_id, '016x'),
                "parent_span_id": format(span.parent.span_id, '016x') if span.parent else None,
                "name": span.name,
                "start_time": span.start_time,
                "end_time": span.end_time,
                "attributes": dict(span.attributes) if span.attributes else {},
                "status": span.status.status_code.name
            }
            with open(filename, "w") as f:
                json.dump(span_data, f)
        return SpanExportResult.SUCCESS

    def shutdown(self):
        pass

# Set up tracing with file-based export
provider = TracerProvider()
# Use SimpleSpanProcessor for immediate export -- we want command traces written right away
provider.add_span_processor(SimpleSpanProcessor(FileSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("scada-command-gateway")
```

## Tracing a Control Command

When an operator issues a command from the HMI, trace the full lifecycle:

```python
def execute_scada_command(command_type, target_rtu, parameters):
    """
    Trace a SCADA command from operator initiation through RTU execution.
    """
    with tracer.start_as_current_span("scada.command.execute") as root_span:
        root_span.set_attribute("scada.command.type", command_type)
        root_span.set_attribute("scada.target.rtu", target_rtu)
        root_span.set_attribute("scada.operator.station", get_operator_station())

        # Phase 1: Validate the command against safety interlocks
        with tracer.start_as_current_span("scada.command.validate") as validate_span:
            is_valid, reason = check_safety_interlocks(command_type, target_rtu, parameters)
            validate_span.set_attribute("scada.validation.result", "pass" if is_valid else "fail")
            if not is_valid:
                validate_span.set_attribute("scada.validation.reason", reason)
                return {"status": "rejected", "reason": reason}

        # Phase 2: Send command to master station
        with tracer.start_as_current_span("scada.command.send") as send_span:
            send_start = time.monotonic()
            result = master_station.send_command(target_rtu, command_type, parameters)
            send_duration_ms = (time.monotonic() - send_start) * 1000
            send_span.set_attribute("scada.send.duration_ms", send_duration_ms)
            send_span.set_attribute("scada.send.protocol", "dnp3")

        # Phase 3: Wait for RTU acknowledgment
        with tracer.start_as_current_span("scada.command.ack_wait") as ack_span:
            ack = wait_for_rtu_ack(target_rtu, timeout=5.0)
            ack_span.set_attribute("scada.ack.received", ack is not None)
            if ack:
                ack_span.set_attribute("scada.ack.latency_ms", ack.latency_ms)

        return result
```

## The IT-Side Collector

On the IT network side, run a custom receiver that reads the span files deposited by the data diode:

```python
import os
import json
import time
import requests

DIODE_OUTPUT_DIR = "/var/diode/received/telemetry"
OTEL_COLLECTOR_URL = "http://otel-collector:4318/v1/traces"

def poll_and_forward():
    """
    Poll the diode output directory for new span files
    and forward them to the OTel Collector via OTLP HTTP.
    """
    while True:
        for filename in os.listdir(DIODE_OUTPUT_DIR):
            filepath = os.path.join(DIODE_OUTPUT_DIR, filename)
            try:
                with open(filepath) as f:
                    span_data = json.load(f)
                # Convert to OTLP format and forward
                otlp_payload = convert_to_otlp(span_data)
                response = requests.post(
                    OTEL_COLLECTOR_URL,
                    json=otlp_payload,
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    os.remove(filepath)  # Clean up after successful export
            except Exception as e:
                print(f"Error processing {filename}: {e}")
        time.sleep(1)  # Poll every second
```

## Security Considerations

A few things to keep in mind:

- **Sanitize span attributes**: Before writing to the diode outbox, strip any attributes that could leak sensitive control parameters. You do not want command payloads with setpoint values ending up in your IT-side observability platform.
- **Rate limit the exporter**: If something goes wrong and spans accumulate, you do not want to saturate the data diode. Set a hard cap on files per second.
- **Validate on the IT side**: The IT-side collector should validate incoming JSON strictly. Treat anything from the diode as untrusted input even though it originated from your own systems.
- **No trace context propagation back**: Standard OpenTelemetry context propagation is bidirectional. In this setup, you must never inject trace context back into the OT network. The spans on the OT side generate their own trace IDs locally.

## What You Get

With this setup, you can see the full lifecycle of SCADA commands in your observability backend: how long validation took, whether the master station forwarded the command promptly, whether the RTU acknowledged it. All of this without any inbound network path to your SCADA systems.

The latency between when a span is generated and when it appears in your dashboard will be slightly higher due to the file-based transfer through the diode, typically a few seconds. That is acceptable for operational monitoring of command flows.
