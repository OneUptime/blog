# Validation Summary: How to Share QuickSight Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon QuickSight dashboards and analyses
- AWS CLI for QuickSight
- Boto3 QuickSight client
- Amazon QuickSight Embedding SDK v2
- QuickSight email report schedules
- QuickSight namespaces and anonymous embedding

## Sources Consulted
- AWS CLI Command Reference: create-dashboard - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-dashboard.html
- Amazon QuickSight Developer Guide: UpdateDashboardPermissions - https://docs.aws.amazon.com/quicksight/latest/developerguide/update-dashboard-permissions.html
- Amazon QuickSight API Reference: StartDashboardSnapshotJobSchedule - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_StartDashboardSnapshotJobSchedule.html
- AWS CLI Command Reference: start-dashboard-snapshot-job-schedule - https://docs.aws.amazon.com/cli/latest/reference/quicksight/start-dashboard-snapshot-job-schedule.html
- Amazon QuickSight User Guide: Configuring email report settings - https://docs.aws.amazon.com/quicksight/latest/user/email-reports-from-dashboard.html
- Boto3 QuickSight generate_embed_url_for_registered_user - https://docs.aws.amazon.com/boto3/latest/reference/services/quicksight/client/generate_embed_url_for_registered_user.html
- Boto3 QuickSight generate_embed_url_for_anonymous_user - https://docs.aws.amazon.com/boto3/latest/reference/services/quicksight/client/generate_embed_url_for_anonymous_user.html
- Amazon QuickSight Embedding SDK README - https://github.com/awslabs/amazon-quicksight-embedding-sdk
- AWS QuickSight pricing - https://aws.amazon.com/quick/quicksight/pricing/
- AWS Big Data Blog: embed multi-tenant analytics in applications with Amazon QuickSight - https://aws.amazon.com/blogs/big-data/embed-multi-tenant-analytics-in-applications-with-amazon-quicksight/

## Issues Found
- The email reports section used `create-topic-refresh-schedule`, which creates a refresh schedule for a QuickSight Q topic and does not create or run dashboard email reports. Replaced it with `start-dashboard-snapshot-job-schedule`, which runs an existing dashboard email report schedule by dashboard ID and schedule ID.
- The email report setup text said the API for email schedules was still being expanded and directed users to the share icon. Updated it to match the current console flow through the dashboard Schedules pane and clarified that the API can run an existing configured schedule.
- The frontend embedding example mixed QuickSight Embedding SDK v2 with older-style event handling and passed frame and content settings in one object. Updated it to use separate `frameOptions` and `contentOptions`, with `onChange` and `onMessage` callbacks.
- Removed an unused `json` import from the Boto3 registered-user embedding example.

## Review Notes
- The local environment did not have the AWS CLI installed, so CLI options were checked against the official AWS CLI command reference rather than local `aws --help` output.
- Anonymous embedding requires QuickSight Enterprise/capacity pricing setup; the post's pricing statement is directionally correct, but future updates could add a short caveat about capacity pricing requirements.
