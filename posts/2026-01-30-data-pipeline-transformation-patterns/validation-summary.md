# Validation Summary: How to Implement Data Transformation Patterns

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- dbt models, snapshots, incremental models, and data tests
- dbt-utils generic tests and surrogate key generation
- Apache Spark / PySpark DataFrame transformations
- Great Expectations / GX Core
- Apache Airflow DAG orchestration
- Medallion architecture and dimensional modeling patterns

## Sources Consulted
- dbt snapshot configuration documentation: https://docs.getdbt.com/reference/snapshot-configs
- dbt `hard_deletes` snapshot configuration documentation: https://docs.getdbt.com/reference/resource-configs/hard-deletes
- dbt data tests property documentation: https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt-utils generic test documentation: https://github.com/dbt-labs/dbt-utils
- Apache Spark PySpark `DataFrame.union` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.union.html
- Apache Spark PySpark `DataFrame.unionByName` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.unionByName.html
- Apache Spark PySpark `GroupedData.pivot` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.pivot.html
- Great Expectations GX Core expectation suite documentation: https://docs.greatexpectations.io/docs/core/define_expectations/organize_expectation_suites
- Great Expectations GX Core expectation creation documentation: https://docs.greatexpectations.io/docs/core/define_expectations/create_an_expectation
- Apache Airflow release notes for `schedule` replacing `schedule_interval`: https://airflow.apache.org/docs/apache-airflow/2.9.3/release_notes.html
- Apache Airflow dbt Cloud provider operator documentation: https://airflow.apache.org/docs/apache-airflow-providers-dbt-cloud/stable/_api/airflow/providers/dbt/cloud/operators/dbt/index.html
- Apache Airflow SparkSubmitOperator documentation: https://airflow.apache.org/docs/apache-airflow-providers-apache-spark/stable/_api/airflow/providers/apache/spark/operators/spark_submit/index.html

## Issues Found
- The `fct_orders` model clustered by `product_key` and downstream examples referenced `f.product_key`, but the fact model is aggregated at order grain and did not produce `product_key`. Removed `product_key` clustering, kept the fact at order grain, and joined products through `stg_order_items` in the denormalized model and orphan-product test.
- The `fct_orders` window calculation partitioned by `o.customer_id` without selecting/grouping that column. Added `customer_id` to the fact model output and `GROUP BY`.
- The SCD Type 2 dbt model rendered invalid SQL on the initial load because the `WITH source AS (...)` CTE always had a trailing comma. Moved the comma inside the incremental branch.
- The snapshot examples used legacy `invalidate_hard_deletes`. Updated them to current `hard_deletes: invalidate` / `hard_deletes='invalidate'`.
- The PySpark cleaning example parsed event timestamps with `to_date`, which drops time-of-day before rolling-window calculations. Changed it to `to_timestamp`.
- The PySpark SCD function included new records in the unchanged branch and used positional `union`, which can misalign schemas. Filtered unchanged records to existing unchanged rows and switched to `unionByName`.
- The dbt schema YAML used older test argument style and an invalid aggregate expression in `dbt_utils.expression_is_true`. Updated tests to `data_tests` with `arguments`, changed the future-date check to a row-level expression, and used `dbt_utils.at_least_one` for non-empty coverage.
- The Great Expectations example used older `ExpectationConfiguration` / `context.add_expectation_suite` APIs. Updated it to GX Core's class-based `gx.ExpectationSuite` and `gx.expectations.*` API.
- The Great Expectations high-value order check used unique-value proportion, which does not measure the percentage of high-value orders. Replaced it with a boolean-domain check for the flag.
- The Airflow DAG used deprecated `schedule_interval`. Updated it to `schedule`.
- The Airflow Great Expectations task referenced a nonexistent `run_validation()` function in the shown module. Changed it to call the function defined in the snippet.

## Review Notes
The dbt SQL examples use BigQuery-style SQL functions and adapter configs, such as `partition_by`, `cluster_by`, `DATE_DIFF(..., DAY)`, and `REGEXP_CONTAINS`-style expressions. That is technically valid for a BigQuery-oriented dbt project, but the post does not explicitly state the warehouse target.
