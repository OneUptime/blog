# Validation Summary: Argo Rollouts Service Selectors Explained: Stable, Canary, Active, and Preview Services

## Status
validated

## Post Type
Technical guide and troubleshooting reference

## Technologies Covered
- Argo Rollouts
- Kubernetes Rollout custom resources and ReplicaSets
- Kubernetes Services, label selectors, and EndpointSlices
- Canary and blue-green deployment strategies
- Istio, NGINX, AWS ALB, Gateway API, and traffic-routing integrations
- Argo Rollouts kubectl plugin
- GitOps reconciliation
- jq and kubectl

## Sources Consulted
- [Argo Rollouts: Canary strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Blue-green strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
- [Argo Rollouts: Traffic management overview](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Istio traffic management](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/)
- [Argo Rollouts: AWS ALB traffic management and ping-pong](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Scaling down aborted ReplicaSets](https://argo-rollouts.readthedocs.io/en/stable/features/scaledown-aborted-rs/)
- [Argo Rollouts kubectl plugin: abort command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/)
- [Argo Rollouts upstream source, reviewed at commit 62aa6d9](https://github.com/argoproj/argo-rollouts/tree/62aa6d9241cd04eace6a8b9ee191e730152df162)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)

## Issues Found
- The opening Rollout manifest omitted `spec.strategy`, but Argo Rollouts requires exactly one of `canary` or `blueGreen`. Added `strategy.canary: {}` so the example is a valid Rollout while retaining its role as the common base example.
- The introductory and canary-section wording implied that every traffic-routed canary uses separate stable and canary Services. Qualified the discussion as Service-level routing and documented Istio's supported subset-level mode, which uses one Service and controller-managed DestinationRule subset labels.
- The basic-canary explanation said the Service selector matches only Ready Pods. Kubernetes selectors match Pods by label regardless of readiness; endpoint conditions determine normal Service routing eligibility. Corrected the explanation to separate label selection from ready, non-terminating endpoint routing.
- The blue-green lifecycle list referred to the preview Service unconditionally even though `previewService` is optional. Qualified the sequence as applying when a preview Service is configured.
- The troubleshooting text attributed an empty set of Ready endpoints only to readiness or port problems. Added the valid zero-replica case.
- The command `kubectl describe pod -n "$NS" <canary-pod>` used angle brackets that a shell interprets as input redirection. Replaced it with executable commands that derive the canary hash from the Service selector and describe matching Pods by label.

## Review Notes
- The post was reviewed against the current stable documentation and upstream Argo Rollouts source commit `62aa6d9241cd04eace6a8b9ee191e730152df162` dated 2026-07-31. The `argoproj.io/v1alpha1` Rollout API and all fields used in the post remain current in that source.
- All ten YAML code blocks parse successfully, and the combined Bash blocks pass `bash -n` syntax validation.
- The traffic-routing strategy snippets are intentionally partial `spec` fragments. The Istio example assumes the referenced VirtualService and named route already exist, as required by the official integration documentation.
- The inspection commands require `jq`, and the abort command requires the Argo Rollouts kubectl plugin.
