# Validation Summary: How to Convert Kubernetes Deployments to Argo Rollouts for Progressive Delivery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments and Services
- Argo Rollouts
- Argo Rollouts kubectl plugin
- Canary deployments
- Blue-green deployments
- Istio VirtualService traffic routing
- Prometheus-based AnalysisTemplates
- GitLab CI/CD
- yq

## Sources Consulted
- Argo Rollouts installation documentation: https://argoproj.github.io/argo-rollouts/installation/
- Argo Rollouts migration documentation: https://argoproj.github.io/argo-rollouts/migrating/
- Argo Rollouts rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Istio traffic management documentation: https://argo-rollouts.readthedocs.io/en/release-1.8/features/traffic-management/istio/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts blue-green documentation: https://argoproj.github.io/argo-rollouts/features/bluegreen/
- Argo Rollouts kubectl plugin command reference: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- Argo Rollouts `status` command reference: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_status/
- Argo Rollouts `set image` command reference: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_set_image/
- Argo Rollouts `list rollouts` command reference: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_list_rollouts/

## Issues Found
- Several Rollout examples had selectors but omitted matching `spec.template.metadata.labels`. Argo Rollouts documentation states that the selector must match the pod template labels, so matching `app: myapp` labels were added to the canary, analysis, and blue-green Rollout pod templates.
- The Istio canary traffic management example referenced `myapp-vsvc` but did not define the required VirtualService. Added a minimal VirtualService with a `primary` route and stable/canary destinations whose hosts match the Rollout's `stableService` and `canaryService`.
- Prometheus AnalysisTemplate success conditions used `result` directly. Argo Rollouts Prometheus examples evaluate the returned vector with `result[0]`, so the success-rate and latency conditions were corrected.
- The migration script converted a live Deployment manifest with `sed`, applied a Rollout, then deleted the Deployment immediately. Argo Rollouts migration documentation warns that deleting or scaling down a live Deployment before validating the Rollout can cause downtime. The script now creates a Rollout with `workloadRef` and `scaleDown: onsuccess`, preserving the Deployment as the template source during migration.
- The CI verification job parsed human-readable `kubectl argo rollouts status` output for the word `Healthy`. The official command returns success when the rollout is healthy and an error otherwise, so the script now branches on the command exit status.

## Review Notes
The blue-green example references `smoke-tests` and `success-rate` AnalysisTemplates by name. That is valid if those templates exist in the target namespace, but a future improvement could make the blue-green snippet fully standalone by including or linking the referenced templates.
