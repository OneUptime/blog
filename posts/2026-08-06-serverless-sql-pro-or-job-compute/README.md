# Serverless SQL, Pro Warehouse, or Job Compute?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Serverless SQL, Data Warehouse, Cost Optimization, Performance

Description: Choose between serverless SQL warehouses, pro warehouses, and job compute using workload interface, concurrency, networking, startup, and cost.

---

Serverless SQL warehouses, pro SQL warehouses, and job compute solve different problems. The first two are SQL endpoints for interactive queries, BI tools, SQL tasks, and dbt. Job compute runs Lakeflow Jobs tasks such as notebooks, Python scripts, wheels, JARs, and Spark Submit applications.

Start with the workload interface. Then evaluate networking, concurrency, feature support, startup, and total cost. Comparing only DBU rates can select a compute product that cannot serve the client or govern the data correctly.

## The short decision

| Requirement | Default choice | Why |
| --- | --- | --- |
| BI dashboards, ODBC or JDBC, ad hoc SQL | Serverless SQL warehouse | Fast startup, rapid scaling, Intelligent Workload Management |
| SQL or dbt task in Lakeflow Jobs | Serverless SQL warehouse | Databricks recommends it for supported SQL and dbt tasks |
| SQL endpoint needs customer-defined network connectivity unsupported by serverless | Pro SQL warehouse | Compute runs in the customer cloud account |
| Python, notebook, or wheel ETL | Serverless jobs | Managed provisioning for supported job tasks |
| JAR, Spark Submit, custom init script, or unsupported serverless feature | Classic job compute | Custom runtime and cluster configuration |
| Production job on all-purpose compute | Move to job compute | Better isolation, lifecycle, and run-level cost attribution |

Databricks recommends serverless SQL warehouses for most SQL workloads and serverless jobs for supported job tasks. A recommendation is a starting point, not a substitute for checking region, network, data source, runtime, and security requirements.

## Serverless SQL warehouses

Serverless SQL warehouses are managed SQL compute. They support Photon, Predictive IO, and Intelligent Workload Management. Databricks documents typical startup of roughly 2 to 6 seconds and rapid scale-up when demand queues.

Choose serverless SQL when:

- Users connect through ODBC, JDBC, the SQL editor, or BI tools.
- Demand is bursty or highly concurrent.
- Fast resume from an auto-stopped state matters.
- The workload is SQL, dashboard, dbt, or SQL-task oriented.
- Unity Catalog and supported serverless networking satisfy governance and connectivity.

Intelligent Workload Management predicts query resource needs and manages admission and scaling. That reduces manual concurrency tuning, but it does not make an undersized maximum-cluster setting or an inefficient query irrelevant. Monitor queue wait, spills, scan volume, and peak queued queries.

Serverless compute runs in the Databricks-managed serverless plane. It does not use customer-selected VM types, instance pools, or Spot policies. Private connectivity is cloud- and service-specific and is configured through current serverless networking features, such as network connectivity configurations where supported.

Check prerequisites. For example, workspaces that rely on a legacy external Hive metastore cannot use serverless SQL warehouses. Regions and network targets also differ.

## Pro SQL warehouses

Pro warehouses are customer-cloud SQL compute with Photon and Predictive IO, but without serverless Intelligent Workload Management. Databricks documents startup at approximately four minutes and less responsive scale-up and scale-down than serverless.

Choose Pro when:

- Serverless SQL is not available in the workspace region.
- A required private data source or on-premises path needs customer-defined networking that the serverless option does not support.
- A SQL endpoint must run in the customer cloud account for an approved architecture requirement.
- The workload needs a supported SQL warehouse feature and cannot use serverless.

Pro is not automatically cheaper because it is less managed. It can sit running between queries, start slowly after auto-stop, and require manual minimum and maximum cluster settings. It also introduces the cloud infrastructure side of the cost model in addition to Databricks usage.

For classic and pro warehouses, Databricks documents a manual scaling model in which one cluster handles up to ten concurrent queries. More clusters add concurrency, while a larger cluster primarily adds resources for query complexity. Validate this against actual queue and query-profile evidence rather than treating ten queries as equal workloads.

## Job compute

Job compute is attached to Lakeflow Jobs tasks. It is not a shared SQL endpoint for a BI client. Job compute has two broad forms:

- Serverless jobs, where Databricks manages provisioning and scaling
- Classic job compute, where the job defines runtime, node types, autoscaling, policies, libraries, and other supported cluster settings

Use serverless jobs for supported notebook, Python script, and Python wheel tasks. Use classic job compute when the workload requires JAR or Spark Submit tasks, unsupported APIs, custom cluster settings, compute policies, init scripts, or another feature listed in the serverless limitations.

For a multi-task job, tasks can share a classic job compute resource to reduce repeated startup. Shared compute also shares process state and installed libraries for the run, so do not rely on mutable Scala singleton state or accidental task isolation.

SQL can execute in a notebook on job compute, but that does not turn the cluster into an ODBC-serving SQL warehouse. Choose job compute when SQL is part of a Spark application or orchestration graph. Choose a SQL warehouse when SQL is the client-facing execution contract.

## Separate interface from implementation

Ask these questions in order:

### 1. Who submits the work?

- BI tool, SQL editor, JDBC, or ODBC: use a SQL warehouse.
- Lakeflow SQL or dbt task: prefer a serverless SQL warehouse.
- Notebook, Python package, JAR, or Spark application: use job compute.

### 2. Does serverless support the workload?

Review current serverless limitations for language, data source, library, Spark API, streaming trigger, network, and runtime behavior. Serverless job compute uses Spark Connect semantics and does not expose the classic Spark UI or arbitrary Spark configuration.

### 3. Where must network traffic originate?

Inventory every destination: Unity Catalog storage, federated databases, SaaS APIs, on-premises systems, package repositories, and customer-managed services. A Unity Catalog credential grants identity, not network reachability.

Use serverless private connectivity when it supports the target and region. Select Pro or classic job compute only when the required customer-defined path is unavailable or another architecture control requires it.

### 4. Is the load concurrent or sequential?

High-concurrency, short SQL queries favor serverless SQL and its workload management. A sequential batch application with Python logic belongs on job compute. A single very large SQL transformation can still favor a SQL warehouse, but benchmark it against serverless jobs if both interfaces satisfy the design.

## Compare complete cost

Use different cost models:

```text
Serverless SQL
  = serverless SQL billable usage
  + attributable network and external service cost

Pro SQL
  = Databricks SQL usage
  + customer-cloud VM, disk, and network cost

Serverless jobs
  = serverless jobs billable usage
  + attributable network and external service cost

Classic job compute
  = Databricks jobs usage
  + customer-cloud driver, worker, disk, and network cost
```

Warehouse cost depends on running time, size, cluster count, and query demand. Configure auto-stop, but include restart latency in the service-level test. Job cost depends on setup, task execution, cleanup, retries, and worker scaling.

`system.billing.usage` attributes SQL usage with `usage_metadata.warehouse_id`. Job compute and serverless jobs can populate `job_id` and `job_run_id`. Query history provides statement timing and source detail, but allocating every shared warehouse dollar to individual concurrent statements requires a documented allocation method.

Private discounts, committed-use terms, cloud rates, and serverless pricing differ by cloud, region, contract, and date. Use effective billing records rather than a static comparison table from another account.

## Concurrency and startup experiments

For a SQL workload, replay a representative mix rather than one query:

1. Measure cold connection to first result after auto-stop.
2. Run expected concurrent dashboard refreshes and ad hoc queries.
3. Record `waiting_for_compute_duration_ms` and `waiting_at_capacity_duration_ms` from query history.
4. Record compilation, execution, result fetch, spills, scan bytes, and cache use.
5. Compare P50 and P95 user latency, failed queries, and total cost.

For a job workload:

1. Measure setup, execution, cleanup, and end-to-end duration.
2. Include Python or JAR dependency installation.
3. Test all required APIs, data sources, and network paths.
4. Include retries and failed attempts in cost per success.
5. Compare serverless standard and performance-optimized modes where available.

Keep data, code, cache conditions, region, identity, and concurrency consistent. A warm one-user test cannot predict a Monday morning dashboard burst.

## Common selection mistakes

- Selecting job compute for a BI connection because the transformation also uses Spark
- Selecting a Pro warehouse without proving a serverless network gap
- Assuming serverless supports a library or Spark API without checking current limitations
- Comparing a serverless DBU line with only the Databricks portion of Pro or classic cost
- Leaving a Pro warehouse running to hide cold starts
- Increasing warehouse size when the real problem is concurrent queueing
- Increasing cluster count when one query is spilling because it needs more resources or optimization
- Running production jobs on all-purpose compute and expecting precise run-level cost attribution

## Official Documentation

- [SQL warehouse types](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-types)
- [SQL warehouse sizing, scaling, and queuing](https://docs.databricks.com/aws/en/compute/sql-warehouse/warehouse-behavior)
- [Connect to a SQL warehouse](https://docs.databricks.com/aws/en/compute/sql-warehouse)
- [Configure compute for jobs](https://docs.databricks.com/aws/en/jobs/compute)
- [Serverless compute limitations](https://docs.databricks.com/aws/en/compute/serverless/limitations)
- [Run Lakeflow Jobs with serverless compute](https://docs.databricks.com/aws/en/jobs/run-serverless-jobs)
- [Billable usage system table reference](https://docs.databricks.com/aws/en/admin/system-tables/billing)

## Conclusion

Choose the compute surface from the workload contract. Serverless SQL is the default for most BI and SQL concurrency, Pro is a compatibility choice for unsupported serverless regions or network paths, and job compute runs application-oriented Lakeflow tasks. Validate serverless support first, then compare end-to-end latency, concurrency, failure rate, and full cost under a representative workload.
