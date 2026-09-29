# How to Audit Traces After Instrumentation and Semantic-Convention Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Instrumentation, Distributed Tracing, Observability

Description: Compare span topology, attributes, sampling, and dependent queries before rolling out instrumentation and semantic-convention changes.

An instrumentation upgrade can keep exporting spans while silently breaking useful coverage. A database child may disappear, HTTP attributes may change names, or a new integration may create duplicate spans. A green exporter health check does not answer whether the traces still describe the application correctly.

Treat the upgrade as a change to a telemetry contract. Compare a small set of controlled operations before and after, then test the queries and alerts that consume the result.

## Record the complete version boundary

Capture the application runtime, auto-instrumentation agent, SDK, each relevant instrumentation package, semantic-convention mode, exporter, Collector components, and backend transformations. Include startup order and enabled/disabled integrations.

A library upgraded independently of its instrumentation may move onto an unsupported code path. Python automatic instrumentation, for example, relies on instrumentation packages and their supported library versions; it does not guarantee coverage of every dependency merely because the process starts successfully. [Python automatic instrumentation](https://opentelemetry.io/docs/zero-code/python/)

Save this inventory with the deployment artifact. Otherwise a comparison between two pods may accidentally compare different dependency graphs instead of one intended agent change.

## Define representative operations

Use a fixture matrix tied to business behavior:

| Scenario | Evidence to compare |
| --- | --- |
| Successful request | One expected server span and essential children |
| Database failure | Error classification and useful sanitized attributes |
| Downstream timeout | Client span, timeout outcome, and parentage |
| HTTP retry | Visible attempts under the intended operation |
| Queue or thread handoff | Correct relationship across the boundary |
| Streaming response | Documented span-end boundary |

Keep test inputs stable and avoid sensitive payloads. Use full sampling in the isolated fixture environment, or a controlled policy that retains these operations, so a missing span is not confused with an expected sampling decision. Do not enable unrestricted full sampling across production just for this audit.

## Compare structure before raw counts

For each operation, compare span kinds, parent relationships, stable operation names, status, and key attributes. Ignore expected nondeterminism such as IDs and timestamps. Compare a small expected topology rather than a byte-for-byte trace snapshot.

A higher span count can mean improved coverage or duplicate instrumentation. If an agent now supports a library that you previously wrapped manually, decide which span represents the actual client operation. Keep a higher-level business span only when it expresses a distinct unit of work.

Track coverage using explicit requirements: every successful checkout must show the inventory call; every timed-out request must preserve the server outcome; every worker execution must identify its service. This produces reviewable failures instead of an unexplained average spans-per-trace chart.

## Audit convention migration separately

HTTP convention migration includes changes such as `http.method` to `http.request.method`, `http.status_code` to `http.response.status_code`, and duration metric naming/units. Instrumentations supporting `OTEL_SEMCONV_STABILITY_OPT_IN` may provide `http` and `http/dup` migration modes. Read the documentation for the installed integration before relying on either option. [HTTP migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)

The duplicate mode does not universally mean two identical spans. It can produce both old and new attributes and both metric forms. Summing both metric families can double-count traffic. Create explicit query versions for the old and new schema, compare results, and remove the transitional union after the fleet converges.

Also inspect resource identity and instrumentation scope. A service name change can make coverage appear to vanish while moving the same spans into a different search partition. OpenTelemetry resources describe the producing entity and belong in this audit alongside span fields. [Resources](https://opentelemetry.io/docs/concepts/resources/)

## Test the consumers and rollout

Run saved searches, exemplars, dashboards, support links, and any Collector filters against the candidate data. A filter matching only a renamed attribute can drop the very failures the upgrade was intended to expose.

Roll out to a small, identifiable cohort. Compare business request counts and workload mix as well as trace volume; otherwise a quiet canary can conceal a coverage regression. Watch SDK/Collector refused and failed export signals, queue pressure, and resource overhead. [Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/)

Set rollback criteria before deployment: missing required spans, broken correlation, incorrect error classification, or unacceptable overhead. A rollback should restore the package and configuration set together. Preserve a small sanitized before/after evidence packet for the next upgrade.

## Conclusion

Validate an instrumentation upgrade by its ability to answer the same operational questions. Compare representative topology, schema, identity, and dependent queries, then canary the complete configuration with explicit rollback criteria.
