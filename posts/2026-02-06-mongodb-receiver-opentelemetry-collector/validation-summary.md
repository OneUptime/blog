# Validation Summary: How to Configure the MongoDB Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- MongoDB receiver (`mongodbreceiver`)
- MongoDB authentication and roles
- Collector processors and exporters
- Prometheus alert rules
- Kubernetes Deployment and ConfigMap YAML

## Sources Consulted
- OpenTelemetry Collector Contrib MongoDB receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mongodbreceiver/README.md
- OpenTelemetry Collector Contrib MongoDB receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mongodbreceiver/metadata.yaml
- OpenTelemetry Collector Contrib MongoDB receiver config implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/mongodbreceiver/config.go
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- MongoDB built-in roles documentation: https://www.mongodb.com/docs/current/reference/built-in-roles/
- MongoDB privilege actions documentation: https://www.mongodb.com/docs/current/reference/privilege-actions/

## Issues Found
- The receiver examples used `endpoint` connection strings, but the current MongoDB receiver uses `hosts`, optional `scheme`, and optional `replica_set`. Updated all receiver snippets accordingly.
- The basic example used the deprecated/removed `logging` exporter with `loglevel`. Replaced it with the current `debug` exporter and `verbosity`.
- Several listed metrics are not emitted by the current receiver, including `mongodb.connection.active`, `mongodb.connection.available`, `mongodb.operation.latency`, and `mongodb.replication.*`. Replaced them with supported metrics from `metadata.yaml`.
- The post claimed the receiver queries `replSetGetStatus` and exposes replication lag/oplog metrics. Updated the explanation to match the documented `serverStatus` and `dbStats` collection model.
- Receiver `resource_attributes` examples attempted to set arbitrary custom values, which is not valid for the MongoDB receiver. Moved custom attributes to the `resource` processor or removed them.
- Replica set and sharded cluster examples used unsupported connection URI syntax and unsupported replication/sharding metrics. Reworked them to use supported `hosts`, `replica_set`, and `mongos` host configuration.
- Production filter processor configuration used older syntax and the wrong database attribute name. Updated it to OTTL `metric_conditions` using `datapoint.attributes["db.namespace"]`.
- Collector internal telemetry used `service.telemetry.metrics.address`, which is ignored in newer Collector versions. Replaced it with a `readers` pull Prometheus configuration.
- MongoDB Atlas example used an SRV URI in `endpoint` and omitted required `batch` and `otlp` component definitions. Updated it to `scheme: mongodb+srv`, a single host, and complete component definitions.
- Prometheus alert examples referenced unsupported metrics and contained unquoted YAML expressions that could parse incorrectly. Replaced the examples with supported metric selectors and quoted expressions where needed.
- Kubernetes deployment used `command: ["--config=..."]`, which would replace the container entrypoint with a flag. Changed it to `args` and pinned the Collector image tag.

## Review Notes
- Verified representative Collector YAML snippets with `otelcol-contrib v0.153.0 validate` after applying fixes.
- All YAML fences in the post parse successfully.
- Prometheus metric names can be translated by the Prometheus exporter depending on exporter settings and Prometheus compatibility mode, so the alert examples now note that selectors may need adjustment for the exported metric names.
