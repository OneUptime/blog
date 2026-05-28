# Validation Summary: How to Build an API Gateway for GCP Microservices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud
- Cloud Endpoints
- ESPv2
- Cloud Run
- OpenAPI 2.0
- Apigee
- Apigee API proxies
- Apigee policies
- Cloud Monitoring

## Sources Consulted
- Google Cloud Endpoints OpenAPI extensions: https://cloud.google.com/endpoints/docs/openapi/openapi-extensions
- Google Cloud Endpoints OpenAPI for Cloud Run with ESPv2: https://cloud.google.com/endpoints/docs/openapi/set-up-cloud-run-espv2
- ESPv2 startup options: https://cloud.google.com/endpoints/docs/openapi/specify-esp-v2-startup-options
- Apigee API proxy concepts: https://cloud.google.com/apigee/docs/api-platform/fundamentals/understanding-apis-and-api-proxies
- Apigee environments and environment groups: https://cloud.google.com/apigee/docs/api-platform/fundamentals/environments-overview
- Apigee API proxy import API: https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.apis/create
- gcloud Apigee API proxy deployment reference: https://cloud.google.com/sdk/gcloud/reference/apigee/apis/deploy
- Apigee VerifyAPIKey policy: https://cloud.google.com/apigee/docs/api-platform/reference/policies/verify-api-key-policy
- Apigee SpikeArrest policy: https://docs.apigee.com/api-platform/reference/policies/spike-arrest-policy
- Apigee analytics overview and metrics reference: https://cloud.google.com/apigee/docs/api-platform/analytics/analytics-services-overview and https://cloud.google.com/apigee/docs/api-platform/analytics/analytics-reference
- Cloud Monitoring dashboard CLI reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create

## Issues Found
- The post claimed GCP offers two main API gateway options, which omitted Google Cloud API Gateway. Updated the wording to say GCP offers several options and that the post focuses on Apigee and Cloud Endpoints.
- The Cloud Endpoints OpenAPI example routed to Cloud Run backends without the recommended `protocol: h2` setting and had a `/health` route with no backend. Added `protocol: h2` to Cloud Run backends and routed `/health` to a backend service.
- The Cloud Endpoints deployment command did not specify a project. Added `--project=my-project`.
- The ESPv2 Cloud Run deployment used the generic `gcr.io/endpoints-release/endpoints-runtime-serverless:2` image directly. For Cloud Run, the Endpoints service config should be built into an ESPv2 image. Updated the example to build and deploy a service-config-specific image.
- The custom Cloud Run configuration used the generic ESPv2 image and included `--rollout_strategy=managed` in `ESPv2_ARGS`. Updated the image to the service-config-specific image and removed the rollout flag from the serverless Cloud Run configuration.
- The Apigee provisioning command used a stable `gcloud apigee organizations provision` command and a region for `--runtime-location`. The documented provisioning command is under `gcloud alpha`, and the trial runtime location is a zone. Updated the command and clarified it is for trial provisioning.
- The post used a non-existent stable `gcloud apigee environments create` command. Replaced it with the documented Apigee environments API call and added a note that new environments must be attached to an instance and environment group before traffic can reach deployed proxies.
- The API proxy deployment section used an invalid `gcloud apigee apis create` command and the wrong deploy flag `--name`. Replaced it with the documented Apigee API proxy bundle import call and `gcloud apigee apis deploy --api=...`.
- The monitoring section used a non-existent `gcloud apigee analytics query` command. Replaced it with an Apigee stats API request using documented metric and dimension names.

## Review Notes
The Apigee snippets are still simplified and assume supporting setup such as an Apigee instance, environment group, hostname, API product, app, and credentials are configured. Cloud Endpoints examples assume the ESPv2 service has IAM permission to invoke the Cloud Run backend services when those services require authentication.
