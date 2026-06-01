# Validation Summary: How to Optimize Spark Jobs for Performance in Azure Databricks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Spark
- PySpark
- Spark SQL
- Azure Databricks
- Delta Lake
- Photon

## Sources Consulted
- Apache Spark SQL Performance Tuning: https://spark.apache.org/docs/latest/sql-performance-tuning.html
- PySpark `hash` function API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.hash.html
- PySpark `pmod` function API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.pmod.html
- PySpark `DataFrame.cache` API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.cache.html
- PySpark `DataFrame.toPandas` API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.toPandas.html
- PySpark `DataFrame.repartition` API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html
- PySpark `DataFrame.coalesce` API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.coalesce.html
- Azure Databricks file size tuning, optimized writes, and auto compaction: https://learn.microsoft.com/en-us/azure/databricks/delta/tune-file-size
- Azure Databricks optimize data file layout and Z-ORDER guidance: https://learn.microsoft.com/en-us/azure/databricks/delta/optimize
- Azure Databricks Photon documentation: https://learn.microsoft.com/en-us/azure/databricks/compute/photon
- Azure Databricks compute configuration reference: https://learn.microsoft.com/en-us/azure/databricks/clusters/create-cluster

## Issues Found
- The manual salting example used `col("product_id").hash()`, which is not a valid PySpark `Column` API. Changed it to use `pyspark.sql.functions.hash` with `pmod` so the salt bucket is a valid non-negative value from 0 to 9.
- The caching example described `cache()` as caching in memory. PySpark `DataFrame.cache()` uses the default storage level `MEMORY_AND_DISK_DESER`, so the wording was changed to avoid implying memory-only persistence.
- The anti-pattern section described `toPandas()` as suitable for moderate datasets. PySpark documentation states it should only be used when the result is expected to be small because all data is loaded into driver memory, so the wording was tightened.
- The Photon section used a specific `14.3.x-photon-scala2.12` runtime string and a numeric performance claim that is not present in current official Azure Databricks documentation. Updated the section to describe current Photon enablement through the compute UI and `runtime_engine: PHOTON`.
- The built-in functions example used `col("name")` without importing `col` in that snippet. Added the missing import.

## Review Notes
The remaining guidance is broadly correct, but several recommendations are workload-dependent. Partition counts, worker counts, broadcast thresholds, caching, and Z-ORDER effectiveness should be verified with the Spark UI and table statistics for each workload. Azure Databricks now recommends liquid clustering for many new Delta table layouts, while `ZORDER BY` remains valid for tables without liquid clustering.
