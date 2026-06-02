# Validation Summary: How to Create SNS Topics and Subscriptions with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Amazon SNS
- Amazon SQS
- AWS Lambda
- AWS KMS
- IAM resource policies
- AWS SDK for JavaScript v3
- TypeScript

## Sources Consulted
- AWS CDK API Reference: `aws-cdk-lib.aws_sns.Topic` and `TopicProps` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html
- AWS CDK Construct Library for Amazon SNS - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns-readme.html
- AWS CDK Construct Library for Amazon SNS Subscriptions - https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_sns_subscriptions/README.html
- AWS CDK API Reference: `SqsSubscriptionProps` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.SqsSubscriptionProps.html
- AWS CDK API Reference: `LambdaSubscription` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.LambdaSubscription.html
- Amazon SNS Developer Guide: Message delivery for FIFO topics - https://docs.aws.amazon.com/sns/latest/dg/fifo-message-delivery.html
- Amazon SNS Developer Guide: Message ordering details for FIFO topics - https://docs.aws.amazon.com/sns/latest/dg/fifo-topic-message-ordering.html
- Amazon SNS Developer Guide: Subscription filter policies - https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- Amazon SNS Developer Guide: Setting up topic encryption with server-side encryption - https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic.html
- AWS SDK for JavaScript v3 API Reference: SNS `PublishCommand` - https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/sns-2010-03-31/Publish

## Issues Found
- The FIFO section said FIFO topics guarantee exactly-once processing. SNS FIFO provides ordered delivery and deduplication semantics, especially when paired with FIFO SQS queues, but "processing" depends on the consumer. Changed the wording to describe delivery and deduplication instead.
- The FIFO section said SNS FIFO topics can only have FIFO SQS queue subscriptions and that standard and FIFO resources cannot be mixed. Current Amazon SNS documentation says FIFO topics can deliver to both standard and FIFO SQS queues, with strict ordering and deduplication preserved end to end only for FIFO queues. Updated the explanation and code comment.
- The encrypted-topic section showed a customer-managed KMS key and SNS topic resource policy but did not mention KMS permissions for publishers. Added a short caveat that publishers need KMS permissions such as `kms:GenerateDataKey` and `kms:Decrypt`.

## Review Notes
The CDK v2 constructs and property names used in the examples are current and match the official API references. Email subscriptions still require recipient confirmation, and cross-account SQS subscriptions may require manual confirmation; those are operational caveats that could be expanded in a future revision but are not correctness blockers for this post.
