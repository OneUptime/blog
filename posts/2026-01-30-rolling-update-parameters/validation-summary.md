# Validation Summary: How to Implement Rolling Update Parameters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments (apps/v1 API)
- RollingUpdate strategy (`maxUnavailable`, `maxSurge`)
- Pod health checks (readinessProbe, livenessProbe, startupProbe)
- `minReadySeconds` Deployment field
- `kubectl rollout` subcommands (status, history, undo, pause, resume)
- YAML manifest configuration

## Sources Consulted
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Rolling update strategy / `maxSurge` & `maxUnavailable` reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment
- Pod lifecycle and probes: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes
- Configure probes (httpGet, initialDelaySeconds, periodSeconds, timeoutSeconds, successThreshold, failureThreshold): https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- `kubectl rollout` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout
- Deployment spec `minReadySeconds`: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#min-ready-seconds

## Issues Found
- **Missing markdown heading marker on "Resource Constrained Configuration"** (formerly line 164): the subsection title was plain text while the sibling subsections (`### High Availability Configuration`, `### Fast Rollout Configuration`) used `###`. This broke the rendering of the subsection heading. Fixed by prefixing the title with `### `.

No technical errors were found in the YAML manifests, probe configurations, percentage math for `maxUnavailable`/`maxSurge`, or `kubectl` commands and flags.

## Review Notes
- `apps/v1` is the correct stable API version for Deployments.
- Defaults for `maxUnavailable` and `maxSurge` are 25% each in Kubernetes, matching the example in "Basic Rolling Update Configuration".
- Percentage rounding rules (maxUnavailable rounds down, maxSurge rounds up) yield 1 for both at 25% of 4 replicas, so the inline math comments are accurate.
- The post correctly notes that `maxUnavailable: 0` blocks pod termination until a new replacement pod is ready. The implicit constraint that `maxUnavailable` and `maxSurge` cannot both be 0 is not violated by any example.
- `readinessProbe.successThreshold: 2` in the high-availability example is valid (readiness probes allow values > 1; liveness/startup probes require 1).
- Startup probe math (`failureThreshold: 30` × `periodSeconds: 10` = 300s = 5 minutes) is correct.
- `kubectl rollout undo --to-revision=2`, `kubectl rollout pause/resume`, and the `-w` (watch) flag are all current and correct.
- `nginx:1.21` is an older image tag but is used purely as an illustrative example; not a technical error.
