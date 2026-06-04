# Validation Summary: How to Deploy Fission Serverless Framework on K8s for Cold-Start Optimized

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- Fission serverless framework
- Helm
- Fission CLI
- Node.js
- Python / Flask
- Go
- NATS JetStream / KEDA message queue triggers
- Prometheus metrics

## Sources Consulted
- Fission installation documentation: https://fission.io/docs/installation/
- Fission executor documentation: https://fission.io/docs/usage/function/executor/
- Fission environment documentation: https://fission.io/docs/usage/function/environments/
- Fission Node.js function documentation: https://fission.io/docs/usage/languages/nodejs/
- Fission Python function documentation: https://fission.io/docs/usage/languages/python/
- Fission language image reference: https://fission.io/docs/usage/languages/
- Fission CLI reference for environment creation: https://fission.io/docs/reference/fission-cli/fission_environment_create/
- Fission CLI reference for function creation: https://fission.io/docs/reference/fission-cli/fission_function_create/
- Fission CLI reference for HTTP triggers: https://fission.io/docs/reference/fission-cli/fission_httptrigger_create/
- Fission CLI reference for function logs: https://fission.io/docs/reference/fission-cli/fission_function_log/
- Fission CLI reference for message queue triggers: https://fission.io/docs/reference/fission-cli/fission_mqtrigger_create/
- Fission NATS JetStream trigger documentation: https://fission.io/docs/usage/triggers/message-queue-trigger-kind-keda/nats-jetstream/
- Fission CRD reference: https://fission.io/docs/reference/crd-reference/
- Fission metrics reference: https://fission.io/docs/reference/metrics-reference/
- Fission Helm chart values repository: https://github.com/fission/fission-charts/blob/main/charts/fission-all/values.yaml

## Issues Found
- The installation commands omitted the CRD installation step and used an older CLI version. Updated the Helm and CLI examples to Fission v1.24.0 and added the documented CRD install command.
- The production Helm values used unsupported chart keys such as `poolmgr.minReadyPools`, `poolmgr.maxColdStartRetries`, `prometheus.enabled`, and `canary.enabled`. Replaced them with documented values for Prometheus service configuration and `canaryDeployment.enabled`.
- Environment images used the older Docker Hub-style `fission/*` image names. Updated them to the documented `ghcr.io/fission/*` images.
- The Node.js sample referenced an unused `response` variable, could throw when `request.body` is undefined, and checked a non-documented cold-start request header. Removed the unused variable/header check and guarded body access.
- The newdeploy environment example incorrectly set `--executortype` on `fission environment create`; executor type is configured on functions. Removed the environment-level flag.
- The Python sample used `flask.request` without importing `flask`. Added the missing import.
- The NATS JetStream trigger omitted KEDA trigger kind and required connection metadata. Added `--mqtkind keda` and the documented metadata keys.
- The log command used `fission function logs`; the documented command is `fission function log`. Corrected the command.
- Several Prometheus metric names did not match the Fission metrics reference. Replaced them with documented metric names.
- The advanced Environment YAML used unsupported `spec.poolmgr` and `spec.imagepullpolicy` fields and placed resource settings under `runtime.container`. Updated the YAML to use documented top-level `resources`, `poolsize`, `terminationGracePeriod`, and `keeparchive` fields.

## Review Notes
The Go syntax could not be checked locally because `gofmt` is not installed in the workspace. JavaScript and Python snippets were syntax-checked successfully. The Python Redis example still requires a Python environment image or source package that includes the `redis` dependency; the post now leaves that as an optimization pattern rather than a complete dependency-packaging walkthrough.
