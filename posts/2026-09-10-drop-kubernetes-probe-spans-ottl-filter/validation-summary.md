# Validation Summary: Drop Kubernetes Liveness and Readiness Probe Spans with OTTL

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL filter processor
- Kubernetes HTTP probes and HTTP span attributes

## Sources Consulted

- [Filter processor conditions and orphaned telemetry warning](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/filterprocessor/README.md)
- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Kubernetes HTTP probe behavior](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [HTTP semantic convention migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed trace_conditions syntax, the folded single predicate, server-kind enum, exact endpoint checks, and both user-agent attribute generations.
- Confirmed Kubernetes normally uses a kube-probe/ user-agent and allows request-header overrides. IsMatch returns false on missing targets, so absence does not accidentally drop spans.
- The article correctly treats separate filter conditions as OR, explains orphaned child spans, and distinguishes volume filtering from an authenticated security decision. The proposed truth table covers the principal positive and negative cases.
- Also inspected the retained authoring-run configuration result for this post: 1 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
