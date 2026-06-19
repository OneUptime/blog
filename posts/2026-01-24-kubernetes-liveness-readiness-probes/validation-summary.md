# Validation Summary: How to Configure Liveness and Readiness Probes Properly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Kubernetes Pod and Deployment YAML
- HTTP, TCP, exec, and gRPC probe mechanisms
- kubectl debugging commands
- Flask health endpoints
- Express health endpoints
- Prometheus alerting syntax
- hey HTTP load generator

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes task guide: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes API reference: Pod v1 Probe fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kubectl logs reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Express 5.x API reference - https://expressjs.com/en/5x/api/
- Flask 3.1 documentation: API and error handling examples - https://flask.palletsprojects.com/en/stable/
- hey README and usage reference - https://github.com/rakyll/hey

## Issues Found
- The startup probe explanation and diagram implied that startup probes only gate liveness checks and that liveness starts after readiness succeeds. Updated both to show that Kubernetes does not execute liveness or readiness probes until the startup probe succeeds, and that liveness does not wait for readiness.
- The `successThreshold` table entry omitted the Kubernetes constraint that liveness and startup probes must use `successThreshold: 1`. Updated the description.
- The worker process probe only checked that `/tmp/healthy` existed, while the example worker refreshed the file timestamp. That would not detect a stuck worker after the file was created. Updated the probe to check that the file exists and was modified recently, and updated the surrounding text accordingly.
- The "same probe for liveness and readiness" section incorrectly treated identical probes as universally bad. Kubernetes documentation allows the same low-cost endpoint in some cases, so the section was narrowed to the real problem: using a dependency-checking readiness endpoint as the liveness probe.

## Review Notes
The Kubernetes YAML fields and defaults are current for the documented probe behavior. gRPC probes are stable in Kubernetes v1.27 and later and require a numeric port; the post's example uses a numeric port. The `hey` command flags `-z` and `-c` match the upstream usage reference.
