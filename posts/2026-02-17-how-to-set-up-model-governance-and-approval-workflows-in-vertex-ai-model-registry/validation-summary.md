# Validation Summary: How to Set Up Model Governance and Approval Workflows

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Vertex AI Model Registry
- Vertex AI Python SDK
- Google Cloud prebuilt prediction containers
- Cloud Firestore Python client
- BigQuery Python client
- Python datetime handling
- MLOps model governance and approval workflows

## Sources Consulted
- Vertex AI Model Registry introduction: https://docs.cloud.google.com/vertex-ai/docs/model-registry/introduction
- Vertex AI model labels documentation: https://docs.cloud.google.com/vertex-ai/docs/model-registry/model-labels
- Vertex AI model versioning documentation: https://docs.cloud.google.com/vertex-ai/docs/model-registry/versioning
- Vertex AI prebuilt prediction containers: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Vertex AI Python SDK `aiplatform.Model` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Model
- Firestore Python `CollectionReference.where` reference: https://cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.base_collection.BaseCollectionReference
- BigQuery Python `Client.insert_rows_json` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- BigQuery Python `ScalarQueryParameter` reference: https://docs.cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.query.ScalarQueryParameter
- Python `datetime` documentation: https://docs.python.org/3.12/library/datetime.html

## Issues Found
- The model upload sample used `us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-2:latest`, whose Vertex AI prediction container is past its end-of-availability date. Updated it to the currently available `sklearn-cpu.1-5:latest` container.
- The Python snippets used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced those calls with `datetime.now(timezone.utc)` and adjusted imports.
- The registration sample called an undefined `trigger_compliance_checks()` function. Replaced it with an optional `compliance_checker` argument that calls `run_all_checks()` when provided.
- The data recency check could subtract an aware UTC timestamp from a naive `datetime.fromisoformat()` result. Added normalization for naive parsed dates.
- The Vertex AI label update examples passed only `{"governance_status": ...}`, which can drop existing labels when updating the model label map. Updated the samples to merge the new status into existing labels before calling `model.update(labels=...)`.
- The `team` metadata value was used directly as a Vertex AI label value even though labels have format restrictions. Added a small helper to normalize that metadata into a valid label value.
- The audit log was described as immutable, but the sample BigQuery table code only appends rows and does not enforce immutability through table controls or IAM. Changed the wording and class docstring to "append-only audit trail."
- The audit event ID used Python's process-randomized `hash()` output. Replaced it with `uuid.uuid4()` for a more appropriate unique event ID.

## Review Notes
The post is technically relevant and the code examples now parse as Python. The examples remain illustrative and assume the required Google Cloud resources, IAM permissions, Firestore database, and BigQuery audit table already exist.
