# Validation Summary: How to Use OTTL to Set span.name Based on HTTP Method and Route Template

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OpenTelemetry HTTP semantic conventions
- OpenTelemetry database, RPC/gRPC, and messaging semantic conventions
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL function documentation for `set`, `Concat`, and `replace_pattern`: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OTTL span context path documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/sql/
- OpenTelemetry RPC span semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/

## Issues Found
- The OTTL examples used older unprefixed span paths such as `name`, `attributes[...]`, and numeric span kind comparisons such as `kind == 2`. Updated the examples to current span context paths such as `span.name`, `span.attributes[...]`, and span kind enums such as `SPAN_KIND_SERVER` and `SPAN_KIND_CLIENT`.
- The primary HTTP examples used the deprecated `http.method` attribute. Updated primary examples to `http.request.method`, retaining `http.method` only where the post explicitly shows an older-instrumentation fallback.
- The HTTP client example used `http.route`, which is a server-span route template attribute. Updated the client naming example to use `url.template` when available.
- The `replace_pattern` query-string regex used a single `$` in Collector YAML. Updated it to `$$` because Collector configuration requires escaping literal dollar signs in OTTL strings.
- The comprehensive URL normalization replaced numeric IDs before UUIDs, which could partially rewrite UUID path segments. Reordered the UUID replacement before numeric ID replacement.
- Database examples used outdated attributes `db.operation` and `db.sql.table`. Updated them to `db.operation.name` and `db.collection.name`.
- gRPC examples built a name from `rpc.service` and `rpc.method`, and checked `rpc.system`. Updated them to use current `rpc.system.name == "grpc"` and the fully qualified `rpc.method`.
- Messaging examples used `messaging.operation` and did not require a destination name even though the generated name included one. Updated them to `messaging.operation.name` and required `messaging.destination.name`.

## Review Notes
The transform processor also provides `set_semconv_span_name()` for semantic-convention-based span renaming in recent Collector versions. The post's manual OTTL approach remains valid after the corrections above, especially when custom fallback normalization is desired.
