# Validation Summary: How to Create Falco Rule Tags

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Falco rules
- Falco rule tags
- Falco CLI
- Falco daemon configuration
- Falco Helm chart
- Falcosidekick
- YAML
- Bash
- MITRE ATT&CK and PCI-DSS tagging conventions

## Sources Consulted
- Falco rule fields documentation: https://falco.org/docs/reference/rules/rule-fields/
- Falco rules overview: https://falco.org/docs/concepts/rules/
- Falco controlling rules documentation: https://falco.org/docs/concepts/rules/controlling-rules/
- Falco daemon CLI arguments: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco daemon configuration options: https://falco.org/docs/reference/daemon/config-options/
- Falco Helm deployment documentation: https://falco.org/docs/setup/kubernetes/
- Falco Helm chart README and templates: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Official Falco rules repository: https://github.com/falcosecurity/rules
- Falcosidekick configuration and payload code: https://github.com/falcosecurity/falcosidekick

## Issues Found
- The configuration example used deprecated `rules_file`. Updated it to `rules_files`, which is the current Falco configuration key.
- The Helm values example used `falco.extra_args` and mixed `-t` with `-T`. The current Falco Helm chart uses top-level `extra.args`, and Falco documents `-t` and `-T` as mutually exclusive. Updated the example to use ordered `rules[].disable` and `rules[].enable` configuration overrides through `-o`.
- The post did not mention that `-t` and `-T` cannot be combined. Added a short note before the configuration-based approach.
- The tag reporting and audit scripts used `grep` pipelines that did not reliably parse Falco YAML rule objects or isolate `tags` arrays. Replaced them with `yq` expressions that inspect rule entries and their `tags` fields.
- The Falcosidekick example implied `templatedfields` could route Slack channels using `.Tags`. Falcosidekick templates are executed against `output_fields`, while tags are part of the event payload. Updated the snippet to show forwarding tagged alerts to a downstream SIEM with static custom fields for routing context.
- The tagging convention example used `condition: always_true`, but `always_true` is not guaranteed to be defined in a user's rule file. Replaced it with a direct Falco condition.

## Review Notes
- The scripts now depend on `yq`; `yq` is not installed in this workspace, so I could not execute them locally.
- Several rule examples use organization-specific macros or lists such as `allowed_networks` and `db_admins`. These are acceptable as illustrative custom-rule placeholders, but a production rules file would need to define them.
