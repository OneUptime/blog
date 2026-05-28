# Validation Summary: How to Enable CORS for Cloud Endpoints APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Endpoints
- ESP and ESPv2
- OpenAPI 2.0
- CORS
- Google Cloud CLI
- Cloud Run
- Flask
- Flask-CORS

## Sources Consulted
- Google Cloud Endpoints: Enabling CORS support for Endpoints: https://docs.cloud.google.com/endpoints/docs/openapi/support-cors
- Google Cloud Endpoints: ESPv2 startup options: https://docs.cloud.google.com/endpoints/docs/openapi/specify-esp-v2-startup-options
- Google Cloud Endpoints: About Cloud Endpoints: https://docs.cloud.google.com/endpoints/docs/openapi/about-cloud-endpoints
- Google Cloud SDK: gcloud endpoints services deploy: https://docs.cloud.google.com/sdk/gcloud/reference/endpoints/services/deploy
- Google Cloud Endpoints: Set up Endpoints OpenAPI for Cloud Run with ESPv2: https://cloud.google.com/endpoints/docs/openapi/set-up-cloud-run-espv2
- Google Cloud Endpoints: Restricting API access with API keys: https://docs.cloud.google.com/endpoints/docs/openapi/restricting-api-access-with-api-keys
- Flask-CORS API documentation: https://flask-cors.readthedocs.io/en/latest/api.html

## Issues Found
- The post said `allowCors: true` makes ESP handle CORS preflight requests automatically. Google Cloud documents this setting as CORS pass-through to a backend that supports CORS, so I changed the explanation to say the backend must still return CORS headers.
- The ESPv2 Cloud Run command passed multiple `ESPv2_ARGS` values as a quoted space-separated string and included comma-separated method/header values directly. Google Cloud documents the custom delimiter syntax for multiple arguments and says comma-containing values should be configured in the ESPv2 image build script, so I updated the command and surrounding text.
- The ESPv2 example used `--cors_max_age=3600`, but the ESPv2 flag expects a duration with `m` or `h` units. I changed the startup flag to `--cors_max_age=1h`.
- The Cloud Run ESPv2 image example used the generic runtime image. Google Cloud's serverless ESPv2 flow deploys an image built with the service configuration, so I changed the example image to a project-specific, config-specific placeholder.
- The deployment section implied redeploying the backend is what applies a new Endpoints configuration. I changed this to say the ESP or ESPv2 proxy should be redeployed, while backend redeployment is only needed for backend CORS code changes.

## Review Notes
The Flask-CORS example matches the documented `resources` and `origins` usage. The OpenAPI snippets are intentionally abbreviated and would need normal surrounding production fields such as backend routing and security definitions in a complete service config.
