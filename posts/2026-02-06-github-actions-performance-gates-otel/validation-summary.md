# Validation Summary: How to Use Automated Performance Gate Checks in GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- Prometheus and PromQL
- GitHub Actions
- GitHub Actions step summaries
- actions/github-script
- Kubernetes kubectl
- Grafana k6
- Python
- YAML

## Sources Consulted
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus OpenTelemetry backend guide: https://prometheus.io/docs/guides/opentelemetry/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- GitHub Actions workflow commands and job summary documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions GITHUB_TOKEN authentication and permissions documentation: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- actions/github-script repository documentation: https://github.com/actions/github-script
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Grafana k6 options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Python syntax validation with Python 3 ast parser.

## Issues Found
- The PromQL examples used `deployment_env`, which is not the current OpenTelemetry semantic resource attribute name. Updated the examples to use `deployment_environment_name`, the Prometheus default underscore-escaped label form for promoted `deployment.environment.name`, and added a note that the queries assume promoted OpenTelemetry resource attributes.
- The PR comment workflow read `perf-results.json`, but the Python script did not create that file. Added `json` import, `PERF_RESULTS_FILE`, `write_results_json()`, and a call after writing the GitHub step summary.
- The retry helper claimed to return the median but returned the upper middle value for even sample counts. Updated it to use `statistics.median()`.
- The retry helper was shown without explaining how it replaces the direct metric query. Added a short instruction to replace `query_metric(query)` with `query_with_retries(query)` inside `run_gates()`.
- The `actions/github-script` PR comment example called `github.rest.issues.createComment()` without awaiting the async REST call. Added `await`.

## Review Notes
The kubectl examples, k6 `--duration` and `--vus` options, GitHub Actions step summary usage, and Prometheus instant query endpoint usage are consistent with current official documentation. The metric names remain illustrative and depend on the application's instrumentation and Prometheus/OpenTelemetry translation configuration.
