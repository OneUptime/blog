# Validation Summary: How to Configure Dapr Sidecar Port Mappings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Deployments, Annotations, NetworkPolicies)
- gRPC
- Prometheus metrics
- Dapr CLI

## Sources Consulted
- [Dapr arguments and annotations reference](https://docs.dapr.io/reference/arguments-annotations-overview/) — official annotation/argument mapping table
- [Dapr sidecar injector annotations source code (annotations.go)](https://github.com/dapr/dapr/blob/master/pkg/injector/annotations/annotations.go) — verified exact annotation key names
- [Dapr CLI `dapr run` command reference](https://docs.dapr.io/reference/cli/dapr-run/) — verified CLI flags and default port values
- [Dapr sidecar health checks](https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/) — verified `/v1.0/healthz` endpoint
- [Dapr profiling and debugging](https://docs.dapr.io/operations/troubleshooting/profiling-debugging/) — verified profile port behavior
- [Dapr gRPC integration](https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-services-grpc/) — verified gRPC proto service name

## Issues Found

### 1. Non-existent `dapr.io/http-port` annotation
**What was wrong:** The post listed `dapr.io/http-port: "3500"` as a valid Kubernetes annotation in both the deployment YAML example and the port conflict resolution section. This annotation does not exist in Dapr. The HTTP port can only be configured via the `--dapr-http-port` daprd CLI flag, not through a Kubernetes annotation.
**What was changed:** Removed `dapr.io/http-port: "3500"` from the deployment annotations example and from the port conflict resolution snippet.

### 2. Non-existent `dapr.io/profile-port` annotation
**What was wrong:** The post listed `dapr.io/profile-port: "7777"` as a valid Kubernetes annotation. This annotation does not exist in Dapr. The profile port is configured via the `--profile-port` daprd CLI flag. The actual debug-related annotation is `dapr.io/debug-port` (default 40000), which serves a different purpose.
**What was changed:** Removed `dapr.io/profile-port: "7777"` from the deployment annotations example.

### 3. Misleading profile/debug port description
**What was wrong:** The default ports list described port 7777 as "Profile/debug port", implying it is always active. In reality, the profile port (7777) is only active when profiling is explicitly enabled via the `--enable-profiling` flag. The debug port (40000, via `dapr.io/debug-port`) is a separate concept.
**What was changed:** Updated the description to "Profile port (only active when profiling is enabled via `--enable-profiling`)" to clarify the prerequisite.

## Review Notes
- The `netstat -tlnp` command in the "Verifying Port Configuration" section may not work in all daprd sidecar containers, as `netstat` is not guaranteed to be installed in the minimal container image. Users may need to use `ss -tlnp` or other alternatives depending on the base image.
- The `grpcurl` example for testing the gRPC port (`dapr.proto.runtime.v1.Dapr/GetState`) uses the correct service and method name, but `GetState` requires request parameters (store name, key) to succeed. It will demonstrate port connectivity but will return an error due to missing parameters. This is acceptable for a port-testing example.
- The Dapr CLI flags section (`dapr run`) is fully correct — all flags and default values match the official documentation.
- The NetworkPolicy YAML is syntactically correct and uses the right ports.
- The health check endpoint `/v1.0/healthz` on port 3500 is confirmed correct per official Dapr documentation.
