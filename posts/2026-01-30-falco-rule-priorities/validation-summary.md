# Validation Summary: How to Implement Falco Rule Priorities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco runtime security rules
- Falco rule priorities
- Falco rule overrides
- Falco configuration
- Falcosidekick alert routing
- Kubernetes runtime security
- YAML

## Sources Consulted
- Falco official documentation: Basic Elements of Falco Rules - https://falco.org/docs/concepts/rules/basic-elements/
- Falco official documentation: Overriding Rules - https://falco.org/docs/concepts/rules/overriding/
- Falco official documentation: Controlling Rules - https://falco.org/docs/concepts/rules/controlling-rules/
- Falco official documentation: Supported Fields for Conditions and Outputs - https://falco.org/docs/reference/rules/supported-fields/
- Falco official configuration file - https://github.com/falcosecurity/falco/blob/master/falco.yaml
- Falcosidekick official README - https://github.com/falcosecurity/falcosidekick
- Falcosidekick official configuration example - https://github.com/falcosecurity/falcosidekick/blob/master/config_example.yaml

## Issues Found
- The post used deprecated `append: true` examples to replace rule priorities. Current Falco documentation uses the `override` section; rule `priority` can be replaced with `override.priority: replace`, and appended rule conditions use `override.condition: append`. Updated the override examples accordingly.
- The Falco `priority` configuration example used uppercase `WARNING` and described lower-priority alerts as not generated. The official Falco configuration documents lowercase values and states that matching rules below the threshold are not loaded or evaluated. Updated the example to `priority: warning` and clarified the behavior.
- The post showed a generic Falco output plugin list with `name`, `library_path`, and `min_priority` for PagerDuty, Slack, and file outputs. That is not a valid Falco output configuration. Replaced it with the documented Falco `http_output` configuration used to send events to Falcosidekick, where per-destination `minimumpriority` filtering is supported.
- The network anomaly example referenced `allowed_outbound_ips` and `malicious_ip_list` without defining them. Added list definitions so the example is a valid Falco rules snippet.

## Review Notes
The priority assignment guidance is operational advice rather than a strict Falco requirement. Falco's official guidance generally assigns lower severities to many unexpected behaviors than the examples in this post; the post's more aggressive severities can still be valid environment-specific choices.
