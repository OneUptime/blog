# Validation Summary: How to Use Macie to Find PII in S3 Buckets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Macie
- Amazon S3
- AWS CLI
- Amazon EventBridge
- AWS Lambda with Python and boto3
- Amazon SNS
- Terraform
- AWS KMS

## Sources Consulted
- Amazon Macie User Guide: Types of Macie findings - https://docs.aws.amazon.com/macie/latest/user/findings-types.html
- Amazon Macie User Guide: Severity scoring for Macie findings - https://docs.aws.amazon.com/macie/latest/user/findings-severity.html
- Amazon Macie User Guide: Reviewing and analyzing findings - https://docs.aws.amazon.com/macie/latest/user/findings.html
- Amazon Macie User Guide: EventBridge event schema for Macie findings - https://docs.aws.amazon.com/macie/latest/user/findings-publish-event-schemas.html
- Amazon Macie User Guide: Quick reference for managed data identifiers - https://docs.aws.amazon.com/macie/latest/user/mdis-reference-quick.html
- Amazon Macie User Guide: Fields for filtering findings - https://docs.aws.amazon.com/macie/latest/user/findings-filter-fields.html
- AWS CLI Command Reference: macie2 create-classification-job - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/macie2/create-classification-job.html
- AWS CLI Command Reference: macie2 list-findings - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/macie2/list-findings.html
- AWS CLI Command Reference: macie2 get-finding-statistics - https://docs.aws.amazon.com/cli/latest/reference/macie2/get-finding-statistics.html
- AWS CLI Command Reference: macie2 put-classification-export-configuration - https://docs.aws.amazon.com/cli/latest/reference/macie2/put-classification-export-configuration.html
- AWS CLI Command Reference: macie2 get-findings-publication-configuration - https://docs.aws.amazon.com/cli/latest/reference/macie2/get-findings-publication-configuration.html
- Amazon EventBridge event reference for Macie - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-macie.html

## Issues Found
- The classification job used `CONTAINS` for `OBJECT_EXTENSION` scoping. AWS documents `EQ` and `NE` as the valid comparators for object extensions, so this was changed to `EQ`.
- The managed data identifier IDs `US_PASSPORT_NUMBER` and `US_DRIVER_LICENSE` were not current Macie managed identifier IDs. They were changed to `USA_PASSPORT_NUMBER` and `DRIVERS_LICENSE`.
- The findings query attempted to filter `classificationDetails.result.sensitiveData.detections.type` with the value `PII`, which is not a managed data identifier type. It now filters by Macie sensitive finding types that match the identifiers used by the tutorial.
- The severity explanation said public bucket configuration increases severity for PII findings. AWS documents sensitive data finding severity as based on the nature and number of occurrences of sensitive data, so the sentence was changed to say bucket security details help prioritization alongside severity.
- The S3 export command used `put-findings-publication-configuration`, which configures Security Hub publication, not S3 export. It was replaced with `put-classification-export-configuration` and the required S3/KMS destination fields.
- The statistics command grouped by `classificationDetails.result.sensitiveData.detections.type`, but `get-finding-statistics` only supports grouping by `resourcesAffected.s3Bucket.name`, `type`, `classificationDetails.jobId`, or `severity.description`. It now groups by finding `type`.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI documentation instead of local `aws ... help` output.
- The Lambda quarantine example is syntactically valid, but in production it should account for versioned buckets, object lock, cross-account permissions, KMS-encrypted objects, and URL-encoded object keys in EventBridge payloads.
