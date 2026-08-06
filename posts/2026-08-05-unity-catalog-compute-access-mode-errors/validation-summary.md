# Validation Summary: Decode Unity Catalog Compute Access Mode Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Databricks Unity Catalog
- Databricks standard, dedicated, and serverless compute
- Apache Spark DataFrame, Dataset, RDD, and Spark Connect APIs
- Python, PySpark, Scala, SQL, UDFs, UDAFs, and UDTFs
- Databricks Runtime compatibility
- Databricks libraries, Unity Catalog volumes, and library allowlists
- DBFS, external locations, storage credentials, and service credentials
- Row filters, column masks, dynamic views, and fine-grained access control
- Databricks Clusters API

## Sources Consulted

- [Standard compute overview](https://docs.databricks.com/aws/en/compute/standard-overview)
- [Standard compute requirements and limitations](https://docs.databricks.com/aws/en/compute/standard-limitations)
- [Dedicated compute overview](https://docs.databricks.com/aws/en/compute/dedicated-overview)
- [Dedicated compute requirements and limitations](https://docs.databricks.com/aws/en/compute/dedicated-limitations)
- [Serverless compute limitations](https://docs.databricks.com/aws/en/compute/serverless/limitations)
- [Migrate from classic compute to serverless compute](https://docs.databricks.com/aws/en/compute/serverless/migration)
- [Install libraries](https://docs.databricks.com/aws/en/libraries/)
- [Configure the serverless environment](https://docs.databricks.com/aws/en/compute/serverless/dependencies)
- [Allowlist libraries and init scripts on standard compute](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/allowlist)
- [Unity Catalog privileges reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/privileges-reference)
- [Unity Catalog requirements and limitations](https://docs.databricks.com/aws/en/data-governance/unity-catalog/requirements)
- [What are user-defined functions (UDFs)?](https://docs.databricks.com/aws/en/udf/)
- [SQL and Python UDFs in Unity Catalog](https://docs.databricks.com/aws/en/udf/unity-catalog)
- [Python scalar UDFs](https://docs.databricks.com/aws/en/udf/python)
- [Session-scoped Scala and Java UDFs](https://docs.databricks.com/aws/en/udf/scala)
- [Work with files in Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/volume-files)
- [Clusters API: List clusters](https://docs.databricks.com/api/workspace/clusters/list)
- [Databricks SQL `current_schema` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/current_schema)

## Issues Found

- The serverless overview referred to “continuous processing-time streaming triggers,” which conflated `Trigger.Continuous` and `Trigger.ProcessingTime`. Changed it to “continuous and processing-time streaming triggers,” matching the two separately unsupported trigger types in the serverless documentation.
- The standard-compute UDF list grouped Scala scalar UDFs and Scala UDAFs together at Databricks Runtime 14.3 LTS. Updated it to document Scala scalar UDF support from Runtime 14.2 and removed the standard-compute Scala UDAF claim, following the feature-specific Scala UDF and current UDF support documentation.
- “Serverless UDFs” was too broad because serverless SQL warehouses have a separate networking model. Scoped the no-internet statement to UDFs in serverless notebooks and jobs, which is the product covered by the cited serverless-compute limitations.
- The volume-backed JAR permission checklist mentioned only `READ VOLUME`. Added the required `USE CATALOG` and `USE SCHEMA` privileges on the parent objects.
- The library table described serverless notebook JAR support as merely limited. Changed it to the documented behavior: JAR libraries are unsupported in serverless notebooks, while JAR tasks in serverless jobs are supported.
- The dedicated-compute DBFS library entry said only “older runtimes.” Replaced it with the documented cutoff of Databricks Runtime 14.3 LTS and below and clarified that DBFS is not a supported serverless library source.

## Review Notes

- Both Python snippets and the Scala DataFrame snippet are syntactically correct for their intended Databricks notebook contexts. The Python examples intentionally assume the notebook-provided `spark` session and a caller-supplied `input_path`.
- The capability-record SQL uses documented built-in functions, and `data_security_mode` is the correct Clusters API field. The post appropriately labels `spark.databricks.clusterUsageTags.dataSecurityMode` as an internal diagnostic rather than a stable application contract.
- Current Databricks documentation is internally inconsistent about Scala UDF version matrices: the general standard-compute limitations page still groups Scala scalar UDFs and Scala UDAFs at 14.3 LTS, while the feature-specific Scala UDF page documents scalar UDFs from 14.2 and the current UDF overview lists Scala UDAFs for dedicated compute. The corrected post follows the more specific UDF documentation.
- All external documentation links in the post resolve to the intended official Databricks pages as of the validation date.
