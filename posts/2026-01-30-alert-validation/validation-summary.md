# Validation Summary: How to Implement Alert Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus alerting rules and PromQL
- Prometheus HTTP API
- promtool
- Alertmanager routing configuration
- GitHub Actions
- pre-commit
- Python, PyYAML, and requests
- YAML, Bash, and JavaScript

## Sources Consulted
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus promtool command documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus recording and alerting rule configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager README / amtool routing examples: https://github.com/prometheus/alertmanager
- Prometheus downloads page: https://prometheus.io/download/
- GitHub Actions service containers documentation: https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers
- GitHub REST API issue comments documentation: https://docs.github.com/rest/issues/comments
- pre-commit documentation: https://pre-commit.com/

## Issues Found
- The PromQL validation section said scalar results are valid for alerting. Prometheus alerting rules fire from returned vector elements, so I changed the diagram and query validator to require an instant vector result.
- The example validation output claimed an unknown metric produces a query error. Prometheus returns an empty vector for a syntactically valid selector with no matching series, so I changed that output to a no-data warning.
- The threshold analyzer was invoked with alert files in CI but ignored command-line arguments. I updated the script to accept alert rule files and extract simple comparison thresholds from each rule.
- The label validator was invoked with alert files in CI but always validated `alerting-rules.yaml`. I updated it to read the alert file argument when provided.
- The route validator used only deprecated `match` / `match_re` fields and returned the root route before evaluating matching child routes. I updated it to support current `matchers`, preserve legacy fields, avoid mutating the original labels object, and return matched child receivers using Alertmanager-style sibling continuation behavior.
- The route validator script ignored the alert file argument passed by the shell wrapper. I updated it to use `sys.argv[1]` when present.
- The GitHub Actions `github-script` example had invalid JavaScript because the markdown code fence closed the template literal. I changed it to string concatenation.
- The workflow downloaded Prometheus `v2.47.0`, which is outdated. I updated the example to Prometheus `v3.12.0`, the latest release shown on the official Prometheus downloads page on 2026-06-12.
- Removed unused Python imports from examples where they could confuse readers.

## Review Notes
The examples are still illustrative and assume reachable local Prometheus and Alertmanager instances with suitable data. I verified the edited Python snippets compile, the YAML snippets parse, the Bash snippets parse, and the embedded `github-script` JavaScript passes `node --check`; I did not run the network-dependent validators against live Prometheus or Alertmanager services.
