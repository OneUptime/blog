# Validation Summary: How to Evaluate Recommendation Model Quality and Metrics in Recommendations AI

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Retail API / Recommendations AI
- Vertex AI Search for commerce serving-config analytics
- BigQuery
- Python
- SQL
- A/B testing concepts

## Sources Consulted
- Google Cloud Retail API Python client, ModelServiceClient: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.services.model_service.ModelServiceClient
- Google Cloud Retail API Python client, Model type fields: https://cloud.google.com/python/docs/reference/retail/latest/google.cloud.retail_v2.types.Model
- Google Cloud Retail REST API, models.get resource name format: https://cloud.google.com/retail/docs/reference/rest/v2/projects.locations.catalogs.models/get
- Google Cloud Retail documentation, manage models and view model details: https://cloud.google.com/retail/docs/manage-models
- Google Cloud Retail documentation, view analytics and serving-config metrics: https://cloud.google.com/retail/docs/metrics
- BigQuery Python streaming insert sample using insert_rows_json: https://cloud.google.com/bigquery/docs/samples/bigquery-table-insert-rows
- BigQuery GoogleSQL date functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
- BigQuery GoogleSQL timestamp functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery GoogleSQL function list, including SAFE_DIVIDE: https://cloud.google.com/bigquery/docs/reference/standard-sql/functions-all
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The post said Recommendations AI provides model metrics directly through the console and API, but the Retail API model endpoint returns model metadata such as training state, serving state, data state, and tuning information. I changed the section heading and description to distinguish model status from serving-config analytics.
- The model resource example used a project ID string, but the Retail API documentation specifies `projects/{projectNumber}/locations/{locationId}/catalogs/{catalogId}/models/{modelId}`. I changed the function parameter and example value to use a project number.
- The Python logging example used `datetime.utcnow()`, which returns a naive UTC datetime and is deprecated in current Python documentation. I changed it to `datetime.now(timezone.utc)` and reused a single timestamp per event.
- The position-based analysis claimed a healthy system shows a clear CTR decline at higher positions. I softened this to "often" because position CTR is affected by ranking quality and position bias, and a strict decline is not guaranteed.
- The coverage section used a hard `below 30%` threshold and stated it meant popularity bias. I softened this to avoid presenting an unsupported universal threshold as a rule.

## Review Notes
The SQL examples are illustrative and assume matching BigQuery schemas for the `analytics` and `retail` datasets. In production, attribution tokens or the built-in serving-config analytics described by Google Cloud may provide more reliable recommendation attribution than a fully custom impression/click join.
