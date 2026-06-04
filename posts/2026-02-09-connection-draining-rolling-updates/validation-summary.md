# Validation Summary: How to Use Connection Draining for Kubernetes Services During Rolling Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments and rolling updates
- Kubernetes pod termination lifecycle and lifecycle hooks
- Kubernetes readiness probes and EndpointSlices
- Go `net/http` graceful shutdown
- Node.js HTTP / Express graceful shutdown
- WebSocket connection draining
- kubectl rollout commands
- Prometheus / PromQL alerting

## Sources Consulted
- Kubernetes documentation: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes documentation: Pod Lifecycle and Pod Termination Flow - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes tutorial: Explore Termination Behavior for Pods and their Endpoints - https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/
- Kubernetes documentation: Update a Deployment Without Downtime - https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl reference: `kubectl set image` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl reference: `kubectl rollout status` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Go `net/http` package documentation: `Server.Shutdown` - https://pkg.go.dev/net/http#Server.Shutdown
- Node.js HTTP documentation: `server.close`, `server.closeAllConnections`, and `server.closeIdleConnections` - https://nodejs.org/api/http.html
- Prometheus documentation: PromQL operators and vector matching - https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The pod termination sequence incorrectly implied endpoints are removed before `preStop` and that the grace period starts after SIGTERM. Updated the sequence to reflect Kubernetes behavior: the grace period starts before `preStop`, SIGTERM is sent after `preStop`, and terminating EndpointSlice endpoints are marked not ready for regular traffic.
- The Deployment YAML examples used `apiVersion: apps/v1` but omitted the required `spec.selector`. Added matching selectors and labels so the manifests are valid Kubernetes Deployment snippets.
- The text around `maxUnavailable: 0` overstated the guarantee. Clarified that it depends on Kubernetes being able to create surge pods and noted that `preStop` time counts against `terminationGracePeriodSeconds`.
- The load-balancer coordination example used `curl` without an explicit URL scheme. Changed it to `http://localhost:8080/shutdown`.
- The shutdown endpoint used a plain Go boolean shared between concurrent handlers. Changed it to `atomic.Bool` and noted use of `sync/atomic`.
- The EndpointSlice/readiness explanation implied the readiness endpoint alone removes the pod from service endpoints. Clarified that Kubernetes also marks terminating endpoints as not ready during pod deletion.
- The PromQL alert expressions used default vector matching between unrelated application and Kubernetes metrics, which would commonly drop all results. Aggregated the metrics and used `and on()` so the generic examples evaluate as intended.

## Review Notes
The examples are broadly correct as illustrative patterns. In a production system, tune drain delays and shutdown timeouts for the actual load balancer deregistration delay, request duration, and application behavior. The PromQL deployment-change condition is a generic approximation; production alerts should usually match service metrics to deployment or workload labels specific to the monitoring setup.
