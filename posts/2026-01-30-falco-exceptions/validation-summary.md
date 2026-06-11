# Validation Summary: How to Build Falco Exceptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco rules
- Falco rule exceptions
- Falco CLI
- Falco metrics
- Kubernetes runtime security
- YAML configuration

## Sources Consulted
- Falco Rule Exceptions: https://falco.org/docs/concepts/rules/exceptions/
- Falco Rule Fields: https://falco.org/docs/reference/rules/rule-fields/
- Falco Basic Rule Elements: https://falco.org/docs/concepts/rules/basic-elements/
- Falco Supported Fields for Conditions and Outputs: https://falco.org/docs/reference/rules/supported-fields/
- Falco Default Rules: https://falco.org/docs/reference/rules/default-rules/
- Falco Daemon CLI Arguments: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco Metrics: https://falco.org/docs/concepts/metrics/
- Falco Event Generator: https://falco.org/docs/concepts/event-sources/kernel/sample-events/

## Issues Found
- The post listed `INFO` as a Falco priority. Current Falco rule documentation lists `INFORMATIONAL`; updated the priority list accordingly.
- The exception flowchart implied suppressed events are logged as exceptions. Falco exceptions suppress alerts by modifying the effective rule condition; updated the flowchart to show no alert.
- Several rule override snippets added exception values without the required current override syntax. Added `override: exceptions: append` where exception values are appended to existing rules from separate files or later rule entries.
- The network field example described `fd.sip` and `fd.sport` as source IP and port. Falco documents these as server IP and server port; corrected the comment.
- The `Terminal shell in container` example overstated the default rule and omitted current default condition terms. Updated the description, condition, and output to match the current default rule more closely.
- The package management example used an outdated/non-current rule name and severity. Updated it to `Launch Package Management Process in Container`, aligned the condition with the current default rule, and changed priority to `ERROR`.
- The metrics configuration omitted `webserver.prometheus_metrics_enabled: true`, which Falco requires for the `/metrics` Prometheus endpoint. Added it and enabled rule counters explicitly.
- The metrics command grepped for the older/incorrect metric prefix. Updated it to `falcosecurity_falco_rules`.
- The monitoring section claimed Falco metrics can track suppressed vs generated alerts. Current Falco metrics expose rule match counters, not a separate exception suppression counter; revised the wording.
- The debugging rule comment claimed it logs exception matches. It actually logs candidate events to inspect fields; corrected the comment.

## Review Notes
Falco was not installed in the local environment, so CLI behavior was verified against official Falco CLI documentation rather than local `falco --help` output. The post remains a general tuning guide; some examples are illustrative and still require validation against the exact Falco ruleset version deployed in a reader's environment.
