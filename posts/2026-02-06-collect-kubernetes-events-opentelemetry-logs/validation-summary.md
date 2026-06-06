# Validation Summary: How to Collect Kubernetes Events as OpenTelemetry Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Events
- Kubernetes RBAC
- OpenTelemetry Collector Contrib
- OpenTelemetry Kubernetes Events Receiver (`k8seventsreceiver`)
- OpenTelemetry Collector resource, transform, filter, memory limiter, batch processors
- OTLP exporter
- Kubernetes Deployment manifests

## Sources Consulted
- OpenTelemetry Collector Contrib Kubernetes Events Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8seventsreceiver
- OpenTelemetry Collector Contrib `k8seventsreceiver` package/source documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8seventsreceiver
- OpenTelemetry Collector Contrib Filter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector Contrib Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- Kubernetes kube-apiserver reference for `--event-ttl`: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post said each event preserved all original fields as attributes. Updated this to say the receiver maps the event message to the log body, event metadata to log attributes, and the involved object to resource attributes.
- The RBAC example included `namespaces` permissions as minimum required permissions. Removed that rule because the official receiver RBAC example only requires `get`, `list`, and `watch` on core `events`.
- The example converted log placed `k8s.object.*` fields under log attributes and used `severityText: "WARNING"`. Updated the example to put involved object fields under resource attributes, add `severityNumber: 13`, and preserve Kubernetes severity text as `"Warning"`.
- The severity explanation said Warning events become `WARNING`. Updated it to distinguish severity number mapping from severity text preservation.
- Transform processor examples used older unprefixed OTTL paths such as `severity_number` and `attributes[...]`. Updated them to current `log.severity_number`, `log.severity_text`, and `log.attributes[...]` paths with `SEVERITY_NUMBER_ERROR`.
- Filter processor examples used the older `logs.log_record` configuration shape and unprefixed `body` / `attributes` paths. Updated them to current `log_conditions` syntax with `log.body`, `log.attributes`, and `resource.attributes`.
- The namespace-limited example text mentioned only production and staging while the snippet also included kube-system. Updated the text to match the snippet.
- The Deployment image tag was outdated (`otel/opentelemetry-collector-contrib:0.96.0`). Updated it to the current verified release tag used during review, `0.153.0`.
- The startup replay section claimed the receiver lists existing events before watching and supports limiting the initial event window. Updated it to match current receiver behavior: it avoids emitting events older than receiver start time, supports `dedup_interval` for repeated MODIFIED events, and supports `storage` for resource version persistence.
- Fixed YAML indentation in the Deployment snippet so `containers` is correctly nested under the pod spec.

## Review Notes
The receiver is still marked alpha for logs in the OpenTelemetry Collector Contrib documentation. The post's guidance to run event collection as a singleton remains correct unless leader election is configured with the receiver's `k8s_leader_elector` option.
