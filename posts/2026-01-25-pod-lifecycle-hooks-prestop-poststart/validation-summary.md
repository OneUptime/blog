# Validation Summary: How to Configure Pod Lifecycle Hooks (preStop, postStart)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes container lifecycle hooks
- Kubernetes Deployments
- Kubernetes Services and EndpointSlices
- kubectl
- NGINX
- Prometheus Pushgateway
- Consul service discovery

## Sources Consulted
- Kubernetes documentation: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes documentation: Pod Lifecycle - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes documentation: Attach Handlers to Container Lifecycle Events - https://kubernetes.io/docs/tasks/configure-pod-container/attach-handler-lifecycle-event/
- Kubernetes documentation: Explore Termination Behavior for Pods And Their Endpoints - https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/
- Kubernetes kubectl reference: logs - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl reference: describe - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes documentation: Get a Shell to a Running Container - https://kubernetes.io/docs/tasks/debug/debug-application/get-shell-running-container/
- Prometheus Pushgateway documentation - https://github.com/prometheus/pushgateway
- Prometheus documentation: When to use the Pushgateway - https://prometheus.io/docs/practices/pushing/

## Issues Found
- The lifecycle sequence implied that `terminationGracePeriodSeconds` starts after SIGTERM. Kubernetes starts the grace-period countdown before running the `preStop` hook, so the sequence diagram and hook behavior bullets were corrected.
- The `postStart` section said the hook is useful for tasks that should not block main application startup. Kubernetes documents that `postStart` runs concurrently with the entrypoint but can delay the container from reaching `Running`, so the wording was corrected.
- The HTTP `postStart` example did not mention that the application process may not have fully started when the hook runs. Added a caveat to use HTTP hooks only when the endpoint is available immediately, otherwise prefer an `exec` hook with retry logic.
- The `preStop` example manually sent `SIGTERM` to PID 1 inside the hook, which undermined the documented ordering where kubelet sends TERM after the hook completes. Replaced it with a message that lets the hook complete so kubelet can send the termination signal.
- The metrics sidecar example used `POST http://prometheus:9091/api/v1/admin/wipe`, which is the Pushgateway admin wipe endpoint, requires `PUT`, and deletes metrics rather than pushing final metrics. Replaced it with a Pushgateway `curl --data-binary` push to the local Pushgateway metrics endpoint.
- The best-practice note said `preStop` runs before probes fail. For Kubernetes Services, terminating endpoints are marked not ready in EndpointSlices; the wording was corrected to describe endpoint removal/draining instead of probe failure ordering.

## Review Notes
kubectl was not installed in the local workspace, so CLI command verification was performed against the official Kubernetes kubectl reference. The Kubernetes YAML examples use current stable API versions (`apps/v1` Deployments and `v1` Pods) and valid lifecycle hook fields.
