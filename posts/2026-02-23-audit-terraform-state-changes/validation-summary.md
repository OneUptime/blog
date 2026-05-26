# Validation Summary: How to Audit Terraform State Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform state and remote backends
- AWS S3, CloudTrail, CloudTrail Lake, SNS, Lambda, DynamoDB, and S3 Object Lock
- Google Cloud Storage and Cloud Audit Logs
- HCP Terraform audit trails API
- GitHub Actions CI/CD workflows
- Bash, jq, Python, boto3, and AWS/gcloud CLI commands

## Sources Consulted
- HashiCorp Terraform AWS provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS CloudTrail documentation for S3 data events: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
- AWS CLI `cloudtrail lookup-events` documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS CLI `cloudtrail start-query` documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/start-query.html
- AWS CLI `cloudtrail describe-query` documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/describe-query.html
- AWS CloudTrail Lake query documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/lake-queries-cli.html
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Google Cloud Storage Cloud Audit Logs documentation: https://cloud.google.com/storage/docs/audit-logging
- Google Cloud Logging query language documentation: https://cloud.google.com/logging/docs/view/logging-query-language
- Google Eventarc Cloud Audit Logs filter documentation for Cloud Storage method names: https://cloud.google.com/eventarc/docs/determining-filters-cal
- HCP Terraform audit trails API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/audit-trails
- Terraform CLI `state pull` documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- GitHub Actions variables documentation for `GITHUB_ENV`: https://docs.github.com/en/actions/reference/variables-reference
- Boto3 S3 `get_object` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object.html

## Issues Found
- The post said CloudTrail captures every S3 API call. Changed this to clarify that S3 object-level calls are captured when CloudTrail data events are enabled.
- The CloudTrail query example used `aws cloudtrail lookup-events` for S3 object data events. Replaced it with a CloudTrail Lake `start-query` and `get-query-results` example because `lookup-events` only searches management and Insights events.
- The state comparison script used `.resources[].type + "." + .resources[].name`, which creates an incorrect cross-product in jq. Changed it to `.resources[] | .type + "." + .name`.
- The GCS audit log query only matched `storage.objects.update`, which misses normal object writes. Expanded it to include `storage.objects.create`, `storage.objects.update`, and `storage.objects.delete`.
- The HCP Terraform audit API `jq` command used non-existent `.attributes` fields. Updated it to match the documented audit trails response schema.
- The Lambda sample passed `VersionId="unknown"` when no version ID was present and did not URL-decode S3 event keys. Updated it to conditionally pass `VersionId` and decode the key with `unquote_plus`.

## Review Notes
- Several Terraform snippets are intentionally partial and reference surrounding resources such as IAM roles, buckets, tables, topic policies, and Lambda invoke permissions that are not shown. They are suitable as focused examples, but a production-ready module would need those supporting resources and permissions.
- S3 Object Lock requires versioning and Object Lock support on the bucket before retention rules can protect objects.
