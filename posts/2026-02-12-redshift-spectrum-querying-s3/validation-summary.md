# Validation Summary: How to Configure Redshift Spectrum for Querying S3 Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Redshift
- Amazon Redshift Spectrum
- Amazon Redshift Serverless
- Amazon S3
- AWS Glue Data Catalog
- AWS IAM
- Amazon Athena
- SQL
- Apache Parquet
- Apache ORC
- PySpark

## Sources Consulted
- Amazon Redshift: CREATE EXTERNAL SCHEMA - https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_EXTERNAL_SCHEMA.html
- Amazon Redshift: External schemas in Amazon Redshift Spectrum - https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-external-schemas.html
- Amazon Redshift: External tables for Redshift Spectrum - https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-external-tables.html
- Amazon Redshift: Data files for queries in Amazon Redshift Spectrum - https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-data-files.html
- Amazon Redshift: IAM policies for Amazon Redshift Spectrum - https://docs.aws.amazon.com/redshift/latest/dg/c-spectrum-iam-policies.html
- Amazon Redshift: CREATE VIEW - https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_VIEW.html
- Amazon Redshift Management Guide: Authorizing Amazon Redshift to access AWS services on your behalf - https://docs.aws.amazon.com/redshift/latest/mgmt/authorizing-redshift-service.html
- Amazon Redshift Management Guide: Granting permissions to Amazon Redshift Serverless - https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-security-other-services.html
- AWS CLI: modify-cluster-iam-roles - https://docs.aws.amazon.com/cli/latest/reference/redshift/modify-cluster-iam-roles.html
- Amazon Athena: MSCK REPAIR TABLE - https://docs.aws.amazon.com/athena/latest/ug/msck-repair-table.html
- AWS Pricing: Amazon Redshift Pricing - https://aws.amazon.com/redshift/pricing/

## Issues Found
- The post said Spectrum queries do not compete with regular Redshift workload for compute resources. I softened this to say much of the S3 scanning happens outside the cluster, while Redshift still handles planning, joins, and final processing.
- The partition repair example showed `MSCK REPAIR TABLE data_lake.clickstream` as if it were a Redshift command. I changed the text to say this should be run in Athena against the Glue/Athena database, and adjusted the table name accordingly.
- The post said external tables work just like regular Redshift tables. I narrowed this to say they can be queried much like regular tables, since external tables have different DDL, metadata, and mutation behavior.
- The view example referenced external tables but omitted `WITH NO SCHEMA BINDING`, which Redshift requires for late-binding views over Spectrum external tables. I added the clause.
- The file-size guidance gave a narrow 128 MB to 512 MB target. AWS documentation recommends 64 MB to 1 GB and roughly equal file sizes, so I updated the guidance.
- The PySpark snippet was marked as a Bash code block and claimed `repartition(50)` creates approximately 256 MB files. I changed the block language to Python and clarified that the partition count should be adjusted to the desired file size.
- The cost section stated Spectrum always charges $5 per TB scanned. I updated it to clarify that the $5/TB example applies to provisioned Redshift clusters in US East (N. Virginia), while Redshift Serverless external S3 queries are included in RPU-hour billing.

## Review Notes
The IAM example uses broad AWS managed policies for simplicity, which matches AWS tutorial-style guidance but is not least privilege. A future hardening pass could replace these with scoped S3 and Glue permissions for the specific bucket, database, tables, and partitions.
