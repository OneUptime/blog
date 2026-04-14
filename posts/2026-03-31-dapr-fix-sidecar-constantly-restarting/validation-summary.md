# Validation Summary: How to Fix Dapr Sidecar Constantly Restarting

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar architecture, Sentry, components)
- Kubernetes (pods, containers, probes, kubectl)
- Go runtime (GOMEMLIMIT, GOGC)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Sentry Helm chart values (port configuration): https://github.com/dapr/dapr/tree/master/charts/dapr/charts/dapr_sentry
- Dapr sidecar Dockerfile (distroless base image): https://github.com/dapr/dapr/blob/master/docker/Dockerfile
- Kubernetes container exit code conventions (128+signal for signal-related exits)
- Go runtime environment variables documentation (GOMEMLIMIT, GOGC)

## Issues Found

1. **Incorrect exit code description (line 29):** The post claimed "Exit Code 2: Signal received, possibly from Kubernetes." This is wrong — signal-related exit codes follow the 128+N convention (e.g., 137 for SIGKILL, 143 for SIGTERM). Exit code 2 typically indicates a usage or argument error. Changed to document exit codes 137 (SIGKILL) and 143 (SIGTERM), which are the actual signal-related codes users will encounter.

2. **Wrong annotation name for sidecar environment variables (line 59):** The post used `dapr.io/sidecar-env`, which is not a valid Dapr annotation. The correct annotation is `dapr.io/env` per the official Dapr annotations reference. Changed to `dapr.io/env`.

3. **`kubectl exec` into daprd container to run `nc` (lines 75-76 and 101-102):** The daprd sidecar container uses a distroless base image (`gcr.io/distroless/static:nonroot`) that does not include `nc`, `sh`, or any shell utilities. The exec commands would fail at runtime. Changed the target container from `-c daprd` to `-c myapp` (the application container), since all containers in a pod share the same network namespace and the app container is more likely to have networking tools available.

## Review Notes
- The Sentry port (443) was verified as correct — the Dapr Sentry Kubernetes Service exposes port 443, which maps to container targetPort 50001.
- The "Preventing Future Restarts" section shows a startup probe on the application container (port 8080), not on the Dapr sidecar. While this helps overall pod stability, the Dapr sidecar injector already configures health probes on the daprd container automatically. This section is not wrong but could be more precise about what it prevents (app being killed while waiting for sidecar) vs. preventing sidecar restarts directly.
- The `dapr.io/sidecar-memory-limit`, `dapr.io/sidecar-memory-request`, and `dapr.io/log-level` annotations were verified as correct.
- The GOMEMLIMIT=200MiB and GOGC=50 environment variable values use correct syntax for Go 1.19+.
- App containers may also lack `nc` if using minimal/distroless images. Users may need to use `kubectl debug` with an ephemeral container for connectivity testing in fully distroless environments.
