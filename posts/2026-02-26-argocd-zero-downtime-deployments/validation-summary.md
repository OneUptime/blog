# Validation Summary: How to Handle Zero-Downtime Deployments with ArgoCD

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes Deployments
- Kubernetes readiness and liveness probes
- Kubernetes lifecycle hooks and graceful pod termination
- Kubernetes PodDisruptionBudget
- NGINX Ingress traffic routing
- Database migration hooks
- Python signal handling
- OneUptime monitoring

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Container Lifecycle Hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes Pod Lifecycle termination documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo Rollouts NGINX traffic routing documentation: https://argoproj.github.io/argo-rollouts/getting-started/nginx/
- OneUptime website: https://oneuptime.com

## Issues Found
- The Deployment manifest was missing the required `spec.selector` and matching pod template labels. Added `metadata.labels`, `spec.selector.matchLabels`, and `spec.template.metadata.labels` so the `apps/v1` Deployment is valid.
- The pod termination explanation and sequence diagram showed SIGTERM before `preStop`. Kubernetes runs `preStop` before sending TERM, while EndpointSlice updates happen as pod termination begins. Updated the explanation and diagram to reflect the documented order.
- The `ApplyOutOfSyncOnly=true` explanation incorrectly implied it prevents unnecessary pod restarts. Kubernetes does not restart pods from a no-op apply unless the pod template changes. Reworded this as an API-load reduction option and added the Argo CD caveat that hooks do not run during selective sync operations.
- The custom Argo CD Deployment health check could mark normal rollouts as degraded based on `Available=False` and did not account for observed generation. Reworked the Lua snippet to wait for observed generation, mark failed progression as degraded, and require updated and available replicas to match the desired replica count.
- The Argo Rollouts snippet was missing `spec.selector`, pod template labels, and a container port. Added these fields so the Rollout template is structurally complete.
- The Python graceful shutdown snippet imported `sys` unnecessarily and called an undefined `server.stop_accepting()` method as executable code. Removed the unused import and made the server-specific call a placeholder comment.
- The checklist used `ApplyOutOfSyncOnly: true`, which is not the manifest syntax shown in Argo CD docs. Corrected it to `ApplyOutOfSyncOnly=true`.

## Review Notes
The corrected post is technically valid as a practical guide. Future improvements could mention that `preStop` sleep duration and `terminationGracePeriodSeconds` should be measured against the specific ingress or load balancer behavior, and that named Argo CD hook Jobs may need `BeforeHookCreation` or `generateName` depending on how often the migration hook should be recreated.
