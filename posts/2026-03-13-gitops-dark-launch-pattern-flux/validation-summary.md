# Validation Summary: How to Implement GitOps Dark Launch Pattern with Flux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes ConfigMap
- Kubernetes Deployment environment variables
- kubectl
- GitHub CLI
- Python async pseudocode
- GitOps dark launch and feature flag rollout patterns

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#top
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create

## Issues Found
- The description said the new code path was served to all requests, but the example uses a configurable sample rate. Changed it to "sampled production requests."
- The introduction implied Kubernetes dark launches are implemented through both feature flags and infrastructure traffic configuration. The post's implementation uses application-level feature flags, while infrastructure routing is optional. Reworded the claim to avoid overstating the requirement.
- The Deployment annotation comment said pods restart automatically when config changes. A pod template annotation only triggers a rollout when the annotation value itself changes, such as when CI updates it with a ConfigMap hash. Clarified the comment.
- The log-monitoring command piped output to `jq`, but the shown Python logging example does not configure JSON logs. Removed `jq` so the command works with the demonstrated output.
- The promotion step created a new `my-app-feature-flags` ConfigMap, but the Deployment imports `my-app-dark-launch` via `envFrom`. Changed the command to update `dark-launch-config.yaml` with the existing `my-app-dark-launch` ConfigMap name so the live feature flags are actually consumed by the Deployment.

## Review Notes
- The Flux `Kustomization` example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `sourceRef`, `path`, `prune`, and `healthChecks` fields.
- The Kubernetes ConfigMap and Deployment `envFrom.configMapRef` examples use valid Kubernetes API fields.
- The `kubectl logs`, `kubectl top pods`, `kubectl get configmap`, and `gh pr create --title` commands use valid current CLI syntax.
