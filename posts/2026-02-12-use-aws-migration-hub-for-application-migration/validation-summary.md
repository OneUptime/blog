# Validation Summary: How to Use AWS Migration Hub for Application Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Migration Hub
- AWS Migration Hub Home Region API
- AWS Application Discovery Service
- AWS Application Discovery Service Agentless Collector
- AWS Application Migration Service
- AWS Database Migration Service
- AWS CLI
- Python and boto3
- Mermaid

## Sources Consulted
- AWS Migration Hub User Guide: https://docs.aws.amazon.com/migrationhub/latest/ug/whatishub.html
- AWS Migration Hub tracking updates documentation: https://docs.aws.amazon.com/migrationhub/latest/ug/updates-tracking-wt.html
- AWS Migration Hub API guide: https://docs.aws.amazon.com/migrationhub/latest/ug/api-reference.html
- AWS CLI `migrationhub-config create-home-region-control`: https://docs.aws.amazon.com/cli/latest/reference/migrationhub-config/create-home-region-control.html
- AWS CLI `mgh` command reference: https://docs.aws.amazon.com/cli/latest/reference/mgh/
- AWS CLI `mgh import-migration-task`: https://docs.aws.amazon.com/cli/latest/reference/mgh/import-migration-task.html
- AWS CLI `mgh notify-migration-task-state`: https://docs.aws.amazon.com/cli/latest/reference/mgh/notify-migration-task-state.html
- AWS CLI `mgh associate-discovered-resource`: https://docs.aws.amazon.com/cli/latest/reference/mgh/associate-discovered-resource.html
- AWS CLI `mgh list-migration-tasks`: https://docs.aws.amazon.com/cli/latest/reference/mgh/list-migration-tasks.html
- AWS CLI `mgh list-discovered-resources`: https://docs.aws.amazon.com/cli/latest/reference/mgh/list-discovered-resources.html
- AWS Application Discovery Service User Guide: https://docs.aws.amazon.com/application-discovery/latest/userguide/what-is-appdiscovery.html
- AWS CLI `discovery create-application`: https://docs.aws.amazon.com/cli/latest/reference/discovery/create-application.html
- AWS CLI `discovery associate-configuration-items-to-application`: https://docs.aws.amazon.com/cli/latest/reference/discovery/associate-configuration-items-to-application.html
- AWS Application Discovery Service Discovery Connector deprecation notice: https://aws.amazon.com/blogs/migration-and-modernization/deprecation-of-aws-application-discovery-service-discovery-connector/
- AWS CLI `mgn describe-source-servers`: https://docs.aws.amazon.com/cli/latest/reference/mgn/describe-source-servers.html
- AWS CLI `dms describe-replication-tasks`: https://docs.aws.amazon.com/cli/latest/reference/dms/describe-replication-tasks.html

## Issues Found
- AWS Migration Hub availability had changed. Added a note that AWS Migration Hub is no longer open to new customers as of November 7, 2025, and that new programs should evaluate AWS Transform.
- The post recommended the older Discovery Connector for agentless discovery. Updated this to use Application Discovery Service Agentless Collector and noted the Discovery Connector end-of-support date of November 17, 2025.
- The agentless discovery CLI example implied `start-data-collection-by-agent-ids` starts Agentless Collector collection. Adjusted the text so that command is shown for Discovery Agent collection, and used `describe-agents` as the CLI status check.
- The application grouping example used `mgh notify-application-state` and `mgh associate-discovered-resource`, which do not create application groups. Replaced it with `discovery create-application` and `discovery associate-configuration-items-to-application`.
- The console grouping description mentioned drag-and-drop behavior. Replaced it with the documented flow of selecting servers and choosing **Group as application**.
- The manual migration task update flow omitted `mgh import-migration-task`, which is a prerequisite for `notify-migration-task-state`. Added the import step.
- The `notify-migration-task-state` examples omitted required `--update-date-time` and `--next-update-seconds` options. Added both and included `ProgressPercent` values in the task payloads.
- The post did not show how to map the manually registered migration task to a discovered server. Added an optional `associate-discovered-resource` step after task import.
- The monitoring example used `aws mgh list-migration-tasks --progress-update-stream`, but `list-migration-tasks` has no `--progress-update-stream` option. Updated it to call `list-migration-tasks` without that option.
- The `list-discovered-resources` example used an inconsistent migration task name. Updated it to match the registered task name.

## Review Notes
The Python examples are illustrative planning scripts rather than complete production automation. A production implementation should handle pagination for `list_configurations`, AWS API errors, credentials, and region/home-region selection explicitly.
