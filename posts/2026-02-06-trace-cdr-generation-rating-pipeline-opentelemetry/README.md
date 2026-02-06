# How to Trace CDR (Call Detail Record) Generation and Rating Pipeline with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CDR, Billing, Rating, Telecommunications

Description: Trace CDR generation, mediation, and rating pipeline with OpenTelemetry for revenue assurance and billing accuracy in telecom.

Call Detail Records are the foundation of telecom billing. Every voice call, SMS, data session, and supplementary service generates a CDR that flows through mediation, rating, and billing systems. A lost CDR means lost revenue. A misrated CDR means a billing dispute. In this post, we will instrument the entire CDR pipeline with OpenTelemetry so you can track every record from generation to invoice.

## CDR Pipeline Architecture

The CDR pipeline has several stages:

1. **Generation**: Network elements (switches, GGSN/PGW, SMSC) create raw CDRs
2. **Collection**: CDRs are transferred from network elements to the mediation system
3. **Mediation**: Raw CDRs are normalized, correlated, filtered, and enriched
4. **Rating**: Rated based on the subscriber's tariff plan
5. **Billing**: Aggregated and applied to the subscriber's account
6. **Output**: Invoice generation and reporting

## Instrumenting CDR Collection

```python
# cdr_collection.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import time
import os

tracer = trace.get_tracer("cdr.collection")
meter = metrics.get_meter("cdr.collection")

# Collection metrics
files_collected = meter.create_counter(
    "cdr.collection.files",
    description="Number of CDR files collected from network elements",
    unit="{file}",
)

records_collected = meter.create_counter(
    "cdr.collection.records",
    description="Number of individual CDR records collected",
    unit="{record}",
)

collection_latency = meter.create_histogram(
    "cdr.collection.latency",
    description="Time from CDR generation to collection",
    unit="s",
)

collection_errors = meter.create_counter(
    "cdr.collection.errors",
    description="CDR collection failures",
    unit="{error}",
)

# Track CDR file backlog
file_backlog = meter.create_gauge(
    "cdr.collection.backlog",
    description="Number of CDR files waiting to be collected",
    unit="{file}",
)


def collect_cdrs_from_switch(switch_id: str, switch_host: str):
    """Collect CDR files from a network element via SFTP."""
    with tracer.start_as_current_span("cdr.collect") as span:
        span.set_attributes({
            "cdr.source.switch_id": switch_id,
            "cdr.source.host": switch_host,
            "cdr.source.type": "voice_switch",
        })

        try:
            # List available CDR files on the switch
            remote_files = list_remote_cdr_files(switch_host)
            span.set_attribute("cdr.files.available", len(remote_files))
            file_backlog.set(len(remote_files), {"switch_id": switch_id})

            for remote_file in remote_files:
                with tracer.start_as_current_span("cdr.collect.file") as file_span:
                    file_span.set_attributes({
                        "cdr.file.name": remote_file.name,
                        "cdr.file.size_bytes": remote_file.size,
                        "cdr.file.created_at": remote_file.created_at,
                    })

                    # Calculate collection delay
                    delay = time.time() - remote_file.created_at
                    collection_latency.record(delay, {
                        "switch_id": switch_id,
                    })

                    # Download the file
                    local_path = download_cdr_file(switch_host, remote_file)
                    file_span.set_attribute("cdr.file.local_path", local_path)

                    # Parse and count records
                    record_count = count_records_in_file(local_path)
                    file_span.set_attribute("cdr.file.record_count", record_count)

                    files_collected.add(1, {"switch_id": switch_id})
                    records_collected.add(record_count, {
                        "switch_id": switch_id,
                        "cdr_type": "voice",
                    })

                    # Remove file from switch after successful collection
                    remove_remote_file(switch_host, remote_file)

        except ConnectionError as e:
            span.record_exception(e)
            span.set_status(StatusCode.ERROR, "Cannot connect to switch")
            collection_errors.add(1, {
                "switch_id": switch_id,
                "reason": "connection_failed",
            })
```

## Instrumenting the Mediation Engine

```python
# cdr_mediation.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("cdr.mediation")
meter = metrics.get_meter("cdr.mediation")

# Mediation metrics
mediation_throughput = meter.create_counter(
    "cdr.mediation.records_processed",
    description="CDR records processed through mediation",
    unit="{record}",
)

mediation_rejects = meter.create_counter(
    "cdr.mediation.rejects",
    description="CDR records rejected during mediation",
    unit="{record}",
)

mediation_duplicates = meter.create_counter(
    "cdr.mediation.duplicates",
    description="Duplicate CDR records detected",
    unit="{record}",
)

mediation_step_latency = meter.create_histogram(
    "cdr.mediation.step_latency",
    description="Processing time for each mediation step",
    unit="ms",
)


def mediate_cdr(raw_cdr: dict, source_id: str):
    """Process a single CDR through the mediation pipeline."""
    with tracer.start_as_current_span("cdr.mediate") as span:
        span.set_attributes({
            "cdr.source_id": source_id,
            "cdr.raw.record_type": raw_cdr.get("record_type"),
            "cdr.raw.calling_number": mask_number(raw_cdr.get("calling_number")),
            "cdr.raw.called_number": mask_number(raw_cdr.get("called_number")),
        })

        # Step 1: Normalization - convert vendor-specific format to internal format
        with tracer.start_as_current_span("cdr.mediate.normalize") as norm_span:
            start = time.time()
            normalized = normalize_cdr(raw_cdr, source_id)
            elapsed = (time.time() - start) * 1000
            mediation_step_latency.record(elapsed, {"step": "normalize"})

            if not normalized:
                norm_span.set_status(StatusCode.ERROR, "Normalization failed")
                mediation_rejects.add(1, {
                    "reason": "normalization",
                    "source": source_id,
                })
                return None

        # Step 2: Deduplication - check if we have already seen this CDR
        with tracer.start_as_current_span("cdr.mediate.dedup") as dedup_span:
            start = time.time()
            is_duplicate = check_duplicate(normalized)
            elapsed = (time.time() - start) * 1000
            mediation_step_latency.record(elapsed, {"step": "dedup"})

            if is_duplicate:
                dedup_span.set_attribute("cdr.duplicate", True)
                mediation_duplicates.add(1, {"source": source_id})
                return None

        # Step 3: Validation - check for missing or invalid fields
        with tracer.start_as_current_span("cdr.mediate.validate") as val_span:
            start = time.time()
            errors = validate_cdr_fields(normalized)
            elapsed = (time.time() - start) * 1000
            mediation_step_latency.record(elapsed, {"step": "validate"})

            if errors:
                val_span.set_status(StatusCode.ERROR,
                    f"Validation errors: {', '.join(errors)}")
                val_span.set_attribute("cdr.validation_errors", len(errors))
                mediation_rejects.add(1, {
                    "reason": "validation",
                    "source": source_id,
                })
                return None

        # Step 4: Enrichment - add subscriber info, trunk group, location data
        with tracer.start_as_current_span("cdr.mediate.enrich") as enrich_span:
            start = time.time()
            enriched = enrich_cdr(normalized)
            elapsed = (time.time() - start) * 1000
            mediation_step_latency.record(elapsed, {"step": "enrich"})

            enrich_span.set_attributes({
                "cdr.subscriber_id": enriched.get("subscriber_id"),
                "cdr.trunk_group": enriched.get("trunk_group"),
                "cdr.call_type": enriched.get("call_type"),
                "cdr.duration_seconds": enriched.get("duration"),
            })

        # Step 5: Correlation - merge partial CDRs into complete records
        with tracer.start_as_current_span("cdr.mediate.correlate") as corr_span:
            start = time.time()
            correlated = correlate_partial_cdrs(enriched)
            elapsed = (time.time() - start) * 1000
            mediation_step_latency.record(elapsed, {"step": "correlate"})

            corr_span.set_attribute("cdr.correlated_parts", correlated.part_count)

        mediation_throughput.add(1, {
            "source": source_id,
            "cdr_type": enriched.get("call_type", "unknown"),
        })

        return correlated
```

## Instrumenting the Rating Engine

```python
# cdr_rating.py
from opentelemetry import trace, metrics

tracer = trace.get_tracer("cdr.rating")
meter = metrics.get_meter("cdr.rating")

rating_latency = meter.create_histogram(
    "cdr.rating.latency",
    description="Time to rate a single CDR",
    unit="ms",
)

rated_amount = meter.create_counter(
    "cdr.rating.revenue",
    description="Total rated revenue",
    unit="{currency_unit}",
)

rating_errors = meter.create_counter(
    "cdr.rating.errors",
    description="CDRs that could not be rated",
    unit="{record}",
)


def rate_cdr(mediated_cdr: dict):
    """Apply tariff plan to a mediated CDR to determine the charge."""
    with tracer.start_as_current_span("cdr.rate") as span:
        start = time.time()

        subscriber_id = mediated_cdr["subscriber_id"]
        call_type = mediated_cdr["call_type"]

        span.set_attributes({
            "cdr.subscriber_id": subscriber_id,
            "cdr.call_type": call_type,
            "cdr.duration_seconds": mediated_cdr.get("duration", 0),
            "cdr.data_volume_bytes": mediated_cdr.get("data_volume", 0),
        })

        # Look up the subscriber's active tariff plan
        with tracer.start_as_current_span("cdr.rate.lookup_tariff") as tariff_span:
            tariff = get_active_tariff(subscriber_id)
            tariff_span.set_attributes({
                "cdr.tariff.plan_id": tariff.plan_id,
                "cdr.tariff.plan_name": tariff.plan_name,
            })

        # Check included allowances (free minutes, data bundles)
        with tracer.start_as_current_span("cdr.rate.check_allowance") as allow_span:
            allowance = check_allowance(subscriber_id, call_type, tariff)
            allow_span.set_attributes({
                "cdr.allowance.remaining": allowance.remaining,
                "cdr.allowance.covered": allowance.fully_covered,
            })

        # Calculate the charge
        with tracer.start_as_current_span("cdr.rate.calculate") as calc_span:
            if allowance.fully_covered:
                charge = 0.0
                rate_type = "included"
            else:
                charge = calculate_charge(mediated_cdr, tariff, allowance)
                rate_type = "charged"

            calc_span.set_attributes({
                "cdr.charge.amount": charge,
                "cdr.charge.currency": tariff.currency,
                "cdr.charge.rate_type": rate_type,
            })

        elapsed = (time.time() - start) * 1000
        rating_latency.record(elapsed, {"call_type": call_type})

        if charge > 0:
            rated_amount.add(charge, {
                "call_type": call_type,
                "tariff_plan": tariff.plan_id,
            })

        span.set_attribute("cdr.rated.amount", charge)
        return charge
```

## Revenue Assurance Alerts

- **CDR collection delay exceeds 1 hour**: Revenue recognition is delayed. Check switch connectivity.
- **Mediation reject rate above 2%**: CDRs are being lost. Investigate normalization rules and validation criteria.
- **Duplicate rate spikes**: Could indicate a CDR file was reprocessed or a switch is generating duplicates.
- **Rating error rate above 0.5%**: Subscribers without valid tariff plans or unrecognized call types.
- **Daily revenue drops more than 10% compared to the same day last week**: Could indicate CDR loss, a mediation failure, or a rating rule change.
- **Zero-rated CDR percentage changes significantly**: If the ratio of "included" vs "charged" CDRs shifts, it might mean allowance calculations are wrong.

## End-to-End CDR Tracing

The real value of OpenTelemetry here is the ability to trace a single CDR from the moment it is generated on the switch all the way through to the rated charge on the subscriber's bill. When a customer disputes a charge, you can pull the trace for that specific CDR and see exactly how it was collected, what mediation steps it went through, how it was enriched, and what tariff rules were applied. That audit trail turns billing disputes from days-long investigations into minutes-long lookups. It also helps your revenue assurance team catch systematic issues before they become large-scale revenue leakage problems.
