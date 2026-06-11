# Validation Summary: How to Build Falco Custom Rules Advanced

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Falco rules
- Falco rule exceptions and overrides
- Falco syscall event fields
- Falco Kubernetes audit event source
- Falco JSON output and Prometheus metrics
- Falco Helm chart and Falcosidekick
- Kubernetes runtime security

## Sources Consulted
- Falco Rule Exceptions: https://falco.org/docs/concepts/rules/exceptions/
- Falco Overriding Rules: https://falco.org/docs/concepts/rules/overriding/
- Falco Basic Rule Elements: https://falco.org/docs/concepts/rules/basic-elements/
- Falco Supported Fields for Conditions and Outputs: https://falco.org/docs/reference/rules/supported-fields/
- Falco Daemon Arguments: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco Metrics: https://falco.org/docs/concepts/metrics/
- Falco Configuration Options: https://falco.org/docs/reference/daemon/config-options/
- Falco default configuration / Helm-consumed falco.yaml: https://github.com/falcosecurity/falco/blob/master/falco.yaml
- Falco Kubernetes Audit Events: https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/values.yaml

## Issues Found
- The exception examples used invalid top-level `exception:` entries. Changed them to a current Falco rule override using `exceptions:` and `override: exceptions: append`.
- The exception explanation claimed a performance advantage that is not how the official docs frame exceptions. Reworded it to say exceptions are applied into the effective rule condition and are easier to maintain.
- The file write macro had ambiguous operator precedence around `O_WRONLY` and `O_RDWR`. Added parentheses so both flag checks are scoped to the `open`/`openat` branch.
- Several Falco rule snippets omitted required rule keys such as `desc`, `output`, and `priority`. Added minimal required fields so the examples are complete rule objects.
- The performance examples placed inline comments inside folded YAML scalar rule conditions, which would become part of the Falco condition text. Removed those inline comments from the condition blocks.
- The macro composition example claimed each base macro is evaluated once. Reworded the comment to avoid implying Falco memoizes macro evaluations.
- The output example used deprecated `k8s.deployment.name`. Replaced it with non-deprecated `k8s.pod.uid`.
- One rule used `INFO` as a priority. Updated it to the documented `INFORMATIONAL` priority name.
- The JSON output description implied extracted fields appear as top-level JSON keys. Updated it to show Falco's `output_fields` object.
- The multi-source section overstated Falco's behavior as direct cross-source correlation in a single rule. Reworded it to describe analyzing syscall and Kubernetes audit sources side by side and routing alerts together downstream.
- The override examples used deprecated `append: true` / `append: false` syntax. Updated them to the current `override:` syntax for priority, enabled state, appended conditions, and appended list items.
- The capture/replay commands used obsolete or unsupported current Falco CLI flags (`-e`, `--stats-interval`, and `-w`). Replaced them with `--dry-run` validation and current replay configuration via `-o engine.kind=replay` and `-o engine.replay.capture_file=...`.
- The Prometheus metrics configuration omitted `webserver.prometheus_metrics_enabled` and the rule counter option. Added both.
- The metrics command and sample output used the older/incorrect metric name and labels. Updated them to `falcosecurity_falco_rules_matches_total` with `rule_name` and `source` labels.

## Review Notes
Falco was not installed in the local environment, so CLI behavior was verified against the official Falco daemon arguments and configuration documentation rather than local `falco --help` output. The Kubernetes audit rule assumes the `k8saudit` plugin and its rules/macros are loaded in the reader's Falco deployment.
