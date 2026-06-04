# Validation Summary: How to Use Liveness Probes to Detect Deadlocks in Application Logic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness probes
- Go HTTP handlers and goroutines
- Go sync primitives and time APIs
- Python threading
- Flask JSON health check endpoints
- Deadlock and stalled-worker detection patterns

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `sync` package documentation: https://pkg.go.dev/sync
- Go `runtime` package documentation: https://pkg.go.dev/runtime
- Go `time` package documentation: https://pkg.go.dev/time
- Python `threading` documentation: https://docs.python.org/3/library/threading.html
- Flask API documentation for routes and response return values: https://flask.palletsprojects.com/en/stable/api/
- Flask quickstart routing documentation: https://flask.palletsprojects.com/en/stable/quickstart/

## Issues Found
- The first Go snippet imported `encoding/json` without using it and started undefined `worker1()` and `worker2()` goroutines. Removed the unused import and kept the startup code focused on the defined `criticalProcessor()` goroutine.
- The Kubernetes probe comment implied that `failureThreshold: 3` meant exactly "30 seconds without heartbeat = restart." Updated it to say Kubernetes restarts after 3 failed probes, which matches the documented liveness probe behavior and avoids implying exact restart timing.
- The multi-component Go heartbeat example only checked components that had already sent a heartbeat, so a critical component that never started could be omitted from the liveness decision. Added registration of expected component names and made zero timestamps unhealthy.
- The Python heartbeat example had the same missing-component issue. Added expected component initialization so both critical threads must report before the liveness endpoint returns healthy.
- The lock contention example recorded wait times into a map but did not show map initialization, which would panic if copied directly. Added a constructor and initialized `lockMonitor`.
- The timeout example called `heartbeat.Beat("processor")` even though the single heartbeat monitor's `Beat` method takes no arguments. Updated it to `heartbeat.Beat()`.
- The best-practices snippet was fenced as YAML while containing Go code and comments. Changed the fence to Go and adjusted the comments and heartbeat call syntax.

## Review Notes
- The Go snippets remain illustrative and reference application-specific functions such as `processMessage`, `receiveMessage`, `syncDatabase`, and `processData`.
- Go was not installed in the local environment, so Go examples were reviewed manually against official documentation rather than compiled locally.
- The Python snippet was syntax-checked successfully with Python 3.
