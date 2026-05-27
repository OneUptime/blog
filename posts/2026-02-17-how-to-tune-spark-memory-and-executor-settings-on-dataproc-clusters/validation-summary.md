# Validation Summary: How to Tune Spark Memory and Executor Settings on Dataproc Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Dataproc
- Apache Spark
- Spark SQL and Adaptive Query Execution
- PySpark
- YARN
- Google Cloud CLI
- Compute Engine N2 machine types

## Sources Consulted
- Apache Spark configuration documentation: https://spark.apache.org/docs/3.5.7/configuration.html
- Apache Spark tuning guide: https://spark.apache.org/docs/3.5.7/tuning.html
- Apache Spark SQL performance tuning documentation: https://spark.apache.org/docs/latest/sql-performance-tuning.html
- Google Cloud Dataproc cluster properties documentation: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/cluster-properties
- Google Cloud CLI Dataproc PySpark job submission reference: https://cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/pyspark
- Google Cloud Dataproc Component Gateway documentation: https://cloud.google.com/dataproc/docs/concepts/accessing/dataproc-gateways
- Google Cloud Compute Engine N2 machine type documentation: https://docs.cloud.google.com/compute/docs/general-purpose-machines

## Issues Found
- The memory architecture explanation implied that execution and storage memory can evict each other symmetrically. Updated it to reflect Spark's unified memory behavior: storage can use free execution memory, but execution can evict storage only down to the protected storage region.
- The cluster creation example set `spark.dynamicAllocation.maxExecutors=16` for a four-worker `n2-standard-8` cluster using 3-core, 15 GB executor containers. That fixed cluster can fit eight such executors on workers, so the value was changed to `8`.
- The AQE guidance said partitions are adjusted automatically without mentioning that coalescing needs a sufficiently high initial shuffle partition count. Updated the text and example to set `spark.sql.shuffle.partitions=800`.
- The skew metrics PySpark snippet assigned the return value of `.show()` to `stats`, which would make `stats` equal to `None`. Split the `describe()` DataFrame creation from `show()`.
- The XL cheat-sheet row used `executor.memory=50g` with five executors per `n2-highmem-32` node. With Spark's default executor memory overhead, this can exceed the 256 GB node memory. Changed the row to `40g`.

## Review Notes
- `gcloud` is not installed in the local environment, so CLI syntax was verified against Google Cloud's official command and Dataproc property documentation instead of local `--help` output.
- The sample partition-size estimator is still approximate because DataFrame memory size is not always the same as shuffle output size. The post presents it as an estimate, which is acceptable for a practical tuning guide.
