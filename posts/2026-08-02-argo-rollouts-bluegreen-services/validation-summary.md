# Validation Summary: Argo Rollouts Blue-Green Deployment: Configuring Active and Preview Services Safely

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Argo Rollouts 1.9.1 blue-green strategy
- Kubernetes Rollouts custom resources and ReplicaSets
- Kubernetes Services and EndpointSlices
- Argo Rollouts AnalysisTemplates and Job metric provider
- Argo Rollouts kubectl plugin
- Kubernetes readiness probes, Pod termination hooks, and `minReadySeconds`
- Horizontal Pod Autoscaling with Argo Rollouts
- Kubernetes NetworkPolicy and service-mesh access control
- AWS Application Load Balancer integration
- curl and jq command-line tools

## Sources Consulted

- Argo Rollouts: Blue-green deployment strategy — https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/
- Argo Rollouts: Analysis overview, including blue-green pre- and post-promotion analysis — https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts: Job metric provider — https://argo-rollouts.readthedocs.io/en/stable/analysis/job/
- Argo Rollouts: Rollout specification — https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts: HPA support — https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/
- Argo Rollouts: AWS ALB traffic routing — https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/
- Argo Rollouts kubectl plugin: get rollout — https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/
- Argo Rollouts kubectl plugin: promote — https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/
- Argo Rollouts kubectl plugin: abort — https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/
- Argo Rollouts 1.9.1 `BlueGreenStrategy` API definition — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/pkg/apis/rollouts/v1alpha1/types.go
- Argo Rollouts 1.9.1 restart controller implementation — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/rollout/restart.go
- Argo Rollouts 1.9.1 rollout controller implementation — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/rollout/controller.go
- Argo Rollouts 1.9.1 Rollout CRD — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/manifests/crds/rollout-crd.yaml
- Argo Rollouts 1.9.1 AnalysisTemplate CRD — https://github.com/argoproj/argo-rollouts/blob/v1.9.1/manifests/crds/analysis-template-crd.yaml
- Kubernetes: Services — https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: EndpointSlices — https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes: `kubectl port-forward` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes: Configure liveness, readiness, and startup probes — https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes: Pod lifecycle and termination — https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- curl container image tag 8.14.1 — https://hub.docker.com/r/curlimages/curl/tags?ordering=last_updated&page=1

## Issues Found

1. **`blueGreen.maxUnavailable` was described as a cutover availability control.** The current Argo Rollouts API defines this field as the unavailable allowance for restart operations; blue-green template updates scale the candidate to the target count before switching the active Service, and blue-green has no `maxSurge` field. Removed `maxUnavailable: 0` from the example and corrected the explanation so readers plan explicit duplicate capacity instead of relying on an unrelated setting.

2. **The port-forward explanation implied that traffic traverses normal Service proxying.** `kubectl port-forward service/...` uses the Service selector to choose a backing Pod and forwards directly to that Pod. Reworded the explanation to state what the command validates and that it does not test kube-proxy, ingress, Gateway, or mesh routing.

3. **The EndpointSlice checklist incorrectly required slices to contain only Ready Pods.** EndpointSlices include all Pods matching the Service selector and represent readiness per endpoint using conditions. Changed the check to require that every endpoint map to the candidate revision and have `ready: true` before it is treated as a normal Service traffic target.

4. **The post-promotion analysis section omitted the effect of an explicit scale-down delay.** Argo Rollouts cancels a still-running post-promotion AnalysisRun when an explicitly configured `scaleDownDelaySeconds` expires so that it can scale down the old ReplicaSet. Added the requirement that analysis finish within that window and documented the different behavior when the delay is omitted.

5. **The ALB paragraph could imply that target-group verification or ping-pong fixes plain blue-green Service-selector switching.** Those options are part of Argo Rollouts' ALB traffic-routing integration under a canary strategy. Clarified that they do not make the blue-green selector pattern atomic and retained Argo's documented downtime warning.

6. **The abort section could imply that `abort` rolls back an already completed rollout.** The command stops a currently progressing rollout; the controller clears abort state for a fully promoted rollout. Limited the guidance to an in-progress rollout and directed completed revisions to a Git-based or explicit undo workflow. Also clarified that abort does not update the desired Pod template stored in Git.

## Review Notes

- The post was validated against Argo Rollouts 1.9.1, released July 17, 2026. `argoproj.io/v1alpha1` remains the current API version for Rollout and AnalysisTemplate resources in that release.
- The complete Rollout example passed `kubectl-argo-rollouts` 1.9.1 lint validation, and all six YAML code blocks parsed successfully.
- `registry.example.com/shop/checkout:2.5.0`, the application endpoints, and the AnalysisTemplate names are intentionally illustrative and must be replaced or implemented by the reader.
- The `curlimages/curl:8.14.1` tag exists. Production users may additionally pin the image by digest for supply-chain reproducibility.
- Scale-down timing and zero-downtime behavior remain data-plane and provider dependent; no fixed delay can replace measurement of the actual cluster and external routing path.
