# Validation Summary: How to use OpenTelemetry Collector processors for data transformation

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- OTTL (OpenTelemetry Transformation Language)
- YAML Collector configuration
- Kubernetes `kubectl port-forward`

## Sources Consulted
- OpenTelemetry Collector processor overview: https://opentelemetry.io/docs/collector/components/processor/
- Batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- Memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- Resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- Resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- Attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- Filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Span processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/spanprocessor/README.md
- Transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL span, metric, datapoint, and log context documentation under https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/contexts
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The resource detection example used the deprecated `resourcedetection` type and an invalid `k8s` detector/config block. Changed it to `resource_detection`, replaced `k8s` with released managed-Kubernetes detector names (`eks`, `aks`), removed the invalid Kubernetes nested config, and fixed EC2 tag regexes.
- The attributes processor examples used unsupported `extracted_attribute`, regex replacement on `update`, expression-style lowercase conversion, and invalid conditional insertion. Replaced them with supported `extract` actions using named capture groups.
- The filter processor examples used an older nested `traces` / `metrics` / `logs` configuration shape. Updated them to current OTTL-based `trace_conditions`, `metric_conditions`, and `log_conditions`.
- The tail sampling example described `trace_state` as trace ID sampling. Updated the comment to accurately describe trace state matching.
- The span processor example used invalid `to_attributes` rule objects and unsupported conditional status configuration. Replaced those with supported regex rule strings.
- The transform processor example used unqualified old-style OTTL paths, invalid metric datapoint access, and unqualified log paths. Updated statements to current path prefixes such as `span.attributes`, `datapoint.value_double`, and `log.attributes`.
- The memory limiter example mixed absolute MiB limits and percentage limits in one snippet, even though fixed MiB limits take precedence. Removed the percentage settings from that example.
- The optimization example omitted required `status_code` policy configuration and a required resource action. Added `status_code.status_codes: [ERROR]` and `action: insert`.
- The troubleshooting block was marked as Bash while containing YAML configuration. Split it into separate YAML and Bash code fences.

## Review Notes
Validated YAML syntax for all YAML fences and used `otel/opentelemetry-collector-contrib:latest` version 0.153.0 to validate representative corrected Collector configs for attributes, filter, span, tail sampling, memory limiter, resource, and transform processors. Resource detection with cloud/Kubernetes detectors is environment-specific; released Collector validation can fail when those detectors initialize outside their target runtime, so the review focused on released detector names and schema correctness.
