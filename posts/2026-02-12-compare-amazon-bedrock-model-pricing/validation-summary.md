# Validation Summary: How to Compare Amazon Bedrock Model Pricing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Bedrock
- AWS Bedrock Runtime API
- Bedrock model pricing
- Python
- Boto3
- Amazon DynamoDB
- Amazon CloudWatch
- AWS Budgets and billing alerts

## Sources Consulted
- AWS Amazon Bedrock pricing: https://aws.amazon.com/bedrock/pricing/
- AWS Price List API data for Amazon Bedrock in us-east-1: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/us-east-1/index.json
- Amazon Bedrock monitoring metrics: https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring.html
- Amazon Bedrock token usage metrics: https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-token-burndown.html
- Boto3 Bedrock Runtime invoke_model API: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-runtime/client/invoke_model.html
- Boto3 DynamoDB guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-python.html
- Boto3 DynamoDB Table.put_item API: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/put_item.html
- DynamoDB Time to Live documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-how-to.html

## Issues Found
- The post said input tokens are always cheaper than output tokens. AWS pricing data includes models where input and output token prices are the same, so this was changed to "usually" and a caveat was added.
- The Bedrock invocation snippet used `json` and `bedrock_runtime` without defining them. Added the required imports and Bedrock Runtime client setup.
- The DynamoDB cache snippet used `time` and `dynamodb` without defining them. Added the required imports and DynamoDB resource setup.
- The monitoring section described a CloudWatch token metric alarm as a spending alarm. Changed the section to "Monitoring Usage" and clarified that CloudWatch tracks token usage while AWS Budgets or billing alerts should be used for spend.
- The CloudWatch example used the non-existent Bedrock metric name `InvocationModelInputTokens`. Changed it to the documented `InputTokenCount` metric in the `AWS/Bedrock` namespace and added a `ModelId` dimension.

## Review Notes
- The model prices in the post are presented as approximate and explicitly direct readers to check current AWS pricing. Spot checks against current AWS pricing data confirmed several listed on-demand prices, including Claude 3 Haiku input pricing and the Llama 3 8B/70B input and output prices for us-east-1.
- Some model availability and pricing vary by Region, provider, access status, and inference type. Future updates should consider replacing older Claude 3-era examples with newer Claude or Amazon Nova models if the post is refreshed for current production recommendations.
