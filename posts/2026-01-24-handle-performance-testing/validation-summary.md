# Validation Summary: How to Handle Performance Testing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- k6
- Artillery
- JavaScript
- YAML
- Docker
- GitHub Actions
- Grafana dashboards and monitoring concepts

## Sources Consulted
- Grafana k6 install documentation: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 running tests documentation: https://grafana.com/docs/k6/latest/get-started/running-k6/
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Artillery test script reference: https://www.artillery.io/docs/reference/test-script
- Artillery HTTP engine reference: https://www.artillery.io/docs/reference/engines/http
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Actions workflow dispatch documentation: https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow

## Issues Found
- The Ubuntu/Debian k6 install snippet only ran `apt-get update` and `apt-get install k6`, which is incomplete for a fresh system unless the k6 apt repository has already been configured. Added the current official Grafana k6 keyring and apt source commands.
- The GitHub Actions k6 install step used the older keyserver-based GPG command. Replaced it with the current official `curl ... | gpg --dearmor` keyring setup from Grafana's k6 install docs.
- The Artillery example used top-level `config.defaults` for HTTP headers. Artillery currently recommends `config.http.defaults` for HTTP engine defaults, so the snippet now uses that location.
- The Artillery example used `$randomNumber(1, 100)`, which is not listed in the current Artillery default variables reference. Replaced it with a documented `config.variables` value and used `{{ productId }}` in the scenario.
- The CI threshold check attempted to grep threshold failures from k6's real-time JSON output. k6 threshold failures already make the command exit non-zero, and the JSON output is line-oriented metric/sample data rather than an end-of-test threshold summary. Removed the incorrect grep step, moved the `--out` flag before the script path, and marked the artifact upload with `if: always()` so results are preserved after failures.
- The `K6_CLOUD_TOKEN` environment variable was included in a local JSON-output run and was not used by the command. Removed it from the example.

## Review Notes
The k6 JavaScript examples use current imports, options, stages, thresholds, tags, checks, groups, and built-in metrics. The examples still use placeholder endpoints and intentionally simplified credentials/data, so they are structurally correct but would need real test data and endpoint-specific error handling before use against a production-like API.
