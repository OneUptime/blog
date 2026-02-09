# How to Instrument Health Insurance Claims (EDI 837/835) Processing Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, EDI, Health Insurance Claims, Revenue Cycle

Description: Instrument EDI 837 and 835 health insurance claims processing pipelines with OpenTelemetry to track claim lifecycle and identify processing bottlenecks.

Health insurance claims processing is the financial backbone of healthcare. EDI 837 transactions carry claims from providers to payers, and EDI 835 transactions bring back the payment remittance information. A single hospital might process thousands of 837 claims daily, and each one flows through validation, scrubbing, submission to the clearinghouse, payer adjudication, and finally remittance posting. When claims get stuck or rejected, revenue stalls. When 835 remittance files are not processed on time, accounts receivable ages and cash flow suffers.

This post shows how to instrument the entire claims processing pipeline with OpenTelemetry to trace every claim from creation to payment posting.

## Instrumenting 837 Claim Generation and Submission

The 837 claim starts when a charge is captured from a clinical encounter. It then goes through coding, validation, scrubbing, and submission:

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Initialize tracing
trace_provider = TracerProvider()
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("claims-processor", "1.0.0")

# Initialize metrics
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("claims-processor", "1.0.0")

claim_processing_latency = meter.create_histogram(
    "claims.processing_latency_ms",
    description="Time to process a claim through the pipeline",
    unit="ms",
)

claims_submitted = meter.create_counter(
    "claims.submitted_total",
    description="Total claims submitted to clearinghouse",
)

claims_rejected = meter.create_counter(
    "claims.rejected_total",
    description="Total claims rejected at any stage",
)

claim_value = meter.create_histogram(
    "claims.billed_amount",
    description="Billed amount per claim",
    unit="usd",
)


def process_837_claim(encounter_id, charge_data):
    """
    Process a charge into an EDI 837 claim and submit it.
    """
    start = time.time()

    with tracer.start_as_current_span("claims.837.process") as span:
        span.set_attribute("claims.encounter_id", encounter_id)
        span.set_attribute("claims.transaction_type", "837P")  # Professional
        span.set_attribute("claims.payer_id", charge_data.get("payer_id", ""))

        # Step 1: Validate and code the charge
        with tracer.start_as_current_span("claims.coding.validate") as code_span:
            coding_result = validate_coding(charge_data)
            code_span.set_attribute("claims.cpt_codes_count",
                                   len(charge_data.get("cpt_codes", [])))
            code_span.set_attribute("claims.icd_codes_count",
                                   len(charge_data.get("icd_codes", [])))
            code_span.set_attribute("claims.coding_valid", coding_result["valid"])

            if not coding_result["valid"]:
                claims_rejected.add(1, {
                    "stage": "coding",
                    "reason": coding_result.get("error_code", "unknown"),
                })
                span.set_status(trace.Status(
                    trace.StatusCode.ERROR, "Coding validation failed"
                ))
                return {"status": "rejected", "stage": "coding",
                        "errors": coding_result["errors"]}

        # Step 2: Scrub the claim (check for common rejection reasons)
        with tracer.start_as_current_span("claims.scrubbing") as scrub_span:
            scrub_result = scrub_claim(charge_data)
            scrub_span.set_attribute("claims.scrub.warnings", len(scrub_result["warnings"]))
            scrub_span.set_attribute("claims.scrub.errors", len(scrub_result["errors"]))
            scrub_span.set_attribute("claims.scrub.rules_checked",
                                   scrub_result["rules_checked"])

            if scrub_result["errors"]:
                claims_rejected.add(1, {"stage": "scrubbing", "reason": "scrub_failure"})
                return {"status": "rejected", "stage": "scrubbing",
                        "errors": scrub_result["errors"]}

        # Step 3: Build the EDI 837 transaction
        with tracer.start_as_current_span("claims.837.build_edi") as edi_span:
            edi_transaction = build_837_transaction(charge_data)
            edi_span.set_attribute("claims.edi.segment_count",
                                  edi_transaction["segment_count"])
            edi_span.set_attribute("claims.edi.size_bytes",
                                  len(edi_transaction["raw_edi"]))

        # Step 4: Submit to the clearinghouse
        with tracer.start_as_current_span("claims.clearinghouse.submit") as ch_span:
            ch_span.set_attribute("claims.clearinghouse", "availity")
            ch_span.set_attribute("claims.payer_id", charge_data["payer_id"])

            submission_result = submit_to_clearinghouse(edi_transaction)

            ch_span.set_attribute("claims.clearinghouse.accepted",
                                submission_result["accepted"])
            ch_span.set_attribute("claims.clearinghouse.tracking_id",
                                submission_result.get("tracking_id", ""))

            if not submission_result["accepted"]:
                claims_rejected.add(1, {
                    "stage": "clearinghouse",
                    "reason": submission_result.get("rejection_code", "unknown"),
                })
                span.set_status(trace.Status(
                    trace.StatusCode.ERROR,
                    f"Clearinghouse rejected: {submission_result.get('rejection_code')}"
                ))
                return {"status": "rejected", "stage": "clearinghouse"}

        duration_ms = (time.time() - start) * 1000
        claim_processing_latency.record(duration_ms, {
            "transaction_type": "837P",
            "payer_id": charge_data["payer_id"],
        })

        billed_amount = sum(line.get("charge_amount", 0) for line in charge_data.get("lines", []))
        claim_value.record(billed_amount, {"payer_id": charge_data["payer_id"]})
        claims_submitted.add(1, {"payer_id": charge_data["payer_id"]})

        return {
            "status": "submitted",
            "tracking_id": submission_result["tracking_id"],
        }
```

## Instrumenting 835 Remittance Processing

When payers send back 835 remittance files, you need to parse them, match payments to claims, and post adjustments:

```python
def process_835_remittance(edi_file_content):
    """
    Process an incoming EDI 835 remittance advice file.
    A single 835 file can contain payment information for hundreds of claims.
    """
    start = time.time()

    with tracer.start_as_current_span("claims.835.process") as span:
        # Step 1: Parse the 835 EDI file
        with tracer.start_as_current_span("claims.835.parse") as parse_span:
            parsed = parse_835_file(edi_file_content)
            parse_span.set_attribute("claims.835.claim_count", len(parsed["claims"]))
            parse_span.set_attribute("claims.835.payer_id", parsed.get("payer_id", ""))
            parse_span.set_attribute("claims.835.total_paid",
                                   parsed.get("total_payment", 0))
            parse_span.set_attribute("claims.835.check_number",
                                   parsed.get("check_number", ""))

        span.set_attribute("claims.835.claim_count", len(parsed["claims"]))

        # Step 2: Process each claim payment in the remittance
        posted_count = 0
        denial_count = 0
        for claim_payment in parsed["claims"]:
            with tracer.start_as_current_span("claims.835.post_payment") as pay_span:
                claim_id = claim_payment.get("claim_id", "")
                pay_span.set_attribute("claims.claim_id", claim_id)
                pay_span.set_attribute("claims.835.paid_amount",
                                     claim_payment.get("paid_amount", 0))
                pay_span.set_attribute("claims.835.adjustment_amount",
                                     claim_payment.get("adjustment_amount", 0))

                # Determine payment status from CARC/RARC codes
                carc_codes = claim_payment.get("adjustment_reason_codes", [])
                pay_span.set_attribute("claims.835.carc_codes", carc_codes)

                is_denial = claim_payment.get("paid_amount", 0) == 0
                pay_span.set_attribute("claims.835.is_denial", is_denial)

                if is_denial:
                    denial_count += 1
                    with tracer.start_as_current_span("claims.835.denial.process") as den_span:
                        den_span.set_attribute("claims.denial.reason_codes", carc_codes)
                        process_denial(claim_id, claim_payment)
                else:
                    # Match payment to original claim and post
                    with tracer.start_as_current_span("claims.835.payment.match_and_post") as match_span:
                        match_result = match_and_post_payment(claim_id, claim_payment)
                        match_span.set_attribute("claims.payment.matched",
                                               match_result["matched"])
                        match_span.set_attribute("claims.payment.posted",
                                               match_result["posted"])

                    if match_result["posted"]:
                        posted_count += 1

        span.set_attribute("claims.835.payments_posted", posted_count)
        span.set_attribute("claims.835.denials", denial_count)

        duration_ms = (time.time() - start) * 1000
        claim_processing_latency.record(duration_ms, {"transaction_type": "835"})

        return {
            "claims_processed": len(parsed["claims"]),
            "payments_posted": posted_count,
            "denials": denial_count,
        }
```

## Tracking Claim Lifecycle Metrics

Beyond individual operations, track the overall health of your revenue cycle:

```python
# Periodic job to calculate claim lifecycle metrics
def calculate_claim_lifecycle_metrics():
    """Calculate and report claim lifecycle metrics."""
    with tracer.start_as_current_span("claims.lifecycle.metrics") as span:
        # Average days in accounts receivable
        avg_days_ar = calculate_average_days_in_ar()
        span.set_attribute("claims.lifecycle.avg_days_ar", avg_days_ar)

        # First-pass acceptance rate
        first_pass_rate = calculate_first_pass_rate()
        span.set_attribute("claims.lifecycle.first_pass_rate", first_pass_rate)

        # Denial rate by payer
        denial_rates = calculate_denial_rates_by_payer()
        for payer_id, rate in denial_rates.items():
            span.add_event("denial_rate", {
                "payer_id": payer_id,
                "rate": rate,
            })

        # Claims in limbo (submitted but no response for 30+ days)
        stale_claims = count_stale_claims(days=30)
        span.set_attribute("claims.lifecycle.stale_30d", stale_claims)
```

## What to Monitor

For claims processing, the metrics that drive revenue cycle performance are: first-pass acceptance rate (target above 95%), average days in accounts receivable (lower is better), denial rate by payer (helps negotiate payer contracts), and 835 processing throughput (delays mean delayed cash posting). With OpenTelemetry tracing across the 837 and 835 pipelines, you can pinpoint exactly where claims get rejected, which payers are slowest to respond, and which coding errors are most common. That data turns revenue cycle management from guesswork into a data-driven operation.
