# Validation Summary: How to Implement Graceful Shutdown in Rust Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Rust
- Tokio signal handling and synchronization primitives
- Axum HTTP server and middleware
- SQLx connection pools
- Kubernetes readiness/liveness probes, lifecycle hooks, and pod termination

## Sources Consulted
- Tokio `tokio::signal` module documentation: https://docs.rs/tokio/latest/tokio/signal/
- Tokio `ctrl_c` documentation: https://docs.rs/tokio/latest/tokio/signal/fn.ctrl_c.html
- Tokio Unix signal documentation: https://docs.rs/tokio/latest/tokio/signal/unix/
- Axum graceful shutdown example: https://github.com/tokio-rs/axum/blob/main/examples/graceful-shutdown/src/main.rs
- Axum middleware documentation: https://docs.rs/axum/latest/axum/middleware/
- SQLx `Pool::close` documentation: https://docs.rs/sqlx/latest/sqlx/struct.Pool.html#method.close
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes pod lifecycle and termination documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The Axum middleware example used the older generic `Next<Bd>` and `Request<Bd>` style. Updated it to the current Axum middleware signature using `extract::Request` and non-generic `Next`.
- The middleware snippet referenced `Arc` without importing it. Added the missing import.
- The request-tracking example stored shutdown state separately in `AppState`, but the final wiring never set that flag. Moved shutdown state into `ShutdownCoordinator` and set it when coordinated shutdown begins.
- The final wiring created one broadcast channel for OS signals and a separate channel inside `ShutdownCoordinator`, so the HTTP server and coordinator were not actually coordinated. Updated the main example to use the coordinator's sender for application shutdown and the signal helper only to receive OS signals.
- The Axum server example did not wire in the request-tracking middleware or health routes used later in the post. Updated `run_server` to receive the coordinator and health state, register the health endpoints, and apply the middleware.
- The SQLx example used `Duration` without importing it. Added the missing import.
- The health-check example used Axum `State`, `StatusCode`, and `Arc` without importing them. Added the missing imports.
- The Kubernetes `preStop` explanation said the hook gives Kubernetes time to remove the pod from service endpoints before SIGTERM. Kubernetes runs `preStop` before TERM, but the hook and application shutdown both count against the pod termination grace period, and endpoint removal/propagation timing is not guaranteed by that statement. Reworded it to accurately describe delaying SIGTERM and allowing endpoint or external load-balancer updates time to propagate.
- The middleware comment said the permit drops when the response completes. In Axum middleware, the permit is held until the downstream handler future returns, which is not necessarily the same as a streamed response body being fully consumed. Updated the wording.

## Review Notes
The examples are still illustrative rather than a single copy-paste crate: imports are shown per section, and a real application would also need to apply the middleware selectively if health endpoints should remain independently reachable during shutdown. No deprecated APIs were found in the corrected Tokio, Axum, SQLx, or Kubernetes snippets.
