# Validation Summary: How to Build an API Monetization Platform on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS API Gateway REST APIs
- API Gateway usage plans and API keys
- AWS CloudFormation
- AWS Lambda with Python
- DynamoDB
- Amazon SES
- AWS Secrets Manager
- Stripe Invoicing API
- CloudWatch Logs, Kinesis Data Firehose, S3, and Athena
- OneUptime external monitoring

## Sources Consulted
- AWS API Gateway usage plans and API keys for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway API key setup for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-setup-api-key-with-restapi.html
- AWS CloudFormation `AWS::ApiGateway::UsagePlan` `ApiStage`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigateway-usageplan-apistage.html
- AWS API Gateway access logging context variables: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-variables-for-access-logging.html
- AWS API Gateway authorizer caching: https://docs.aws.amazon.com/apigateway/latest/api/API_Authorizer.html
- Boto3 API Gateway `create_api_key`: https://docs.aws.amazon.com/boto3/latest/reference/services/apigateway/client/create_api_key.html
- Boto3 API Gateway `create_usage_plan_key`: https://docs.aws.amazon.com/boto3/latest/reference/services/apigateway/client/create_usage_plan_key.html
- Boto3 API Gateway `get_usage`: https://docs.aws.amazon.com/botocore/latest/reference/services/apigateway/client/get_usage.html
- Boto3 DynamoDB `update_item`: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/update_item.html
- Boto3 SES `send_email`: https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_email.html
- Stripe create invoice API: https://docs.stripe.com/api/invoices/create?lang=python
- Stripe finalize invoice API: https://docs.stripe.com/api/invoices/finalize?lang=python
- Stripe create invoice item API: https://docs.stripe.com/api/invoiceitems/create?lang=python
- OneUptime linked blog URL checked with HTTP 200: https://oneuptime.com/blog/post/2026-02-12-build-a-real-time-leaderboard-on-aws/view

## Issues Found
- The post referred to API Gateway usage plans generally, but usage plans and API keys apply to API Gateway REST APIs. Updated the wording to specify REST APIs.
- The usage plan discussion implied hard rate and quota enforcement. AWS documents usage plan throttles and quotas as best-effort limits, so the post now warns not to rely on them as billing or cost-control hard limits.
- The CloudFormation snippet created a `RestApi` but attached usage plans to a `prod` stage that the template did not create. Updated the snippet to take an existing REST API ID and state that the API must already have a deployed `prod` stage.
- The post did not state that API methods must require API keys for usage plan enforcement. Added that assumption to the CloudFormation setup text.
- The signup Lambda stored `apiKeyId` but not `usagePlanId` or `monthlyLimit`, while the developer portal example later expected those fields. Updated the signup example to store both values.
- The usage tracking example used a Lambda authorizer for per-request billing metering. Authorizers can be cached and are intended for authorization, so this can undercount or miscount billing events. Reworked the example into a backend tracking helper that records requests after API Gateway has accepted the API key.
- The metering and billing examples keyed usage by a truncated API key value. Updated them to use API Gateway's `apiKeyId`, which is available in the REST API request context for API-key-required methods and avoids relying on the raw key value for billing correlation.
- The Stripe example converted invoice totals through `float`, which can introduce currency rounding errors. Updated it to use `Decimal` and explicit cent rounding.
- The Stripe example called `stripe_invoice.finalize_invoice()` on the returned object. Stripe's Python API documents finalization as `stripe.Invoice.finalize_invoice(invoice_id)`, so the snippet now uses that form.
- The developer portal API snippet called `respond()` without defining it. Added the helper so the code example is syntactically complete.

## Review Notes
- The examples remain illustrative and still assume required infrastructure exists, including DynamoDB table schemas, indexes, IAM permissions, verified SES sending identities, deployed API Gateway methods, and Stripe customer payment methods.
- The Python snippets were syntax-checked successfully after edits.
