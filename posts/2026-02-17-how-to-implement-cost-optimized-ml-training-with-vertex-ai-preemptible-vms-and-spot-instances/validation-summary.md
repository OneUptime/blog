# Validation Summary: How to Use Cost-Optimized ML Training with Vertex AI Preemptible VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI custom training
- Vertex AI SDK for Python
- Compute Engine Spot VMs and preemptible VMs
- Google Cloud Storage
- PyTorch checkpointing
- Python signal handling

## Sources Consulted
- Google Cloud Vertex AI documentation: Use Spot VMs with training: https://docs.cloud.google.com/vertex-ai/docs/training/use-spot-vms
- Google Cloud Vertex AI documentation: Configure compute resources for serverless training: https://docs.cloud.google.com/vertex-ai/docs/training/configure-compute
- Google Cloud Vertex AI SDK for Python API reference: CustomJob: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomJob
- Google Cloud Compute Engine documentation: Spot VMs: https://docs.cloud.google.com/compute/docs/instances/spot
- Google Cloud Compute Engine documentation: Preemptible VM instances: https://docs.cloud.google.com/compute/docs/instances/preemptible
- Google Cloud Vertex AI documentation: Custom containers overview: https://docs.cloud.google.com/vertex-ai/docs/training/containers-overview

## Issues Found
- The `CustomJob.run()` examples passed `scheduling={"strategy": "SPOT"}`. The current Vertex AI Python SDK uses the `scheduling_strategy` keyword, with the Spot enum value `aiplatform.compat.types.custom_job.Scheduling.Strategy.SPOT`. Updated all three SDK examples.
- The post described `restart_job_on_worker_restart=True` as automatic restart on preemption. In the SDK, that flag restarts the whole custom job if a worker restarts and is mainly documented for distributed training jobs. Vertex AI Spot VM preemptions are documented as `STOCKOUT` failures with built-in retry attempts. Removed the misleading flag from the Spot examples and updated the explanation.
- The retry wrapper only checked for generic "preempted" or "spot" exception text. Added `stockout` to match the Vertex AI Spot VM preemption failure mode documented by Google.
- The wrap-up said to configure Vertex AI for automatic restart on preemption. Updated this to describe Vertex AI's built-in retries for Spot VM `STOCKOUT` preemptions.

## Review Notes
- The cost estimator is intentionally approximate and correctly tells readers to check current Google Cloud pricing for exact values. Spot prices can change, so the hard-coded sample numbers should remain illustrative only.
- The checkpointing loop is a simplified example. Production training code should also persist scheduler state, random number generator state, and framework-specific distributed training state when applicable.
