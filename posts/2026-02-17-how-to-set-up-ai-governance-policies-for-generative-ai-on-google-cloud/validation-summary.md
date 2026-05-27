# Validation Summary: How to Set Up AI Governance Policies for Generative AI on Google Cloud

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud IAM custom roles
- Vertex AI and Gemini model governance
- VPC Service Controls
- Firestore
- Cloud Logging
- BigQuery
- Sensitive Data Protection / Cloud DLP API
- Cloud Billing budgets
- GoogleSQL
- Python

## Sources Consulted
- Google Cloud SDK: `gcloud iam roles create` - https://cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Vertex AI IAM permissions - https://cloud.google.com/vertex-ai/docs/general/iam-permissions
- Google Cloud SDK: `gcloud access-context-manager perimeters create` - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- VPC Service Controls supported products - https://cloud.google.com/vpc-service-controls/docs/supported-products
- Vertex AI model versions and lifecycle - https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Vertex AI text embeddings API - https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
- Google Cloud Python BigQuery client `insert_rows_json` - https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- Google Cloud Python Logging client `log_struct` - https://cloud.google.com/python/docs/reference/logging/latest/logger
- Google Cloud Python DLP `InspectConfig` - https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.InspectConfig
- Google Cloud SDK: `gcloud billing budgets create` - https://cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- BigQuery GoogleSQL date and timestamp functions - https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions

## Issues Found
- The custom IAM admin role used `aiplatform.models.deploy`, which is not listed as a Vertex AI IAM permission. Replaced it with valid model read permissions, keeping deploy control on the endpoint permissions.
- The VPC Service Controls example included `generativelanguage.googleapis.com`, which is not listed as a supported VPC Service Controls product. Replaced it with `firebasevertexai.googleapis.com`, which is supported, and softened the explanatory claim to avoid overstating VPC Service Controls behavior.
- The approved model list used `gemini-2.0-pro`, which is not a current listed Vertex AI stable model ID, and older model IDs where newer stable options are recommended. Updated the examples to `gemini-2.5-flash`, `gemini-2.5-pro`, and `gemini-embedding-001`.
- The policy enforcement snippet called an undefined `contains_pii()` function. Added a small local implementation so the example is syntactically complete while retaining the recommendation to use Sensitive Data Protection for production.
- The Python examples used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc).isoformat()`.
- The audit logger imported `json` only to serialize metadata into a string, while the BigQuery schema declares `metadata JSON`. Changed metadata to remain a JSON-compatible object.
- The budget example called the budget "daily" even though Cloud Billing budgets are calendar/custom-period budgets rather than daily hard caps. Changed it to a monthly budget matching the policy's monthly limit.
- The budget command used `--filter-services="services/aiplatform.googleapis.com"`, but the CLI expects Cloud Billing Catalog service resource IDs. Replaced it with a clear `services/VERTEX_AI_SERVICE_ID` placeholder and added a comment to look it up in the Catalog.
- The budget threshold values used `80` and `100`; the CLI expects fractions such as `0.80` and `1.00`. Corrected both threshold rules.

## Review Notes
Local `gcloud` was not installed in the workspace, so CLI validation was performed against official Google Cloud SDK reference documentation. The Python snippets were checked locally for syntax with Python 3.12.3, but the Google Cloud client libraries were not installed, so runtime API calls were not executed.
