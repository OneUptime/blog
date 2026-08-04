# Showback for Deleted and Ephemeral Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Showback, FinOps, AWS CUR, Kubernetes, Cloud Inventory, Cost Allocation, Data Engineering

Description: Attribute late billing lines for deleted and short-lived resources with a temporal ownership ledger instead of today's inventory.

---

A resource can disappear before its cost appears in a showback pipeline. Cloud billing is reported after usage, Kubernetes Pods are disposable, and current inventory queries return only what still exists. Joining last month's cost to today's tags guarantees attribution gaps and can assign historical cost to the wrong owner.

The reliable pattern is to preserve ownership and resource relationships as time-bounded evidence. The billing usage interval then joins to the evidence that was valid when the resource existed.

## Understand Why the Asset Is Gone

Several distinct cases look like a missing resource:

- usage happened before deletion but the billing line arrived later;
- a retained child resource, such as a volume or snapshot, continued billing after its parent disappeared;
- a refund, credit, fee, or correction was posted after the original usage;
- a short-lived Pod or batch task ended before an inventory scrape;
- the billing line has no resource identifier by design;
- the resource identifier exists, but the inventory system never captured it.

Classify these cases separately. A retained volume is an active billable asset, not merely a late line for a deleted instance. A refund needs a financial association policy, not an attempt to find a currently running resource.

## Do Not Depend on Current Tags

AWS CUR includes `lineItem/ResourceId` only when resource IDs are enabled and the service supplies one. AWS also documents line classes where that field can be blank, including some transfers, API requests, discounts, credits, and taxes.

Cost allocation tags must be activated before they appear as billing columns. Tag backfill can update eligible historical billing data, but only for tags that were actually assigned to resources during the requested period. It cannot reconstruct a tag that was never captured.

Some service-specific tags also vanish with the resource. Amazon EKS documentation states that tags do not propagate to associated resources and that tags for a deleted resource are no longer available. A current tag API is therefore not a historical ownership database.

Use billing-time tags when present, but preserve them in the source snapshot instead of looking them up again later.

## Build a Temporal Resource Ledger

Create one durable record for each observed resource lifecycle:

```text
resource_key
provider_account
region
service
resource_type
native_resource_id
valid_from
valid_to
owner_key
parent_resource_key
controller_or_workload_key
evidence_source
evidence_observed_at
confidence
```

The resource key should include provider, account, region, service, type, and native identifier as appropriate. Names alone are unsafe because they can be reused. Never let a newly created resource with the same display name inherit an older resource's cost.

When ownership changes, close the prior interval and open a new one. When deletion is observed, close the lifecycle interval but retain the record indefinitely according to your audit and retention policy.

AWS Config can record configuration items when supported resources are created, changed, or deleted. Its resource timeline and `GetResourceConfigHistory` API can supply historical configuration evidence. CloudTrail event history can supplement this with management events such as create, tag, and delete operations, subject to CloudTrail's event coverage and retention. Neither source covers every possible resource and data event, so track coverage rather than assuming completeness.

## Capture Ephemeral Kubernetes Identity at Event Time

A Kubernetes Pod has a unique UID for its lifecycle. A replacement Pod can reuse a name while receiving a different UID. Capture Pod events or audit records and retain:

- cluster identity and Pod UID;
- namespace and Pod name;
- workload controller kind, name, and UID;
- labels used for showback;
- node and cloud-provider instance identity;
- start, deletion, and terminal timestamps;
- container resource requests and observed usage intervals;
- Job, CronJob, or workflow execution identity.

Periodic scrapes alone miss Pods that start and finish between scrape intervals. Watch the API, export state from the scheduler or workload system, and persist termination records outside the cluster. Use UID-based lineage to roll Pods into a Deployment, StatefulSet, Job, or approved service-catalog owner.

## Join by Usage Time, Not Report Arrival

For metered usage, match the cost line's usage interval to the ownership interval:

```sql
SELECT
  c.source_row_key,
  r.resource_key,
  r.owner_key
FROM cost_line c
JOIN resource_owner_history r
  ON c.provider_account = r.provider_account
 AND c.region = r.region
 AND c.service = r.service
 AND c.resource_id = r.native_resource_id
 AND c.usage_start_time < COALESCE(r.valid_to, TIMESTAMP '9999-12-31')
 AND c.usage_end_time > r.valid_from;
```

This is an interval-overlap join. If a cost line spans an ownership change, split its amount by overlapping usage duration only when cost accrues uniformly and no finer usage record exists. Otherwise keep it unresolved or use a service-specific driver.

The arrival timestamp tells you when the provider reported the row, not who owned the resource. One-time fees, commitment purchases, refunds, and other non-usage lines need their own association date and policy.

Require that an interval join returns at most one valid lifecycle and ownership record for a given moment. Overlapping owner intervals should fail a data-quality test instead of duplicating the cost.

## Use a Controlled Attribution Hierarchy

Apply evidence in a predictable order:

1. cost-allocation tags captured on the billing line;
2. resource ledger ownership valid during the usage interval;
3. parent, controller, or workload association valid during the interval;
4. account, namespace, or service association table;
5. named deleted-resource or missing-inventory residual bucket.

Store the selected rule, evidence record, confidence, and alternatives. Do not parse arbitrary naming conventions unless they are governed and versioned. Do not fall back to the resource's current owner for historical usage.

For billing lines without a resource ID, use the strongest dimensions the line actually provides: account, service, operation, usage type, availability zone, and billing entity. Allocate shared or non-resource charges with an explicit policy rather than manufacturing a resource match.

## Preserve Parent and Child Lifecycles

Deletion often reveals that the cost belonged to a related asset:

- an EC2 instance is deleted but an EBS volume remains;
- a Kubernetes Service is removed after its load balancer records usage;
- a database is deleted but retained snapshots continue to consume storage;
- a NAT gateway is deleted after data processing and transfer usage occurred;
- a cluster disappears while its control-plane or support adjustment arrives later.

Record relationship intervals independently. The child resource should retain its own identifier, lifecycle, and owner, with the parent link as evidence. Deleting the parent must not close a child that remains billable.

## Reconcile Late and Missing Attribution

Report these controls by billing period:

- cost with a native resource ID versus cost without one;
- identified resources matched to a temporal ledger record;
- matched cost by evidence source and confidence;
- cost associated through a parent or controlled fallback;
- cost for deleted resources with no historical evidence;
- rows with multiple overlapping owners;
- billing adjustments associated after the original period.

Keep residual cost inside the showback control total. A spike in `RESOURCE_NOT_OBSERVED` is a signal that event capture, service coverage, or retention failed.

When a late billing adjustment changes a closed report, post an explicit delta or create a versioned restatement. The historical ledger lets you apply the owner that was valid for the originating resource and period without silently rewriting ownership from current state.

## Official Documentation

- [AWS Data Exports: CUR line-item columns and resource ID behavior](https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html)
- [AWS Data Exports: CUR 2.0 resource tag columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-tag-columns.html)
- [AWS Billing: Activating user-defined cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html)
- [AWS Billing: Backfilling cost allocation tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-allocation-backfill.html)
- [AWS Config: Selecting and recording resources](https://docs.aws.amazon.com/config/latest/developerguide/select-resources.html)
- [AWS Config: Looking up discovered and deleted resources](https://docs.aws.amazon.com/config/latest/developerguide/looking-up-discovered-resources.html)
- [AWS Config API: GetResourceConfigHistory](https://docs.aws.amazon.com/config/latest/APIReference/API_GetResourceConfigHistory.html)
- [AWS CloudTrail: Viewing event history](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html)
- [Amazon EKS: Tagging EKS resources](https://docs.aws.amazon.com/eks/latest/userguide/eks-using-tags.html)
- [Kubernetes: Pod lifecycle and Pod UID](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

## Conclusion

Deleted-resource showback is a history problem, not a tagging lookup problem. Capture resource identity, ownership, and relationships while they exist; retain them as effective-dated records; and join cost by usage time. With explicit fallbacks and residual controls, late billing lines remain attributable even after the asset and its live tags are gone.
