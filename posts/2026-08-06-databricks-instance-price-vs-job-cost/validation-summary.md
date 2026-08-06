# Validation Summary: Why a Cheaper Databricks Instance Can Cost More per Job

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Databricks classic jobs compute
- Lakeflow Jobs
- Databricks Runtime and Photon
- Databricks system tables for billing and compute
- Apache Spark execution, shuffle, spill, caching, and task retries
- Cloud virtual machines, attached storage, networking, Spot capacity, and instance pools

## Sources Consulted

- [Classic compute configuration best practices](https://docs.databricks.com/aws/en/compute/cluster-config-best-practices)
- [Compute configuration reference](https://docs.databricks.com/aws/en/compute/configure)
- [View compute metrics](https://docs.databricks.com/aws/en/compute/cluster-metrics)
- [Compute system tables reference](https://docs.databricks.com/aws/en/admin/system-tables/compute)
- [Diagnose cost and performance issues using the Spark UI](https://docs.databricks.com/aws/en/optimizations/spark-ui-guide)
- [What is Photon?](https://docs.databricks.com/aws/en/compute/photon)
- [Best practices for cost optimization](https://docs.databricks.com/aws/en/lakehouse-architecture/cost-optimization/best-practices)
- [Pool configuration reference](https://docs.databricks.com/aws/en/compute/pools)
- [Pool best practices](https://docs.databricks.com/aws/en/compute/pool-best-practices)
- [Configure compute for jobs](https://docs.databricks.com/aws/en/jobs/compute)
- [Jobs API create reference](https://docs.databricks.com/api/workspace/jobs/create)
- [Billable usage system table reference](https://docs.databricks.com/aws/en/admin/system-tables/billing)
- [Pricing system table reference](https://docs.databricks.com/aws/en/admin/system-tables/pricing)
- [Monitor job costs and performance with system tables](https://docs.databricks.com/aws/en/admin/system-tables/jobs-cost)
- [Apache Spark tuning guide](https://spark.apache.org/docs/latest/tuning.html)
- [Apache Spark configuration reference](https://spark.apache.org/docs/latest/configuration.html)

## Issues Found

- The introduction described workload SKU, instance type, and Photon as all changing Databricks "usage rates." This conflated the price of a DBU with the rate at which a configuration consumes DBUs. It now says that the workload SKU and DBU consumption determine the usage charge, and that instance type and Photon selection affect DBU consumption.
- The initial cost equation added failed-attempt and retry cost after listing usage and infrastructure cost over time, which could double-count failed attempts if those totals already included them. It now defines cost per successful outcome as the total Databricks, cloud compute, storage, and network cost across all attempts divided by successful outcomes.
- The benchmark instructions named only `system.billing.usage`, but that table records usage quantities rather than published monetary prices. The instructions now say to join `system.billing.list_prices` for list-price cost or apply contract rates for effective cost, while obtaining cloud cost from the provider export.

## Review Notes

- The hypothetical worker-cost arithmetic and 1.8x break-even calculation are correct.
- The post correctly scopes its component cost model to classic jobs compute. Databricks documentation notes that serverless DBU charges already include the underlying virtual machine cost.
- Current official documentation supports the claims about autoscaling, separate driver sizing, local storage for spill and caching, fewer larger workers for complex ETL, Photon DBU differences, instance-pool startup behavior and idle provider charges, job retries, job-compute attribution, and the listed compute and Spark UI metrics.
- All six links in the post's Official Documentation section resolved to the intended official Databricks pages during validation.
