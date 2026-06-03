# Validation Summary: How to Build a SaaS Billing System with AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon Kinesis Data Streams
- Amazon EventBridge and EventBridge Scheduler
- AWS SDK for JavaScript v3
- Stripe Billing subscriptions
- Stripe metered usage records
- Stripe webhooks
- Stripe CLI
- JavaScript / Node.js

## Sources Consulted
- Stripe API Reference: Create a subscription - https://docs.stripe.com/api/subscriptions/create
- Stripe Billing subscriptions guide - https://docs.stripe.com/billing/subscriptions/build-subscriptions
- Stripe API Reference: Usage records - https://docs.stripe.com/api/usage_records
- Stripe webhook signature verification docs - https://docs.stripe.com/webhooks/signature
- Stripe CLI usage docs - https://docs.stripe.com/stripe-cli/use-cli
- Stripe CLI trigger docs - https://docs.stripe.com/stripe-cli/triggers
- AWS SDK for JavaScript v3 DynamoDB examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- DynamoDB update expression docs - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- AWS SDK for JavaScript v3 Kinesis examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_kinesis_code_examples.html
- AWS Lambda with Kinesis Data Streams tutorial - https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-example.html
- AWS Lambda with EventBridge Scheduler docs - https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html
- AWS SDK for JavaScript v3 EventBridge examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_eventbridge_code_examples.html

## Issues Found
- The subscription creation example expanded `latest_invoice.payment_intent` and returned `latest_invoice.payment_intent.client_secret`. Current Stripe subscription integration docs use `latest_invoice.confirmation_secret` for this flow. Updated the expansion and returned client secret path, and added `payment_settings.save_default_payment_method = 'on_subscription'` to match current Stripe guidance for future subscription payments.
- Several AWS SDK v3 examples used `docClient` without initializing it. Added `DynamoDBClient` imports and `DynamoDBDocumentClient.from(new DynamoDBClient({}))` setup to the affected snippets.
- The Stripe webhook handler passed `event.body` directly to signature verification. Stripe requires the raw request body, and API Gateway can pass base64-encoded bodies or a mapped `rawBody`. Updated the handler to use `event.rawBody` when present, decode base64 bodies when needed, and handle case variation in the `Stripe-Signature` header.
- The entitlement handler assumed every EventBridge event detail was a subscription object, but the route also includes `invoice.payment_succeeded`, whose detail is an invoice object. Updated the example to retrieve the subscription from the invoice before computing entitlements.
- The entitlement handler used `subscription.plan?.id`, which is not the best current subscription shape for price-based Billing integrations. Updated the subscription creation example to store the internal plan ID in Stripe metadata and updated entitlement resolution to use that metadata, with a price-ID fallback.

## Review Notes
All JavaScript code snippets were syntax-checked with Node.js v22.22.0 after edits. The snippets remain illustrative and still depend on application-specific helper functions such as `getOrCreateStripeCustomer`, `getPriceIdForPlan`, `getActiveSubscriptions`, `getUsageForPeriod`, `getCustomerIdFromStripeId`, and notification/cache helpers.
