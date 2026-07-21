# Application Showback from Kubernetes Labels and Shared RDS Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Amazon RDS, FinOps, Showback

Description: Build application showback by joining Kubernetes labels and workload metrics with AWS billing data and defensible allocation of shared RDS costs.

---

Application-level showback requires joining two kinds of evidence. Cloud billing data establishes the cost pools. Kubernetes and database telemetry explain which applications consumed shared infrastructure. Neither source is sufficient by itself.

A provider bill can identify a worker node or RDS instance but usually cannot identify every pod or application using it. Kubernetes labels identify workload ownership but do not carry the node's billed price. A shared RDS instance can be tagged to a platform, yet its resource tag cannot describe how several applications divided its database load.

The model becomes auditable when every allocation starts from a reconciled cost pool and uses a named, time-aligned demand driver.

## Establish one application identity

Use a stable `application_id` across deployment metadata, telemetry, service inventory, and cost reporting. Kubernetes recommends the `app.kubernetes.io` label family. Useful labels include:

- `app.kubernetes.io/name` for the application name
- `app.kubernetes.io/instance` for a specific instance
- `app.kubernetes.io/component` for a component such as API or worker
- `app.kubernetes.io/part-of` for the higher-level application

Kubernetes describes these labels as recommended, not required, and does not enforce a formal application concept. Add a company-owned label for the stable catalog ID when names can change:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: checkout-api
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: checkout
    cost.example.com/application-id: app-0042
    cost.example.com/team-id: team-payments
```

Apply the labels to pod templates so the resulting pods carry them. Validate them at admission or deployment time, and map the stable ID to product, team, and cost center in an effective-dated inventory.

## Capture historical Kubernetes usage

The Kubernetes Metrics API exposes current CPU and memory usage for nodes and pods. The standard metrics-server is a lightweight, short-term, in-memory component intended for features such as autoscaling and `kubectl top`. It is not a monthly cost ledger.

For showback, send these facts to a durable metrics pipeline at a consistent interval:

- timestamp and cluster ID
- node and pod identity
- namespace
- application labels as they existed at that time
- container CPU and memory usage
- CPU and memory requests
- persistent storage and relevant network measures
- pod start and end times

Resource requests and actual usage answer different questions. Kubernetes schedules pods based on requests even if actual use is lower. A request-based allocator reflects reserved schedulable capacity; a usage-based allocator reflects observed consumption. A blended policy can recognize both, but its weights must be documented and stable for the reporting period.

## Create Kubernetes cost pools from billing data

Start with the cloud provider's effective or amortized costs for the cluster's resources, while retaining billed cost for invoice reconciliation. Build separate pools rather than one undifferentiated cluster total:

- worker compute
- attached storage
- cluster management or control-plane charges
- load balancing and network charges
- observability and security agents
- shared platform namespace costs

Map provider resources to cluster and node identities using resource IDs, provider identifiers, and a controlled inventory. Allocation must not change the total of any pool.

For worker compute, calculate each application's share of the chosen CPU and memory drivers over the same intervals as the node cost. Handle node capacity that was not assigned to application pods as an explicit idle or platform-reserve bucket. Dividing only among active applications hides the cost of spare capacity and makes their rates rise when another workload becomes quiet.

System namespaces can remain a visible platform pool or be allocated to applications using the agreed driver. Do not count system-pod usage once as an application allocation and again as platform overhead.

## Build the RDS pool from AWS charges

Group RDS cost and usage records by DB instance or cluster resource ID where the export supplies it. Keep materially different components visible, such as instance capacity, storage, I/O, backup, data transfer, licensing, and related monitoring charges. Their best demand drivers may differ.

If an RDS resource serves one application, activate and use an application cost allocation tag for direct attribution. AWS documents that RDS tags can organize billing cost by application or project. A tag on a shared database, however, can only identify the shared resource or platform. It does not split the bill among its consumers.

## Meter a shared database by application

Choose the strongest available driver for each cost pool:

1. **Dedicated database or instance:** Allocate directly to its application.
2. **Database or schema per application:** Use the database identity if engine telemetry and governance make the mapping reliable.
3. **Distinct database user per application:** Attribute demand by the user dimension, with service accounts mapped to application IDs.
4. **Application identity in database sessions:** Use the application dimension where the engine exposes it.
5. **Instrumented application demand:** Use query time, transactions, rows, bytes, or another workload-specific meter carried with `application_id`.
6. **Approved proxy:** Use requests, connections, or another correlated measure only when its limitations are stated.

Amazon RDS Database Insights can slice database load by SQL, waits, hosts, or users. The RDS documentation also lists a top-application dimension for PostgreSQL and SQL Server, not for every engine. Database load represents active session activity. It can be a useful compute-pressure driver, but it is not automatically a measure of storage, backup, or network consumption.

`DatabaseConnections` from CloudWatch is scoped to an RDS instance, so the default service metric cannot divide a shared instance by application. Connection counts are also not necessarily proportional to cost. Long-lived pools and short expensive queries make that proxy particularly easy to misinterpret.

## Allocate each RDS component deliberately

A defensible policy might use:

- database load or query time for instance-capacity cost
- tenant or application bytes stored for storage cost
- measured I/O or query activity for I/O cost
- retained application data for backup cost
- measured bytes for data transfer
- proportional effective RDS cost for inseparable support or monitoring overhead

For every pool and period:

```text
application allocation
= pool effective cost
* application driver quantity
/ driver quantity for all eligible applications
```

If driver coverage is incomplete, keep the uncovered part in `unallocated-rds` rather than scaling known consumers to absorb unknown demand. Report coverage beside the allocation.

## Join Kubernetes and RDS results once

Produce one application-period fact with separate components:

| Field | Purpose |
| --- | --- |
| `application_id` | Stable join key |
| `period` | Time window shared by cost and telemetry |
| `kubernetes_direct_cost` | Workload-attributable cluster cost |
| `kubernetes_platform_share` | Allocated system and platform cost |
| `rds_direct_cost` | Dedicated database cost |
| `rds_shared_share` | Metered share of shared RDS pools |
| `allocation_rule_id` | Policy lineage |
| `driver_coverage` | Completeness indicator |

This prevents a shared RDS amount from being included in a general platform rate and then added again as a database allocation.

## Validate before publishing

Check that billed provider costs reconcile to the invoice, effective cluster and RDS pools reconcile to native commitment-aware data, and every pool equals direct plus allocated plus idle, central, and unallocated results. Confirm the label and telemetry windows match the charge period, especially for short-lived pods and ownership changes.

Publish the cost basis, request-versus-usage policy, idle treatment, RDS drivers, engine-specific telemetry limitations, and allocation-rule version. Application showback is trustworthy when recipients can see both the amount and why the chosen driver represents their use.

## Official documentation

- [Kubernetes: Recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
- [Kubernetes: Resource management for pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Tools for monitoring resources](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/)
- [AWS: Tagging Amazon RDS resources](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Tagging.html)
- [AWS: Monitoring RDS with Database Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DatabaseInsights.html)
- [AWS: CloudWatch dimensions for Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/dimensions.html)
- [AWS: Performance Insights dashboard dimensions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.Components.html)
- [FinOps Foundation: Allocation](https://www.finops.org/framework/capabilities/allocation/)
