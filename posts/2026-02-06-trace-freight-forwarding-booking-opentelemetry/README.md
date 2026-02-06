# How to Trace Freight Forwarding Quote and Booking Workflows Across Multiple Carriers with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Freight Forwarding, Carrier Integration, Logistics

Description: Trace freight forwarding quote requests and booking workflows across multiple carrier APIs using OpenTelemetry distributed tracing.

Freight forwarding involves coordinating shipments across multiple carriers, each with their own API, rate structure, and booking workflow. When a customer requests a quote, your system fans out to several carriers in parallel, normalizes the responses, and presents the best options. Then when the customer books, you need to confirm with the selected carrier and track the shipment. OpenTelemetry helps you trace these multi-carrier interactions and identify which provider is dragging down your response times.

## Setting Up the Tracer

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("freight.forwarding")
```

## Tracing the Multi-Carrier Quote Request

The quote request is the most interesting part from a tracing perspective because it involves parallel calls to external APIs. You want to see how long each carrier takes and whether any fail.

```python
import asyncio

async def get_freight_quotes(shipment_details: dict):
    with tracer.start_as_current_span("freight.quote.request") as span:
        origin = shipment_details["origin"]
        destination = shipment_details["destination"]
        span.set_attribute("shipment.origin", origin)
        span.set_attribute("shipment.destination", destination)
        span.set_attribute("shipment.weight_kg", shipment_details["weight_kg"])
        span.set_attribute("shipment.mode", shipment_details["mode"])  # ocean, air, rail

        carriers = get_active_carriers(shipment_details["mode"])
        span.set_attribute("carriers.queried", len(carriers))

        # Fan out to all carriers in parallel
        tasks = [
            fetch_carrier_quote(carrier, shipment_details)
            for carrier in carriers
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect successful quotes and log failures
        quotes = []
        failures = 0
        for carrier, result in zip(carriers, results):
            if isinstance(result, Exception):
                failures += 1
                span.add_event("carrier_quote_failed", {
                    "carrier": carrier.name,
                    "error": str(result)
                })
            else:
                quotes.append(result)

        span.set_attribute("quotes.received", len(quotes))
        span.set_attribute("quotes.failures", failures)
        return quotes
```

## Tracing Individual Carrier API Calls

Each carrier call gets its own span so you can compare response times across providers.

```python
async def fetch_carrier_quote(carrier, shipment_details: dict):
    with tracer.start_as_current_span("freight.quote.carrier_call") as span:
        span.set_attribute("carrier.name", carrier.name)
        span.set_attribute("carrier.api_version", carrier.api_version)
        span.set_attribute("carrier.mode", carrier.transport_mode)

        # Transform our internal format to the carrier's API format
        with tracer.start_as_current_span("freight.quote.transform_request"):
            payload = carrier.transform_quote_request(shipment_details)

        # Make the actual API call
        with tracer.start_as_current_span("freight.quote.api_call") as api_span:
            api_span.set_attribute("http.method", "POST")
            api_span.set_attribute("http.url", carrier.quote_endpoint)

            response = await carrier.client.post(
                carrier.quote_endpoint,
                json=payload,
                timeout=30
            )
            api_span.set_attribute("http.status_code", response.status_code)

            if response.status_code != 200:
                api_span.set_attribute("error", True)
                raise CarrierAPIError(carrier.name, response.status_code, response.text)

        # Normalize the carrier response to our internal format
        with tracer.start_as_current_span("freight.quote.normalize_response") as norm_span:
            quote = carrier.normalize_quote_response(response.json())
            norm_span.set_attribute("quote.price_usd", quote.total_price)
            norm_span.set_attribute("quote.transit_days", quote.transit_days)
            norm_span.set_attribute("quote.valid_until", quote.expiry_date.isoformat())

        return quote
```

## Tracing the Booking Workflow

Once the customer picks a quote, the booking process kicks off. This involves confirming with the carrier, generating documentation, and setting up tracking.

```python
def book_shipment(quote_id: str, customer_id: str):
    with tracer.start_as_current_span("freight.booking") as span:
        span.set_attribute("quote.id", quote_id)
        span.set_attribute("customer.id", customer_id)

        # Load the selected quote
        quote = load_quote(quote_id)
        span.set_attribute("carrier.name", quote.carrier_name)
        span.set_attribute("shipment.mode", quote.transport_mode)

        # Confirm the booking with the carrier
        with tracer.start_as_current_span("freight.booking.carrier_confirm") as confirm_span:
            confirmation = confirm_with_carrier(quote)
            confirm_span.set_attribute("booking.reference", confirmation.reference_number)
            confirm_span.set_attribute("booking.status", confirmation.status)

            if confirmation.status != "confirmed":
                confirm_span.set_attribute("error", True)
                span.add_event("booking_rejected", {
                    "reason": confirmation.rejection_reason
                })
                raise BookingRejectedError(confirmation.rejection_reason)

        # Generate shipping documents (bill of lading, commercial invoice, etc.)
        with tracer.start_as_current_span("freight.booking.generate_docs") as docs_span:
            documents = generate_shipping_documents(quote, confirmation)
            docs_span.set_attribute("documents.count", len(documents))
            docs_span.set_attribute("documents.types", [d.doc_type for d in documents])

        # Set up shipment tracking
        with tracer.start_as_current_span("freight.booking.setup_tracking"):
            tracking = setup_shipment_tracking(
                confirmation.reference_number,
                quote.carrier_name
            )
            span.set_attribute("tracking.id", tracking.tracking_id)

        return BookingResult(
            reference=confirmation.reference_number,
            tracking_id=tracking.tracking_id,
            documents=documents
        )
```

## Metrics for Carrier Performance Comparison

Beyond traces, metrics help you compare carriers at an aggregate level.

```python
from opentelemetry import metrics

meter = metrics.get_meter("freight.forwarding")

carrier_quote_latency = meter.create_histogram(
    "freight.carrier.quote_latency_ms",
    description="Time for each carrier to return a quote",
    unit="ms"
)

carrier_quote_failures = meter.create_counter(
    "freight.carrier.quote_failures",
    description="Number of failed carrier quote requests"
)

booking_success_rate = meter.create_counter(
    "freight.booking.total",
    description="Total booking attempts by status"
)
```

## Why This Matters

Freight forwarding platforms live and die by their quoting speed and accuracy. If one carrier's API is consistently slow, it drags down your entire quote response time. If a carrier frequently rejects bookings after quoting, you need to know. With OpenTelemetry traces spanning the full quote-to-booking workflow, you can hold carriers accountable with real data and make informed decisions about which integrations to prioritize or deprecate.
