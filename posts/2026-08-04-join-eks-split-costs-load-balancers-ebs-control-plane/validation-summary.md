# Validation Summary: Join EKS Pod Costs to Load Balancers, EBS, and Control Plane

## Status

validated

## Post Type

Technical FinOps implementation guide

## Technologies Covered

- Amazon EKS
- Kubernetes object identity, ownership, Ingress, Services, PersistentVolumes, and PersistentVolumeClaims
- AWS Cost and Usage Reports (CUR) 2.0 and AWS Data Exports split cost allocation data
- AWS Load Balancer Controller, Application Load Balancers, and Network Load Balancers
- Amazon EBS and the Amazon EBS CSI driver
- AWS cost allocation tags
- SQL window functions and normalized cost-allocation weights
- Kubernetes showback and FinOps cost allocation

## Sources Consulted

- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [AWS Data Exports: Enabling split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/enabling-split-cost-allocation-data.html)
- [AWS Data Exports: Example of split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/example-split-cost-allocation-data.html)
- [AWS Data Exports: CUR 2.0 split line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html)
- [AWS Data Exports: CUR 2.0 identity columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html)
- [AWS Data Exports: CUR 2.0 line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-line-item.html)
- [Amazon EKS: View costs by Pod with split cost allocation](https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html)
- [Amazon EKS pricing](https://aws.amazon.com/eks/pricing/)
- [Amazon EKS: EKS Capabilities](https://docs.aws.amazon.com/eks/latest/userguide/capabilities.html)
- [Amazon EKS: Organize Amazon EKS resources with tags](https://docs.aws.amazon.com/eks/latest/userguide/eks-using-tags.html)
- [Amazon EKS: Route application and HTTP traffic with Application Load Balancers](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html)
- [Amazon EKS: Route TCP and UDP traffic with Network Load Balancers](https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html)
- [Elastic Load Balancing pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- [Elastic Load Balancing: Billing and usage report codes](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/load-balancer-billing-usage-reports.html)
- [Amazon EKS: Use Kubernetes volume storage with Amazon EBS](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html)
- [Amazon EBS pricing](https://aws.amazon.com/ebs/pricing/)
- [Amazon EBS CSI driver: Static PersistentVolume example](https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/examples/kubernetes/static-provisioning/manifests/pv.yaml)
- [Kubernetes API: PersistentVolume and `CSIPersistentVolumeSource`](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/#CSIPersistentVolumeSource)
- [Kubernetes: Object names and UIDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)
- [Kubernetes: Owners and dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

## Issues Found

- The split-compute explanation did not distinguish the explicit `Unused` split record from Pod-level `unused_cost`. Adding both representations would double-count unused capacity. The post now describes separate capacity and Pod-attribution views and requires consistent gross or net fields.
- The canonical asset guidance did not state that CUR 2.0 `identity_line_item_id` is unique only within a partition and is not stable across separate reports. It also did not retain a billed-component dimension needed to distinguish fixed and variable rows. The asset schema and explanation now preserve delivery and partition scope, retain the billed component, select the current refresh, and avoid using either the source line-item ID or resource ID alone as the asset key.
- The load-balancer allocation guidance implied that ALB and NLB variable charges are independently billed by bytes, requests, or rule evaluations. AWS actually bills LCU or NLCU usage from the highest applicable capacity-unit dimension in each metering interval. The post now requires the dominant dimension and recipient telemetry when reconstructable, or a documented policy proxy.
- The EBS section referred to separate baseline charges, but gp3 baseline IOPS and throughput are included in the volume price. The text now assigns the volume-capacity charge separately from separately billed provisioned IOPS, additional throughput, snapshots, and transfer.
- The control-plane guidance could associate an account/Region/product aggregate with a cluster even when several eligible clusters exist, and it did not warn that the generated `aws:eks:cluster-name` tag excludes control-plane expenses. The post now uses activated user-defined cluster cost allocation tags or resource identity when present and leaves ambiguous aggregates shared or unresolved.
- The original SQL used an inner join and therefore dropped assets with no binding, despite saying missing denominators should enter an exception bucket. It also did not reject negative or null weights. The revised query validates the window denominator and binding fields, allocates only valid weights, and emits one unresolved row for every missing or invalid binding set.
- The validation checklist said raw weight numerators must sum to one even though the SQL normalizes arbitrary numerators. It now checks nonnegative numerators, a positive denominator, and normalized weights that sum to one.
- The Kubernetes API link used a legacy path that redirected to the current API reference. It now points directly to the canonical `PersistentVolume` API page and `CSIPersistentVolumeSource` anchor.

## Review Notes

- The controller annotations `alb.ingress.kubernetes.io/tags` and `service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags` are current and documented.
- The Amazon EBS CSI driver's `volumeHandle` is the EBS volume ID for the standard driver, as shown in the official static-provisioning example.
- The post is intentionally warehouse-neutral. An implementation should define the exact `selected_cost` basis, data types, uniqueness constraints, refresh semantics, and interval-overlap rules for its query engine and CUR ingestion pipeline.
- EKS pricing features and billing dimensions can change; Provisioned Control Plane and EKS Capabilities should be rechecked when the post is next revised.
