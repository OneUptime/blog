# Validation Summary: How to Implement Health Checks That Distinguish Between Liveness and Readiness

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Kubernetes Deployment configuration
- Node.js
- Express
- Flask
- psutil
- prom-client
- Prometheus metrics

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes API reference for Pod probe fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Express 4.x API reference: https://expressjs.com/en/4x/api/
- Node.js perf_hooks documentation: https://nodejs.org/api/perf_hooks.html
- Flask documentation: https://flask.palletsprojects.com/en/stable/
- psutil API reference: https://psutil.readthedocs.io/latest/api.html
- prom-client npm documentation: https://www.npmjs.com/package/prom-client

## Issues Found
- The Node.js liveness check calculated `eventLoop` and `memory` check details but returned `alive: this.isAlive`, so failed sub-checks would not actually fail the liveness endpoint. Updated `checkLiveness()` to combine `isAlive`, `eventLoop`, and `memory` into the final `alive` result.
- The Node.js `checkEventLoop()` implementation always returned `true`; the value returned inside `setImmediate()` was not returned from `checkEventLoop()`. Replaced it with Node's `monitorEventLoopDelay()` API and checked the recorded mean event-loop delay in milliseconds.
- The Python liveness memory check used `psutil.virtual_memory().percent`, which reports host/system memory usage rather than the current application's process memory usage. Updated it to use `psutil.Process().memory_percent()` to align with the code's stated goal of checking process health.

## Review Notes
- Kubernetes probe behavior, probe field names, and the Deployment YAML structure are consistent with current Kubernetes documentation.
- The examples are syntactically valid: JavaScript blocks passed `node --check`, the Kubernetes YAML parsed successfully, and the Python block parsed with Python's AST parser.
- The Flask example uses `app.run()`, which is acceptable for a small illustrative snippet, but production deployments should run Flask through a production WSGI server.
