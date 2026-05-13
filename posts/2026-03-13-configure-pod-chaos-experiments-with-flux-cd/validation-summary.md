# Validation Summary: How to Configure Pod Chaos Experiments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Chaos Mesh
- PodChaos
- StressChaos
- Chaos Mesh Schedule
- Flux Kustomization

## Sources Consulted
- Chaos Mesh: Simulate Pod Faults: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh: Simulate Stress Scenarios: https://chaos-mesh.org/docs/2.6.7/simulate-heavy-stress-on-kubernetes/
- Chaos Mesh: Define Scheduling Rules: https://chaos-mesh.org/docs/define-scheduling-rules/
- Chaos Mesh: Configure namespace for Chaos experiments: https://chaos-mesh.org/docs/configure-enabled-namespace/
- Chaos Mesh: Define the Scope of Chaos Experiments: https://chaos-mesh.org/docs/define-chaos-experiment-scope/
- Flux: Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The introduction said pods are killed by the scheduler. Kubernetes scheduling does not kill pods, so this was changed to the more accurate "pods being terminated."
- The Flux CD description implied that Git-stored manifests show when experiments last ran and what the results were. Git stores the desired configuration, while runtime status and results are available from Kubernetes and Chaos Mesh, so the wording was corrected.
- The prerequisites implied namespace annotations are always required. Chaos Mesh only requires the `chaos-mesh.org/inject=enabled` annotation when `enableFilterNamespace` is enabled, so the prerequisite was clarified.
- The pod kill examples omitted `gracePeriod`. Chaos Mesh documents `gracePeriod` for `pod-kill`, so `gracePeriod: 0` was added to the one-time and scheduled pod kill examples.
- The pod kill comment said the experiment would "auto-recover." Pod kill deletes the pod and Kubernetes recreates it through its controller; the comment was corrected to avoid implying Chaos Mesh restores the killed pod.
- The CPU stress comment said `load: 80` consumes 80% of available CPU. Chaos Mesh defines CPU load per worker, with total load as `workers * load`, so the comment was corrected.
- The Flux `dependsOn` wording implied it verifies Chaos Mesh controller health by itself. Flux waits for the referenced Kustomization to be Ready; controller health requires health checks or `wait: true` on the dependency, so the wording was clarified.

## Review Notes
The YAML snippets use current Chaos Mesh `chaos-mesh.org/v1alpha1` resources and Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization fields. The `flux` CLI is listed as a prerequisite but is not used directly in the commands shown; this is not technically incorrect, but the prerequisite could be narrowed in a future editorial pass.
