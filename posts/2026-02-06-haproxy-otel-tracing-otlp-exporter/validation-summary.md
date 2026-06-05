# Validation Summary: How to Configure HAProxy OpenTelemetry Tracing with the OpenTracing Filter

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- HAProxy OpenTracing filter
- HAProxy SPOE filter
- OpenTracing C wrapper
- Jaeger OpenTracing plugin
- OpenTelemetry Collector
- OTLP
- Docker Compose

## Sources Consulted
- HAProxy OpenTracing filter README: https://github.com/haproxy/haproxy/blob/master/addons/ot/README
- HAProxy OpenTracing test configuration examples: https://github.com/haproxy/haproxy/tree/master/addons/ot/test
- HAProxy SPOE overview and syntax: https://www.haproxy.com/blog/extending-haproxy-with-the-stream-processing-offload-engine
- HAProxy 3.4 release note for OpenTracing deprecation and native OpenTelemetry filter: https://www.haproxy.com/blog/announcing-haproxy-3-4
- OpenTracing C wrapper build instructions: https://github.com/haproxytech/opentracing-c-wrapper
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector overview: https://opentelemetry.io/docs/collector/

## Issues Found
- The post treated `/etc/haproxy/otel-tracer.json` as both the HAProxy OpenTracing filter config and the tracer plugin config. HAProxy's `filter opentracing ... config` file must use the OpenTracing filter's `ot-tracer`, `ot-scope`, and event syntax, so I replaced the JSON example with a valid `ot.cfg` plus a separate Jaeger plugin configuration.
- The install section used CMake directly for `opentracing-c-wrapper`, but the official wrapper instructions use `./scripts/bootstrap`, `./configure`, `make`, and `make install`. I corrected the build commands and added the required HAProxy `USE_OT=1` build step.
- The HAProxy example loaded `opentracing.so` as a runtime module. The official OpenTracing filter is built into HAProxy when compiled with OpenTracing support, so I removed the `module-path` and `module-load` lines.
- The post described an OTel-compatible OpenTracing tracer with direct OTLP HTTP export, but the official HAProxy OpenTracing examples use OpenTracing plugins such as Jaeger. I changed the bridge model to send Jaeger protocol into the OpenTelemetry Collector and export OTLP from the Collector.
- The propagation example manually set `traceparent` and `tracestate` from variables that were not created by the shown configuration. I replaced that with the OpenTracing filter's documented `inject ... use-headers` mechanism and noted that the exact header format depends on the tracer plugin.
- The Collector configuration only had an OTLP receiver, which would not receive spans from the corrected Jaeger OpenTracing plugin path. I added a Jaeger receiver on UDP 6831 and kept OTLP export.
- The Docker Compose example used `haproxy:latest`, which does not communicate that the image must be built with OpenTracing support and the tracer plugin. I changed it to a clearly custom `myorg/haproxy-opentracing:2.9` image and mounted both required config files.
- The SPOE example referenced an agent backend without defining it. I added a minimal `otel-agent-backend` with `option spop-check`.
- The verification section implied tracing stats would appear on the stats page. I added the HAProxy runtime socket and `flt-ot status`, which is the documented OpenTracing filter CLI status command.
- The post did not mention that OpenTracing is deprecated in HAProxy 3.4 and planned for removal in HAProxy 3.5. I added this version-specific caveat and recommended the native OpenTelemetry filter for new deployments.

## Review Notes
The corrected post remains an OpenTracing migration/bridge guide, not a native HAProxy OpenTelemetry guide. A future rewrite should probably retitle and restructure it around HAProxy 3.4's native `filter opentelemetry` support once production-ready examples are available for the target deployment.
