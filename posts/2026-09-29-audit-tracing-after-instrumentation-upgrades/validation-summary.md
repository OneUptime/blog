# Validation Summary: How to Audit Traces After Instrumentation and Semantic-Convention Upgrades

## Status

validated

## Post Type

Technical guide. The post contains implementation details about semantic-convention attributes, migration settings, sampling, span relationships, and Collector behavior, despite having no runnable examples.

## Technologies Covered

- OpenTelemetry automatic instrumentation and Python instrumentation packages
- Tracing SDKs, exporters, sampling, and context propagation
- HTTP semantic conventions
- Resource identity and instrumentation scope
- OpenTelemetry Collector filtering and internal telemetry
- Distributed tracing and canary deployments

## Sources Consulted

- [Python automatic instrumentation](https://opentelemetry.io/docs/zero-code/python/) — package-based instrumentation and supported integrations.
- [Python BaseInstrumentor reference](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/base/instrumentor.html) — supported dependency versions.
- [HTTP convention migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) — attribute renames, metric names and units, and migration options.
- [HTTP span conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) — retries, errors, and span-duration boundaries.
- [Sampling](https://opentelemetry.io/docs/concepts/sampling/) — trace retention and sampling decisions.
- [Context propagation](https://opentelemetry.io/docs/concepts/context-propagation/) — relationships across services.
- [Resources](https://opentelemetry.io/docs/concepts/resources/) — producing entities and service identity.
- [Instrumentation scope](https://opentelemetry.io/docs/concepts/instrumentation-scope/) — identifying telemetry-producing software.
- [Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/) — refusals, export failures, queues, and resource consumption.
- [Collector filter processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md) — attribute conditions and dropping telemetry.
- [Author profile](https://github.com/nawazdhandala) — verified the author link's redirect.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. All four documentation links resolve to the intended official resources; the author link also resolves correctly.
- Confirmed the attribute migrations from `http.method` to `http.request.method` and `http.status_code` to `http.response.status_code`. HTTP duration metrics changed names and units from milliseconds to seconds.
- Confirmed `OTEL_SEMCONV_STABILITY_OPT_IN` migration options `http` and `http/dup`. Support depends on the integration and release; later major versions can remove the variable. The post correctly requires checking the installed integration.
- Dual convention emission can expose both attribute schemas and metric families without requiring two identical spans. Summing request counts from both families can double-count traffic.
- The fixture matrix describes expectations for selected operations, not guarantees for all integrations. HTTP client span duration can exclude response-body consumption, so checking the documented streaming boundary is appropriate.
- Sampling affects trace retention, while propagation affects cross-service relationships. Resource identity and instrumentation scope are appropriate additional dimensions for the audit.
- Collector filtering outcomes depend on the configured predicate and error mode. A condition dropping records that lack an expected attribute can discard spans after a rename; a positive exclusion condition may instead stop matching. Testing actual filters is appropriate.
- Refusal, export-failure, and queue metrics are documented Collector signals. SDK diagnostics vary by language and implementation; the article does not prescribe universal SDK metric names.
- Version inventory, controlled comparisons, consumer checks, canary workload comparisons, and coordinated package/configuration rollback are sound operational recommendations consistent with the documented behavior.
- No executable code, terminal commands, configuration blocks, or application fixture were supplied. Validation was a documentation review, not an executed instrumentation upgrade.
