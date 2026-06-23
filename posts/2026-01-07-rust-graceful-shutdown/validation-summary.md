# Validation Summary: How to Build a Graceful Shutdown Handler in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- Tokio signal handling and synchronization primitives
- Axum HTTP server and middleware
- SQLx PostgreSQL connection pools
- Kubernetes Deployment, readiness probes, lifecycle hooks, and pod termination

## Sources Consulted
- Tokio signal module documentation: https://docs.rs/tokio/latest/tokio/signal/index.html
- Tokio Notify documentation: https://docs.rs/tokio/latest/tokio/sync/struct.Notify.html
- Axum `Serve::with_graceful_shutdown` documentation: https://docs.rs/axum/latest/axum/serve/struct.Serve.html
- Axum `middleware::from_fn_with_state` documentation: https://docs.rs/axum/latest/axum/middleware/fn.from_fn_with_state.html
- SQLx `Pool` documentation: https://docs.rs/sqlx/latest/sqlx/struct.Pool.html
- Kubernetes Pod lifecycle and termination flow documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/

## Issues Found
- The Axum middleware examples used older generic `Next<Bd>` signatures and `http::Request<Bd>`. Updated them to the current Axum 0.8 style using `extract::Request` and non-generic `middleware::Next`.
- The connection drain helper could miss a `Notify::notify_waiters()` wakeup if the active count reached zero between checking the count and registering the waiter. Reworked `wait_for_drain` to create the `Notified` future before the second active-count check.
- The complete implementation moved `shutdown_tx` into the shutdown task before subscribing the server shutdown future. Moved subscription earlier so the sender is not used after move.
- The complete implementation referenced prior modules and helper functions without imports. Added module declarations/imports and a `create_db_pool` helper using `DATABASE_URL`.
- The Kubernetes Deployment snippet omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and `template.metadata.labels`.
- The Kubernetes timeout guidance only compared `terminationGracePeriodSeconds` to the drain timeout. Updated it to account for both the `preStop` delay and drain timeout, matching Kubernetes termination behavior.
- The graceful shutdown test used `drop(guards.into_iter().next())`, which drops the iterator and therefore all remaining guards. Changed it to `drop(guards.pop())` so only one guard is dropped before the assertion.
- Removed unused imports from examples where they would otherwise produce compiler warnings.

## Review Notes
The examples are technically consistent with current Tokio, Axum, SQLx, and Kubernetes documentation. The "complete" Rust example still assumes standard project scaffolding and dependencies, including Tokio with signal/sync support, Axum, tracing, tracing-subscriber, and SQLx with PostgreSQL/runtime features.
