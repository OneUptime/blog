# Validation Summary: Read VPA Recommendation and Pod-Matching Conditions

## Status
validated

## Post Type
Technical troubleshooting guide / reference

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- VPA recommender status conditions
- kubectl
- Kubernetes JSONPath
- jq
- Kubernetes field selectors
- Observability and alerting

## Sources Consulted
- VPA API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#verticalpodautoscalercondition
- VPA v1 API types and condition definitions: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go
- Current default recommender condition and status construction: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/model/vpa.go
- Current default recommender update routine: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/routines/recommender.go
- VPA Pod watcher and target validation logic: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/input/cluster_feeder.go
- VPA Pod count and retained aggregate-state logic: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/model/cluster.go
- VPA target selector resolution, including CronJob support: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/target/fetcher.go
- VPA controller ownership and scalability resolution: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/target/controller_fetcher/controller_fetcher.go
- VPA checkpoint handling for `FetchingHistory`: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/checkpoint/checkpoint_writer.go
- VPA recommendation confidence estimators and bound construction: https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/logic/estimator.go and https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/logic/recommender.go
- VPA 1.7.1 release and tagged source: https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1 and https://github.com/kubernetes/autoscaler/tree/352365899477910018f40d89fa3ea30b2c5d0e78/vertical-pod-autoscaler
- Generated VPA CRD, including namespaced scope and `vpa` short name: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/deploy/vpa-v1-crd-gen.yaml
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes field selector reference: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes API conventions for conditions and observed generations: https://github.com/kubernetes/community/blob/main/contributors/devel/sig-architecture/api-conventions.md#typical-status-properties
- jq manual: https://jqlang.org/manual/

## Issues Found
No technical issues found.

## Review Notes
The post was verified against upstream autoscaler master commit `22115908908a2fc94a4f3c47f28f1fb754fe585a` (2026-08-24) and the VPA 1.7.1 tagged source. Repository-wide source searches confirmed that the default recommender does not set `LowConfidence` or `FetchingHistory`, while the checkpoint writer still honors an active `FetchingHistory` condition. The jq filter was executed with populated and missing status fields and produced the intended TSV output.

The `vpa-recommender` image command matches the current official deployment layout, but installations that rename the Deployment, change its namespace, or place the recommender container at another index must adjust it. The non-Pending Pod command intentionally mirrors the recommender's phase filter and lists all such Pods in the namespace; readers must compare the displayed labels with the target's selector as the post instructs. Links to `master` are mutable, so the version-specific conclusions should be rechecked for later VPA releases.
