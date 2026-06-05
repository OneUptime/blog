# Validation Summary: How to Use OpenTelemetry to Monitor Container Runtime Security Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- Falco
- Falco rules
- Sysdig Secure
- Kubernetes container logs
- OTLP logs

## Sources Consulted
- Falco output channels documentation: https://falco.org/docs/concepts/outputs/channels/
- Falco rules and macros documentation: https://falco.org/docs/concepts/rules/basic-elements/
- Falco default and local rules files documentation: https://falco.org/docs/concepts/rules/default-custom/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector container operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- OpenTelemetry Collector JSON parser and timestamp documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md and https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Python logs API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/_logs.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- Sysdig Secure event forwarding to webhook documentation: https://docs.sysdig.com/en/sysdig-secure/event-forwarding-to-webhook/
- Sysdig Secure SIEM and data platforms payload documentation: https://docs.sysdig.com/en/sysdig-secure/siem-data-platforms/

## Issues Found
- The Falco configuration mixed custom rule definitions into `falco.yaml`. Falco loads custom rules from rules files such as `/etc/falco/falco_rules.local.yaml` or files under `/etc/falco/rules.d`, so the snippet was split into a Falco config snippet and a rules-file snippet.
- The Falco configuration showed `http_output` pointing directly at the Collector OTLP HTTP logs endpoint. Falco HTTP output sends Falco alert JSON, not OTLP log payloads, so the direct OTLP HTTP output example was removed and the filelog pipeline remains the integration path.
- The filelog receiver tried to parse Kubernetes container log files directly as JSON. Kubernetes stdout files are wrapped in container runtime log formats, so the receiver now uses the `container` operator before the JSON parser and reads from `/var/log/pods`.
- The filelog timestamp layout used microsecond precision for Falco timestamps. Falco JSON examples include nanosecond precision, so the layout now uses the collector's nanosecond directive.
- The transform processor description claimed the custom `security.*` attributes were semantic conventions. They are useful custom attributes, but not OpenTelemetry semantic conventions, so the wording was corrected.
- Kubernetes metadata was written to log attributes even though Kubernetes identity is normally represented as resource attributes and used by the `k8sattributes` processor for association. The transform now writes Kubernetes and container identity fields to resource attributes and adds explicit pod association rules.
- The Sysdig adapter assumed a payload object with `entities` and mapped `containerId` to `k8s.pod.name`. Current Sysdig Secure event forwarding sends runtime policy events as a JSON array, with details under `content`, `content.fields`, and `labels`, so the adapter now handles array payloads and maps documented fields.
- The Sysdig severity mapping treated severity values as strings and categorized them inaccurately. Sysdig Secure policy event severity is an integer where 0-3 are High, 4-5 Medium, 6 Low, and 7 Info, so the mapping was updated.
- The correlation SQL joined log Kubernetes pod names from log attributes, but the Collector configuration now stores Kubernetes identity as resource attributes. The query was updated to join against `f.resource_attributes['k8s.pod.name']`.

## Review Notes
- The SQL query remains backend-specific pseudocode because OpenTelemetry does not define a standard SQL schema for traces and logs.
- The Python logs API and SDK are documented under `_logs` modules in current OpenTelemetry Python documentation; the snippet is syntactically valid, but production services should pin compatible OpenTelemetry package versions.
