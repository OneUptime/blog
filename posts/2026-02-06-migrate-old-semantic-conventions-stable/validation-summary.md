# Validation Summary: How to Migrate from Old Semantic Conventions to Stable Versions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python instrumentation
- OpenTelemetry Collector transform processor
- Prometheus/PromQL
- Grafana dashboards and alerts
- Python
- YAML

## Sources Consulted
- OpenTelemetry HTTP semantic convention stability migration: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client spans: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention stability migration: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Python Flask instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/flask.html
- opentelemetry-semantic-conventions package versions on PyPI: https://pypi.org/project/opentelemetry-semantic-conventions/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The network attribute mapping incorrectly implied that `net.peer.name` and `net.peer.port` map to `client.address` and `client.port` on server spans. Updated the table and audit script to distinguish client-span peer mappings from server-side `http.client_ip` to `client.address`.
- The Collector transform example copied only `net.peer.*` attributes and omitted server-side `net.host.*` and `http.client_ip` translations. Added those transforms and added missing `receivers`, `batch`, and `exporters` definitions so the YAML is a complete minimal Collector configuration.
- The dependency snippet was fenced as Python even though it was a `requirements.txt` example. Changed the fence to `text`.
- The package versions were too old for the database stable semantic convention migration covered in the post. Updated the example pins to versions aligned with OpenTelemetry semantic conventions 1.33.0 / Python semantic-conventions 0.54b0 or later.
- The PromQL migration example reused the old metric name for the new convention and used a regex that could match missing labels. Updated it to use `http_server_request_duration_seconds_bucket` and an `or` expression combining old and new metric names.

## Review Notes
The dual-emission wrapper remains a simplified example. In production instrumentation, client and server span perspective should be handled explicitly when translating network attributes back to old names.
