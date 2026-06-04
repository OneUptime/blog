# Validation Summary: How to Set Up Kubernetes Multi-Zone Deployments for Regional Failure Resilience

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, StatefulSets, Services, scheduling, and node operations
- Pod topology spread constraints
- Topology Aware Routing
- Kubernetes persistent volumes and StorageClasses
- Google Kubernetes Engine and Google Cloud regional persistent disks
- Amazon EKS, eksctl, and AWS Load Balancer Controller
- Azure CLI location and availability zone mapping
- Cluster Autoscaler
- kube-state-metrics and Prometheus alerting

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Topology Aware Routing - https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes documentation: kube-state-metrics - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics node metrics reference - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Google Cloud documentation: Provisioning regional persistent disks and Hyperdisk Balanced HA volumes in GKE - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd
- Google Cloud SDK reference: gcloud container clusters update - https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Kubernetes Autoscaler FAQ: balance-similar-node-groups - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- AWS Load Balancer Controller documentation: Network Load Balancer annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS eksctl node group documentation - https://docs.aws.amazon.com/eks/latest/eksctl/general-nodegroups.html
- Azure CLI account documentation: az account list-locations - https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest
- Azure REST API documentation: Subscriptions - List Locations - https://learn.microsoft.com/en-us/rest/api/resources/subscriptions/list-locations?view=rest-resources-2022-12-01

## Issues Found
- Corrected the PostgreSQL StatefulSet explanation. The original text implied the plain `postgres:15` StatefulSet handled replication; it only handles placement and storage. The post now states that PostgreSQL replication must be configured separately or managed by an operator.
- Replaced the older `service.kubernetes.io/topology-aware-hints` annotation with the current `service.kubernetes.io/topology-mode: Auto` annotation for Topology Aware Routing.
- Replaced the deprecated AWS cross-zone load balancing annotation with `service.beta.kubernetes.io/aws-load-balancer-attributes: load_balancing.cross_zone.enabled=true`.
- Fixed the zone failure simulation command. `kubectl cordon` does not evict existing pods, so the post now uses `kubectl drain --ignore-daemonsets --delete-emptydir-data` for a non-production zone evacuation test.
- Replaced the invalid Cluster Autoscaler ConfigMap example with a Deployment args example, because Cluster Autoscaler consumes these settings as command-line flags.
- Fixed PromQL examples to join pod and node metrics with `kube_node_labels`, because kube-state-metrics does not expose `topology_kubernetes_io_zone` directly on the shown pod and allocatable metrics.
- Fixed the Prometheus alert expression by using the joined node zone label and `scalar(avg(...))` so the vector arithmetic works as intended.

## Review Notes
- The cloud-provider LoadBalancer manifest includes provider-specific annotations in one example. In real deployments, apply only the annotations for the target provider and controller.
- Regional persistent disk behavior is GKE-specific; equivalent multi-zone storage features differ across AWS and Azure.
