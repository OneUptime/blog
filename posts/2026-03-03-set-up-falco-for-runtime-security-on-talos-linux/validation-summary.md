# Validation Summary: How to Set Up Falco for Runtime Security on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Falco
- Falco Helm chart
- Falco modern eBPF driver
- Falco rules
- Falcosidekick
- Falco Talon
- Kubernetes
- Helm
- kubectl

## Sources Consulted
- Falco Helm chart README: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falco Helm chart templates for Falcosidekick HTTP output wiring: https://github.com/falcosecurity/charts/blob/master/charts/falco/templates/_helpers.tpl
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/values.yaml
- Falco default rules and macros: https://github.com/falcosecurity/rules/blob/main/rules/falco_rules.yaml
- Falco rule overriding documentation: https://falco.org/docs/concepts/rules/overriding/
- Falco Talon rules documentation: https://docs.falco-talon.org/docs/rules/
- Talos Linux overview: https://docs.siderolabs.com/talos/v1.12/overview/what-is-talos

## Issues Found
- The post described the recommended Talos approach as the "modern libs driver approach." Changed this to the modern eBPF driver, which is the current Falco driver terminology.
- The driver comparison treated the legacy eBPF probe as a current peer option. Updated the wording to identify it as deprecated in current Falco releases and to describe modern eBPF as the current default-style option.
- The Helm values file used `extra.volumes` and `extra.mounts`, but the Falco chart uses top-level `mounts.volumes` and `mounts.volumeMounts`. Updated the snippet accordingly.
- The Helm values file put `stdout_output`, `grpc`, and `grpc_output` at the top level. These are Falco config keys under `falco`, and `grpc_output` is deprecated. Updated the snippet to use `falco.stdout_output` and noted that enabling Falcosidekick configures HTTP output and JSON output automatically.
- The custom-rule install command used `helm upgrade` while describing installation. Changed it to `helm upgrade --install` with `--create-namespace`.
- The database outbound connection rule compared `fd.sip` to a CIDR list. Updated it to use `fd.snet`, matching Falco's network-list pattern for RFC1918 checks.
- The Falcosidekick Prometheus comment said alerts are stored in Prometheus. Updated this to say Falcosidekick exposes Prometheus metrics.
- The Talon example used action objects as if they directly contained match criteria. Rewrote the snippet to define reusable actions with `actionner` values and separate Talon rules that match Falco events and invoke those actions.
- The performance tuning snippet used invalid Falco config keys such as `syscall_buf_size_preset`, `syscall_drop_failed_exit`, `outputs.rate`, and `rules`. Replaced them with current Helm/Falco values: `driver.modernEbpf.bufSizePreset`, `driver.modernEbpf.dropFailedExit`, `falco.buffered_outputs`, `falco.syscall_event_drops`, and a valid custom rule override.

## Review Notes
The remaining examples are version-sensitive because the Falco Helm chart and Talon schema continue to evolve. The corrected snippets align with the current upstream chart values and published rules documentation as of 2026-05-16. YAML snippets were parsed successfully after the edits; Helm rendering was not run because the local environment does not have the Helm CLI installed.
