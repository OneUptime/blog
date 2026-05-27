# Validation Summary: How to Use Vertex AI Training with Reserved GPU Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI custom training
- Compute Engine reservations
- GPU accelerator-optimized A2 machine types
- Google Cloud CLI
- Vertex AI SDK for Python
- Vertex AI Pipelines and scheduled pipeline jobs
- Python

## Sources Consulted
- Google Cloud Vertex AI documentation: Use reservations with training: https://docs.cloud.google.com/vertex-ai/docs/training/use-reservations
- Google Cloud Compute Engine documentation: Create a reservation for a single project: https://docs.cloud.google.com/compute/docs/instances/reservations-single-project
- Google Cloud Compute Engine documentation: About reservations: https://docs.cloud.google.com/compute/docs/instances/reservations-overview
- Google Cloud SDK reference: `gcloud compute reservations create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/reservations/create
- Google Cloud Compute Engine documentation: Accelerator-optimized machine family: https://docs.cloud.google.com/compute/docs/accelerator-optimized-machines
- Google Cloud Vertex AI documentation: Configure compute resources for custom training: https://docs.cloud.google.com/vertex-ai/docs/training/configure-compute
- Google Cloud Python SDK reference: `google.cloud.aiplatform.CustomJob`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomJob
- Google Cloud Python SDK reference: `google.cloud.aiplatform.PipelineJob.create_schedule`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.PipelineJob
- Google Cloud Compute Engine pricing: https://cloud.google.com/products/compute/pricing

## Issues Found
- The post described reservations as 1-year or 3-year commitments with automatic discounts. Fixed this to explain that reservations hold zonal capacity until deleted and are billed at on-demand rates unless applicable discounts, such as committed use discounts, apply.
- The reservation creation command did not allow Vertex AI to consume the GPU VM reservation. Added `--reservation-sharing-policy=ALLOW_ALL`.
- The reservation command explicitly attached `--accelerator` to an A2 accelerator-optimized machine type. Removed it because A2 machine types include pre-attached A100 GPUs based on the machine type.
- The Vertex AI SDK example placed `reservation_affinity` as a top-level `CustomJob` argument, which is not in the `CustomJob` constructor. Moved `reservation_affinity` into each worker pool's `machine_spec`, matching the Vertex AI API shape.
- The scheduled pipeline and multiple-job examples omitted reservation affinity, so they would not target the specific reservation. Added matching `reservation_affinity` blocks.
- The cost analysis treated a reservation itself as the source of a 40% discount. Updated the analysis to model a reservation combined with a 1-year resource-based committed use discount, refreshed the example numbers, and noted exclusions such as Vertex AI management fees, disks, storage, and networking.
- The multiple-job example said it queued jobs but only configured `CustomJob` objects. Changed the wording to say it configures jobs and removed an unused `time` import.
- Replaced absolute wording such as "guarantee" with "assured" or "help ensure" to better match Google Cloud's documented "high level of assurance" language.

## Review Notes
The current examples are syntactically valid Python. Pricing is inherently time-sensitive; future reviews should re-check the current Compute Engine pricing page and Cloud Billing SKUs before relying on the example dollar amounts.
