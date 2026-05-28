# Validation Summary: How to Deploy an API with Cloud Endpoints Using an OpenAPI Specification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Endpoints
- OpenAPI 2.0 and OpenAPI 3.x
- Extensible Service Proxy v2 (ESPv2)
- Google Cloud CLI
- Cloud Run
- Google Kubernetes Engine
- Service Management API
- Service Control API

## Sources Consulted
- Google Cloud Endpoints for OpenAPI: https://docs.cloud.google.com/endpoints/docs/openapi
- About Cloud Endpoints: https://docs.cloud.google.com/endpoints/docs/openapi/about-cloud-endpoints
- Deploying the Endpoints configuration: https://docs.cloud.google.com/endpoints/docs/openapi/deploy-endpoints-config
- Quickstart: Set up Endpoints OpenAPI for Cloud Run with ESPv2: https://docs.cloud.google.com/endpoints/docs/openapi/set-up-cloud-run-espv2
- Getting started with Cloud Endpoints for GKE with ESPv2: https://docs.cloud.google.com/endpoints/docs/openapi/get-started-kubernetes-engine-espv2
- Extensible Service Proxy V2 startup options: https://docs.cloud.google.com/endpoints/docs/openapi/specify-esp-v2-startup-options
- Monitoring your API: https://docs.cloud.google.com/endpoints/docs/openapi/monitoring-your-api
- Google Cloud SDK reference for gcloud run deploy: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy

## Issues Found
- The post said Cloud Endpoints uses OpenAPI 2.0 only. Updated it to state that Cloud Endpoints supports OpenAPI 2.0 and OpenAPI 3.x, while keeping the example on OpenAPI 2.0.
- The post described ESP/ESPv2 as a sidecar in all cases and said it validates requests against the OpenAPI spec. Updated the wording to describe ESP/ESPv2 as a proxy and to limit enforcement claims to authentication, API key requirements, routing, logging, and telemetry.
- The Cloud Run OpenAPI example used a `.endpoints.PROJECT_ID.cloud.goog` service name even though the Cloud Run ESPv2 guide uses the reserved ESPv2 Cloud Run hostname in the OpenAPI `host` field. Updated the example host, service commands, and curl URLs to use the ESPv2 Cloud Run hostname consistently.
- The Cloud Run backend configuration omitted the documented `protocol: h2` value for a Cloud Run backend. Added it to the `x-google-backend` example.
- The Cloud Run ESPv2 image build example used `gcloud builds submit` directly without the documented `gcloud_build_image` script arguments. Replaced it with the documented script invocation and updated the deployment image reference to the generated image format.
- The Cloud Run update guidance said `--rollout_strategy=managed` means no proxy restart is needed. Updated the note to distinguish non-serverless platforms from Cloud Run, where the ESPv2 image must be rebuilt and redeployed after service configuration changes.
- The GKE ESPv2 sidecar example exposed port 8081 but did not set `--listener_port=8081` or `--healthz=/healthz`. Added both flags to match the documented ESPv2 Kubernetes examples.
- The OpenAPI example uses `x-google-backend` for Cloud Run, while the GKE sidecar snippet uses a local `--backend`. Added a note that the top-level `x-google-backend` block should be removed when using the local sidecar backend pattern.

## Review Notes
The article is now technically valid as a concise Cloud Endpoints and ESPv2 tutorial. A future improvement would be to split Cloud Run and GKE into separate end-to-end paths, because their recommended service names, DNS setup, and ESPv2 configuration lifecycle differ.
