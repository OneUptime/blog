# Validation Summary: How to Test Prometheus Recording Rules and Aggregation Logic with `promtool`

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Prometheus 3.14.0
- PromQL counter rates and aggregation
- Recording rules
- `promtool` rule validation and unit testing
- YAML rule files and test fixtures

## Sources Consulted
- Recording rule configuration and syntax checking: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Recording rule naming practices: https://prometheus.io/docs/practices/rules/
- Rule unit-testing schema, expanding notation, missing/stale samples, and evaluation order: https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/
- `rate()` semantics: https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Range-vector boundaries: https://prometheus.io/docs/prometheus/latest/querying/basics/#range-vector-selectors
- Aggregation operators and retained labels: https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators
- `promtool` command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Official Prometheus 3.14.0 release and binary: https://github.com/prometheus/prometheus/releases/tag/v3.14.0
- Version-specific rate implementation: https://github.com/prometheus/prometheus/blob/v3.14.0/promql/functions.go
- Author link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Extracted the four YAML blocks directly from the README into a temporary directory, using the first block as the rule file and combining the remaining blocks into the test file as instructed.
- Ran the official Darwin ARM64 `promtool` binary. `promtool --version` confirmed version 3.14.0, revision `d7598b7141418fa35be2b5ec5d0fefb634199610`.
- `promtool check rules requests.rules.yml` exited successfully and reported one rule. `promtool test rules requests.test.yml` exited successfully with all three cases passing.
- Confirmed the normal traffic result is 3 requests per second, with only cluster and service labels in addition to the recorded metric name.
- Confirmed the reset case returns 2.75. At five minutes, the range excludes the sample at zero minutes. Instance A's reset-adjusted increase is 180 over the 240 seconds between the retained endpoints; extrapolation over the five-minute range preserves the 0.75 per-second rate. Instance B contributes 2.
- Confirmed the single-sample fixture returns no sample. This observation applies to the ordinary counter samples shown; the version-specific implementation also supports start-timestamp metadata, which these fixtures do not supply.
- Verified the command syntax, YAML fields, sample expansion, missing/stale notation, and rule-group evaluation-order guidance against official documentation. The linked documentation and author URL resolve to the intended resources.
- Prometheus 3.14.0 is an official published release. No deprecated APIs or flags are used in the examples. Matching the deployment's `promtool` version remains appropriate.
- The suggested additional cluster/service isolation and missing/stale cases are future extensions, not tests included in the post. Offline fixtures cannot establish production source coverage or rule evaluation health.
- No README changes were necessary.
