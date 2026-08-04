# Join EKS Pod Costs to Load Balancers, EBS, and Control Plane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Amazon EKS, Kubernetes, Showback, AWS CUR, Amazon EBS, Elastic Load Balancing, FinOps

Description: Extend EKS split cost allocation beyond node compute by joining Pod workloads to load balancers, EBS volumes, and control-plane charges safely.

---

AWS split cost allocation data makes EC2-backed EKS compute visible at Pod grain. It does not turn every resource used by Kubernetes into a Pod cost. Load balancers, EBS volumes, the EKS control plane, public addresses, data transfer, and other services remain separate AWS billing assets.

A complete EKS showback needs a controlled asset-association layer. The key is to join each ancillary asset once, preserve its lifetime, and distribute shared assets with normalized weights.

## Know What Split Cost Allocation Covers

AWS documents EKS split cost allocation as allocating Amazon EC2 CPU and memory cost to Pods. For accelerated EKS instances it can also provide accelerator resource allocation under the supported request-based mode.

CUR 2.0 split fields include:

- `split_line_item_parent_resource_id`: parent EC2 instance ID;
- `split_line_item_reserved_usage` and `actual_usage`;
- `split_line_item_split_usage`, the maximum of reserved and actual usage;
- `split_line_item_split_usage_ratio`;
- `split_line_item_split_cost` and conditional `net_split_cost`;
- `split_line_item_unused_cost` and conditional `net_unused_cost`.

AWS also adds EKS attributes such as cluster, namespace, node, workload name, and workload type to split records under documented conditions. For example, workload identity is populated only when AWS can identify exactly one supported managing workload.

AWS represents unused capacity in two related ways: an explicit `Unused` split record carries unallocated capacity in `split_cost`, while each Pod's `unused_cost` redistributes that unused amount to Pods. For a capacity view, sum `split_cost` across Pod and `Unused` records. For a Pod-attribution view, sum each Pod's `split_cost + unused_cost` and exclude the `Unused` record. Use the net pair consistently when available; never add both representations.

These rows are the compute allocation source. Do not derive EC2 node cost again from ordinary parent rows and add both totals.

## Build a Canonical Asset Table

Normalize all billed assets before assigning owners:

```text
asset_line_id
billing_interval_start
billing_interval_end
provider
account_id
region
service
asset_type
billed_component
resource_id
selected_cost
source_delivery_id
source_partition_id
source_line_item_id
```

Suggested `asset_type` values include:

- `eks_pod_compute`;
- `eks_unused_compute`;
- `load_balancer`;
- `ebs_volume`;
- `eks_control_plane`;
- `public_ipv4`;
- `data_transfer`;
- `unresolved_eks_ancillary`.

Keep the original CUR identity line-item ID, but do not use it alone as `asset_line_id`. In CUR 2.0 it is unique only within one partition and is not stable across separate reports. Scope source rows by delivery and partition, select the current refresh before allocation, and then mint a stable asset key or validated fingerprint. Resource IDs are not globally unique across services and can be blank, so never use them alone. Scope populated IDs by provider, account, Region, and service; distinguish row-grain assets by interval and billed component or scoped source-row identity, and keep resource-less charges in controlled aggregate keys.

## Preserve a Kubernetes Identity Ledger

Snapshot Kubernetes objects and controller relationships over time:

```text
cluster_id
namespace
object_kind
object_name
object_uid
parent_uid
cloud_resource_id
owner_key
valid_from
valid_to
source
```

Use UIDs, not names alone. A deleted Service, PVC, or Pod can be recreated with the same name and a different UID. Effective intervals prevent today's object from claiming last month's asset cost.

The ledger should capture Ingress-to-Service, Service-to-load-balancer, PVC-to-PV, PV-to-cloud-volume, Pod-to-PVC, and workload-controller relationships.

## Join Load Balancers to Services and Ingresses

The AWS Load Balancer Controller creates AWS load balancers from Kubernetes Ingresses and Services. Use both controller state and explicit AWS tags:

- ALB Ingress supports `alb.ingress.kubernetes.io/tags`;
- NLB Services can use `service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags`;
- retain cluster, namespace, Kubernetes object UID, workload owner, and creation/deletion time in the association ledger.

EKS resource tags do not automatically propagate to associated resources. Tag the created load balancer intentionally and activate the relevant cost allocation tags where appropriate.

For a load balancer serving one product, bind all hourly and usage components directly. For a shared ingress, separate fixed load-balancer hours from LCU or NLCU usage. AWS bills ALB and NLB capacity units from the highest usage dimension in each metering interval, not as separate byte, request, and rule-evaluation charges. Allocate variable cost with the dominant capacity-unit dimension and per-recipient telemetry when it can be reconstructed; otherwise use a documented policy proxy. Equal split may be acceptable for the fixed hourly component.

Do not join one load balancer CUR row directly to every backend and charge its full cost to each.

## Join EBS Volumes Through CSI Identity

For CSI-backed persistent storage, a Kubernetes PersistentVolume records the storage system identity in `spec.csi.volumeHandle`. For the Amazon EBS CSI driver this provides the cloud-volume identity needed to map to an EBS volume and its CUR resource ID.

Retain:

- volume ID;
- PV UID and name;
- PVC UID, namespace, and name;
- StorageClass;
- bound and released intervals;
- consuming workload owner intervals;
- snapshots and unattached periods as separate states.

Allocate provisioned volume-capacity charges to the PVC owner during the binding interval. Allocate separately billed provisioned IOPS, additional throughput, snapshots, and data transfer by their own billed component and approved driver. A volume that remains after its PVC or workload is deleted belongs in an orphaned-storage pool until a historical association or owner policy resolves it.

Do not use the current PVC list to allocate the whole month. EBS outlives Pods routinely, and a retained PV can change lifecycle state without changing its volume ID.

## Allocate the EKS Control Plane Explicitly

Amazon EKS has per-cluster hourly pricing based on Kubernetes version support, with separately priced Provisioned Control Plane capacity and EKS Capabilities where used. Worker nodes, EBS, addresses, and transfer are billed separately.

Bind control-plane rows to the cluster using activated user-defined cluster cost allocation tags or CUR resource identity where present. The AWS-generated `aws:eks:cluster-name` tag does not capture control-plane expenses. An account/Region/product association identifies one cluster only when exactly one eligible cluster exists; otherwise keep the aggregate in a shared or unresolved pool until policy allocates it. Then choose a policy:

- central platform cost;
- equal share among active tenant namespaces;
- proportional to direct Pod compute cost;
- proportional to workload count or another documented benefit metric;
- direct assignment for a single-tenant cluster.

No AWS rule states that namespace CPU share determines control-plane benefit. If that driver is used, label it as internal policy. Extended-support cost can be assigned to the cluster owner or platform upgrade program rather than hidden in the ordinary hourly rate.

## Normalize Shared-Asset Weights

Use one association table per asset interval:

```text
asset_line_id
recipient_key
weight_numerator
driver_name
association_source
policy_version
```

Allocate with a window total so fan-out cannot multiply cost:

```sql
WITH weighted AS (
    SELECT
        a.asset_line_id,
        b.recipient_key,
        a.selected_cost,
        b.weight_numerator,
        SUM(b.weight_numerator) OVER (
            PARTITION BY a.asset_line_id
        ) AS total_weight,
        MIN(b.weight_numerator) OVER (
            PARTITION BY a.asset_line_id
        ) AS min_weight,
        COUNT(*) OVER (
            PARTITION BY a.asset_line_id
        ) AS binding_count,
        COUNT(b.weight_numerator) OVER (
            PARTITION BY a.asset_line_id
        ) AS weight_count,
        COUNT(b.recipient_key) OVER (
            PARTITION BY a.asset_line_id
        ) AS recipient_count
    FROM eks_asset_cost a
    JOIN eks_asset_binding b
      ON a.asset_line_id = b.asset_line_id
),
allocated AS (
    SELECT
        asset_line_id,
        recipient_key,
        selected_cost * weight_numerator / NULLIF(total_weight, 0)
            AS allocated_cost
    FROM weighted
    WHERE total_weight > 0
      AND min_weight >= 0
      AND weight_count = binding_count
      AND recipient_count = binding_count
),
exceptions AS (
    SELECT
        a.asset_line_id,
        'unresolved_eks_ancillary' AS recipient_key,
        a.selected_cost AS allocated_cost
    FROM eks_asset_cost a
    WHERE NOT EXISTS (
        SELECT 1
        FROM weighted w
        WHERE w.asset_line_id = a.asset_line_id
          AND w.total_weight > 0
          AND w.min_weight >= 0
          AND w.weight_count = w.binding_count
          AND w.recipient_count = w.binding_count
    )
)
SELECT
    asset_line_id,
    recipient_key,
    allocated_cost
FROM allocated
UNION ALL
SELECT
    asset_line_id,
    recipient_key,
    allocated_cost
FROM exceptions;
```

The exception branch preserves assets with missing, zero, negative, or null weights instead of dropping them. Never coalesce an invalid denominator to one recipient or divide the full asset cost across duplicated raw join rows.

## Keep Cost Categories Visible

The final report should not collapse everything into `Kubernetes cost`. Show at least:

- Pod compute;
- unused node compute;
- load balancer fixed and variable components;
- persistent storage, IOPS, throughput, and snapshots;
- EKS control-plane and extended-support components;
- network transfer and addresses;
- platform overhead;
- unresolved ancillary cost.

This distinction tells a team whether to rightsize requests, remove an idle load balancer, delete an orphaned volume, consolidate clusters, or correct a topology.

## Validate the Join

- The chosen split-cost view reconciles to the parent compute scope without adding both explicit `Unused` records and Pod `unused_cost` values.
- Each ancillary CUR line appears in exactly one asset pool.
- Direct bindings have one active recipient per interval.
- Shared numerators are nonnegative, each denominator is positive, and the resulting normalized weights sum to one.
- Kubernetes UIDs and effective intervals prevent name reuse.
- EKS tags are not assumed to propagate to load balancers or volumes.
- Deleted-object cost enters an orphaned or historical-association state.
- Control-plane allocation is marked as policy, not provider fact.
- Asset allocations plus central and unresolved pools equal total EKS-related cost.

## Official Documentation

- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [AWS Data Exports: Example of split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/example-split-cost-allocation-data.html)
- [AWS Data Exports: Split line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html)
- [AWS Data Exports: CUR 2.0 identity columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-identity.html)
- [Amazon EKS: View costs by Pod with split cost allocation](https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html)
- [Amazon EKS: Pricing for control plane and other AWS resources](https://aws.amazon.com/eks/pricing/)
- [Amazon EKS: Route HTTP traffic with Application Load Balancers](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html)
- [Amazon EKS: Route TCP and UDP traffic with Network Load Balancers](https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html)
- [Elastic Load Balancing: Pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)
- [Elastic Load Balancing: Billing and usage report codes](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/load-balancer-billing-usage-reports.html)
- [Amazon EKS: Use Kubernetes volume storage with Amazon EBS](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html)
- [Amazon EBS: Pricing](https://aws.amazon.com/ebs/pricing/)
- [Kubernetes: CSI PersistentVolume source and volumeHandle](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/#CSIPersistentVolumeSource)
- [Amazon EKS: EKS tags do not propagate to associated resources](https://docs.aws.amazon.com/eks/latest/userguide/eks-using-tags.html)

## Conclusion

EKS split cost allocation is the compute foundation, not a complete cluster bill. Join load balancers through Service and Ingress history, EBS through PV and PVC CSI identity, and control-plane fees through the cluster. Normalize every shared-asset allocation, retain object UIDs and lifetimes, and label each distribution driver as policy where AWS supplies no workload assignment.
