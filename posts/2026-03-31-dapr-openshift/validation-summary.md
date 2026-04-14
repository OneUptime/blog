# Validation Summary: How to Use Dapr with OpenShift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Red Hat OpenShift
- Kubernetes
- Helm
- OpenShift Security Context Constraints (SCCs)
- OpenShift Routes
- Dapr Kubernetes secret store component

## Sources Consulted
- Dapr Helm Chart source (https://github.com/dapr/dapr/tree/master/charts/dapr) — verified subchart names, value paths, and defaults
- Dapr Sidecar Injector documentation (https://docs.dapr.io/concepts/dapr-services/sidecar-injector/) — verified injection is pod-annotation-only
- Dapr Annotations Reference (https://docs.dapr.io/reference/arguments-annotations-overview/) — verified annotation names and values
- Dapr Kubernetes Secret Store reference (https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/) — verified component type and apiVersion
- Dapr Scheduler documentation (https://docs.dapr.io/concepts/dapr-services/scheduler/) — verified scheduler service account and Helm values structure
- OpenShift SCC API reference (https://docs.okd.io/latest/rest_api/security_apis/securitycontextconstraints-security-openshift-io-v1.html) — verified SCC apiVersion and kind
- OpenShift Route API reference (https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/network_apis/route-route-openshift-io-v1) — verified Route apiVersion

## Issues Found

1. **Incorrect Helm value path for scheduler `runAsNonRoot`**: The post used `--set dapr_scheduler.runAsNonRoot=true`, but the scheduler subchart nests this under `securityContext`, requiring `--set dapr_scheduler.securityContext.runAsNonRoot=true`. The other subcharts (operator, sentry, placement) correctly use `runAsNonRoot` at the top level. Fixed the Helm install command.

2. **Fabricated namespace label for sidecar injection**: The post claimed OpenShift projects require a namespace-level label (`dapr-enabled=true`) for Dapr injection. This label does not exist in Dapr. Sidecar injection is controlled exclusively through pod-level annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`), which the post already showed correctly. Removed the false claim and the fabricated `oc label` command.

3. **Missing SCC grant for `dapr-scheduler` service account**: The post granted the custom SCC to four Dapr service accounts (operator, injector, sentry, placement) but omitted the scheduler service account, which is created by default since Dapr 1.14. Added the missing `oc adm policy add-scc-to-user` command for `dapr-scheduler`.

## Review Notes
- The `runAsNonRoot` flags for operator, sentry, and placement already default to `true` in the Dapr Helm chart, so explicitly setting them is redundant but harmless. This was left as-is since it serves as clear documentation of intent for OpenShift deployments.
- The Dapr scheduler component was introduced in Dapr v1.14 (August 2024). The post does not specify a Dapr version, which is fine since it targets current versions.
- The SCC definition is reasonable for Dapr workloads, though specific UID ranges may need adjustment based on the OpenShift cluster's namespace UID allocation.
- The OpenShift Route targets `targetPort: 8080` which is the application port, not the Dapr sidecar port (3500/3501). This is correct for routing external traffic to the application.
