# Validation Summary: How to Build a Serverless REST API on GCP Using Cloud Functions and API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Cloud Functions / Cloud Run functions
- API Gateway
- OpenAPI 2.0 / Swagger
- Firestore
- Python
- Flask HTTP responses
- Google Cloud CLI

## Sources Consulted
- Google Cloud API Gateway: Use API Keys - https://docs.cloud.google.com/api-gateway/docs/authenticate-api-keys
- Google Cloud API Gateway: Pass data to and from the backend service - https://docs.cloud.google.com/api-gateway/docs/passing-data
- Google Cloud API Gateway: OpenAPI 2.0 extensions - https://docs.cloud.google.com/api-gateway/docs/oasv2-extensions
- Google Cloud API Gateway: About quotas - https://docs.cloud.google.com/api-gateway/docs/quotas-overview
- Google Cloud SDK: gcloud api-gateway api-configs create - https://docs.cloud.google.com/sdk/gcloud/reference/api-gateway/api-configs/create
- Google Cloud SDK: gcloud alpha services api-keys create - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/services/api-keys/create
- Google Cloud Functions runtime support - https://docs.cloud.google.com/functions/docs/runtime-support
- Google Cloud Run functions: Write functions - https://docs.cloud.google.com/run/docs/write-functions
- Google Cloud Run functions: Specify dependencies in Python - https://cloud.google.com/run/docs/runtimes/python-dependencies

## Issues Found
- The product and order creation examples returned `firestore.SERVER_TIMESTAMP` in the JSON response. That sentinel is intended for Firestore writes, not direct JSON responses, so the examples now use a timezone-aware `datetime`, store it in Firestore, and return an ISO-formatted timestamp.
- Product read responses did not normalize Firestore timestamp values before calling `jsonify`. The product list and product-by-ID examples now convert `created_at` values with `isoformat()`, matching the existing order-list behavior.
- The source directories were missing required Python dependencies. Added a minimal `requirements.txt` example with `functions-framework` and `google-cloud-firestore`, consistent with Google Cloud's Python dependency guidance.
- The `/products/{product_id}` OpenAPI backend used `path_translation: APPEND_PATH_TO_ADDRESS` while the function expected `product_id` in `request.args`. API Gateway only maps path parameters into query parameters with `CONSTANT_ADDRESS`, so the spec now uses `CONSTANT_ADDRESS`.
- The API key section omitted the OpenAPI `securityDefinitions` / `security` configuration and the required new API config plus gateway update. Added the minimal OpenAPI snippets and deployment commands.
- The API key creation command used the alpha command even though the stable `gcloud services api-keys create` variant is available. Updated the command to the stable form.

## Review Notes
The post remains a valid implementation guide. For production, the API key section should also recommend API key restrictions and stronger authentication for sensitive APIs, but the current post is technically correct for a basic tutorial.
