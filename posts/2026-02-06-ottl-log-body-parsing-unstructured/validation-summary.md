# Validation Summary: How to Use OTTL-Based Log Body Parsing That Extracts Structured Fields from

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Filelog receiver
- Stanza `regex_parser` operator
- OpenTelemetry log data model and semantic conventions

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Contrib Stanza `regex_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib Stanza severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry HTTP semantic convention attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/

## Issues Found
- The post claimed OTTL does not have a dedicated extraction function. Current OTTL documents `ExtractPatterns` for named regex capture extraction, so the text and examples were updated to use `ExtractPatterns`.
- Several transform processor examples used older bare paths such as `body`, `attributes`, `cache`, `severity_text`, and `severity_number`. Updated them to current documented paths such as `log.body`, `log.attributes`, `log.cache`, `log.severity_text`, and `log.severity_number`.
- The severity mapping example used raw numeric severity values. Updated it to use documented severity enum constants such as `SEVERITY_NUMBER_ERROR`.
- The filelog `regex_parser` examples used `preserve_to`, which is not a documented `regex_parser` configuration field. Removed it because `parse_from` does not require moving or deleting the source field.
- Timestamp parser snippets omitted `layout_type`. The default is `strptime`, but the examples now set `layout_type: strptime` explicitly to match the documented timestamp parser configuration.
- The Apache semantic convention mapping used deprecated `http.method`. Updated it to the current `http.request.method` attribute.

## Review Notes
- The post title appears truncated, ending with "from", but that is an editorial issue rather than a technical accuracy issue.
- The Apache access log regex is suitable for the numeric byte count example shown, but production Apache logs can emit `-` for the byte count depending on format and response.
