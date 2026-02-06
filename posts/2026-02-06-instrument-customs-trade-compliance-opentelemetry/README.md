# How to Instrument Customs Declaration and Trade Compliance Validation with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Customs Declaration, Trade Compliance, International Logistics

Description: Instrument customs declaration processing and trade compliance validation workflows with OpenTelemetry for full audit trail visibility.

International shipments must clear customs, and that involves a chain of validations: HS code classification, duty calculation, restricted party screening, country-of-origin verification, and document submission to government portals. Any step can fail or stall, holding up goods at the border. OpenTelemetry tracing gives you visibility into every stage of customs processing and, equally important, an audit trail that regulators expect.

## Setting Up Tracing for Customs Services

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

tracer = trace.get_tracer("customs.compliance")
```

## Tracing the Full Declaration Workflow

A customs declaration starts with classifying goods and ends with submission to the customs authority. Here is how to trace the entire flow.

```python
def process_customs_declaration(shipment_id: str, goods: list, origin: str, destination: str):
    with tracer.start_as_current_span("customs.declaration") as span:
        span.set_attribute("shipment.id", shipment_id)
        span.set_attribute("origin.country", origin)
        span.set_attribute("destination.country", destination)
        span.set_attribute("goods.line_items", len(goods))

        # Step 1: Classify goods with HS codes
        with tracer.start_as_current_span("customs.hs_classification") as hs_span:
            classifications = []
            for item in goods:
                hs_code = classify_hs_code(item)
                classifications.append({
                    "description": item["description"],
                    "hs_code": hs_code.code,
                    "confidence": hs_code.confidence
                })
                if hs_code.confidence < 0.85:
                    hs_span.add_event("low_confidence_classification", {
                        "item": item["description"],
                        "hs_code": hs_code.code,
                        "confidence": hs_code.confidence
                    })
            hs_span.set_attribute("classification.low_confidence_count",
                sum(1 for c in classifications if c["confidence"] < 0.85))

        # Step 2: Calculate duties and taxes
        with tracer.start_as_current_span("customs.duty_calculation") as duty_span:
            duties = calculate_duties(classifications, origin, destination)
            duty_span.set_attribute("duty.total_amount", duties.total_amount)
            duty_span.set_attribute("duty.currency", duties.currency)
            duty_span.set_attribute("duty.trade_agreement_applied", duties.trade_agreement)

        # Step 3: Restricted party screening
        with tracer.start_as_current_span("customs.restricted_party_screen") as screen_span:
            screening_result = screen_restricted_parties(shipment_id)
            screen_span.set_attribute("screening.lists_checked", screening_result.lists_checked)
            screen_span.set_attribute("screening.matches_found", screening_result.match_count)
            screen_span.set_attribute("screening.cleared", screening_result.cleared)

            if not screening_result.cleared:
                screen_span.add_event("restricted_party_match", {
                    "matched_list": screening_result.matched_list,
                    "entity": screening_result.matched_entity
                })
                hold_shipment(shipment_id, "restricted_party_match")
                return

        # Step 4: Validate country-of-origin documentation
        with tracer.start_as_current_span("customs.origin_validation") as origin_span:
            origin_check = validate_country_of_origin(goods, origin)
            origin_span.set_attribute("origin.certificates_valid", origin_check.valid)
            origin_span.set_attribute("origin.preferential_treatment", origin_check.preferential)

        # Step 5: Submit declaration to customs authority
        with tracer.start_as_current_span("customs.submit_declaration") as submit_span:
            declaration = build_declaration_document(
                shipment_id, classifications, duties, screening_result, origin_check
            )
            submission = submit_to_customs_authority(declaration, destination)
            submit_span.set_attribute("submission.authority", submission.authority_name)
            submit_span.set_attribute("submission.reference_number", submission.reference)
            submit_span.set_attribute("submission.status", submission.status)
            submit_span.set_attribute("http.status_code", submission.http_status)

        span.set_attribute("declaration.status", submission.status)
        return submission
```

## Tracing the Restricted Party Screening in Detail

Restricted party screening is critical and time-sensitive. You query multiple government lists (OFAC, BIS Entity List, EU Sanctions) and need to track the response from each.

```python
def screen_restricted_parties(shipment_id: str):
    with tracer.start_as_current_span("customs.screening.execute") as span:
        parties = get_shipment_parties(shipment_id)  # shipper, consignee, notify party
        span.set_attribute("parties.count", len(parties))

        screening_lists = ["OFAC_SDN", "BIS_ENTITY", "EU_SANCTIONS", "UN_CONSOLIDATED"]
        results = []

        for list_name in screening_lists:
            with tracer.start_as_current_span("customs.screening.check_list") as list_span:
                list_span.set_attribute("screening.list_name", list_name)
                list_span.set_attribute("screening.parties_checked", len(parties))

                matches = query_screening_list(list_name, parties)
                list_span.set_attribute("screening.matches", len(matches))

                for match in matches:
                    list_span.add_event("screening_match", {
                        "list": list_name,
                        "party_name": match.party_name,
                        "match_score": match.score
                    })
                results.extend(matches)

        span.set_attribute("screening.total_matches", len(results))
        return ScreeningResult(
            lists_checked=len(screening_lists),
            match_count=len(results),
            cleared=len(results) == 0
        )
```

## Metrics for Compliance Operations

```python
from opentelemetry import metrics

meter = metrics.get_meter("customs.compliance")

declarations_submitted = meter.create_counter(
    "customs.declarations.submitted",
    description="Total customs declarations submitted"
)

screening_duration = meter.create_histogram(
    "customs.screening.duration_ms",
    description="Time to complete restricted party screening",
    unit="ms"
)

hs_classification_confidence = meter.create_histogram(
    "customs.hs_classification.confidence",
    description="Confidence score distribution for HS code classifications"
)

declarations_held = meter.create_counter(
    "customs.declarations.held",
    description="Declarations held due to compliance issues"
)
```

## Why Tracing Matters for Trade Compliance

Trade compliance is not just about speed. Regulators can audit your screening processes and you need to demonstrate that every shipment was properly checked against all required lists. OpenTelemetry traces serve as a detailed, timestamped record of every check performed, every list queried, and every result returned. This is significantly better than relying on application logs alone because the trace structure shows the causal relationship between steps, not just a flat list of log lines. When an auditor asks "was this shipment screened against the OFAC SDN list?", you can pull the trace and show the exact span with the query time, result, and match score.
