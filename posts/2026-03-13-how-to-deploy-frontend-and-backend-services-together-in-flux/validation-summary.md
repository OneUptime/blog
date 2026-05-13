# Validation Summary: How to Deploy Frontend and Backend Services Together in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kubernetes Deployments
- Kubernetes Services and pod readiness
- Kubernetes ConfigMaps and Secrets
- kubectl and Flux CLI commands
- GitOps rollback workflow

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `suspend kustomization` documentation: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI `resume kustomization` documentation: https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes ConfigMap usage documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl rollout` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The post implied that plain Flux `dependsOn` is sufficient for a lockstep frontend/backend release. Flux only requires the dependency Kustomization to be Ready by default, so a frontend Kustomization can need an additional check for strict matching-version coordination. Added matching `app/version` labels and a `readyExpr` to the frontend dependency on the backend.
- The backend and frontend Kustomization examples set both `wait: true` and `healthChecks`. Flux documents that `spec.healthChecks` is ignored when `spec.wait` is true. Removed `wait: true` from those two examples so the targeted Deployment health checks shown in the post are the checks Flux uses.
- The release command only staged the frontend and backend Deployment manifests. Because the corrected lockstep example uses release labels on the Flux Kustomizations, updated the command to stage the backend and frontend Kustomization files too.
- The manual rollback example could be read as safe to resume Flux after an in-cluster `kubectl rollout undo` without first correcting Git. Clarified that suspension is for emergency rollback while preparing the Git revert, and that Flux should be resumed only after Git contains the rollback state.
- The conclusion said Flux handles rollback ordering "in reverse." Flux applies the reverted Git state using the declared dependency ordering, so the wording was corrected.

## Review Notes
The Kubernetes Deployment, probe, ConfigMap `envFrom`, `secretKeyRef`, `kubectl get`, `kubectl rollout undo`, and Flux CLI command forms used in the post are consistent with current official documentation. The local environment did not have `flux` or `kubectl` installed, so CLI validation was done against official generated command documentation.
