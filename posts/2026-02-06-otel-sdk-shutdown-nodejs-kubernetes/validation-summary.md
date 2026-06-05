# Validation Summary: How to Configure SDK Shutdown Procedures in Node.js with SIGTERM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- Node.js process signal handling
- Express HTTP server shutdown
- Kubernetes pod termination lifecycle
- Kubernetes lifecycle hooks and readiness probes
- OTLP gRPC exporters

## Sources Consulted
- Node.js Process API documentation: https://nodejs.org/api/process.html
- Node.js CLI unhandled rejections documentation: https://nodejs.org/api/cli.html#--unhandled-rejectionsmode
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry SDK for Node.js README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry JS NodeSDK API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry resources concept documentation: https://opentelemetry.io/docs/concepts/resources/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/

## Issues Found
- Corrected the Node.js SIGTERM explanation. The post said Node.js does not exit on SIGTERM by default when active event loop handles exist. Official Node.js documentation says SIGTERM and SIGINT have default exit handlers on non-Windows platforms, and installing a listener removes that default behavior. The post now explains that explicit trapping is needed for cleanup, not because the default process would keep running.
- Updated the OpenTelemetry resource example to use current APIs. The post used `new Resource(...)` and `SemanticResourceAttributes`, but current OpenTelemetry JS documentation and package declarations use `resourceFromAttributes` and `ATTR_*` semantic convention constants. The snippet now uses `resourceFromAttributes`, stable service/deployment constants, and incubating Kubernetes constants.
- Replaced the deprecated `metricReader` NodeSDK option with `metricReaders`. The current `@opentelemetry/sdk-node` type declarations mark `metricReader` as deprecated in favor of `metricReaders`.
- Fixed the shutdown timeout in the implementation. The code used 25 seconds while the Kubernetes example also configured a 5 second `preStop` hook. Kubernetes starts the termination grace period before the `preStop` hook runs, so the code now uses 20 seconds to match the article's own formula: 30 seconds grace minus 5 seconds preStop minus 5 seconds safety margin.
- Clarified the unhandled rejection comment. With a listener installed, the sample handler exits explicitly after flushing telemetry, so the wording now says Node.js 15+ would terminate by default and the handler flushes before exiting.

## Review Notes
The Express `server.close()` example is a reasonable baseline for stopping new HTTP connections and waiting for existing ones, but production services may also need to close database pools, message consumers, background jobs, and long-lived upgraded connections such as WebSockets.
