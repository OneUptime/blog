# Validation Summary: How to Build a Video Streaming Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure guide

## Technologies Covered
- Terraform
- AWS S3
- AWS Elemental MediaConvert
- AWS Lambda
- Amazon CloudFront
- Amazon DynamoDB
- Amazon CloudWatch
- Amazon SNS
- IAM

## Sources Consulted
- HashiCorp Terraform AWS provider documentation for `aws_cloudfront_origin_access_control`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control.html
- HashiCorp Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- HashiCorp Terraform AWS provider documentation for `aws_s3_bucket_notification`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- HashiCorp Terraform AWS provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS CloudFront documentation, "Restrict access to an Amazon S3 origin": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS Lambda documentation, "Process Amazon S3 event notifications with Lambda": https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- AWS Elemental MediaConvert documentation, "Setting up IAM permissions": https://docs.aws.amazon.com/mediaconvert/latest/ug/iam-role.html
- AWS Elemental MediaConvert documentation, "Troubleshooting AWS Elemental MediaConvert identity and access": https://docs.aws.amazon.com/mediaconvert/latest/ug/security_iam_troubleshoot.html
- AWS CLI documentation for `mediaconvert create-job`: https://docs.aws.amazon.com/cli/latest/reference/mediaconvert/create-job.html
- AWS CloudFront documentation, "Types of metrics for CloudFront": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CloudFront documentation, "Monitor CloudFront metrics with Amazon CloudWatch": https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/monitoring-using-cloudwatch.html

## Issues Found
- The CloudFront section used Origin Access Identity (OAI). AWS now recommends Origin Access Control (OAC) for S3 origins, and OAI is documented as legacy and not recommended. Updated the Terraform example to use `aws_cloudfront_origin_access_control`, `origin_access_control_id`, and an S3 bucket policy with the CloudFront service principal plus `AWS:SourceArn`.
- The Lambda function referenced `aws_iam_role.transcoder_lambda` without defining it. Added a Lambda execution role and policy with CloudWatch Logs permissions, MediaConvert job permissions, `iam:PassRole` for the MediaConvert service role, and DynamoDB write permissions for metadata updates.
- The S3 bucket notification was missing an explicit dependency on `aws_lambda_permission.s3_trigger`. Added `depends_on` so Terraform applies the Lambda invoke permission before configuring the S3 notification.
- The comment about MediaConvert job templates implied Lambda creates job templates. Updated the wording to say the Lambda creates transcoding jobs.

## Review Notes
- The snippets are still illustrative and assume supporting inputs and resources exist, including `var.environment`, `var.mediaconvert_endpoint`, `aws_acm_certificate.video`, and a packaged `transcoder.zip`.
- CloudFront metrics are global but CloudWatch alarm creation for CloudFront metrics must be done in `us-east-1`; the post's metric dimensions are correct, but a production Terraform module should use an appropriate provider configuration for that alarm.
