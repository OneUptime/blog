# How to Trace Pharmacy Inventory and Drug Interaction Checking APIs with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Pharmacy, Drug Interactions, Inventory Management

Description: Trace pharmacy inventory management and drug interaction checking APIs with OpenTelemetry for performance visibility and reliability monitoring.

Pharmacy systems handle two critical real-time operations: checking drug interactions before dispensing and managing inventory levels to prevent stockouts. When the drug interaction API is slow, pharmacists are tempted to skip the check. When the inventory system lags, fill queues back up and patients wait longer. Both problems have direct patient safety and satisfaction implications.

This post walks through instrumenting pharmacy inventory and drug interaction checking APIs with OpenTelemetry to trace every operation and catch performance degradation before it affects patient care.

## Instrumenting Drug Interaction Checking

Drug interaction checks happen at multiple points: when a prescription arrives (e-prescribing), when a pharmacist begins filling, and at the point of final verification. Each check queries a drug knowledge base and cross-references against the patient's medication profile.

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Initialize tracing and metrics
trace_provider = TracerProvider()
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("pharmacy-service", "1.0.0")

metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("pharmacy-service", "1.0.0")

interaction_check_latency = meter.create_histogram(
    "pharmacy.interaction_check_latency_ms",
    description="Drug interaction check response time",
    unit="ms",
)

interactions_found = meter.create_counter(
    "pharmacy.interactions_found_total",
    description="Total drug interactions found",
)

inventory_lookup_latency = meter.create_histogram(
    "pharmacy.inventory_lookup_latency_ms",
    description="Inventory lookup response time",
    unit="ms",
)


def check_drug_interactions(new_drug_ndc, patient_medication_list):
    """
    Check a new drug against the patient's current medication list
    for drug-drug, drug-allergy, and drug-food interactions.
    """
    start = time.time()

    with tracer.start_as_current_span("pharmacy.interaction_check") as span:
        span.set_attribute("pharmacy.drug_ndc", new_drug_ndc)
        span.set_attribute("pharmacy.current_med_count", len(patient_medication_list))
        span.set_attribute("pharmacy.check_trigger", "dispensing")

        all_interactions = []

        # Drug-drug interaction check
        with tracer.start_as_current_span("pharmacy.interaction.drug_drug") as dd_span:
            dd_start = time.time()
            drug_interactions = query_drug_drug_interactions(
                new_drug_ndc, patient_medication_list
            )
            dd_duration = (time.time() - dd_start) * 1000
            dd_span.set_attribute("pharmacy.dd_interactions_found", len(drug_interactions))
            dd_span.set_attribute("pharmacy.dd_check_duration_ms", dd_duration)
            dd_span.set_attribute("pharmacy.knowledge_base", "first_databank")
            all_interactions.extend(drug_interactions)

        # Drug-allergy interaction check
        with tracer.start_as_current_span("pharmacy.interaction.drug_allergy") as da_span:
            patient_allergies = get_patient_allergies(patient_medication_list[0].get("patient_id"))
            da_span.set_attribute("pharmacy.allergies_count", len(patient_allergies))

            allergy_interactions = check_drug_allergy_interactions(
                new_drug_ndc, patient_allergies
            )
            da_span.set_attribute("pharmacy.allergy_interactions_found",
                                len(allergy_interactions))
            all_interactions.extend(allergy_interactions)

        # Therapeutic duplication check
        with tracer.start_as_current_span("pharmacy.interaction.therapeutic_dup") as td_span:
            duplications = check_therapeutic_duplication(
                new_drug_ndc, patient_medication_list
            )
            td_span.set_attribute("pharmacy.duplications_found", len(duplications))
            all_interactions.extend(duplications)

        # Classify severity of all found interactions
        severity_counts = {"contraindicated": 0, "severe": 0, "moderate": 0, "mild": 0}
        for interaction in all_interactions:
            sev = interaction.get("severity", "mild")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        span.set_attribute("pharmacy.total_interactions", len(all_interactions))
        for sev, count in severity_counts.items():
            span.set_attribute(f"pharmacy.interactions.{sev}", count)
            if count > 0:
                interactions_found.add(count, {"severity": sev})

        duration_ms = (time.time() - start) * 1000
        interaction_check_latency.record(duration_ms, {
            "check_type": "full",
            "interactions_found": len(all_interactions) > 0,
        })

        return {
            "interactions": all_interactions,
            "severity_counts": severity_counts,
            "check_duration_ms": duration_ms,
        }
```

## Instrumenting Inventory Management

Pharmacy inventory operations include checking stock levels, processing incoming shipments, and managing automated dispensing cabinets:

```python
def check_inventory(drug_ndc, pharmacy_location, quantity_needed):
    """Check if sufficient inventory exists at the specified pharmacy location."""
    start = time.time()

    with tracer.start_as_current_span("pharmacy.inventory.check") as span:
        span.set_attribute("pharmacy.drug_ndc", drug_ndc)
        span.set_attribute("pharmacy.location", pharmacy_location)
        span.set_attribute("pharmacy.quantity_needed", quantity_needed)

        # Check on-hand quantity
        with tracer.start_as_current_span("pharmacy.inventory.query_onhand") as oh_span:
            on_hand = query_inventory_level(drug_ndc, pharmacy_location)
            oh_span.set_attribute("pharmacy.quantity_on_hand", on_hand)
            oh_span.set_attribute("db.system", "postgresql")

        # Check if there is enough to fill the prescription
        sufficient = on_hand >= quantity_needed
        span.set_attribute("pharmacy.inventory.sufficient", sufficient)

        if not sufficient:
            # Check alternative locations
            with tracer.start_as_current_span("pharmacy.inventory.check_alternatives") as alt_span:
                alternatives = find_alternative_locations(drug_ndc, quantity_needed)
                alt_span.set_attribute("pharmacy.alternative_locations_found",
                                     len(alternatives))

            # Check if a substitute drug is available
            with tracer.start_as_current_span("pharmacy.inventory.check_substitutes") as sub_span:
                substitutes = find_therapeutic_substitutes(drug_ndc, pharmacy_location)
                sub_span.set_attribute("pharmacy.substitutes_available", len(substitutes))

        # Check expiration dates for on-hand stock
        with tracer.start_as_current_span("pharmacy.inventory.check_expiry") as exp_span:
            expiring_soon = check_expiring_stock(drug_ndc, pharmacy_location, days=30)
            exp_span.set_attribute("pharmacy.lots_expiring_30d", len(expiring_soon))

        duration_ms = (time.time() - start) * 1000
        inventory_lookup_latency.record(duration_ms, {
            "location": pharmacy_location,
            "result": "sufficient" if sufficient else "insufficient",
        })

        return {
            "on_hand": on_hand,
            "sufficient": sufficient,
            "alternatives": alternatives if not sufficient else [],
            "substitutes": substitutes if not sufficient else [],
        }
```

## Tracing the Fill Queue Workflow

The fill queue is where prescriptions wait to be filled. Tracing it shows you where prescriptions get stuck:

```python
def process_fill_queue_item(prescription_id):
    """Process a single prescription from the fill queue."""
    with tracer.start_as_current_span("pharmacy.fill_queue.process") as span:
        span.set_attribute("pharmacy.prescription_id", prescription_id)

        # Step 1: Retrieve the prescription details
        with tracer.start_as_current_span("pharmacy.prescription.fetch") as fetch_span:
            prescription = get_prescription(prescription_id)
            fetch_span.set_attribute("pharmacy.drug_ndc", prescription["drug_ndc"])
            fetch_span.set_attribute("pharmacy.quantity", prescription["quantity"])

        # Step 2: Run interaction check
        with tracer.start_as_current_span("pharmacy.fill.interaction_check") as ic_span:
            med_list = get_patient_medication_profile(prescription["patient_id_hash"])
            interactions = check_drug_interactions(
                prescription["drug_ndc"], med_list
            )
            has_severe = interactions["severity_counts"].get("severe", 0) > 0
            ic_span.set_attribute("pharmacy.fill.has_severe_interaction", has_severe)

            if has_severe or interactions["severity_counts"].get("contraindicated", 0) > 0:
                span.add_event("fill_held_for_pharmacist_review")
                return {"status": "held_for_review", "reason": "drug_interaction"}

        # Step 3: Check and decrement inventory
        with tracer.start_as_current_span("pharmacy.fill.inventory_check") as inv_span:
            inventory = check_inventory(
                prescription["drug_ndc"],
                prescription["pharmacy_location"],
                prescription["quantity"],
            )

            if not inventory["sufficient"]:
                span.add_event("fill_on_backorder")
                return {"status": "backorder", "alternatives": inventory["alternatives"]}

            # Decrement inventory atomically
            with tracer.start_as_current_span("pharmacy.inventory.decrement") as dec_span:
                decrement_result = decrement_inventory(
                    prescription["drug_ndc"],
                    prescription["pharmacy_location"],
                    prescription["quantity"],
                )
                dec_span.set_attribute("pharmacy.inventory.decremented", True)
                dec_span.set_attribute("pharmacy.inventory.remaining",
                                     decrement_result["remaining"])

        # Step 4: Print label and complete fill
        with tracer.start_as_current_span("pharmacy.fill.complete") as complete_span:
            print_label(prescription)
            mark_filled(prescription_id)
            complete_span.set_attribute("pharmacy.fill.status", "completed")

        span.set_attribute("pharmacy.fill.result", "filled")
        return {"status": "filled"}
```

## Performance Targets

For pharmacy systems, the benchmarks that matter are: drug interaction checks under 500ms (pharmacists run these constantly), inventory lookups under 200ms, and the complete fill queue processing under 3 seconds per prescription. With OpenTelemetry tracing across both the interaction and inventory APIs, you can quickly determine if slowness comes from the drug knowledge base lookup, the patient medication profile query, the inventory database, or the network between services. That granularity lets you fix the actual bottleneck instead of guessing.
