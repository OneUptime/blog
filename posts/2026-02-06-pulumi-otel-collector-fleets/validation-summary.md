# Validation Summary: How to Use Pulumi to Provision OpenTelemetry Collector Fleets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Pulumi
- Pulumi Kubernetes provider
- TypeScript
- Kubernetes ConfigMaps and DaemonSets

## Sources Consulted
- Pulumi CLI `pulumi new` command documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Pulumi Kubernetes ConfigMap API documentation: https://www.pulumi.com/registry/packages/kubernetes/api-docs/core/v1/configmap/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector official releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The Collector configuration comment described `probabilistic_sampler` as tail-based sampling. Changed the comment to probabilistic sampling because tail sampling is handled by the separate `tail_sampling` processor.
- The transform processor example used older context-style attribute references and omitted `error_mode`. Updated the snippet to the current documented OTTL style using `span.attributes[...]` and `error_mode: "ignore"`.
- The generated Pulumi program created a Namespace but did not reference it from the ConfigMap or DaemonSet namespace fields, so Pulumi would not infer an ordering dependency on the Namespace. Updated both resources to use `namespace.metadata.name`.
- The example image tag used the older OpenTelemetry Collector Contrib `0.96.0` release. Updated it to `0.153.0`, the latest official release found during review.
- The comment above `pulumi.log.info` claimed it exported a service endpoint, but the code logs a deployment message and does not create a Kubernetes Service. Updated the comment to match the code.
- The comment said Pulumi requires YAML as a string. Clarified that Kubernetes ConfigMap data values are strings and that JSON is valid YAML for the Collector configuration file.
- The TypeScript snippets used a value import for a type-only dependency and assigned the DaemonSet to an unused variable. Updated these for compatibility with stricter TypeScript project settings.

## Review Notes
The DaemonSet example intentionally does not create a Kubernetes Service, so clients would need another discovery or routing mechanism to send telemetry to these Collectors. The backend URLs are placeholders and would need real OTLP HTTP endpoints and TLS/authentication settings in production.
