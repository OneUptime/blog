# Validation Summary: How to Use Ansible to Set Up AWS CloudTrail

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS CloudTrail
- Amazon S3
- Amazon CloudWatch Logs
- Amazon CloudWatch metric alarms
- AWS IAM
- AWS CLI

## Sources Consulted
- Ansible `amazon.aws.cloudtrail` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudtrail_module.html
- Ansible `amazon.aws.s3_bucket` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- Ansible `amazon.aws.cloudwatchlogs_log_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudwatchlogs_log_group_module.html
- Ansible `amazon.aws.cloudwatchlogs_log_group_metric_filter` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudwatchlogs_log_group_metric_filter_module.html
- Ansible `amazon.aws.cloudwatch_metric_alarm` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudwatch_metric_alarm_module.html
- Ansible `amazon.aws.iam_role` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/iam_role_module.html
- AWS CloudTrail S3 bucket policy documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail CloudWatch Logs role policy documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-required-policy-for-cloudwatch-logs.html
- AWS CLI CloudTrail examples for event selectors: https://docs.aws.amazon.com/cli/latest/userguide/cli_cloudtrail_code_examples.html
- AWS CloudTrail data events documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html

## Issues Found
- The post said CloudTrail records every API call. Updated this to "supported API calls and account activity" because CloudTrail coverage depends on supported event types and services.
- The S3 bucket policy did not include the `trails` S3 key prefix configured later on the trail, so CloudTrail delivery would fail when `s3_key_prefix: "trails"` was used. Updated the policy resource to include `{{ s3_key_prefix }}/AWSLogs/{{ account_id }}/*`.
- The S3 bucket policy omitted the recommended `aws:SourceArn` condition from AWS CloudTrail's current bucket policy guidance. Added it to both required CloudTrail policy statements.
- The CloudTrail task used `is_logging`, which is a return field rather than the current module input parameter. Replaced it with `enable_logging`.
- The CloudWatch Logs integration example used `cloud_watch_logs_log_group_arn` and `cloud_watch_logs_role_arn`; the current `amazon.aws.cloudtrail` parameters are `cloudwatch_logs_log_group_arn` and `cloudwatch_logs_role_arn`. Updated both names.
- The CloudWatch Logs integration update omitted `s3_bucket_name`, which is required when `amazon.aws.cloudtrail` is used with `state: present`. Added the bucket and retained the trail's key security settings in that update task.
- The CloudWatch Logs integration referenced `iam_role.arn`, but the current `amazon.aws.iam_role` result nests the ARN under `iam_role.iam_role.arn`. Updated the reference.
- The CloudWatch alarm example used `alarm_name` and `comparison_operator`, but the current `amazon.aws.cloudwatch_metric_alarm` module uses `name` and `comparison`. Updated both parameters.
- The data events example used an unsupported `event_selectors` parameter on `amazon.aws.cloudtrail`. Replaced that task with an Ansible `command` task that calls the official AWS CLI `cloudtrail put-event-selectors` command with valid basic event selector JSON for all S3 object and Lambda function data events.
- Added AWS CLI to the prerequisites because the corrected data event selector example now invokes `aws cloudtrail put-event-selectors`.

## Review Notes
- The local environment did not have `ansible-galaxy` installed, so module validation was performed against official online Ansible collection documentation.
- The CloudWatch alarm task may create alarms before matching metrics have emitted data. That is operationally acceptable in AWS, but the alarms will remain in insufficient data state until CloudWatch receives matching metric filter output.
