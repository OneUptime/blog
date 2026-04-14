# Validation Summary: How to Configure Dapr Sidecar Listening Address

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (pod annotations, sidecar injection)
- daprd (Dapr sidecar process)
- Networking (IPv4, IPv6, dual-stack, listening addresses)
- JavaScript (Node.js fetch API)
- Python (requests library)

## Sources Consulted
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr environment variables reference — https://docs.dapr.io/reference/environment/
- Dapr CLI reference (`dapr run`) — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr source code: `cmd/daprd/options/options.go` (CLI flag defaults)
- Dapr source code: `pkg/injector/annotations/annotations.go` (annotation definitions)
- Dapr source code: `pkg/runtime/config.go` (port constants and defaults)
- Dapr GitHub issue #7397 (public port purpose clarification)

## Issues Found

### 1. Default listening address incorrect for Kubernetes
**What was wrong:** The post stated the default listening address is `0.0.0.0` (all interfaces). In Kubernetes, the default is actually `[::1],127.0.0.1` (localhost only). The `0.0.0.0` default only applies to standalone mode.
**What was changed:** Updated the intro paragraph and "Default Listening Behavior" section to distinguish between standalone mode (`0.0.0.0`) and Kubernetes mode (`[::1],127.0.0.1`).
**Why:** This is a significant security-relevant error. Claiming the default is all interfaces when it's actually localhost could mislead readers about their security posture.

### 2. `dapr.io/http-port` annotation does not exist
**What was wrong:** The post used `dapr.io/http-port: "3600"` as a Kubernetes annotation. This annotation does not exist — the Dapr annotations reference explicitly marks the HTTP port as "not supported" via annotation. Only `dapr.io/grpc-port` is available.
**What was changed:** Removed the `dapr.io/http-port` annotation from the example and noted that the HTTP port can only be changed via the `--dapr-http-port` CLI flag. Updated the JavaScript example to use the default port 3500 as fallback instead of 3600.
**Why:** Using a non-existent annotation would silently fail, leaving the HTTP port unchanged and confusing developers.

### 3. Port 3501 incorrectly described as "Public gRPC for service invocation"
**What was wrong:** Port 3501 was described as "Public gRPC (for service invocation)". It is actually the public HTTP port for health checks (`/healthz`) and metadata endpoints (`/v1.0/metadata`). It is not a gRPC port.
**What was changed:** Updated the description to "Public HTTP (health and metadata)".
**Why:** Misidentifying the port's protocol and purpose could lead to incorrect debugging or integration attempts.

### 4. "same container" should be "same pod"
**What was wrong:** The post said "only processes within the same container can reach the Dapr HTTP and gRPC APIs." Since containers in a Kubernetes pod share a network namespace, the correct term is "same pod."
**What was changed:** Changed "same container" to "same pod."
**Why:** The distinction matters — other containers in the pod (not just the app container) can also reach the sidecar on localhost.

### 5. `ss` output did not match Kubernetes defaults
**What was wrong:** The expected `ss` output showed `0.0.0.0` for all ports, which doesn't match the Kubernetes default of localhost binding.
**What was changed:** Updated the output to show both `127.0.0.1` and `[::1]` entries for each port, matching the Kubernetes default `[::1],127.0.0.1` listen address.
**Why:** The example output should match the described default behavior to avoid confusion.

### 6. "Restricting to Localhost" section framing was misleading
**What was wrong:** The section implied you need to explicitly restrict to localhost for security, but in Kubernetes the default is already localhost.
**What was changed:** Reframed to note that Kubernetes already defaults to localhost, and the annotation is primarily useful for standalone mode.
**Why:** The original framing could lead readers to add unnecessary annotations.

## Review Notes
- The `ss` command in the daprd container may not be available in all Dapr sidecar images since they use minimal base images. An alternative like `netstat` or checking daprd logs for "listening on" messages may be more reliable in practice.
- The Dapr sidecar's default listening address changed from `0.0.0.0` to localhost in recent versions. The original post likely referenced older Dapr behavior.
- The `dapr.io/sidecar-listen-addresses` annotation and its behavior are correctly documented in the post.
- The `DAPR_HTTP_PORT` and `DAPR_GRPC_PORT` environment variables are correctly referenced.
