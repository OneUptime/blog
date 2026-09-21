# Validation Summary: How to Keep PII in Logs, Traces, Metrics, and Error Reports Within a Region

## Status
validated

## Post Type
Technical guide with a Python implementation example and operational validation recommendations.

## Technologies Covered
- OpenTelemetry instrumentation, Collector pipelines, processors, exporters, and persistent queues
- Logs, traces, metrics, exemplars, profiles, and resource attributes
- Python 3 sets, conditional expressions, integer division, and type checks
- Error-reporting SDKs, browser telemetry, and alert notification templates
- Regional data processing, data minimization, pseudonymization, and remote access

## Sources Consulted
- [OpenTelemetry: Handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/) — instrumentation review, minimization, redaction, and limitations of hashing.
- [OpenTelemetry: Transforming telemetry](https://opentelemetry.io/docs/collector/transforming-telemetry/) — filtering and transformation of telemetry signals.
- [OpenTelemetry Collector Contrib: Transform Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md) — component availability, error modes, and transformation risks.
- [OpenTelemetry: Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/) — sending queues, retries, persistent disk storage, and data-loss conditions.
- [OpenTelemetry: Collector configuration](https://opentelemetry.io/docs/collector/configuration/) — exporter selection in signal pipelines and distribution component checks.
- [OpenTelemetry: Metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/) — stream identity, single-writer requirements, overlapping streams, and exemplar contents.
- [OpenTelemetry: HTTP attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/) — route templates and sensitive HTTP headers.
- [Python: Built-in types](https://docs.python.org/3/library/stdtypes.html) — set membership, hashability, integer arithmetic, and Boolean behavior.
- [Sentry Python: Data collected](https://docs.sentry.io/platforms/python/data-management/data-collected/) — request data and local variables in exception stack frames.
- [Sentry Python: SDK options](https://docs.sentry.io/platforms/python/configuration/options/) — SDK initialization and independent DSN configuration.
- [Prometheus: Notification template reference](https://prometheus.io/docs/alerting/latest/notifications/) — alert labels and annotations available to notification templates.
- [Microsoft: Continuing data transfers that apply to all EU Data Boundary Services](https://learn.microsoft.com/en-us/privacy/eudb/eu-data-boundary-transfers-for-all-services) — remote access and customer-initiated transfers outside a storage boundary.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the named profile.

## Issues Found
No technical issues found.

## Review Notes
- Reviewed the README on disk. No changes to the post were necessary; existing workspace edits were preserved.
- Extracted and compiled the exact Python code block, then executed it under Python 3.13.1. All 56,640 mapping cases passed, covering every listed method and route, unknown and missing values, literal customer identifiers, query strings, integer statuses from 0 through 700, and several non-integer status inputs. The adversarial route maps to `OTHER`; only integer statuses from 100 through 599 produce status classes. Booleans and floats are deliberately rejected by the exact type check.
- The helper expects ordinary HTTP method and route strings. Lists and dictionaries in those positions raise `TypeError` during set membership checks. This is an input-contract limitation rather than an error in the deliberately limited example; callers accepting arbitrary objects would need separate type validation. The function neither inspects nor sanitizes other telemetry fields.
- Confirmed that configured persistent queues can write telemetry to disk. This is a possible configured behavior, not a claim that every Collector automatically spills to disk. Dead-letter storage likewise depends on the deployed pipeline and supporting systems.
- Confirmed that the transform processor's `ignore` error mode continues processing after statement errors. It does not establish a fail-closed export policy. Component availability and behavior must be checked against the deployed distribution, as the post recommends.
- Confirmed the warning about deleting dimensions after aggregation: distinct streams can acquire the same identity unless appropriately reaggregated. Mapping dimensions before recording the application metric avoids this particular collision. Resource identity, exemplars, and other output fields still require independent review.
- The HTTP semantic conventions require `http.route` to be a low-cardinality route template. The post's literal-email route is an intentional adversarial example of incorrectly populated telemetry.
- Independent SDK destinations, exception locals, alert template values, and remote dashboard access support the recommendation to review paths outside the Collector. Regional endpoint naming alone does not demonstrate the location of all processing, storage, or access.
- All three technical links in the post resolve to the intended documentation; the author link also resolves. The Microsoft example supports reviewing remote access separately without establishing universal legal requirements for every deployment.
- No terminal commands, Collector configuration snippets, pinned component versions, or deprecated API calls appear in the post. No live Collector, backend, browser SDK, or regional deployment was supplied, so runtime residency and failure-path behavior were not tested. The post correctly limits the conclusions that synthetic tests can establish.
