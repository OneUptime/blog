# Validation Summary: Redact SQL Text and Bind Values Before Shared Monitoring

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OpenTelemetry database client span semantic conventions
- OpenTelemetry Collector Contrib transform processor
- OpenTelemetry Transformation Language (OTTL)
- OTLP receivers and gRPC exporters
- SQL parsing, normalization, digests, and query fingerprints
- MySQL Performance Schema statement digests
- PostgreSQL `pg_stat_statements` and query identifiers
- OpenTelemetry metrics, logs, and exemplars
- Telemetry data minimization and sensitive-data redaction

## Sources Consulted

- [OpenTelemetry database client span semantic conventions](https://opentelemetry.io/docs/specs/semconv/db/database-spans/)
- [OpenTelemetry semantic conventions v1.44.0: database client spans](https://github.com/open-telemetry/semantic-conventions/blob/v1.44.0/docs/db/database-spans.md)
- [OpenTelemetry database semantic-convention migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/)
- [OpenTelemetry semantic conventions for SQL databases](https://opentelemetry.io/docs/specs/semconv/db/sql/)
- [OpenTelemetry Collector Contrib v0.159.0 transform processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/transformprocessor/README.md)
- [OpenTelemetry Collector Contrib v0.159.0 OTTL functions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/pkg/ottl/ottlfuncs/README.md)
- [OpenTelemetry Collector v0.159.0 processor-ordering guidance](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/processor/README.md#ordering-processors)
- [OpenTelemetry Collector configuration and pipelines](https://opentelemetry.io/docs/collector/configuration/#pipelines)
- [OpenTelemetry Collector changelog for the OTLP exporter rename](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/CHANGELOG.md#v1500v01440)
- [OpenTelemetry Collector v0.159.0 OTLP gRPC exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/exporter/otlpexporter/README.md)
- [OpenTelemetry Metrics SDK exemplar specification](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#exemplar)
- [OpenTelemetry metrics data model: exemplars](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars)
- [OpenTelemetry guidance for handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [MySQL Performance Schema statement digests and sampling](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-digests.html)
- [PostgreSQL `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [OWASP: Fail Securely](https://owasp.org/www-community/Fail_securely)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST IR 8053: De-Identification of Personal Information](https://nvlpubs.nist.gov/nistpubs/ir/2015/nist.ir.8053.pdf)

## Issues Found

- **OpenTelemetry stability status:** The post described the database span conventions as uniformly stable while discussing `db.query.parameter.<key>`. That attribute is Development and opt-in, although `db.query.summary` and `db.query.text` are Stable. Removed the blanket “stable” wording, stated the parameter attribute's actual status, and described the deny regex as matching the `db.query.parameter.` prefix rather than a “stable prefix.”
- **Fingerprint safety:** “Non-reversible internal fingerprint” overstated the protection offered by an ordinary hash of predictable or unsanitized query text. Changed the fallback guidance to permit only a policy-approved keyed fingerprint for internal correlation when operationally necessary.
- **Deprecated exporter component ID:** The pipeline used `otlp/shared_backend`. Collector v0.144.0 renamed the canonical OTLP gRPC exporter component to `otlp_grpc` and retained `otlp` only as a deprecated alias. Updated the pipeline reference to `otlp_grpc/shared_backend`.
- **Configuration-fragment completeness:** The YAML referenced an OTLP receiver, batch processor, and exporter without defining them, so it was not a standalone Collector configuration. Marked it explicitly as an excerpt and stated which component definitions are omitted.
- **Transform error behavior:** The post did not distinguish startup OTTL validation failures from runtime statement errors and did not state the runtime drop scope precisely. Clarified that the documented modern configuration applies to Collector v0.120.0 and later, invalid OTTL prevents configuration loading, and `error_mode: propagate` returns a runtime error up the pipeline and drops the affected payload.
- **Exemplar behavior:** The post implied that every exemplar links to a detailed trace. Trace and span IDs are optional, and exemplars can also retain attributes filtered from metric points. Updated the text to say exemplars can preserve filtered attributes and link metrics to traces.

## Review Notes

- The transform configuration and regex escaping were validated with `otelcol-contrib` v0.159.0. A live OTLP trace test confirmed that the processor removed `db.query.text`, `db.statement`, and multiple `db.query.parameter.*` attributes while preserving allowed attributes such as `db.query.summary`.
- The shown YAML remains intentionally partial. A deployable configuration must define `receivers.otlp`, `processors.batch`, and `exporters.otlp_grpc/shared_backend`, including the backend endpoint and appropriate TLS and authentication settings.
- `db.query.parameter.<key>` remains a Development semantic-convention attribute, so its status and naming should be rechecked when upgrading semantic-convention versions.
- MySQL digest text retains object identifiers, while PostgreSQL query text and `queryid` behavior have configuration and version caveats. The post correctly avoids treating either mechanism as an anonymity guarantee.
- All external links already present in the post returned successful HTTP responses during validation.
