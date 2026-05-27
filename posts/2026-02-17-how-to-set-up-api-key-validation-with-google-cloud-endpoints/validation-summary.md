# Validation Summary: How to Set Up API Key Validation with Google Cloud Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Endpoints
- ESPv2
- OpenAPI 2.0
- API Keys API
- Google Cloud CLI
- Cloud Monitoring
- JWT authentication

## Sources Consulted
- Google Cloud Endpoints: Restricting API access with API keys: https://docs.cloud.google.com/endpoints/docs/openapi/restricting-api-access-with-api-keys
- Google Cloud Endpoints: OpenAPI 2.0 feature limitations: https://docs.cloud.google.com/endpoints/docs/openapi/openapi-limitations
- Google Cloud Endpoints: Using Google ID tokens to authenticate users: https://docs.cloud.google.com/endpoints/docs/openapi/authenticating-users-google-id
- Google Cloud Endpoints: Monitoring your API: https://docs.cloud.google.com/endpoints/docs/openapi/monitoring-your-api
- Google Cloud Endpoints: Why and when to use API keys: https://cloud.google.com/endpoints/docs/openapi/when-why-api-key
- Google Cloud SDK reference: gcloud services api-keys create: https://docs.cloud.google.com/sdk/gcloud/reference/services/api-keys/create
- Google Cloud SDK reference: gcloud services api-keys update: https://cloud.google.com/sdk/gcloud/reference/services/api-keys/update
- Google Cloud Authentication: Manage API keys: https://docs.cloud.google.com/docs/authentication/api-keys
- Google Cloud Monitoring metrics reference: serviceruntime metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud SDK reference: gcloud monitoring dashboards create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create

## Issues Found
- The API key listing comment said `gcloud services api-keys list` lists key values. It lists key metadata/IDs; `get-key-string` is used to retrieve the key string. Updated the comment accordingly.
- The HTTP referrer restriction example omitted URL schemes. Google Cloud requires schemes such as `https://` for referrer restrictions. Updated the example values.
- The combined API key/JWT explanation said separate security entries make either scheme sufficient. ESP and ESPv2 do not support API key alternatives as logical OR requirements. Updated the explanation to clarify that API key plus OAuth2/JWT conjunction is supported, but API key OR alternatives are not.
- The monitoring section claimed Endpoints tracks requests, error rates, and latency per API key. Official docs describe visibility/filtering by consumer project; the API key's project is associated with requests, but per-key metric labels are not available in the current metric descriptor. Updated the section to describe consumer project tracking.
- The Cloud Monitoring dashboard example used the nonexistent metric type `serviceruntime.googleapis.com/api/producer/request_count` and grouped by deprecated/nonexistent `metric.labels.credential_id`. Replaced it with the documented `serviceruntime.googleapis.com/api/request_count` metric and a valid grouping by `metric.labels.response_code_class`.
- The revocation section showed `--clear-restrictions` as a temporary disable operation. Clearing restrictions makes a key less restricted and does not revoke it. Replaced that example with `gcloud services api-keys undelete` as the documented recovery operation after deletion.
- The revocation wording said deletion immediately revokes access and usually propagates in under a minute. Updated the wording to avoid an unsupported timing guarantee and state that requests are rejected after deletion propagates.

## Review Notes
The main OpenAPI API key examples, `x-api-key` header option, API key creation/update flags, JWT security definition format, and `gcloud endpoints services deploy` usage are consistent with current Google Cloud documentation. `gcloud` was not installed in the local workspace, so CLI verification was performed against official Google Cloud SDK reference pages rather than local `--help` output.
