# Validation Summary: How to Assess Your Applications with AWS Migration Hub Strategy Recommendations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Migration Hub Strategy Recommendations
- AWS Migration Hub
- AWS Application Discovery Service
- AWS Application Migration Service
- AWS App2Container
- AWS Schema Conversion Tool
- AWS Database Migration Service
- Boto3 for Python
- Amazon S3
- Amazon CloudWatch

## Sources Consulted
- AWS Migration Hub Strategy Recommendations user guide: https://docs.aws.amazon.com/migrationhub-strategy/latest/userguide/what-is-mhub-strategy.html
- AWS Migration Hub Strategy Recommendations binary analysis documentation: https://docs.aws.amazon.com/migrationhub-strategy/latest/userguide/binary-analysis.html
- AWS Migration Hub Strategy Recommendations source code analysis documentation: https://docs.aws.amazon.com/migrationhub-strategy/latest/userguide/source-code-analysis.html
- Boto3 `start_assessment` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/start_assessment.html
- Boto3 `get_assessment` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_assessment.html
- Boto3 `list_servers` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/list_servers.html
- Boto3 `get_server_details` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_server_details.html
- Boto3 `get_server_strategies` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_server_strategies.html
- Boto3 `list_application_components` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/list_application_components.html
- Boto3 `get_application_component_details` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_application_component_details.html
- Boto3 `get_portfolio_summary` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_portfolio_summary.html
- Boto3 `start_recommendation_report_generation` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/start_recommendation_report_generation.html
- Boto3 `get_recommendation_report_details` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_recommendation_report_details.html
- Boto3 AWS Migration Hub `notify_migration_task_state` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/mgh/client/notify_migration_task_state.html

## Issues Found
- Added the current AWS availability caveat. AWS documentation states Migration Hub is no longer open to new customers as of November 7, 2025, so the post now frames Strategy Recommendations as applicable to existing Migration Hub customers and points new customers toward AWS Transform.
- Corrected the `start_assessment` example. The original used `s3bucketForAnalysisData` as a nested S3 bucket/key object, but the boto3 API expects string bucket names for `s3bucketForAnalysisData` and `s3bucketForReportData`, and those names must begin with `migrationhub-strategy-`.
- Corrected the `get_assessment` example. The boto3 API parameter is `id`, not `assessmentId`, and `dataCollectionDetails` does not include `completionPercentage`; the example now reports the documented success, failed, and in-progress counts.
- Corrected server ID handling. `list_servers` returns each server ID in `id`, not `serverId`.
- Added `get_server_strategies` where detailed strategy options are needed. `applicationComponentStrategySummary` is only a count summary, while `get_server_strategies` returns recommended strategies and tools for a server.
- Corrected application component ID handling. `list_application_components` returns component IDs in `id`, not `appId`.
- Corrected anti-pattern reporting code. `get_application_component_details` does not return an `antiPatternReport` object with severity entries; the example now uses `listAntipatternSeveritySummary` and `resultList[].antipatternReportResultList`.
- Corrected the portfolio report section. The original code did not export a report and used non-existent summary fields (`totalServerCount` and `serverStrategySummary`); the example now uses `start_recommendation_report_generation`, `get_recommendation_report_details`, `listServerSummary`, and `listServerStrategySummary`.
- Corrected the prioritization example to use `server['id']`, detect `Retirement` recommendations, and match documented target destination strings such as EC2, ECS, EKS, Fargate, Amazon RDS, and Aurora.
- Corrected the Migration Hub progress update example by importing `datetime` and using a timezone-aware UTC timestamp for `UpdateDateTime`.

## Review Notes
The Python snippets were checked with `ast.parse` and all seven parse successfully. The examples still require valid AWS credentials, correct Region and Migration Hub home Region configuration, existing S3 buckets, IAM permissions, and a usable Strategy Recommendations setup before they can run successfully.
