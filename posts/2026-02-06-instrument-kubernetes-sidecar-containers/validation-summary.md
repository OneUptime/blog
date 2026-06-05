# Validation Summary: How to Instrument Kubernetes Sidecar Containers for Any Language Runtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Kubernetes Pods and sidecar containers
- Envoy tracing
- Istio MeshConfig tracing providers
- NGINX OpenTelemetry module
- OpenTelemetry Operator auto-instrumentation and Collector sidecar injection
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector configuration environment variables: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector attributes/resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Operator documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator sidecar injection documentation: https://github.com/open-telemetry/opentelemetry-operator
- Envoy OpenTelemetry tracer API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy Bootstrap API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto.html
- Envoy OpenTelemetry tracing sandbox: https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/opentelemetry.html
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- NGINX OpenTelemetry module documentation: https://nginx.org/en/docs/ngx_otel_module.html
- NGINX OpenTelemetry module repository: https://github.com/nginxinc/nginx-otel

## Issues Found
- The app container pointed SDKs at `localhost:4318` but did not set the OTLP protocol. Added `OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf` so the endpoint matches OTLP/HTTP.
- The Collector resource processor used `from_attribute: ""` together with `value`, and referenced `${K8S_POD_NAME}` without defining the variable. Removed the empty `from_attribute`, switched to `${env:K8S_POD_NAME}`, and added a Kubernetes downward API environment variable for the collector container.
- The Envoy example used the deprecated bootstrap-level tracing field. Reworked the example to configure the OpenTelemetry tracing provider under `HttpConnectionManager.tracing.provider`, matching current Envoy guidance, and added a minimal route and app cluster.
- The NGINX example used the wrong module filename, `otel_ngx_module.so`. Corrected it to the official `ngx_otel_module.so`.
- The NGINX Dockerfile installed build dependencies but described them as installing the module. Changed the example to install the prebuilt `nginx-module-otel` package and pinned the base image to `nginx:1.25.3`, the first NGINX Open Source version documented with the prebuilt module package.
- The OpenTelemetry Operator section conflated `Instrumentation` resources with Collector sidecar injection. Updated the comments and added the required `OpenTelemetryCollector` resource in `mode: sidecar` for the `sidecar.opentelemetry.io/inject` annotation.

## Review Notes
The Istio snippet remains conceptually valid for defining an OpenTelemetry extension provider, but current Istio documentation also recommends enabling tracing with the Telemetry API for sampling/provider selection. The post could be expanded in the future with a Telemetry resource example, but the existing MeshConfig provider example is not technically incorrect.
