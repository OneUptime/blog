# Validation Summary: How to Understand Dapr Latency Overhead

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, state management, pub/sub)
- Kubernetes (pod annotations, kubectl exec)
- Zipkin (distributed tracing)
- Python (requests library with connection pooling)
- Go (pprof profiling)
- curl (HTTP timing measurements)
- gRPC and HTTP protocols

## Sources Consulted
- Dapr Arguments and Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Profiling & Debugging: https://docs.dapr.io/operations/troubleshooting/profiling-debugging/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Tracing Configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Sidecar Overview: https://docs.dapr.io/concepts/dapr-services/sidecar/

## Issues Found
1. **Invalid Kubernetes annotation `dapr.io/profile-port`**: The post included `dapr.io/profile-port: "7777"` as a pod annotation for configuring the sidecar profiling port. This annotation does not exist in Dapr's Kubernetes annotations reference. The profiling port defaults to 7777 and can only be customized via the `--profiling-port` CLI flag when running daprd. Removed the invalid annotation and added a note that the sidecar exposes pprof on port 7777 by default.

## Review Notes
- The latency overhead values in the table are presented as approximate ranges and appropriately caveated with "actual values vary by hardware and network." These are reasonable ballpark figures consistent with community benchmarks but are not officially published by the Dapr project.
- The Python code example correctly demonstrates connection pooling with `requests.Session` and `HTTPAdapter`, which is a valid approach for reducing per-request overhead to the Dapr sidecar.
- The Dapr Configuration resource for Zipkin tracing uses the correct apiVersion (`dapr.io/v1alpha1`), field paths, and Zipkin endpoint format.
- The service invocation URL format (`http://localhost:3500/v1.0/invoke/<appID>/method/<method>`) is correct per the Dapr API reference.
- The default Dapr HTTP port (3500) is correct.
