# Validation Summary: How to Implement GDPR-Compliant Infrastructure with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- AWS S3
- AWS KMS
- AWS DynamoDB
- AWS CloudTrail
- AWS Lambda
- GDPR

## Sources Consulted
- OpenTofu input variables: https://opentofu.org/docs/v1.8/language/values/variables/
- OpenTofu `contains` function: https://opentofu.org/docs/v1.8/language/functions/contains/
- AWS provider `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS provider `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS provider `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS provider `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS provider `aws_kms_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS CloudTrail S3 bucket policy requirements: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail data events: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
- AWS CloudTrail event types and supported data resources: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-events.html
- DynamoDB TTL behavior: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- DynamoDB TTL timing caveat: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-before-you-start.html
- S3 noncurrent version expiration: https://docs.aws.amazon.com/AmazonS3/latest/API/API_NoncurrentVersionExpiration.html
- AWS Regions and Availability Zones: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html
- GDPR official text: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679
- European Commission guidance on transfers outside the EU: https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/what-rules-apply-if-my-organisation-transfers-data-outside-eu_en
- European Commission adequacy decisions page: https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en

## Issues Found
- The introduction and data residency language overstated GDPR by implying EU-only storage is required and that erasure always happens simply "on request." I changed the wording to describe an EU-only residency policy as an example control and clarified that erasure depends on Article 17 conditions.
- The allowed AWS region list incorrectly included `eu-west-2` (London), which is in the United Kingdom and not in the EU, and it omitted `eu-south-2` (Spain). I removed London, added Spain, and updated the validation message accordingly.
- Several AWS resources and data sources omitted `provider = aws.eu` even though the post only showed aliased AWS provider configurations. I added the provider meta-argument where needed so the snippets work with the aliased-provider pattern shown in the post.
- The CloudTrail example was incomplete because the S3 bucket policy required for CloudTrail log delivery was missing. I added the IAM policy document, S3 bucket policy, and an explicit dependency to match AWS and provider requirements for a functioning trail.
- The CloudTrail section described the setup as maintaining Article 30 processing records and logging "all access to personal data," but the configuration only logs S3 object data events. I corrected the section and best-practice wording to describe S3-specific audit logging and clarified that CloudTrail logs do not replace the separate Article 30 record of processing activities.
- The best-practices section treated DynamoDB TTL as if it were suitable for time-sensitive erasure by itself. I clarified that TTL deletion is asynchronous and that explicit deletes are still needed for Article 17 erasure workflows.

## Review Notes
- The post now accurately presents EU-only region selection as a stricter internal residency policy, not as a blanket GDPR mandate. This matters because GDPR Chapter V permits transfers outside the EU when an adequacy decision or another valid safeguard is in place.
- The UK remained an adequacy-decision destination at the time of review, with the European Commission publishing a renewal of the UK GDPR adequacy decision on 19 December 2025. The post no longer treats the London region as an EU region.
- The examples rely on surrounding definitions that are not shown in full, such as IAM roles, `archive_file` data sources, and input variables like `company` and `environment`. That is acceptable for a blog post snippet, but readers still need those supporting definitions in a working module.
- CloudTrail data events are not enabled by default and incur additional charges. The revised wording is technically correct, but cost and scope tradeoffs are still worth mentioning in a future update.
