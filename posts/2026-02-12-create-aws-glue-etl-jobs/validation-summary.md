# Validation Summary: How to Create AWS Glue ETL Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Glue
- AWS Glue ETL jobs
- AWS Glue Data Catalog
- AWS Glue DynamicFrames
- Apache Spark / PySpark
- AWS SDK for Python (boto3)
- Amazon S3
- JDBC targets

## Sources Consulted
- AWS Glue Jobs API documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-job.html
- AWS Glue CreateJob API reference: https://docs.aws.amazon.com/glue/latest/webapi/API_CreateJob.html
- AWS Glue CSV format options documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format-csv-home.html
- AWS Glue DynamicFrameReader documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-dynamic-frame-reader.html
- AWS Glue DynamicFrameWriter documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-dynamic-frame-writer.html
- AWS Glue Data Catalog update documentation: https://docs.aws.amazon.com/glue/latest/dg/update-from-job.html
- AWS Glue ResolveChoice documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-transforms-ResolveChoice.html
- AWS Glue for Ray documentation: https://docs.aws.amazon.com/glue/latest/dg/ray-jobs-section.html
- AWS Glue pricing: https://aws.amazon.com/glue/pricing/
- Apache Spark PySpark lpad documentation: https://downloads.apache.org/spark/docs/3.4.3/api/python/reference/pyspark.sql/api/pyspark.sql.functions.lpad.html

## Issues Found
- The worker type table listed outdated disk sizes for `G.1X` and `G.2X`. Updated them from 64 GB and 128 GB to the current documented 94 GB and 138 GB.
- The worker type table described `G.025X` as suitable for small Python Shell jobs and listed 64 GB disk. AWS documents `G.025X` as a 0.25 DPU Spark streaming worker with 84 GB disk, recommended for low-volume streaming jobs, so the row was corrected.
- The job type table presented Ray jobs without the current availability caveat. AWS Glue for Ray is no longer open to new customers, so the Ray use case now notes that it applies to existing customers only.
- The PySpark example called `.lpad()` as a method on a `Column`, which is not valid PySpark API usage. Imported `pyspark.sql.functions.lpad` and changed the month/day expressions to call `lpad(column, 2, "0")`.
- The Data Catalog read example passed `additional_options={"enableUpdateCatalog": True}` to `create_dynamic_frame.from_catalog`. AWS documents `enableUpdateCatalog` for catalog-updating write sinks, not as a read option for `from_catalog`, so that option was removed.

## Review Notes
The remaining examples use valid AWS Glue and boto3 APIs for the stated AWS Glue 4.0 Spark job context. The post intentionally uses Glue 4.0 even though newer Glue versions exist; this is still valid, but a future update could mention Glue 5.x defaults and newly documented worker families if the article is expanded.
