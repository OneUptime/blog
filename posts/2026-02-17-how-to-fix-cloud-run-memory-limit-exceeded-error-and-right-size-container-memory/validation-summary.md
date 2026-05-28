# Validation Summary: How to Fix Cloud Run Memory Limit Exceeded Error and Right-Size Container Memory

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Logging
- Google Cloud Monitoring
- Google Cloud CLI
- Docker
- Node.js
- Java / Spring Boot
- Python / pandas

## Sources Consulted
- Google Cloud Run memory limits documentation: https://docs.cloud.google.com/run/docs/configuring/services/memory-limits
- Google Cloud Run concurrency documentation: https://docs.cloud.google.com/run/docs/about-concurrency
- Google Cloud Run troubleshooting documentation: https://docs.cloud.google.com/run/docs/troubleshooting
- Google Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud Monitoring metric list for Cloud Run metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud SDK reference for `gcloud run services update`: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- Google Cloud SDK reference for `gcloud logging read`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Docker documentation for `docker run` memory constraints: https://docs.docker.com/engine/containers/run/
- Node.js CLI documentation for `--max-old-space-size`: https://nodejs.org/dist/latest/docs/api/cli.html

## Issues Found
- The opening section said users would see a 500 error. Cloud Run documentation says memory-limit serving errors can be HTTP 500 or HTTP 503, so the text now says users can see a 500 or 503 error.
- The error explanation implied a specific SIGKILL behavior and "no swap" details. Official Cloud Run docs describe instance termination for memory-limit violations but do not frame this as a graceful signal sequence for this case, so the wording now says the instance is terminated immediately without a graceful drain or warning window.
- The sample memory-limit log text did not match the current Cloud Run troubleshooting documentation. It was replaced with text aligned to the official documented error message.
- The post stated that Cloud Run default concurrency is always 80. Current documentation says console-created services default to 80, while services created with Google Cloud CLI or Terraform default to 80 times the number of vCPUs. The concurrency paragraph was updated with that distinction.
- The multi-stage-build section claimed smaller images mean less memory used at startup. Cloud Run memory documentation explicitly says deployed container image size does not affect memory available to the instance. The section was narrowed to focus on reducing runtime dependencies that the process actually loads into memory.
- The right-sizing diagram said "max concurrency," which was ambiguous after correcting the default-concurrency behavior. It now says "the default concurrency."
- The alert-policy command used `--condition-threshold-value` and `--condition-threshold-comparison`, which are not current `gcloud monitoring policies create` flags. The command now uses the documented `--if='> 0.8'` form with a `--duration`.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference rather than local `--help` output. The Docker, Node.js, Java, and Python snippets are illustrative and syntactically plausible; the Python snippet assumes `pandas` is imported as `pd` elsewhere in a real application.
