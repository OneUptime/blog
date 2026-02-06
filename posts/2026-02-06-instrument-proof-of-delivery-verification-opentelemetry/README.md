# How to Instrument Proof-of-Delivery (POD) Capture and Verification Workflows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Proof of Delivery, POD Verification, Logistics

Description: Instrument proof-of-delivery capture and verification workflows with OpenTelemetry to track signature collection and photo uploads.

Proof-of-delivery (POD) is the final confirmation that a package reached its intended recipient. Modern POD workflows involve photo capture, electronic signatures, GPS location validation, and sometimes recipient ID verification. When any of these steps fail or take too long, it creates disputes, delayed invoicing, and unhappy customers. OpenTelemetry lets you trace the complete POD workflow from capture on the driver's device to verification on the backend.

## Tracer Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("pod.service")
meter = metrics.get_meter("pod.service")
```

## Tracing POD Capture from the Driver App

The driver's mobile app collects several pieces of evidence. The backend receives this data and needs to validate each piece. Here is how to trace the full submission and verification.

```python
def process_pod_submission(delivery_id: str, pod_data: dict):
    with tracer.start_as_current_span("pod.process_submission") as span:
        span.set_attribute("delivery.id", delivery_id)
        span.set_attribute("driver.id", pod_data["driver_id"])
        span.set_attribute("pod.has_signature", "signature" in pod_data)
        span.set_attribute("pod.has_photo", "photo" in pod_data)
        span.set_attribute("pod.has_gps", "gps" in pod_data)

        # Validate GPS location against delivery address
        with tracer.start_as_current_span("pod.validate_gps") as gps_span:
            gps = pod_data.get("gps", {})
            gps_span.set_attribute("gps.lat", gps.get("lat", 0))
            gps_span.set_attribute("gps.lon", gps.get("lon", 0))

            gps_result = validate_delivery_location(
                delivery_id, gps.get("lat"), gps.get("lon")
            )
            gps_span.set_attribute("gps.distance_from_address_m", gps_result.distance_meters)
            gps_span.set_attribute("gps.within_threshold", gps_result.within_threshold)

            if not gps_result.within_threshold:
                gps_span.add_event("gps_outside_threshold", {
                    "distance_meters": gps_result.distance_meters,
                    "threshold_meters": gps_result.threshold
                })

        # Process the signature
        if "signature" in pod_data:
            with tracer.start_as_current_span("pod.process_signature") as sig_span:
                sig_result = validate_signature(pod_data["signature"])
                sig_span.set_attribute("signature.valid", sig_result.valid)
                sig_span.set_attribute("signature.signer_name", pod_data.get("signer_name", ""))

                if not sig_result.valid:
                    sig_span.add_event("invalid_signature", {
                        "reason": sig_result.rejection_reason
                    })

        # Process the delivery photo
        if "photo" in pod_data:
            with tracer.start_as_current_span("pod.process_photo") as photo_span:
                photo_result = process_delivery_photo(pod_data["photo"])
                photo_span.set_attribute("photo.size_bytes", photo_result.file_size)
                photo_span.set_attribute("photo.stored", photo_result.stored)
                photo_span.set_attribute("photo.storage_key", photo_result.storage_key)

        # Run the overall verification decision
        with tracer.start_as_current_span("pod.verification_decision") as decision_span:
            decision = make_pod_decision(delivery_id, gps_result, sig_result, photo_result)
            decision_span.set_attribute("pod.verified", decision.verified)
            decision_span.set_attribute("pod.confidence_score", decision.confidence)
            decision_span.set_attribute("pod.requires_review", decision.needs_review)

        span.set_attribute("pod.final_status", "verified" if decision.verified else "pending_review")
        return decision
```

## Tracing Photo Upload and Storage

Photo uploads can be slow, especially over cellular connections. The backend processing includes image validation, compression, and storage to an object store.

```python
def process_delivery_photo(photo_data: bytes):
    with tracer.start_as_current_span("pod.photo.pipeline") as span:
        span.set_attribute("photo.raw_size_bytes", len(photo_data))

        # Validate the image is a real photo and not corrupted
        with tracer.start_as_current_span("pod.photo.validate") as val_span:
            validation = validate_image_format(photo_data)
            val_span.set_attribute("photo.format", validation.format)
            val_span.set_attribute("photo.width", validation.width)
            val_span.set_attribute("photo.height", validation.height)

            if not validation.valid:
                val_span.add_event("photo_validation_failed", {
                    "reason": validation.error
                })
                raise PhotoValidationError(validation.error)

        # Compress the image for storage
        with tracer.start_as_current_span("pod.photo.compress") as compress_span:
            compressed = compress_image(photo_data, quality=80)
            compress_span.set_attribute("photo.compressed_size_bytes", len(compressed))
            compression_ratio = len(compressed) / len(photo_data)
            compress_span.set_attribute("photo.compression_ratio", round(compression_ratio, 2))

        # Upload to object storage
        with tracer.start_as_current_span("pod.photo.upload") as upload_span:
            storage_result = upload_to_s3(compressed, bucket="pod-photos")
            upload_span.set_attribute("storage.bucket", "pod-photos")
            upload_span.set_attribute("storage.key", storage_result.key)
            upload_span.set_attribute("storage.upload_duration_ms", storage_result.duration_ms)

        return PhotoResult(
            file_size=len(compressed),
            stored=True,
            storage_key=storage_result.key
        )
```

## Tracing Dispute Resolution

When a POD is contested, the system kicks off a review workflow. Tracing this helps you understand how long reviews take and where they get stuck.

```python
def initiate_pod_dispute(delivery_id: str, dispute_reason: str):
    with tracer.start_as_current_span("pod.dispute.initiate") as span:
        span.set_attribute("delivery.id", delivery_id)
        span.set_attribute("dispute.reason", dispute_reason)

        # Retrieve the original POD evidence
        with tracer.start_as_current_span("pod.dispute.fetch_evidence"):
            evidence = fetch_pod_evidence(delivery_id)
            span.set_attribute("evidence.photo_count", evidence.photo_count)
            span.set_attribute("evidence.has_signature", evidence.has_signature)
            span.set_attribute("evidence.gps_verified", evidence.gps_verified)

        # Create the review case
        with tracer.start_as_current_span("pod.dispute.create_case") as case_span:
            case = create_review_case(delivery_id, dispute_reason, evidence)
            case_span.set_attribute("case.id", case.case_id)
            case_span.set_attribute("case.assigned_to", case.reviewer)
            case_span.set_attribute("case.priority", case.priority)

        return case
```

## Key Metrics

```python
pod_submission_duration = meter.create_histogram(
    "pod.submission.duration_ms",
    description="Time to process a complete POD submission",
    unit="ms"
)

pod_verification_rate = meter.create_counter(
    "pod.verifications.total",
    description="Total POD verifications by status"
)

photo_upload_duration = meter.create_histogram(
    "pod.photo.upload_duration_ms",
    description="Time to upload POD photos to storage",
    unit="ms"
)

disputes_opened = meter.create_counter(
    "pod.disputes.opened",
    description="Number of POD disputes opened"
)
```

## The Payoff

POD is the last step of the delivery process, but it is critical for billing and customer satisfaction. With OpenTelemetry tracing, you can see exactly why a POD failed verification (bad GPS, corrupted photo, missing signature), how long photo uploads take over different network conditions, and how quickly disputes get resolved. This kind of end-to-end visibility turns a simple "delivered" checkbox into a fully auditable, data-driven process.
