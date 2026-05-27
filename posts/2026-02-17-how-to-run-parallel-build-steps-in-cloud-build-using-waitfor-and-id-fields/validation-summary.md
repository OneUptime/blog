# Validation Summary: How to Run Parallel Build Steps in Cloud Build Using waitFor and id Fields

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Cloud Build YAML configuration
- Docker builds in Cloud Build
- Docker Compose
- Cloud Run deployment with gcloud
- Cloud Storage access with gsutil

## Sources Consulted
- Google Cloud Build documentation: Configuring the order of build steps - https://docs.cloud.google.com/build/docs/configuring-builds/configure-build-step-order
- Google Cloud Build documentation: Build configuration file schema - https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build documentation: Increase vCPU for builds - https://docs.cloud.google.com/build/docs/optimize-builds/increase-vcpu-for-builds
- Google Cloud Build documentation: View build results - https://docs.cloud.google.com/build/docs/view-build-results
- Google Cloud documentation: Deploying to Cloud Run using Cloud Build - https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Docker documentation: docker compose CLI reference - https://docs.docker.com/reference/cli/docker/compose/
- Docker documentation: Deprecated and retired Docker products and features - https://docs.docker.com/retired/

## Issues Found
- The post stated that a step without `waitFor` waits for the immediately preceding step. Google Cloud Build documentation says a step with omitted or empty `waitFor` waits for all prior build steps to complete successfully. Updated the rule to say "all prior build steps."
- The debugging section stated that each log line is prefixed with the step ID. Google documentation explicitly supports viewing build logs and execution details by selecting individual steps, but does not document that every log line is prefixed with the custom `id`. Updated the sentence to say step IDs appear in build step details and that the console can show isolated per-step output.

## Review Notes
The Cloud Build `id`, `waitFor`, `waitFor: ['-']`, multiple dependency, `images`, `entrypoint`, and `machineType: 'E2_HIGHCPU_32'` examples align with current Google Cloud documentation. The `docker/compose:1.29.2` example uses Docker Compose v1, which Docker documents as superseded by Compose v2; the command remains recognizable for older Compose-based CI examples, but a future refresh could modernize the integration test step to a Compose v2 image or install the Compose plugin explicitly.
