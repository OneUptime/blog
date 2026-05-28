# Validation Summary: How to Create SQL UDFs in BigQuery and Share Them Across Datasets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- GoogleSQL
- SQL user-defined functions
- JavaScript user-defined functions
- BigQuery IAM and dataset access control
- BigQuery INFORMATION_SCHEMA

## Sources Consulted
- Google Cloud BigQuery user-defined functions documentation: https://cloud.google.com/bigquery/docs/user-defined-functions
- Google Cloud BigQuery routines documentation: https://cloud.google.com/bigquery/docs/routines
- GoogleSQL data definition language documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- Google Cloud BigQuery IAM access control documentation: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Google Cloud BigQuery running queries documentation: https://cloud.google.com/bigquery/docs/running-queries
- GoogleSQL mathematical functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/mathematical_functions
- GoogleSQL operators documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/operators

## Issues Found
- The post stated that SQL UDFs have no performance overhead compared to inline SQL and that performance is identical to inline SQL. Google documents SQL UDFs as native SQL expressions and JavaScript UDFs as a separate language option, but does not guarantee identical performance in all queries. I changed the wording to the accurate claim that SQL UDFs avoid JavaScript sandbox overhead and should still be performance-tested for important production queries.
- The `fiscal_quarter` UDF used `/` for quarter calculation. In GoogleSQL, integer division with `/` returns `FLOAT64` for `INT64 / INT64`, so May would produce a fractional quarter. I changed the quarter calculation to use `DIV(...) + 1`.
- The dataset access section used `bq add-iam-policy-binding`, which is not the documented `bq` workflow for dataset access. Google documents SQL `GRANT` for granting dataset roles, or `bq show`/edit JSON/`bq update --source` for the `bq` tool. I replaced the command block with documented `GRANT` statements for the BigQuery Data Viewer role on the shared schema.
- The access explanation only mentioned permissions on the UDF dataset. BigQuery also requires `bigquery.jobs.create`, commonly via the BigQuery Job User role, in the project where the query job runs. I added a sentence noting that requirement.
- The test examples called `my_project.shared_udfs.net_revenue`, but the post created `net_revenue` in `my_project.my_dataset`. I changed the test calls to use `my_project.my_dataset.net_revenue`.

## Review Notes
The URL parameter extraction UDF is intentionally simple and does not decode percent-encoded values or handle every edge case in URL parsing. It is acceptable as a lightweight example, but production URL parsing logic should be tested against the team's actual URL formats.
