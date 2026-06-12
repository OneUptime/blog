# Validation Summary: How to Configure k6 for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana k6
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- JavaScript
- YAML
- Groovy

## Sources Consulted
- Grafana k6 installation documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 ramping VUs executor documentation: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
- grafana/setup-k6-action documentation: https://github.com/grafana/setup-k6-action
- grafana/run-k6-action documentation: https://github.com/grafana/run-k6-action
- Archived grafana/k6-action repository notice: https://github.com/grafana/k6-action
- GitLab CI/CD artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab load performance testing documentation: https://docs.gitlab.com/ci/testing/load_performance_testing/
- Jenkins Pipeline Utility Steps documentation: https://www.jenkins.io/doc/pipeline/steps/pipeline-utility-steps/
- GitHub Actions workflow syntax and expressions documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions and https://docs.github.com/actions/reference/evaluate-expressions-in-workflows-and-actions

## Issues Found
- The Debian/Ubuntu k6 install commands used the older keyserver-based GPG flow. Updated them to Grafana's current `curl ... | gpg --dearmor` installation command.
- The GitHub Actions smoke and load jobs uploaded `k6-results/`, but the smoke job did not create that directory or write an artifact, and the load job wrote into a directory that might not exist. Added `mkdir -p k6-results` and summary exports.
- The "Official k6 Action" examples used archived `grafana/k6-action@v0.3.1` with the old `filename` input. Replaced it with `grafana/setup-k6-action@v1` and `grafana/run-k6-action@v1` using the current `path` input.
- The GitLab CI example used outdated k6 `0.49.0`. Updated pinned binary examples to `1.8.0`, current as of review.
- The GitLab CI cache comment did not match the implementation because `/usr/local/bin/k6` was not cached between jobs. Added a project-local `.k6/` cache and PATH export.
- The GitLab CI report used `artifacts:reports:performance`, which is not the current load performance report key. Changed it to `load_performance` and generated `load-performance.json` with `--summary-export`.
- The Jenkins example parsed k6 streaming JSON output as a single JSON object and referenced the wrong summary path for request counts. Switched Jenkins to `--summary-export` and updated the `readJSON` access to `results.metrics.http_reqs.values.count`.
- The GitHub Actions binary cache example pinned k6 `0.49.0`. Updated the cache key and binary download URL to `1.8.0`.

## Review Notes
- k6 `--summary-export` is valid and useful for CI integration, but Grafana's docs now recommend `handleSummary()` for more flexible long-term report customization.
- The Jenkins `readJSON` and `slackSend` steps require the Pipeline Utility Steps and Slack Notification plugins, respectively.
