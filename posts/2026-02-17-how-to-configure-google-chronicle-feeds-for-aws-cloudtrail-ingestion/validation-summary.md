# Validation Summary: How to Configure Google Chronicle Feeds for AWS CloudTrail Ingestion

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Security Operations / Chronicle SIEM feeds
- AWS CloudTrail
- Amazon S3
- Amazon SQS
- AWS IAM policies
- AWS CLI
- YARA-L / UDM search

## Sources Consulted
- Google Security Operations documentation: Collect AWS CloudTrail logs: https://docs.cloud.google.com/chronicle/docs/ingestion/default-parsers/aws-cloudtrail
- Google Security Operations Feed Management API reference: https://docs.cloud.google.com/chronicle/docs/reference/feed-management-api
- Google Security Operations UDM search documentation: https://docs.cloud.google.com/chronicle/docs/investigation/udm-search
- Google Security Operations YARA-L functions documentation: https://docs.cloud.google.com/chronicle/docs/yara-l/functions
- Google Security Operations YARA-L match syntax documentation: https://docs.cloud.google.com/chronicle/docs/yara-l/match-syntax
- Google Security Operations YARA-L condition syntax documentation: https://docs.cloud.google.com/chronicle/docs/yara-l/condition-syntax
- AWS CLI SQS create-queue command reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html
- AWS CLI SQS set-queue-attributes command reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/set-queue-attributes.html
- Amazon S3 Event Notifications documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html
- Amazon S3 IAM policy documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-policy-language-overview.html

## Issues Found
- The S3 feed configuration used the older "Amazon S3" source label and included fields that are not part of the current documented Amazon S3 V2 feed schema. Updated it to "Amazon S3 V2", removed the stale "URI is a" and region entries, and added Maximum File Age.
- The SQS feed configuration used an SQS queue URL and generic access-key fields. Current Google SecOps Amazon SQS V2 feed configuration uses the queue ARN, S3 URI, source deletion option, maximum file age, and SQS-specific access-key fields. Updated the field list accordingly.
- The IAM S3 read policy omitted `s3:GetBucketLocation`, which is commonly required for bucket-region discovery and is included in AWS S3 read-access examples. Added it to both S3 permission snippets and split bucket-level and object-level permissions onto the correct ARN types.
- The SQS queue policy example used `SQS:SendMessage`; AWS examples use `sqs:SendMessage`. Updated the action casing to match AWS documentation.
- The `set-queue-attributes` command used a placeholder JSON string that would not run as written. Updated it to read the saved policy JSON into the `Policy` attribute.
- The UDM search example used `timestamp("2026-02-17T00:00:00Z")`, which is not a documented YARA-L timestamp function. Replaced it with `timestamp.get_date(metadata.event_timestamp.seconds, "UTC") = "2026-02-17"` and normalized boolean operators to documented lowercase syntax.

## Review Notes
- The official Google documentation currently recommends Amazon SQS V2 as the preferred approach for AWS CloudTrail ingestion because it reduces ingestion latency versus polling S3.
- If CloudTrail logs are encrypted with a customer-managed KMS key, the ingesting IAM principal also needs appropriate KMS permissions.
