# Validation Summary: How to Get Started with Falco for Runtime Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco
- Falco Helm chart
- Falcosidekick
- Kubernetes
- Docker and Docker Compose
- Linux packages and systemd
- eBPF and kernel module drivers
- YAML rule and configuration files

## Sources Consulted
- Falco official documentation: https://falco.org/docs/
- Falco Kubernetes quickstart: https://falco.org/docs/getting-started/falco-kubernetes-quickstart/
- Falco container setup: https://falco.org/docs/setup/container/
- Falco host package setup: https://falco.org/docs/setup/packages/
- Falco kernel event source documentation: https://falco.org/docs/concepts/event-sources/kernel/
- Falco output channel documentation: https://falco.org/docs/concepts/outputs/channels/
- Falco CLI arguments reference: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco rule basics and overriding documentation: https://falco.org/docs/concepts/rules/basic-elements/ and https://falco.org/docs/concepts/rules/overriding/
- Falco Helm chart values and breaking changes: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/tree/master/charts/falcosidekick
- Falco upstream rules repository: https://github.com/falcosecurity/rules

## Issues Found
- The Helm example used the removed legacy eBPF driver value `driver.kind: ebpf` and an invalid `driver.ebpf.hostNetwork` structure. Updated it to `driver.kind: modern_ebpf` with the current `modernEbpf` values.
- Several Helm/Falco config keys used camelCase names (`logLevel`, `jsonOutput`, `jsonIncludeOutputProperty`) instead of the current chart keys. Updated them to `log_level`, `json_output`, and `json_include_output_property`.
- The Docker examples omitted the tracefs mount used by the official modern eBPF container example and included older kernel-module-oriented mounts. Updated the Docker and Compose snippets to match the current modern eBPF container setup.
- The architecture and output examples referenced gRPC output, which is removed in Falco 0.44 and current chart 9.x. Removed the gRPC output snippet and kept current supported output channels.
- The CLI examples used `falco --list` for rule listing and `--validate` incorrectly. Updated them to use `falco -L`, `falco -V`, and `falco --dry-run` according to the current CLI reference.
- The default rule snippet for `Terminal shell in container` contained older output fields, including `%container.info`. Updated the example to match the current upstream stable rule style.
- The "Key Default Rules" section mixed stable, incubating, and sandbox rules and included a rule name that does not exist in the current upstream ruleset. Renamed it to "Key Available Rules" and replaced the incorrect outbound rule name.
- The Falcosidekick webhook values used `customheaders`; the current chart uses `customHeaders` for that output. Updated the key.
- The tuning examples used deprecated `append: true` syntax. Updated them to the current `override: condition: append` syntax and corrected the sensitive-file-read macro to `user_known_read_sensitive_files_activities`.
- The sample JSON event had an `evt.time` nanosecond value inconsistent with the displayed timestamp. Updated it to match `2026-01-27T10:30:00Z`.
- The custom "environment secret access" rule actually matched command-line content rather than environment reads. Renamed the rule and description to reflect what the condition detects.

## Review Notes
Helm and package examples were checked against current official documentation, but Falco and Helm CLIs were not installed locally in this workspace, so commands were verified from official references rather than executed end to end.
