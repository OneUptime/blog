# Validation Summary: How to Subscribe an HTTP/HTTPS Endpoint to SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS HTTP/HTTPS subscriptions
- AWS CLI
- Express.js
- Python Flask
- SNS message signature verification
- SNS delivery retry policies
- AWS CDK

## Sources Consulted
- Amazon SNS HTTP/HTTPS subscription confirmation JSON format: https://docs.aws.amazon.com/sns/latest/dg/http-subscription-confirmation-json.html
- Amazon SNS HTTP/HTTPS headers: https://docs.aws.amazon.com/sns/latest/dg/http-header.html
- Amazon SNS signature verification: https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message-verify-message-signature.html
- Amazon SNS raw message delivery: https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html
- Amazon SNS message delivery retries: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
- AWS CLI v2 `sns subscribe`: https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- AWS CLI v2 `sns set-subscription-attributes`: https://docs.aws.amazon.com/cli/latest/reference/sns/set-subscription-attributes.html
- AWS CDK v2 `UrlSubscriptionProps`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.UrlSubscriptionProps.html
- Express 4.x API reference for `express.text`: https://expressjs.com/en/4x/api.html

## Issues Found
- The JavaScript signature verification example built the SNS string-to-sign with a trailing newline and returned `true` without verifying the signature. Updated it to validate the SNS signing certificate URL, download and cache the certificate, choose SHA-1 or SHA-256 based on `SignatureVersion`, build the canonical string without a trailing newline, and verify the RSA signature.
- The Express route called the signature verifier synchronously. Updated it to `await` the asynchronous verifier.
- The Flask example parsed and processed SNS messages without signature verification. Added equivalent certificate URL validation, certificate caching, canonical string construction, and RSA signature verification before handling confirmations or notifications.
- The delivery retry section said the default retry policy includes multiple increasing-backoff phases. Adjusted the wording to state that a configurable delivery policy can include those phases.
- The CDK example enabled `rawMessageDelivery`, which strips the SNS JSON envelope from HTTP/S notifications and conflicts with the endpoint examples that depend on SNS metadata and signatures. Changed it to keep raw message delivery disabled.

## Review Notes
The AWS CLI examples and delivery policy attribute names are current. The Python Flask sample now requires the `cryptography` package in addition to Flask and Requests.
