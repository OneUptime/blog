# Validation Summary: How to Use Patient Data De-Identification on Azure Using FHIR Export

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- FHIR Bulk Data Export
- Azure Health Data Services FHIR service
- Azure Data Lake Storage Gen2
- Azure Databricks
- Apache Spark / PySpark
- Azure CLI / Azure RBAC
- HIPAA Safe Harbor de-identification

## Sources Consulted
- Microsoft Learn: Export your FHIR data by invoking the $export command on the FHIR service - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/export-data
- Microsoft Learn: Configure export settings in FHIR service - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/configure-export-data
- Microsoft Learn: Get started with the FHIR service in Azure Health Data Services - https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/get-started-with-fhir
- Microsoft Learn: Azure CLI az role assignment - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Databricks documentation: Mounting cloud object storage on Databricks - https://docs.databricks.com/aws/en/dbfs/mounts
- Databricks documentation: Databricks Runtime 13.3 LTS - https://docs.databricks.com/aws/en/release-notes/runtime/13.3lts
- Apache Spark PySpark API: pyspark.sql.functions.transform - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.transform.html
- Apache Spark PySpark API: DataFrameWriter - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.html
- HHS: Guidance Regarding Methods for De-identification of Protected Health Information - https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html
- HL7 FHIR Bulk Data Access Implementation Guide: Export - https://build.fhir.org/ig/HL7/bulk-data/export.html

## Issues Found
- The FHIR service URL examples used a generic Azure API for FHIR-style host. Updated them to the Azure Health Data Services FHIR service host pattern.
- The export status example hard-coded an `_operations/export/{job-id}` URL. Updated it to poll the `Content-Location` URL returned by the export kickoff response.
- The Databricks mount examples claimed service principal authentication but used storage account keys and `wasbs`. Updated the examples to use `abfss` and OAuth service-principal configuration for ADLS Gen2.
- The NDJSON load examples assumed one fixed file such as `Patient.ndjson`. Azure FHIR export can write multiple files per resource type inside an export job folder, so the paths now use wildcard patterns.
- The Patient address transformation called a Python UDF inside Spark `transform`. Spark supports Column expressions and Scala UDFs in `transform`, but not Python UDFs, so the ZIP generalization inside `transform` now uses native Spark expressions.
- The de-identification code used salted hashes of source identifiers while presenting the pipeline as Safe Harbor-oriented. HHS guidance requires re-identification codes to not be derived from information about the individual, so the examples now use non-derived study IDs and describe storing the re-identification map separately.
- The Azure CLI role assignment example omitted `--assignee-principal-type Group` while using `--assignee-object-id` for a group. Added the principal type to align with Azure RBAC CLI guidance.

## Review Notes
The post is technically relevant and contains implementation code. The Safe Harbor ZIP-prefix example still uses a hard-coded set of low-population three-digit ZIP prefixes; production systems should keep that policy table current with public Census data and legal/compliance review. The validation sample is useful as a technical guardrail but does not replace formal HIPAA de-identification review or Expert Determination where required.
