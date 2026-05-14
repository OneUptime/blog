# Validation Summary: How to Set Up Staging to Production Promotion with Flux CD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD Kustomization and notification-controller resources
- Kubernetes Deployments, Services, HorizontalPodAutoscaler, probes, and namespaces
- Kustomize bases, overlays, images, and patches
- GitHub Actions workflows
- GitHub CLI and GitHub repository rulesets
- CODEOWNERS

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- GitHub REST API repository rulesets documentation: https://docs.github.com/en/rest/repos/rules
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- `peter-evans/create-pull-request` Marketplace documentation: https://github.com/marketplace/actions/create-pull-request
- `actions/checkout` documentation: https://github.com/actions/checkout
- `Azure/k8s-set-context` documentation: https://github.com/Azure/k8s-set-context
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The repository tree omitted `namespace.yaml` files that were later referenced by both overlays. Added those files to the tree.
- The Flux Kustomization examples set `wait: true` while also using `healthChecks`. Flux ignores `.spec.healthChecks` when `.spec.wait` is true, so the examples would not use the listed health checks as described. Removed `wait: true` from the staging and production Flux Kustomizations.
- The production Flux Kustomization listed a HorizontalPodAutoscaler in `healthChecks`, but the documented built-in health check kinds do not include HPA. Removed the HPA health check and kept the Deployment health check.
- The GitHub Actions workflow used older action versions and omitted explicit token permissions needed to push a branch and create a pull request. Updated `azure/k8s-set-context`, `actions/checkout`, and `peter-evans/create-pull-request`, added `contents: write` and `pull-requests: write`, and added the required `method: kubeconfig` input.
- The workflow declared a manual `image_tag` input but extracted the tag from the staging overlay instead. Removed the unused input so manual and push-triggered runs consistently promote the currently declared staging tag.
- The pull request action used `reviewers` for what was presented as a team reviewer. Changed it to `team-reviewers`.
- The GitHub ruleset command passed nested JSON objects and arrays through field flags and used the wrong `require_code_owner_reviews` parameter name. Replaced it with a JSON body via `gh api --input -`, corrected the field to `require_code_owner_review`, and added the required pull request rule parameters.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider. Current Alert and Provider resources are documented under `v1beta3`; `v1` is for Receiver. Updated both resources to `v1beta3`.
- The Alert example used deprecated `.spec.summary`. Replaced it with `.spec.eventMetadata.summary`.

## Review Notes
The overall GitOps promotion pattern is valid, but production readiness still depends on repository-specific details such as the Flux `GitRepository` definition, GitHub token policy, team access, Slack secret format, metrics-server availability for HPA CPU metrics, and the staging smoke-test endpoint.
