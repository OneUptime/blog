# Validation Summary: How to Use Vertex AI Batch Prediction for Large-Scale Inference Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Batch Prediction / Batch Inference
- Google Cloud Storage
- BigQuery
- Vertex AI SDK for Python
- Cloud Functions
- Cloud Scheduler
- Explainable AI
- Spot VMs

## Sources Consulted
- Google Cloud Vertex AI documentation: Get batch inferences from a custom trained model - https://cloud.google.com/vertex-ai/docs/predictions/get-batch-predictions
- Google Cloud Vertex AI documentation: Get inferences from a custom trained model - https://cloud.google.com/vertex-ai/docs/predictions/get-predictions
- Google Cloud Python client reference: `google.cloud.aiplatform.Model.batch_predict` - https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Google Cloud Python client reference: `google.cloud.aiplatform.BatchPredictionJob` - https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.BatchPredictionJob
- Google Cloud Python client reference: `google.cloud.aiplatform_v1.types.JobState` - https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform_v1.types.JobState
- Google Cloud Vertex AI documentation: Use Spot VMs with inference - https://cloud.google.com/vertex-ai/docs/predictions/use-spot-vms
- Google Cloud Vertex AI pricing - https://cloud.google.com/vertex-ai/pricing

## Issues Found
- The post stated that Vertex AI Batch Prediction scales compute automatically. For custom-trained batch prediction, Google documents that batch inference jobs do not autoscale; Vertex AI partitions the input across the requested replicas, uses `starting_replica_count`, and ignores `max_replica_count`. Updated the overview, diagram, code snippets, cost guidance, and closing paragraph to reflect this.
- The CSV example used unquoted string values. Google documents that string values in CSV batch prediction input must be enclosed in double quotes. Updated the CSV sample.
- The BigQuery output description implied predictions are always appended to original columns. Google documents schema-dependent output tables and `predictions` / `errors` outputs. Updated the wording to be conditional and more precise.
- The explanations section omitted the requirement that the model must be configured for explanations or the request must provide an explanation spec. Updated the description.
- The monitoring example compared `job.state` to string literals, but the Python SDK returns a `JobState` enum. Updated the snippet to import and compare against `JobState` values.
- The cost section contained overly broad machine-size and runtime claims. Updated it to align with Google guidance: use the smallest sufficient machine type, increase replicas for throughput, benchmark, and choose the actual replica count because `max_replica_count` is ignored for custom-trained batch jobs.
- The preemptible VM guidance was outdated. Google now documents Spot VMs for Vertex AI inference through supported API/SDK paths, with console limitations and preemption caveats. Updated the guidance.

## Review Notes
All Python code blocks were checked with Python AST parsing for syntax. Runtime execution was not performed because the local environment does not have Google Cloud credentials or the `google-cloud-aiplatform` package installed.
