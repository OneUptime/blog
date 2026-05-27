# Validation Summary: How to Set Up Datadog APM Tracing for Applications Running on Cloud Run on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Datadog APM
- Datadog serverless-init sidecar
- Datadog Python SDK (`ddtrace`)
- Datadog Node.js SDK (`dd-trace`)
- Google Secret Manager
- Google Cloud CLI (`gcloud`)
- YAML service configuration
- Docker

## Sources Consulted
- Datadog Cloud Run container instrumentation docs: https://docs.datadoghq.com/serverless/google_cloud_run/containers/
- Datadog Cloud Run sidecar instrumentation docs: https://docs.datadoghq.com/serverless/google_cloud_run/containers/sidecar/
- Datadog Python Cloud Run sidecar docs: https://docs.datadoghq.com/serverless/google_cloud_run/containers/sidecar/python/
- Datadog Node.js Cloud Run sidecar docs: https://docs.datadoghq.com/serverless/google_cloud_run/containers/sidecar/nodejs/
- Datadog Serverless CLI for Cloud Run docs: https://docs.datadoghq.com/serverless/libraries_integrations/cli-cloud-run/
- Datadog Python tracing library configuration: https://docs.datadoghq.com/tracing/trace_collection/library_config/python/
- Datadog Node.js tracing library configuration: https://docs.datadoghq.com/tracing/trace_collection/library_config/nodejs/
- Google Cloud Run container configuration and startup order docs: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Google Cloud Run secrets configuration docs: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Secret Manager quickstart: https://docs.cloud.google.com/secret-manager/docs/create-secret-quickstart

## Issues Found
- The post used `gcr.io/datadoghq/agent:latest` with `DD_APM_ENABLED` as the Cloud Run sidecar. Datadog's current Cloud Run sidecar documentation uses `gcr.io/datadoghq/serverless-init` for sidecar instrumentation. Updated the sidecar image and environment variables to the documented `serverless-init` pattern.
- The Cloud Run container dependency example lacked startup probes. Google Cloud Run documents that startup probes are required for container dependencies to work successfully. Added startup probes for the application container and Datadog sidecar.
- The post described agentless tracing as sending each trace synchronously and adding request latency. Current Datadog Cloud Run docs describe sidecar and in-container `serverless-init` approaches instead. Replaced the comparison with Datadog's documented sidecar versus in-container tradeoffs.
- The sidecar resource guidance used an unsupported fixed estimate of 100-200MB. Datadog's current examples allocate 512Mi and 1 vCPU to the sidecar, so the performance guidance now reflects that documented example rather than a fixed smaller estimate.
- The Python and Node.js examples referenced placeholder functions (`fetch_users_from_db` and `fetchData`) that were not defined. Added small placeholder implementations so the snippets are syntactically complete.
- The Node.js example used `parseInt` without a radix. Updated it to `parseInt(..., 10)`.
- The Secret Manager IAM command assumed the default Compute Engine service account. Replaced it with a generic Cloud Run service account email placeholder because Cloud Run services can use a configured service identity.
- Updated wording that referred to the sidecar as the full Datadog Agent so it accurately describes Datadog's `serverless-init` sidecar.

## Review Notes
The post now follows the manual YAML deployment path. Datadog also recommends the `datadog-ci cloud-run instrument` command and Terraform module for many deployments, but those alternatives were not added because the review was limited to correcting technical errors without restructuring the article.
