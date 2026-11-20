# Validation Summary: How to Keep HPA Replica Calculations Stable During a Deployment Rolling Update

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes configuration fragments and diagnostic commands.

## Technologies Covered

- Kubernetes Deployments, ReplicaSets, and Pods
- Horizontal Pod Autoscaler (HPA), including autoscaling/v2 behavior policies
- CPU resource requests, utilization, and ContainerResource metrics
- Custom metrics adapters and metric label selection
- Rolling updates, readiness, startup filtering, and termination
- kubectl, jq, and YAML

## Sources Consulted

- Kubernetes HPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Deployment documentation, including proportional scaling, rolling-update limits, and availability: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- HPA autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes v1.35.0 resource replica calculator: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go
- Kubernetes v1.35.0 utilization implementation: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.35.0/pkg/controller/podautoscaler/metrics/utilization.go
- Official kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Official jq manual: https://jqlang.org/manual/
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes

- The README was left unchanged. Its examples and recommendations are technically relevant and use supported API fields.
- Confirmed that the HPA scales the Deployment while the Deployment controller manages ReplicaSet sizes, including proportional scaling during an active rollout.
- Verified the CPU example against the pinned implementation: utilization uses summed matching usage divided by summed matching requests. Four Pods consuming 300m total 1200m; requests of 2000m yield 60%, while requests of 3000m yield 40%. This is request-weighted utilization, not an unweighted mean of individual Pod percentages. The stated eligibility and sampling assumptions appropriately limit the example.
- The v1.35.0 source link is a reproducible implementation reference, not a claim that this is the latest Kubernetes release. Its request calculation includes feature-gated Pod-level request handling and container-specific request selection. AverageValue expresses absolute usage rather than a request-relative percentage.
- Confirmed the documented container-renaming procedure. Multiple metrics select the largest recommendation; metric errors can prevent downscaling while valid metrics can still permit scale-up. Adapter coverage depends on the actual query and workload labels, so the post appropriately calls for checking both revisions.
- Checked the rollout fragment and availability explanation. A 25% surge is rounded up; maxUnavailable: 0 constrains rollout capacity removal, and minReadySeconds: 20 requires sustained readiness before availability. Terminating Pods can consume resources beyond the normal rollout count.
- The HPA scaleTargetRef and behavior fragments belong under an autoscaling/v2 HPA's spec. The Deployment fragment belongs in an apps/v1 Deployment. These are illustrative fragments, not standalone manifests. The 300-second stabilization window and one-Pod policy over 60 seconds are valid; neither governs all Deployment-initiated terminations.
- Checked all four kubectl commands, namespace and selector options, output formats, shell pipeline, and jq object construction against their references. They assume the checkout resources exist in production, app=checkout matches the intended workload, and jq is installed.
- The post's external links resolve to the intended documentation, pinned source, and author profile. The linked documentation sections match their topics.
- Validation was a documentation and source-code review. No live Kubernetes rollout, load test, adapter query, or server-side manifest validation was performed. Workload-specific readiness, scheduling capacity, and latency still require the realistic-demand testing recommended in the post.
