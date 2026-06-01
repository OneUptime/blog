# Validation Summary: How to Use Lambda for Sending Emails via SES

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- Amazon Simple Email Service (Amazon SES)
- Amazon Simple Notification Service (Amazon SNS)
- Amazon DynamoDB Streams
- Amazon S3
- AWS CLI
- IAM
- JavaScript / Node.js
- AWS SDK for JavaScript v3
- MIME email formatting

## Sources Consulted
- Amazon SES API Reference: SendEmail - https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html
- Amazon SES API Reference: SendRawEmail / AWS SDK for JavaScript v3 - https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/email-2010-12-01/SendRawEmail
- AWS SDK for JavaScript v3: Amazon SES examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_ses_code_examples.html
- AWS CLI Command Reference: lambda invoke - https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS CLI Command Reference: ses create-template - https://docs.aws.amazon.com/cli/latest/reference/ses/create-template.html
- Amazon SES Developer Guide: Verifying identities and SES sandbox behavior - https://docs.aws.amazon.com/ses/latest/dg/sending-authorization-identity-owner-tasks-verification.html
- Amazon SES Developer Guide: Request production access - https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Amazon SES Developer Guide: Sending raw email / file attachments - https://docs.aws.amazon.com/ses/latest/dg/send-email-raw.html
- Amazon SES Developer Guide: Errors related to sending quotas - https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas-errors.html
- AWS Service Authorization Reference: Amazon SES condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonses.html

## Issues Found
- The `aws lambda invoke` example passed a raw JSON payload without `--cli-binary-format raw-in-base64-out`. AWS CLI v2 defaults binary blob parameters to base64 input, so the example can fail for users on CLI v2. Added the documented flag.
- The raw attachment example put the entire Base64-encoded attachment on one MIME line. SES raw messages must respect the SMTP line length limit, so large attachments could be rejected or malformed. Updated the code to wrap Base64 output at 76 characters per line.
- The IAM policy restricted `ses:FromAddress` to `noreply@yourdomain.com`, but later examples send from `orders@yourdomain.com` and `news@yourdomain.com`. Updated the condition to include all sender addresses used in the post.
- The retry helper checked `error.name === 'Throttling'`. SES documents quota/rate-limit API failures as `ThrottlingException`. Updated the condition to match the documented error name.

## Review Notes
- The post uses the classic Amazon SES API and `@aws-sdk/client-ses`, which are still documented and valid. SES API v2 also supports newer attachment-oriented sending features, but the raw MIME approach shown here remains valid.
- The placeholder `markEmailBounced` and `unsubscribeUser` calls are intentionally application-specific and would need implementations in a real Lambda function.
