# Validation Summary: How to Right-Size Kubernetes Cluster Node Pools Based

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, StatefulSets, node selectors, taints, tolerations, resources, and kubectl
- Karpenter NodePools and AWS EC2NodeClass references
- Prometheus PromQL, recording rules, and HTTP API usage
- kube-state-metrics node label metrics
- AWS EC2 instance families and Spot capacity
- Python requests and pandas

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes node autoscaling documentation: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter NodeClasses documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- Karpenter scheduling documentation: https://karpenter.sh/docs/concepts/scheduling/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Amazon EKS managed node groups documentation: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html

## Issues Found
- The initial PromQL examples grouped cAdvisor container metrics by `deployment`, a label those metrics do not normally expose. Updated the examples and Python script to group by `namespace` and `pod`, and added container/pod label filters.
- The Python script treated network bytes per second as Mbps. Fixed the conversion to multiply by 8 and divide by 1,000,000 before comparing against a Mbps threshold or printing output.
- The `NodePool` examples used `apiVersion: v1` and fields such as `instanceType`, `minSize`, `maxSize`, and `spotInstances`, which are not built-in Kubernetes NodePool fields. Converted these snippets to Karpenter `karpenter.sh/v1` `NodePool` resources with `spec.template`, `nodeClassRef`, `requirements`, labels, taints, and limits.
- Deployment examples omitted required `apps/v1` selectors and matching pod-template labels. Added `spec.selector.matchLabels` and `spec.template.metadata.labels` to each Deployment.
- The StatefulSet example omitted required controller fields. Added `serviceName`, `spec.selector.matchLabels`, and matching pod-template labels.
- The monitoring rules grouped node exporter metrics by a node pool label that is not present directly on those metrics. Updated the PromQL to join node metrics with kube-state-metrics `kube_node_labels` using Prometheus vector matching, and added a note about the required `node` relabeling assumption.
- The dynamic scaling snippet used a nonexistent `autoscaling.k8s.io/v1` `ClusterAutoscaler` resource. Replaced it with a Karpenter NodePool example using `disruption.consolidationPolicy` and `consolidateAfter`.
- The migration patch only added a `nodeSelector`, which would not schedule onto a tainted pool. Updated it to include the matching toleration.
- Best-practice wording referred to autoscaling thresholds after the scaling example was changed to Karpenter. Updated the wording to scaling limits and consolidation settings.

## Review Notes
- The AWS pricing values are presented as illustrative and should still be refreshed for the target AWS region before publication.
- The `hostPath` storage example is technically valid but operationally fragile for production databases; a local PersistentVolume or a CSI-backed storage class would usually be safer.
