# Validation Summary: How to Plan an AWS Migration with the AWS Migration Hub

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Migration Hub
- AWS Application Discovery Service
- AWS Application Discovery Service Agentless Collector
- AWS Application Migration Service
- AWS Database Migration Service
- AWS Migration Hub Strategy Recommendations
- AWS Transform
- Boto3
- Python
- Mermaid

## Sources Consulted
- AWS Migration Hub availability change: https://docs.aws.amazon.com/migrationhub/latest/ug/migrationhub-availability-change.html
- AWS Migration Hub API reference: https://docs.aws.amazon.com/migrationhub/latest/ug/api-reference.html
- AWS Migration Hub overview: https://docs.aws.amazon.com/migrationhub/latest/ug/whatishub.html
- AWS Migration Hub tracking updates guide: https://docs.aws.amazon.com/migrationhub/latest/ug/updates-tracking-wt.html
- AWS Server Migration Service discontinuation notice: https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-sms.html
- Boto3 Migration Hub client reference: https://docs.aws.amazon.com/boto3/latest/reference/services/mgh.html
- Boto3 `create_home_region_control` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhub-config/client/create_home_region_control.html
- Boto3 `create_progress_update_stream` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/mgh/client/create_progress_update_stream.html
- Boto3 `import_migration_task` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/mgh/client/import_migration_task.html
- Boto3 `notify_migration_task_state` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/mgh/client/notify_migration_task_state.html
- Boto3 `list_migration_tasks` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/mgh/client/list_migration_tasks.html
- AWS Application Discovery Service Agentless Collector user guide: https://docs.aws.amazon.com/application-discovery/latest/userguide/agentless-collector.html
- AWS Discovery Connector deprecation notice: https://aws.amazon.com/blogs/migration-and-modernization/deprecation-of-aws-application-discovery-service-discovery-connector/
- AWS Application Discovery Service agent installation guide: https://docs.aws.amazon.com/application-discovery/latest/userguide/install.html
- AWS Application Discovery Service application grouping guide: https://docs.aws.amazon.com/application-discovery/latest/userguide/applications.html
- Boto3 `create_application` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/discovery/client/create_application.html
- AWS Application Discovery Service `AssociateConfigurationItemsToApplication` API reference: https://docs.aws.amazon.com/application-discovery/latest/APIReference/API_AssociateConfigurationItemsToApplication.html
- Boto3 Migration Hub Strategy Recommendations `start_assessment` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/start_assessment.html
- Boto3 Migration Hub Strategy Recommendations `get_server_strategies` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_server_strategies.html
- Boto3 Migration Hub Strategy Recommendations `get_server_details` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/migrationhubstrategy/client/get_server_details.html

## Issues Found
- Added the current AWS Migration Hub availability caveat. AWS Migration Hub stopped accepting new customers on November 7, 2025, so the guide now makes clear that it applies to existing customers and points new migration programs toward AWS Transform.
- Replaced AWS Server Migration Service as a listed integration. AWS SMS was discontinued and current AWS Migration Hub documentation lists AWS Application Migration Service and AWS DMS as the supported AWS migration status update tools; the post now lists Strategy Recommendations instead.
- Replaced the Discovery Connector agentless discovery guidance. Discovery Connector reached end of support on November 17, 2025, so the post now refers to AWS Application Discovery Service Agentless Collector and removes the outdated connector-based code example.
- Corrected the application grouping code. The original snippet used Migration Hub progress stream and migration task APIs, which do not create application groups. The updated snippet uses Application Discovery Service `create_application` and `associate_configuration_items_to_application`.
- Corrected the Strategy Recommendations example. The original loop expected a `recommendation` field inside `applicationComponentStrategySummary`, but that summary only contains counts and strategy names. The updated example uses `get_server_strategies`, which returns recommendation details.
- Corrected the Migration Hub status update example. `NotifyMigrationTaskState` requires an existing migration task, and the snippet also used `datetime.now()` without importing `datetime`. The updated example imports `datetime`, creates a progress stream, imports the migration task, and sends a timezone-aware update timestamp.

## Review Notes
- The Boto3 snippets are illustrative and still assume AWS credentials, IAM permissions, and the default SDK region are configured for the Migration Hub home Region.
- AWS Application Discovery Service and Migration Hub are closed to new customers, but existing customers can continue using them for ongoing migration projects.
