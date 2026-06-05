# Validation Summary: How to Migrate from Dynatrace OneAgent to OpenTelemetry Instrumentation

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Dynatrace OneAgent
- Dynatrace Environment API v2
- OpenTelemetry Collector
- OpenTelemetry Java agent
- OpenTelemetry Operator for Kubernetes
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Python zero-code instrumentation
- OpenTelemetry semantic conventions
- Kubernetes Deployments
- OneUptime OTLP ingestion

## Sources Consulted
- Dynatrace Environment API v2 entity selector: https://docs.dynatrace.com/docs/discover-dynatrace/references/dynatrace-api/environment-api/entity-v2/entity-selector
- Dynatrace Environment API v2 entities list: https://docs.dynatrace.com/docs/dynatrace-api/environment-api/entity-v2/get-entities-list
- Dynatrace PROCESS_GROUP_INSTANCE entity type properties: https://docs.dynatrace.com/docs/dynatrace-api/environment-api/entity-v2/get-entity-type
- Dynatrace OneAgent Linux uninstall documentation: https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/installation-and-operation/linux/operation/uninstall-oneagent-on-linux
- Dynatrace Operator uninstall documentation: https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/guides/deployment-and-configuration/updates-and-maintenance/update-uninstall-operator
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Java agent documentation: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry JavaScript SDK NodeSDK API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/sql/
- OpenTelemetry general server attributes: https://opentelemetry.io/docs/specs/semconv/general/attributes/
- OneUptime OpenTelemetry ingestion documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Dynatrace inventory query used `PROCESS_GROUP` with `properties.softwareTechnologies`, but Dynatrace documents `softwareTechnologies` on `PROCESS_GROUP_INSTANCE`. Updated the query and surrounding text to use process group instances.
- The Collector exporter used `https://otlp.oneuptime.com`, which does not match OneUptime's documented OTLP endpoint. Updated it to `https://oneuptime.com/otlp`.
- The OneUptime Collector example was missing the documented JSON encoding and `Content-Type` header for OTLP HTTP ingestion. Added `encoding: json` and `Content-Type: "application/json"`.
- The Kubernetes Deployment examples omitted required `apps/v1` Deployment fields. Added `spec.selector.matchLabels`, matching pod template labels, and a minimal container to the Operator injection example.
- The examples used `deployment.environment`, which is superseded by the stable `deployment.environment.name` resource attribute. Updated the Java and Python examples.
- The Node.js example used the deprecated `metricReader` NodeSDK option. Updated it to `metricReaders`.
- The Java manual span example used older `SemanticAttributes` constants and older database attribute names. Replaced them with current semantic convention attribute keys: `db.system.name`, `db.namespace`, `db.query.text`, `server.address`, and `server.port`.

## Review Notes
The guide is technically relevant and covers a real migration path. The Collector `hostmetrics` `process` scraper can be expensive when matching every process with `names: [".*"]`, so production deployments should test overhead and narrow the include list where possible.
