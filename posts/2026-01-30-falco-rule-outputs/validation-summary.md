# Validation Summary: How to Build Falco Rule Outputs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Falco rules and outputs
- Falco daemon configuration
- Falco JSON output
- Falcosidekick
- Kubernetes alerting integrations
- YAML configuration

## Sources Consulted
- Falco Basic Elements of Rules: https://falco.org/docs/concepts/rules/basic-elements/
- Falco Supported Fields for Conditions and Outputs: https://falco.org/docs/reference/rules/supported-fields/
- Falco Output Channels: https://falco.org/docs/concepts/outputs/channels/
- Falco Alerts Forwarding with Falcosidekick: https://falco.org/docs/concepts/outputs/forwarding/
- Falco gRPC API deprecation documentation: https://falco.org/docs/developer-guide/grpc/
- Falco default configuration: https://github.com/falcosecurity/falco/blob/master/falco.yaml
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/values.yaml

## Issues Found
- The post described Falco output fields as wrapped in `%` symbols. Falco fields are prefixed with `%`, so the wording was corrected.
- The JSON output configuration used `json_include_output_property` while describing `output_fields`. Replaced it with the correct `json_include_output_fields_property`.
- The JSON example included a `uuid` property that is not part of Falco's documented JSON alert structure. Removed it.
- The post claimed per-rule `output_fields` can be specified directly in rule YAML. Falco includes templated output fields automatically in JSON `output_fields`; additional fields should be added through the output text or `append_output.extra_fields`. Updated the explanation and examples.
- The examples used `priority: HIGH`, which is not a valid Falco priority. Replaced it with `WARNING`.
- The Falcosidekick integration used Falco gRPC output, but Falco gRPC output/server is deprecated as of Falco 0.43.0 and Falcosidekick is documented as receiving Falco alerts over HTTP. Updated the examples and diagrams to use HTTP.
- The HTTP output example used an outdated version-specific `user_agent`. Replaced it with Falco's current default `falcosecurity/falco`.
- The Falcosidekick webhook example used `customheaders` as a nested map. The current Helm values use `customHeaders` as a string, so the snippet was corrected.
- The setuid example referenced `proc.suid`, which is not a documented Falco field. Reworked the example into a writable executable detection using documented process fields already discussed in the post.

## Review Notes
The remaining rule conditions use common Falco default macros such as `spawned_process`, `container`, `open_read`, `open_write`, `outbound`, and `dns_lookup`; these depend on the standard Falco rules/macros being available in the deployment. Falco fields and suggested output fields can vary by Falco version and event source, so production rules should be tested with `falco --list=<source>` and the target deployment's ruleset.
