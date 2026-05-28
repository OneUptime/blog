# Validation Summary: How to Build Reproducible ML Pipelines with Vertex AI Pipelines

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Google Cloud Vertex AI Pipelines
- Kubeflow Pipelines SDK v2
- Vertex ML Metadata
- Google Artifact Registry
- BigQuery table snapshots
- Cloud Storage
- Docker
- pip-tools / pip-compile
- Python Google Cloud client libraries

## Sources Consulted
- Vertex AI Pipelines build guide: https://cloud.google.com/vertex-ai/docs/pipelines/build-pipeline
- Vertex AI Pipelines introduction and Vertex ML Metadata lineage behavior: https://cloud.google.com/vertex-ai/docs/pipelines/introduction
- Kubeflow Pipelines control flow documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/core-functions/control-flow/
- BigQuery GoogleSQL DDL reference for `CREATE SNAPSHOT TABLE`: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery hash functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/hash_functions
- BigQuery aggregate functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions
- Artifact Registry cleanup policy documentation: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Artifact Registry repository creation reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Vertex AI Python SDK `PipelineJob` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.PipelineJob
- Docker Buildx image inspection for `python:3.10.13-slim`

## Issues Found
- The Dockerfile used an invalid placeholder digest (`sha256:abc123...`). Replaced it with the current Docker Hub manifest-list digest for `python:3.10.13-slim` so the pinned base image reference is syntactically valid.
- The dependency lockfile excerpt included truncated hashes without making clear it was an excerpt. Clarified that the full `pip-compile` output must be retained with every package pinned and hashed.
- The BigQuery data hash query ordered rows by `ROWID`, which is not a BigQuery pseudocolumn. Replaced it with a deterministic `STRING_AGG(... ORDER BY TO_JSON_STRING(t))` plus `SHA256`/`TO_HEX` expression.
- The KFP examples imported from the old `kfp.v2` namespace. Updated them to current KFP v2-style imports from `kfp` and `kfp.dsl`.
- The pipeline used deprecated `dsl.Condition`. Replaced it with `dsl.If`, which the KFP docs identify as the current equivalent.
- The Artifact Registry cleanup policy command passed inline JSON to `--policy`, used all-caps action/tag state values, and omitted active-run control. Updated the example to create a local `cleanup-policy.json`, use documented `Delete` and `untagged` values, and apply it with `--no-dry-run`.
- Several claims implied guaranteed exact reproduction. Softened those statements to distinguish re-running with the same pinned inputs from bit-for-bit determinism, which also depends on deterministic framework settings and compatible hardware.

## Review Notes
The pipeline snippets remain illustrative and reference helper components such as `export_data_snapshot`, `validate_data_integrity`, `evaluate_model`, and `log_provenance` that are not defined in the post. That is acceptable for this guide, but a future end-to-end version should include those component definitions or link to a complete sample repository.
