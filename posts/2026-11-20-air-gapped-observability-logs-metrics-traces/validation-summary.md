# Validation Summary: Air-Gapped Observability

## Review scope

Reviewed on 20 November 2026 against official OneUptime and OpenTelemetry documentation. This is an architecture guide with illustrative sizing calculations, not a tested deployment recipe.

## Sources consulted

- https://oneuptime.com/enterprise/air-gapped/
- https://oneuptime.com/enterprise/air-gapped/observability
- https://opentelemetry.io/docs/collector/configuration/
- https://opentelemetry.io/docs/collector/resiliency/

## Checks

- Verified OneUptime's OTLP/HTTP endpoint, authentication header, and documented built-in gRPC ingress constraint.
- Verified Collector pipeline activation, configuration validation command, and persistent queue limitations.
- Checked storage arithmetic and distinguished stored data from serialized queue growth.
- Shell examples passed bash syntax checking; placeholders and instrumentation prerequisites are explicit.
- Reviewed the generated social image for legibility and clipping.

## Limitations

No live OneUptime, Collector, network isolation, certificate rotation, or notification integration test was performed. The acceptance exercises are instructions for readers, not claimed test results.

- Repository validator passed for this post in an isolated fixture containing its catalog entry, author list, tag allowlist, and image. The full existing catalog was not revalidated.

## Readability revision

Added a compact Mermaid flowchart with explanatory text. Reviewed nodes and connections against the procedure; no separate Mermaid rendering test was performed. The six completed posts passed repository validation together after this revision.
