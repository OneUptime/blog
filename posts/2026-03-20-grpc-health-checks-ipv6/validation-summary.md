# Validation Summary: How to Configure gRPC Health Checks over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC Health Checking Protocol (`grpc.health.v1`)
- Go (`grpc-go`)
- Python (`grpcio` and `grpcio-health-checking`)
- Kubernetes gRPC liveness and readiness probes
- `grpc_health_probe`
- `grpcurl`
- IPv6 socket binding and literal addressing
- OneUptime monitoring

## Sources Consulted
- gRPC Health Checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC Health Checking Protocol reference: https://grpc.github.io/grpc/cpp/md_doc_health-checking.html
- gRPC Python API (`Server.start`, `Server.wait_for_termination`, `Server.add_insecure_port`): https://grpc.github.io/grpc/python/grpc.html
- gRPC Python health checking API (`HealthServicer.set`): https://grpc.github.io/grpc/python/grpc_health_checking.html
- gRPC Go package docs (`grpc.NewClient`): https://pkg.go.dev/google.golang.org/grpc
- Kubernetes probe concepts: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes probe configuration guide: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes blog, "Kubernetes 1.24: gRPC container probes in beta": https://kubernetes.io/blog/2022/05/13/grpc-probes-now-in-beta/
- grpc-health-probe official README: https://github.com/grpc-ecosystem/grpc-health-probe
- grpcurl official README: https://github.com/fullstorydev/grpcurl
- OneUptime Port Monitor docs: https://oneuptime.com/docs/monitor/port-monitor
- OneUptime Custom Code Monitor docs: https://oneuptime.com/docs/monitor/custom-code-monitor

## Issues Found
- The Python example called `server.start()` and then exited immediately. I added `server.wait_for_termination()` so the server actually continues serving, matching gRPC Python's documented server lifecycle.
- The Python example only set a service-specific health status. I added the empty-string (`""`) overall health status, which gRPC documents as the conventional server-wide health key.
- The Kubernetes comment implied native gRPC probes were simply "1.24+". I corrected it to note that the feature is beta in Kubernetes 1.24-1.26 and stable in 1.27+.
- The readiness probe omitted `service`, while the post's dynamic update example changes the `helloworld.Greeter` status. I added `service: "helloworld.Greeter"` so readiness checks target the same service-specific health entry.
- The `grpcurl` example did not mention the need for server reflection or supplied descriptors, and it sent no explicit `HealthCheckRequest` body for a named service check. I updated the example to send `{"service":"helloworld.Greeter"}` and noted the reflection/descriptor requirement.
- The OneUptime section used product names that do not match the official docs (`TCP monitors`, `custom script monitor`). I corrected them to `Port monitors` and `Custom Code monitor`.
- The conclusion said the health service is required to share the same IPv6 listener as the main service. I softened that wording to `usually`, because gRPC health can be exposed on a different listener or port if probes are configured to use it.

## Review Notes
- The Go snippets use current gRPC-Go APIs, including `grpc.NewClient`.
- `grpcurl` can invoke the health RPC without `-proto` or `-protoset` only when server reflection is enabled. Otherwise readers need to provide descriptors explicitly.
- The `grpc_health_probe` installation command using `releases/latest` is plausible, but the official project recommends pinning a versioned release for reproducible builds.
- The post now aligns Kubernetes probes to a service-specific health entry. If readers also rely on the empty-string overall health status for external monitoring, they should update that status alongside the service-specific entry when dependencies change.
