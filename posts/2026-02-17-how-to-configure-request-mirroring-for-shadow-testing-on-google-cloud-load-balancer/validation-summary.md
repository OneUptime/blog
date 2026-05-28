# Validation Summary: How to Configure Request Mirroring for Shadow Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Application Load Balancer
- Google Cloud URL maps
- Google Cloud backend services and health checks
- Request mirroring / shadow testing
- gcloud CLI
- Python Flask
- Google Cloud BigQuery
- SQL

## Sources Consulted
- Google Cloud Load Balancing: Set up traffic management for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/setting-up-global-traffic-mgmt
- Google Cloud Compute Engine REST API: URL maps resource and requestMirrorPolicy fields: https://cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud SDK: gcloud compute url-maps import: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/import
- Google Cloud SDK: gcloud compute backend-services create: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/create
- Google Cloud SDK: gcloud compute backend-services add-backend: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK: gcloud compute health-checks create http: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/create/http
- Flask API documentation for route decorators and request handling: https://flask.palletsprojects.com/
- Google Cloud BigQuery Python client insert_rows_json documentation: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client#google_cloud_bigquery_client_Client_insert_rows_json
- GoogleSQL query syntax and functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax

## Issues Found
- The backend service examples omitted `--load-balancing-scheme=EXTERNAL_MANAGED`, while the post uses global external Application Load Balancer traffic management features. Added the flag to both backend service creation commands so the examples align with the documented global external Application Load Balancer scheme.
- The health check example did not specify scope. Added `--global` so it matches the global backend services used in the rest of the example.
- The URL map import examples used `--source=-` and omitted `--global`. The current gcloud reference documents omitting `--source` to read from standard input and using `--global` for global URL maps. Updated all URL map import commands accordingly.
- The comparison proxy comment and surrounding text said it captured both primary and mirror responses. A mirror backend only receives mirrored requests and cannot see the primary response unless the primary path is instrumented separately. Updated the wording to say it captures mirrored responses for comparison.
- The post claimed Google Cloud adds an `X-Mirrored-From` header. Official requestMirrorPolicy documentation says the load balancer suffixes the `Host` or `:authority` header with `-shadow`; the traffic management guide recommends a custom header if you need to record the selected weighted backend. Replaced the incorrect header claim.
- The post said mirrored traffic doubles inbound traffic from the load balancer's perspective. Clarified that each mirrored request creates an additional request from the load balancer to the mirror backend.
- The post did not mention that mirrored backend requests do not generate Cloud Logging or Cloud Monitoring entries for the mirror backend. Added this caveat because it affects the observability guidance.

## Review Notes
The examples assume managed instance group backends. Google Cloud currently documents request mirroring support for managed instance groups, zonal NEGs, and hybrid NEGs, and does not support internet NEGs, serverless NEGs, or Private Service Connect backends as mirrored backends.
