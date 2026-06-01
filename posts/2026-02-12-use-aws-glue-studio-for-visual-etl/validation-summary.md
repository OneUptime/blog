# Validation Summary: How to Use AWS Glue Studio for Visual ETL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Glue Studio
- AWS Glue ETL jobs
- Apache Spark / PySpark
- AWS Glue DynamicFrames
- Amazon S3
- AWS Glue Data Catalog
- Amazon CloudWatch metrics and alarms
- Boto3

## Sources Consulted
- AWS Glue: Job editor features: https://docs.aws.amazon.com/glue/latest/dg/job-editor-features.html
- AWS Glue: Editing or uploading a job script: https://docs.aws.amazon.com/glue/latest/dg/edit-nodes-script.html
- AWS Glue: Transform data with AWS Glue managed transforms: https://docs.aws.amazon.com/glue/latest/dg/edit-jobs-transforms.html
- AWS Glue: Creating a custom transformation: https://docs.aws.amazon.com/glue/latest/dg/transforms-custom.html
- AWS Glue: AWS Glue versions: https://docs.aws.amazon.com/glue/latest/dg/release-notes.html
- AWS Glue: AWS Glue version support policy: https://docs.aws.amazon.com/glue/latest/dg/glue-version-support-policy.html
- AWS Glue: Monitoring AWS Glue using Amazon CloudWatch metrics: https://docs.aws.amazon.com/glue/latest/dg/monitoring-awsglue-with-cloudwatch-metrics.html
- AWS Glue: AWS Glue job run statuses on the console: https://docs.aws.amazon.com/glue/latest/dg/view-job-runs.html
- AWS Glue: Calling AWS Glue APIs in Python: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-python-calling.html

## Issues Found
- The post described AWS Glue 4.0 as the latest Glue version. Updated it to AWS Glue 5.1, which the current AWS Glue documentation lists as the default/latest Glue version for new jobs.
- The post implied that direct script edits sync back to the visual canvas. Updated this to explain that saving direct script edits converts the job to script-only editing, matching AWS Glue Studio documentation.
- The data preview section said Glue Studio starts a development endpoint. Updated this to "preview session" because current Glue Studio data preview uses data preview/interactive sessions rather than legacy development endpoints.
- The transforms table listed "Split" as a condition-based transform. Replaced it with "Conditional Router", which matches current AWS Glue Studio managed transform names and behavior.
- The transforms table described Custom transform as SQL or PySpark. Updated it to Python or Scala code, because AWS Glue Studio has a separate SQL transform.
- The custom transform code used `DynamicFrameCollection` in a type annotation without importing it. Added the `DynamicFrame` and `DynamicFrameCollection` imports so the example is syntactically complete.
- The CloudWatch alarm example only specified the `JobName` dimension for `glue.driver.aggregate.numFailedTasks`. Added the documented `JobRunId=ALL` and `Type=count` dimensions used by this AWS Glue metric.
- Clarified that a Change Schema visual node is commonly represented by `ApplyMapping` in generated Glue scripts, instead of implying ApplyMapping is a separate visual UI for the same operation.

## Review Notes
The remaining examples are simplified and use placeholder S3 paths, table names, and SNS ARNs, which is appropriate for a tutorial. The post now reflects current AWS Glue Studio behavior as of 2026-06-01.
