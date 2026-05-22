# Validation Summary: How to Configure Health Checks for Express.js with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Express.js
- Node.js HTTP server
- Mongoose
- ioredis
- Kubernetes Deployments and probes
- Kubernetes container lifecycle hooks
- Istio sidecar injection and probe rewriting
- Envoy proxy timeout behavior

## Sources Consulted
- Kubernetes: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Istio: Health Checking of Istio Services - https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio: Sidecar Injection Problems / holdApplicationUntilProxyStarts - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio: Application Requirements and sidecar ports - https://istio.io/latest/docs/ops/deployment/application-requirements/
- Node.js HTTP server API - https://nodejs.org/api/http.html
- Mongoose connection documentation - https://mongoosejs.com/docs/connections.html
- Mongoose Connection API - https://mongoosejs.com/docs/api/connection.html
- Envoy timeout FAQ - https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html

## Issues Found
- The Istio probe rewrite description incorrectly said the rewritten path used query parameters. Updated it to describe Istio's `/app-health/<container-name>/livez` and `/app-health/<container-name>/readyz` paths and the `ISTIO_KUBE_APP_PROBERS` mapping.
- The probe rewriting caveat referred to custom response headers being stripped. Updated it to the documented behavior: the sidecar returns the status code and strips the response body.
- The annotation snippets were ambiguous and could be applied to Deployment metadata instead of pod template metadata. Updated them to show `template.metadata.annotations`.
- The sidecar readiness wait script used port `15020` for `/healthz/ready`. Updated it to port `15021`, which is Istio's sidecar health check port.
- The startup probe used `/healthz` while the text said failed dependency startup would eventually cause the startup probe to kill the pod. Updated the startup probe to call `/ready` so it matches the described dependency-gated startup behavior.
- The graceful shutdown example referenced `mongoose` and `redis` without defining them, and used the old callback form of `mongoose.connection.close()`. Added the missing imports/client and changed shutdown to use the current promise-based close API.
- The keep-alive timeout example set timeout fields after `server.listen()` and described `65000` as slightly higher than Envoy's idle timeout. Moved timeout configuration before `listen()` and changed the text to recommend aligning the value with the deployment's proxy/client idle timeout.
- The `preStop` YAML snippet had invalid structure for a pod spec fragment. Corrected the indentation and placement of `terminationGracePeriodSeconds`.
- The shutdown sequence incorrectly said Kubernetes sends SIGTERM before running the `preStop` hook. Updated the sequence to reflect that `preStop` completes before TERM is sent, while the termination grace period is already running.
- The memory health check comment equated heap usage with the container memory limit. Updated it to describe the threshold as application-specific.

## Review Notes
The examples are generally sound after the fixes. For production use, dependency checks should be tuned carefully so readiness failures do not amplify transient dependency incidents, and memory thresholds should be based on observed process RSS, V8 heap behavior, and container limits rather than a single hard-coded value.
