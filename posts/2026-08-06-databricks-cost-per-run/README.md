# Calculate Databricks Cost per Job Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Cost Optimization, FinOps, Cloud Cost, Data Engineering

Description: Build a defensible Databricks cost-per-run model using billable DBUs, cloud infrastructure charges, run phases, retries, and actual billing exports.

---

The hourly price shown beside a Databricks compute configuration is not the cost of a job run. A classic job can incur a Databricks usage charge and a separate cloud infrastructure charge. Startup and cleanup consume resources, autoscaling changes the node count over time, and failed attempts can cost as much as a successful attempt.

A useful cost-per-run model starts with metered records, not a single hourly rate multiplied by wall-clock duration.

## Define the cost boundary first

Use a formula that matches the compute product:

```text
Classic job compute cost
  = Databricks usage cost
  + cloud VM and attached disk cost
  + directly attributable network, storage, and service cost

Serverless job cost
  = serverless Databricks usage cost
  + directly attributable external service and network cost
```

Do not add an invented VM estimate to serverless usage. Databricks operates the serverless compute plane, and the billable serverless SKU is the primary compute charge. For classic compute, the virtual machines and related cloud resources run in the customer cloud account and appear on the cloud provider bill.

Decide whether the report shows:

- List cost, using the Databricks list price table
- Contract cost, after private discounts or committed-use terms
- Amortized cost, including prepaid commitments and shared platform charges
- Marginal cost, showing only usage that changes when the run occurs

Label the result. A list-cost estimate should not be presented as an invoice total.

## Calculate the Databricks usage component

Unity Catalog exposes billable usage in `system.billing.usage`. For standard Lakeflow job runs on job compute or serverless compute, `usage_metadata.job_id` and `usage_metadata.job_run_id` support direct attribution. Notebook `WORKFLOW_RUN` entries are an exception: their compute usage is attributed to the parent notebook rather than to a separate workflow run. These fields are not populated for jobs that run on shared all-purpose compute.

Join the usage table to `system.billing.list_prices` using the price validity interval. The current price structure is `pricing.effective_list.default`.

```sql
SELECT
  u.workspace_id,
  u.cloud,
  u.usage_metadata.job_id AS job_id,
  u.usage_metadata.job_run_id AS job_run_id,
  u.sku_name,
  u.usage_unit,
  p.currency_code,
  SUM(u.usage_quantity) AS usage_quantity,
  SUM(
    u.usage_quantity * p.pricing.effective_list.default
  ) AS estimated_list_cost
FROM system.billing.usage AS u
JOIN system.billing.list_prices AS p
  ON p.cloud = u.cloud
 AND p.sku_name = u.sku_name
 AND u.usage_end_time >= p.price_start_time
 AND (
   p.price_end_time IS NULL
   OR u.usage_end_time < p.price_end_time
 )
WHERE u.workspace_id = :workspace_id
  AND u.usage_metadata.job_run_id = :job_run_id
GROUP BY
  u.workspace_id,
  u.cloud,
  u.usage_metadata.job_id,
  u.usage_metadata.job_run_id,
  u.sku_name,
  u.usage_unit,
  p.currency_code;
```

Sum all records, including corrections. Billing corrections can be represented as retractions and restatements, so filtering for only `ORIGINAL` records can preserve a charge that Databricks later corrected.

The price table provides list prices over time. Private discounts, negotiated currency treatment, credits, marketplace terms, and committed-use benefits can make the invoice differ. Reconcile the estimate with account billing data before using it for financial close.

## Add cloud infrastructure for classic compute

For classic compute, obtain actual line items from the provider's billing export:

- AWS Cost and Usage Reports or Data Exports
- Azure Cost Management exports
- Google Cloud Billing export to BigQuery

Attribute resources using provider resource identifiers and tags that are confirmed to propagate for the cloud and compute configuration. On AWS, for example, pool-backed cluster instances inherit workspace and pool tags, but not cluster tags. Include only charges that fall inside the documented scope:

- Driver and worker VM runtime
- Attached managed disks or persistent disks
- Public IP, NAT, and cross-zone or cross-region network charges where applicable
- Pool instances while they are idle, allocated using a documented rule rather than treated as metered to one run
- Storage and API operations that are directly attributable to the job

Keep shared control-plane, logging, or network costs in a separate allocation layer unless the organization has a documented allocation rule. Otherwise, two teams can calculate different costs for the same run while both appear plausible.

Cloud billing granularity and minimums vary by provider, operating system, resource, and purchase option. For example, AWS documents per-second billing with a 60-second minimum for many On-Demand EC2 instances. Always use the provider export rather than applying that rule universally.

## Account for startup, execution, and cleanup

Job wall-clock duration contains several phases:

```text
trigger -> queue -> setup -> execution -> cleanup -> termination
```

Queue time often occurs before compute is assigned, while setup can include VM acquisition, runtime startup, and library installation. Cleanup can continue after application code finishes. The exact billable interval depends on the product and provider resource lifecycle.

Do not calculate classic cost as:

```text
(driver hourly price + configured workers * worker hourly price)
* job wall-clock hours
```

That shortcut fails when:

- Autoscaling changes the worker count
- Workers join after the driver starts
- A Spot worker is replaced by an on-demand worker
- Cluster setup or library installation is slow
- A shared job cluster serves several tasks
- The cloud provider applies billing minimums or discounts

Use `system.lakeflow.job_task_run_timeline` to understand task setup, execution, and cleanup time for records emitted since early December 2025. It does not expose queue duration; the job-run duration fields are populated only for legacy single-task jobs. Use metered Databricks and provider records for money. Duration data explains cost but should not replace the billing records.

## Charge retries and repairs to the outcome

A cost-per-run report that ignores failed work rewards unreliable pipelines. Include:

- Automatic task retries within the job run
- Repaired task executions
- A failed top-level run followed by a new successful run
- Reprocessing caused by non-idempotent writes

For retries and repairs that remain under one job run ID, the billing usage grouped by `job_run_id` captures the run's usage. If an orchestrator launches a new job run after failure, use a separate business invocation ID as a job parameter or audit key and aggregate all related Databricks run IDs.

Report both values when operational decisions matter:

```text
cost per Databricks run
cost per successful business outcome
```

The second metric exposes the cost of reliability failures.

## Handle all-purpose compute honestly

Databricks documents that precise job cost attribution is not possible on all-purpose compute because notebooks, queries, and jobs can overlap on the same cluster. The billing table identifies the cluster, but it cannot split shared infrastructure perfectly among concurrent workloads.

Options are:

1. Move production jobs to dedicated job compute or serverless compute for direct job and run attribution.
2. Report the whole cluster cost and label any job allocation as an estimate.
3. Allocate by a published rule such as task runtime, executor time, or weighted resource usage, and preserve unallocated idle cost as a separate line.

Never imply that a runtime-weighted allocation is metered per-job cost.

## Build a reconciliation ledger

Keep a table with one row per charge component rather than only a final number:

| Field | Purpose |
| --- | --- |
| `workspace_id` | Separates workspace-local job identifiers |
| `job_id` | Identifies the saved job |
| `job_run_id` | Identifies the Databricks run |
| `business_invocation_id` | Groups replacement runs and external retries |
| `charge_source` | Databricks, AWS, Azure, or Google Cloud |
| `sku` | Preserves rate and product detail |
| `usage_quantity` and `unit` | Keeps the metered basis |
| `list_cost` | Reproducible list-price estimate |
| `net_cost` | Contract or invoice value when available |
| `currency` | Prevents accidental cross-currency sums |
| `is_shared_allocation` | Distinguishes metered and allocated cost |

Load usage incrementally, then reprocess a recent window because billing corrections and late provider records can arrive after a run completes. Keep source record identifiers where available so the pipeline is idempotent.

## Validate the model

Before publishing cost per run:

1. Reconcile total Databricks usage by SKU and date with the account billing view.
2. Reconcile cloud infrastructure totals with the provider export.
3. Test a fixed-size classic job and compare expected node time with exported VM line items.
4. Test an autoscaling run and verify that the model does not assume maximum workers for the whole duration.
5. Trigger a controlled retry and confirm both attempts are included.
6. Verify that any cost incurred by failed and canceled runs is attributed to them.
7. Separate list cost from negotiated net cost.
8. Document treatment of pools, shared networking, commitments, taxes, and credits.

Cost is also version- and region-sensitive. Refresh price joins from the effective-dated price table and provider catalogs rather than embedding rates in code.

## Official Documentation

- [Billable usage system table reference](https://docs.databricks.com/aws/en/admin/system-tables/billing)
- [Monitor costs using system tables](https://docs.databricks.com/aws/en/admin/usage/system-tables)
- [Jobs system table reference](https://docs.databricks.com/aws/en/admin/system-tables/jobs)
- [AWS EC2 On-Demand instance billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-on-demand-instances.html)
- [AWS Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html)
- [Azure Cost Management exports](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-export-acm-data)
- [Google Cloud Billing export to BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery)

## Conclusion

A defensible Databricks cost-per-run metric combines effective-dated Databricks usage with actual cloud billing records for classic compute. Run phases, autoscaling, retries, repairs, pools, and shared infrastructure all prevent a simple hourly-price calculation from being reliable. Preserve the metered components, label allocations and list-price estimates, and reconcile the result to both billing systems.
