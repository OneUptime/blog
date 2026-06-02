# Validation Summary: How to Set Up Amazon Connect for Customer Service

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Connect
- AWS CLI
- Amazon Connect contact flows
- AWS Lambda
- Amazon DynamoDB
- Amazon Lex
- Amazon Connect chat
- Amazon Connect real-time and historical metrics

## Sources Consulted
- AWS CLI Command Reference: create-instance - https://docs.aws.amazon.com/cli/latest/reference/connect/create-instance.html
- AWS CLI Command Reference: search-available-phone-numbers - https://docs.aws.amazon.com/cli/latest/reference/connect/search-available-phone-numbers.html
- AWS CLI Command Reference: claim-phone-number - https://docs.aws.amazon.com/cli/latest/reference/connect/claim-phone-number.html
- AWS CLI Command Reference: create-queue - https://docs.aws.amazon.com/cli/latest/reference/connect/create-queue.html
- AWS CLI Command Reference: create-routing-profile - https://docs.aws.amazon.com/cli/latest/reference/connect/create-routing-profile.html
- AWS CLI Command Reference: create-user - https://docs.aws.amazon.com/cli/latest/reference/connect/create-user.html
- AWS CLI Command Reference: list-contact-flows - https://docs.aws.amazon.com/cli/latest/reference/connect/list-contact-flows.html
- AWS CLI Command Reference: describe-contact-flow - https://docs.aws.amazon.com/cli/latest/reference/connect/describe-contact-flow.html
- AWS CLI Command Reference: start-chat-contact - https://docs.aws.amazon.com/cli/latest/reference/connect/start-chat-contact.html
- AWS CLI Command Reference: get-current-metric-data - https://docs.aws.amazon.com/cli/latest/reference/connect/get-current-metric-data.html
- AWS CLI Command Reference: get-metric-data-v2 - https://docs.aws.amazon.com/cli/latest/reference/connect/get-metric-data-v2.html
- Amazon Connect API Reference: InvokeLambdaFunction - https://docs.aws.amazon.com/connect/latest/APIReference/interactions-invokelambdafunction.html
- Amazon Connect Administrator Guide: Set working queue block - https://docs.aws.amazon.com/connect/latest/adminguide/set-working-queue.html
- Amazon Connect Administrator Guide: Transfer to queue block - https://docs.aws.amazon.com/connect/latest/adminguide/transfer-to-queue.html
- Amazon Connect Pricing Appendix - https://aws.amazon.com/products/connect/customer/pricing/appendix/

## Issues Found
- The `search-available-phone-numbers` example used `--max-results`, but the AWS CLI paginated command uses `--max-items`. Changed the example to use `--max-items 5`.
- The `claim-phone-number` example used country code and phone number type arguments, but the AWS CLI `claim-phone-number` command requires an explicit `--phone-number` returned from the search step. Replaced those arguments with `--phone-number "+18005550123"`.
- The pricing section described phone numbers as having a monthly fee. AWS pricing documentation describes Amazon Connect telephony numbers as charged on a per-day rate. Changed this to "daily fee per number."

## Review Notes
The AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI and Amazon Connect documentation instead of local `aws ... help` output. The `create-instance` API is still documented by AWS as preview and subject to change, which is worth watching for future updates.
