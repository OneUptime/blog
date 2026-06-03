# Validation Summary: How to Implement Reserved Capacity with Resource Reservations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, node affinity, tolerations, PriorityClass-scoped ResourceQuota
- kube-state-metrics and Prometheus PromQL
- Amazon EC2 Reserved Instances, zonal capacity, EC2 Capacity Reservations, Reserved Instance Marketplace
- AWS CLI
- Google Cloud committed use discounts and Compute Engine reservations
- gcloud CLI
- eksctl managed node groups and Spot node groups

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes system metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- AWS EC2 regional and zonal Reserved Instances documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-scope.html
- AWS EC2 Capacity Reservations documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html
- AWS CLI describe-reserved-instances-offerings reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-reserved-instances-offerings.html
- AWS CLI create-reserved-instances-listing reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-reserved-instances-listing.html
- Google Cloud gcloud commitments create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/commitments/create
- Google Cloud committed use discounts with reservations: https://docs.cloud.google.com/compute/docs/instances/reservations-with-commitments
- Google Cloud merge and split commitments documentation: https://docs.cloud.google.com/compute/docs/instances/merge-and-split-commitments
- eksctl managed node groups documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html

## Issues Found
- The post treated cloud Reserved Instances and committed use discounts as capacity guarantees. Updated the introduction and provider-specific text to distinguish billing commitments from actual capacity reservations. AWS regional RIs do not reserve capacity; zonal RIs and EC2 Capacity Reservations can. Google Cloud committed use discounts reduce cost but require reservations for capacity.
- The PromQL examples used legacy kube-state-metrics metric names such as `kube_pod_container_resource_requests_cpu_cores` and `kube_node_status_capacity_cpu_cores`. Updated them to current metric names with `resource` and `unit` labels, and joined pod/node metrics to `kube_node_labels` instead of matching node names by regex.
- The Kubernetes Deployment examples were invalid for `apps/v1` because they omitted required selectors and matching pod template labels. Added `spec.selector.matchLabels` and `spec.template.metadata.labels`.
- The AWS RI Marketplace command omitted the required `--client-token` parameter and implied all RIs could be sold. Updated the text to eligible Standard Reserved Instances and added the idempotency token.
- The reserved node group example did not constrain nodes to the Availability Zone used for a zonal RI or Capacity Reservation. Added `availabilityZones: ["us-east-1a"]` to align the node group with the capacity reservation example.
- The spot fallback section overstated disruption prevention and did not mention workload scheduling requirements. Updated the wording to say workloads need rules that prefer spot and allow fallback, and that fallback reduces disruption when capacity is available.
- The ResourceQuota example used CPU and memory totals inconsistent with the 50 `t3.xlarge` node example. Updated the values to 200 CPU and 800Gi memory before system overhead.
- Several remaining "guarantee" claims were softened to avoid implying Kubernetes affinity alone creates capacity.

## Review Notes
The examples are still illustrative and should be adapted for real clusters. In production, quota values should normally be based on allocatable capacity rather than raw instance capacity, and kube-state-metrics label metrics require the relevant label allowlist configuration.
