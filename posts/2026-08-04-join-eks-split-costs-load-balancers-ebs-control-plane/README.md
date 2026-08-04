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

These rows are the compute allocation source. Do not derive EC2 node cost again from ordinary parent rows and add both totals.

## Build a Canonical Asset Table

Normalize all billed assets before assigning owners:

```text
asset_line_id
billing_interval_start
billing_interval_end
account_id
region
service
asset_type
resource_id
selected_cost
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

Keep the original CUR identity line-item ID. Resource IDs are not globally unique across services and can be blank, so the asset key must include provider, account, Region, service, and interval as appropriate.

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

For a load balancer serving one product, bind all hourly and usage components directly. For a shared ingress, choose a measured driver such as processed bytes, requests, rule evaluations, or target traffic. The driver must match the billed component; equal split may be acceptable for the fixed hourly component while bytes drive variable processing.

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

Allocate provisioned volume capacity and baseline charges to the PVC owner during the binding interval. Allocate provisioned IOPS, throughput, snapshots, and data transfer by their own billed component and approved driver. A volume that remains after its PVC or workload is deleted belongs in an orphaned-storage pool until a historical association or owner policy resolves it.

Do not use the current PVC list to allocate the whole month. EBS outlives Pods routinely, and a retained PV can change lifecycle state without changing its volume ID.

## Allocate the EKS Control Plane Explicitly

Amazon EKS has per-cluster hourly pricing based on Kubernetes version support, with additional separately priced control-plane options and capabilities where used. Worker nodes, EBS, addresses, and transfer are billed separately.

Bind control-plane rows to the cluster using CUR resource identity where available, or a controlled account/Region/product association. Then choose a policy:

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
        ) AS total_weight
    FROM eks_asset_cost a
    JOIN eks_asset_binding b
      ON a.asset_line_id = b.asset_line_id
)
SELECT
    asset_line_id,
    recipient_key,
    selected_cost * weight_numerator / NULLIF(total_weight, 0)
        AS allocated_cost
FROM weighted;
```

Send a zero or missing denominator to an exception bucket. Never coalesce it to one recipient or divide the full asset cost across duplicated raw join rows.

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

- Split Pod compute plus split unused compute reconciles to the parent compute scope.
- Each ancillary CUR line appears in exactly one asset pool.
- Direct bindings have one active recipient per interval.
- Shared weights are nonnegative and sum to one.
- Kubernetes UIDs and effective intervals prevent name reuse.
- EKS tags are not assumed to propagate to load balancers or volumes.
- Deleted-object cost enters an orphaned or historical-association state.
- Control-plane allocation is marked as policy, not provider fact.
- Asset allocations plus central and unresolved pools equal total EKS-related cost.

## Official Documentation

- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [AWS Data Exports: Split line item columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html)
- [Amazon EKS: View costs by Pod with split cost allocation](https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html)
- [Amazon EKS: Pricing for control plane and other AWS resources](https://aws.amazon.com/eks/pricing/)
- [Amazon EKS: Route HTTP traffic with Application Load Balancers](https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html)
- [Amazon EKS: Route TCP and UDP traffic with Network Load Balancers](https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html)
- [Amazon EKS: Use Kubernetes volume storage with Amazon EBS](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html)
- [Kubernetes: CSI PersistentVolume source and volumeHandle](https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-v1/#CSIPersistentVolumeSource)
- [Amazon EKS: EKS tags do not propagate to associated resources](https://docs.aws.amazon.com/eks/latest/userguide/eks-using-tags.html)

## Conclusion

EKS split cost allocation is the compute foundation, not a complete cluster bill. Join load balancers through Service and Ingress history, EBS through PV and PVC CSI identity, and control-plane fees through the cluster. Normalize every shared-asset allocation, retain object UIDs and lifetimes, and label each distribution driver as policy where AWS supplies no workload assignment.
