# Validation Summary: How to Set Up Row-Level Security in BigQuery Using Row Access Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery row-level security
- BigQuery row access policies
- GoogleSQL DDL and DML
- BigQuery INFORMATION_SCHEMA
- BigQuery IAM
- BigQuery column-level security policy tags

## Sources Consulted
- Google Cloud BigQuery row-level security introduction: https://cloud.google.com/bigquery/docs/row-level-security-intro
- Google Cloud BigQuery row-level security management guide: https://cloud.google.com/bigquery/docs/managing-row-level-security
- GoogleSQL DDL reference for row access policies: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- Google Cloud BigQuery IAM roles and permissions: https://cloud.google.com/bigquery/docs/access-control
- Google Cloud BigQuery row-level security best practices: https://cloud.google.com/bigquery/docs/best-practices-row-level-security
- Google Cloud BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery REST Job resource row-level security statistics: https://cloud.google.com/bigquery/docs/reference/rest/v2/Job

## Issues Found
- The post said users who do not match any row access policy see zero rows. Updated this to explain that users need regular table access and must be included in a row access policy grantee list to query filtered data.
- The post said there is no indication that data was filtered. Updated this because the BigQuery console displays a notice that results might be filtered by a row access policy.
- A code comment described `GRANT TO` as granting access to a filter function. Updated it to say it grants filtered data access to the group.
- The post used a non-existent `INFORMATION_SCHEMA.ROW_ACCESS_POLICIES` query to list row access policies. Replaced it with the documented `bq ls --row_access_policies` command.
- The post did not mention that `DROP ROW ACCESS POLICY` cannot delete the last policy on a table. Added the documented requirement to use `DROP ALL ROW ACCESS POLICIES` in that case.
- The post said row access policies apply to all query types including INSERT and that users cannot modify rows they cannot see. Reworded this to cover protected data reads in SELECT and read portions of DML, and added the documented caution that users with write permissions can still insert data.
- The post said table owners and users with `bigquery.admin` can always see all rows. Replaced this with the documented behavior that admins/data owners can manage policies but should be added to a `TRUE` filter policy when they need full-table read access.
- The auditing section claimed the INFORMATION_SCHEMA query identified jobs affected by row access policies. Reworded it to say it lists recent jobs referencing the protected table and noted that exact confirmation requires job details or audit logs.

## Review Notes
The remaining SQL examples follow the documented `CREATE ROW ACCESS POLICY`, `DROP ROW ACCESS POLICY`, `DROP ALL ROW ACCESS POLICIES`, `SESSION_USER()`, and subquery row access policy patterns. The post intentionally uses placeholder project, dataset, group, and service account names.
