# Validation Summary: How to Configure Locust for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Locust
- Python
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Mermaid diagrams
- Bash
- YAML
- Groovy

## Sources Consulted
- Locust configuration documentation: https://docs.locust.io/en/stable/configuration.html
- Locust running without the web UI documentation: https://docs.locust.io/en/stable/running-without-web-ui.html
- Locust CSV statistics documentation: https://docs.locust.io/en/2.37.10/retrieving-stats.html
- Locust event hooks documentation: https://docs.locust.io/en/stable/extending-locust.html
- Locust stats source documentation: https://docs.locust.io/en/stable/_modules/locust/stats.html
- Locust Docker documentation: https://docs.locust.io/en/stable/running-in-docker.html
- GitLab CI/CD artifacts report types: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab load performance testing documentation: https://docs.gitlab.com/ci/testing/load_performance_testing/

## Issues Found
- Corrected the description of `--exit-code-on-error`. Locust uses this option to set the exit code when there is any failure or error; it is not a failure-ratio threshold.
- Fixed GitHub Actions PR comment parsing for Locust `results_stats.csv`. The post used the median response time column as failure rate and the average content size column as P95. It now computes failure rate from request and failure counts and reads P95 from the correct Locust CSV percentile column.
- Added `await` to the `actions/github-script` API call so the PR comment creation completes before the script exits.
- Changed the GitHub Actions run link from a relative URL to the full GitHub Actions run URL.
- Added `results_exceptions.csv` to artifact uploads where Locust CSV output is collected.
- Fixed GitLab CI usage of the official `locustio/locust` image by overriding its `locust` entrypoint for shell-based CI scripts.
- Removed the invalid GitLab `artifacts:reports: performance` usage for a Locust CSV. Current GitLab report types do not accept Locust `results_stats.csv` as a `performance` report.
- Fixed Jenkins CSV parsing for Locust `results_stats.csv`. The post now computes failure rate from request and failure counts and reads P95 from the correct percentile column.
- Fixed the parallel result aggregation script to read P95 from the correct Locust CSV column.

## Review Notes
The Locust Python examples use current event and environment APIs, including `events.quitting` and `environment.process_exit_code`. The Jenkins example assumes the Pipeline Utility Steps plugin for `readCSV` and an HTML Publisher setup for `publishHTML`; those are normal Jenkins prerequisites but are not installed by the snippet itself.
