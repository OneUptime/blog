# How to Allocate OpenSearch Serverless OCU Costs by Application in Cloudability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, OpenSearch, FinOps, Cost Management

Description: Allocate shared OpenSearch Serverless OCU spend to applications using verified billing pools, explicit ownership mappings, and reconciled telemetry weights.

OpenSearch Serverless compute can serve multiple collections. Assigning the entire OCU charge to every application using that capacity multiplies the bill; assigning it to the first collection tag found makes the result arbitrary.

Use Cloudability to preserve the billed cost pool and apply a documented allocation policy. Application-level allocation is an accounting model when the provider's bill and metrics do not directly identify each application's share.

## Identify the actual compute boundary

Current AWS documentation distinguishes collection groups, which share compute among collections, from Classic collections that can operate outside a group with account-level capacity behavior. Collection groups can share OCUs across different KMS keys. Do not reuse an older assumption that each key always defines a separate compute pool.

Inventory account, region, collection group, collection, application owner, and collection generation. Compare this inventory with actual billing rows before deciding the allocation grain. Keep indexing, search, storage, and other charges separate until their meaning is established.

A collection tag is useful ownership metadata. Its presence does not prove a shared OCU billing item contains that collection's tag or represents only that collection.

## Create a reconciled source pool

In Cloudability, find the relevant service and usage values from your own billing data. Do not hard-code a guessed usage-type string. Build a small report by account, region, service, usage type, and available resource identifier, then inspect the actual OCU charges.

Choose one cost basis and reporting period. For example, a daily amortized pool can support operational chargeback, while finance may require a different basis for invoice reconciliation. Record the policy rather than switching metrics between source and destination reports.

Create an ownership Business Dimension that identifies direct application costs and a distinct shared OpenSearch bucket. Review the source bucket so storage already attributed directly is not also swept into the shared compute allocation.

## Select an honest weighting signal

AWS publishes `IndexingOCU` and `SearchOCU` at account or collection-group scope, depending on the deployment. Collection-level request and document metrics provide other signals. Do not request a collection dimension for an OCU metric whose documented dimension set is account or group level.

A request count is a proxy for search consumption, not proof that every request costs the same. If query complexity varies substantially, use application telemetry that better represents workload effort, or agree on fixed weights until a defensible signal exists.

For a simple illustrative policy, allocate a 240-unit daily search pool across three applications with weights 60, 30, and 10:

```python
from decimal import Decimal

pool = Decimal("240.00")
weights = {"Payments": Decimal(60), "Analytics": Decimal(30),
           "Support": Decimal(10)}
total = sum(weights.values(), Decimal(0))
if total <= 0 or any(value < 0 for value in weights.values()):
    raise ValueError("Invalid allocation weights")
allocated = {name: pool * value / total for name, value in weights.items()}
assert sum(allocated.values(), Decimal(0)) == pool
assert allocated["Payments"] == Decimal("144.00")
```

This fixture validates arithmetic, not a live Cloudability allocation. Use separate weighting policies for indexing and search when their workload drivers differ.

## Configure Cost Sharing and telemetry

Cloudability supports fixed and telemetry-based Cost Sharing rules. Select the shared source bucket and destination application values, then use the telemetry workflow available in your edition and tenant.

The July 2026 release introduced centralized Telemetry Metrics and a CSV format with date, tags, and value. Older per-allocation documentation describes a different upload layout. Download the template from the workflow you are actually using; do not mix the schemas.

Validate that every destination value matches the Business Dimension, all weights are nonnegative, and the time window matches the cost pool. Define a fallback for missing telemetry or an all-zero day. Preserve unexplained spend in a visible shared or unallocated bucket instead of silently dropping it.

## Prove conservation

Compare pre-allocation and post-allocation reports with identical scope and cost basis. Direct cost plus incoming allocations, less outgoing allocations, must reconcile to the original total. Inspect a quiet day and a busy day, and make sure no source pool is allocated twice through overlapping rules.

Keep rounding residuals explicit when presenting currency values. Recalculate weights when applications move between groups; the old pool membership is not automatically a valid policy for the new topology.

## Conclusion

Allocate the billed OCU pool once, with ownership and weights tied to the real compute boundary. Label telemetry-based shares as allocation policy and retain a reconciliation back to provider spend.

## Official Documentation

- [AWS collection groups](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-collection-groups.html)
- [AWS capacity and Classic collection behavior](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-scaling.html)
- [AWS Serverless CloudWatch metric dimensions](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/monitoring-cloudwatch.html)
- [AWS collection tagging](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/tag-collection.html)
- [IBM Cost Sharing](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=setup-sharing-cost-in-cloudability)
- [IBM centralized telemetry release](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=cloudability-whats-new-in-premium)
