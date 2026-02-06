# How to Monitor SMS Gateway Message Delivery Latency and Failure Rates with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SMS, Gateway, Monitoring, Telecommunications

Description: Monitor SMS gateway performance including message delivery latency and failure rates using OpenTelemetry metrics and traces.

SMS remains a critical channel for two-factor authentication, alerts, and notifications. When your SMS gateway slows down or starts dropping messages, the impact is immediate. In this post, we will build observability into an SMS gateway using OpenTelemetry so you can track delivery latency, failure rates, and throughput in real time.

## SMS Gateway Architecture

A typical SMS gateway handles the flow between your application and the mobile network:

1. Application submits a message via API (HTTP or SMPP)
2. Gateway validates, queues, and routes the message
3. Message is sent to the SMSC (Short Message Service Center) via SMPP
4. SMSC delivers to the handset
5. Delivery receipt (DLR) comes back through the chain

Each of these stages can introduce latency or failures, and we want visibility into all of them.

## Instrumenting the SMS Gateway with OpenTelemetry

Let's instrument a Python-based SMS gateway that accepts messages over HTTP and forwards them via SMPP.

```python
# sms_gateway.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import time
import uuid

tracer = trace.get_tracer("sms.gateway")
meter = metrics.get_meter("sms.gateway")

# Track end-to-end delivery latency
delivery_latency = meter.create_histogram(
    "sms.delivery.latency",
    description="Time from submission to delivery confirmation",
    unit="ms",
)

# Count messages by status
message_counter = meter.create_counter(
    "sms.message.count",
    description="Total SMS messages processed",
    unit="{message}",
)

# Track queue depth
queue_depth = meter.create_up_down_counter(
    "sms.queue.depth",
    description="Current number of messages waiting in queue",
    unit="{message}",
)

# Track SMPP connection health
smpp_connection_errors = meter.create_counter(
    "sms.smpp.connection_errors",
    description="Number of SMPP connection failures",
    unit="{error}",
)

# Store pending messages for DLR correlation
pending_messages = {}


def submit_message(sender: str, recipient: str, body: str) -> str:
    """Accept an SMS submission from the application layer."""
    message_id = str(uuid.uuid4())

    # Create a root span covering the full message lifecycle
    with tracer.start_as_current_span("sms.submit") as span:
        span.set_attributes({
            "sms.message_id": message_id,
            "sms.sender": sender,
            "sms.recipient_prefix": recipient[:5] + "***",  # mask for privacy
            "sms.body_length": len(body),
            "sms.encoding": detect_encoding(body),
        })

        # Validate the message
        validation_ok = validate_message(sender, recipient, body)
        if not validation_ok:
            span.set_status(StatusCode.ERROR, "Validation failed")
            message_counter.add(1, {"status": "validation_failed"})
            return None

        # Enqueue for sending
        queue_depth.add(1)
        enqueue_time = time.time()

        pending_messages[message_id] = {
            "submit_time": enqueue_time,
            "span_context": span.get_span_context(),
            "recipient_mcc_mnc": get_mcc_mnc(recipient),
        }

        message_counter.add(1, {"status": "queued"})
        span.add_event("sms.queued", {"queue.position": get_queue_size()})

    return message_id


def send_via_smpp(message_id: str, message: dict):
    """Send a queued message through the SMPP connection."""
    with tracer.start_as_current_span("sms.smpp.send") as span:
        span.set_attributes({
            "sms.message_id": message_id,
            "smpp.system_id": get_smpp_system_id(),
            "smpp.dest_ton": message.get("dest_ton", 1),
            "smpp.dest_npi": message.get("dest_npi", 1),
        })

        queue_depth.add(-1)  # message leaves the queue

        try:
            # Submit to SMSC over SMPP
            smpp_response = smpp_client.submit_sm(
                source_addr=message["sender"],
                destination_addr=message["recipient"],
                short_message=message["body"],
            )

            span.set_attribute("smpp.message_id", smpp_response.message_id)
            span.set_attribute("smpp.command_status", smpp_response.status)

            if smpp_response.status != 0:
                span.set_status(StatusCode.ERROR,
                    f"SMPP error: {smpp_response.status}")
                message_counter.add(1, {"status": "smpp_error"})
            else:
                message_counter.add(1, {"status": "submitted_to_smsc"})

        except ConnectionError as e:
            smpp_connection_errors.add(1, {
                "smpp.host": smpp_client.host,
            })
            span.record_exception(e)
            span.set_status(StatusCode.ERROR, "SMPP connection failed")
            message_counter.add(1, {"status": "connection_error"})


def handle_delivery_receipt(dlr):
    """Process an incoming delivery receipt from the SMSC."""
    message_id = dlr.get("message_id")

    with tracer.start_as_current_span("sms.dlr.received") as span:
        span.set_attributes({
            "sms.message_id": message_id,
            "sms.dlr.status": dlr["status"],
            "sms.dlr.error_code": dlr.get("err", "000"),
        })

        if message_id in pending_messages:
            submit_time = pending_messages[message_id]["submit_time"]
            latency_ms = (time.time() - submit_time) * 1000

            # Record the end-to-end delivery latency
            delivery_latency.record(latency_ms, {
                "sms.dlr.status": dlr["status"],
                "sms.route": pending_messages[message_id].get("recipient_mcc_mnc", "unknown"),
            })

            if dlr["status"] == "DELIVRD":
                message_counter.add(1, {"status": "delivered"})
            elif dlr["status"] == "UNDELIV":
                message_counter.add(1, {"status": "undelivered"})
                span.set_status(StatusCode.ERROR, "Message undelivered")
            elif dlr["status"] == "EXPIRED":
                message_counter.add(1, {"status": "expired"})

            del pending_messages[message_id]
```

## Collector Configuration for SMS Metrics

Configure the OpenTelemetry Collector to receive and process SMS gateway telemetry.

```yaml
# otel-collector-sms.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s

  # Group metrics by carrier route for per-route analysis
  groupbyattrs:
    keys:
      - sms.route
      - sms.dlr.status

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch, groupbyattrs]
      exporters: [otlp]
```

## Alerting Rules

Set up these alerts based on your SMS gateway telemetry:

- **Delivery rate drops below 95%**: Compare `delivered` count against `submitted_to_smsc` over a 5-minute window.
- **Average delivery latency exceeds 30 seconds**: Most SMS should arrive within 10 seconds on domestic routes.
- **SMPP connection error rate spikes**: More than 3 connection errors in a minute warrants immediate investigation.
- **Queue depth grows continuously**: If the queue depth is only going up, your SMPP throughput cannot keep up with inbound volume.

## Per-Route Analysis

One of the biggest advantages of this instrumentation is per-route visibility. By tagging messages with the MCC/MNC (Mobile Country Code / Mobile Network Code) of the recipient, you can break down delivery latency and failure rates by carrier. This is invaluable when a specific carrier starts having issues, as you will see the degradation isolated to that route rather than across the whole system.

Feeding all of this into OneUptime lets you build dashboards that show delivery SLA compliance per route and per time window, giving your operations team the data they need to make routing decisions and escalate to carrier partners with evidence.
