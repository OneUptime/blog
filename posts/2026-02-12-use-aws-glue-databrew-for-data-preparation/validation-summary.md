# Validation Summary: How to Use AWS Glue DataBrew for Data Preparation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Glue DataBrew
- AWS Glue ETL
- AWS Glue Studio
- Boto3 GlueDataBrew client
- Amazon S3
- AWS Glue Data Catalog
- Data profiling, recipes, recipe jobs, and schedules

## Sources Consulted
- Boto3 GlueDataBrew `create_dataset` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/databrew/client/create_dataset.html
- Boto3 GlueDataBrew `create_profile_job` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/databrew/client/create_profile_job.html
- Boto3 GlueDataBrew `create_project` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/databrew/client/create_project.html
- Boto3 GlueDataBrew `create_recipe` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/databrew/client/create_recipe.html
- Boto3 GlueDataBrew `update_recipe` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/databrew/client/update_recipe.html
- Boto3 GlueDataBrew `create_recipe_job` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/databrew/client/create_recipe_job.html
- Boto3 GlueDataBrew `create_schedule` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/databrew/client/create_schedule.html
- AWS Glue DataBrew recipe action reference: https://docs.aws.amazon.com/databrew/latest/dg/recipe-actions-reference.html
- AWS Glue DataBrew recipe action pages for RENAME, MOVE_TO_INDEX, REMOVE_MISSING, REPLACE_TEXT, CHANGE_DATA_TYPE, BOOLEAN_OPERATION, SPLIT_COLUMN_SINGLE_DELIMITER, FORMAT_DATE, YEAR, GROUP_BY, FILL_WITH_CUSTOM, and REMOVE_OUTLIERS
- AWS Glue pricing page for DataBrew sessions and jobs: https://aws.amazon.com/glue/pricing/

## Issues Found
- The introduction said Glue ETL requires PySpark. Updated this to say Glue ETL typically involves Spark or Python code, because AWS Glue supports more than PySpark-only ETL modes.
- The project example did not mention that `create_project` requires an existing `RecipeName`. Added that caveat and adjusted the code comment.
- The recipe example used `create_recipe` after referencing the same recipe in the project example. Changed it to `update_recipe` for the working recipe version.
- Several recipe actions used invalid operation names or parameter names. Updated them to documented DataBrew actions and parameters: `REMOVE_MISSING`, `REPLACE_TEXT`, `CHANGE_DATA_TYPE` with `columnDataType`, `BOOLEAN_OPERATION`, `MOVE_TO_INDEX`, `REMOVE_COMBINED`, `SPLIT_COLUMN_SINGLE_DELIMITER`, `YEAR`, `GROUP_BY`, `FILL_WITH_CUSTOM`, and `REMOVE_OUTLIERS`.
- The `GROUP_BY` example used a plain object for aggregations, but DataBrew expects JSON-encoded string parameters such as `sourceColumns` and `groupByAggFunctionOptions`. Rewrote the snippet accordingly.
- The pricing section listed profile jobs as `$0.16 per node per hour`. Updated it to the current AWS pricing model: DataBrew jobs, including profile and recipe jobs, are billed at `$0.48 per node-hour` and billed per minute.

## Review Notes
The Boto3 operation shapes for datasets, profile jobs, projects, recipe jobs, and schedules match the corrected examples. The article still uses placeholder bucket names, account IDs, and IAM role names, which is appropriate for a tutorial but means the snippets require user-specific AWS resources and permissions before execution.
