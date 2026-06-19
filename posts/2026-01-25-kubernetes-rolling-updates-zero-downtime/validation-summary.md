# Validation Summary: How to Implement Rolling Updates with Zero Downtime

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes Deployments and rolling updates
- Kubernetes readiness and liveness probes
- Kubernetes container lifecycle hooks and graceful termination
- Kubernetes PodDisruptionBudgets
- kubectl rollout and set image commands
- Flask health endpoint example
- Express/Node.js graceful shutdown example
- hey HTTP load testing tool

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Flask quickstart and API documentation: https://flask.palletsprojects.com/en/stable/quickstart/ and https://flask.palletsprojects.com/en/stable/api/
- Express 5.x API documentation: https://expressjs.com/en/api/
- rakyll/hey README: https://github.com/rakyll/hey

## Issues Found
- The `maxSurge` and `maxUnavailable` examples repeated the same YAML key in a single mapping to show alternatives. I changed the alternatives to commented examples so the snippets are valid YAML.
- The recommended rolling update explanation said the settings ensure the desired number of pods are always "running." I changed this to "available," which matches Kubernetes Deployment semantics.
- The readiness probe Deployment snippet omitted the required selector/template label pairing. I added `spec.selector.matchLabels` and matching pod template labels.
- The pod termination sequence listed SIGTERM before the grace period countdown and omitted the PreStop hook ordering. I corrected the sequence to show that the grace period starts first, the PreStop hook runs before SIGTERM, and SIGKILL follows only if the container is still running.
- The PreStop hook example manually sent `SIGTERM` from inside the hook. Since Kubernetes sends TERM after the PreStop hook completes, I removed the manual signal and left the hook as a connection-draining delay.
- The PreStop Deployment snippet lacked object metadata. I added `metadata.name` so the manifest is structurally complete.
- The `minReadySeconds` wording said fast-crashing pods would be prevented from being considered ready. I changed this to "available," because `minReadySeconds` controls when a ready pod is counted as available.
- The `progressDeadlineSeconds` explanation said the deployment is "marked as failed." I changed this to the more precise `ProgressDeadlineExceeded` condition reported by Kubernetes.
- The PodDisruptionBudget explanation and comment implied it always keeps pods running. I clarified that PDBs protect against voluntary disruptions such as node drains.
- The troubleshooting command used the deprecated `Endpoints` API. I changed it to watch `EndpointSlice` objects using the service-name label.
- The hey output example used a `Success ratio` line that hey does not print. I changed the example to `Status code distribution`, matching hey's documented output.

## Review Notes
The complete Deployment uses the same `/health` endpoint for readiness and liveness. This is valid, but future revisions could mention that production liveness checks should usually avoid failing for temporary dependency or overload conditions that readiness should handle.
