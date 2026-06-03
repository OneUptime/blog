# Validation Summary: How to Enable X-Ray Tracing for Lambda Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- AWS X-Ray
- AWS CLI
- AWS CDK v2
- AWS Serverless Application Model (SAM)
- Amazon API Gateway REST APIs
- Amazon SQS
- Amazon SNS
- AWS SDK for JavaScript v3
- AWS X-Ray SDK for Node.js
- AWS Distro for OpenTelemetry (ADOT)

## Sources Consulted
- AWS Lambda X-Ray tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-x-ray.html
- AWS Lambda Node.js tracing documentation: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html
- AWS X-Ray SDK for Node.js documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs.html
- AWS X-Ray SDK Node.js AWS SDK client instrumentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html
- AWS CLI `update-function-configuration` documentation: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS CDK Lambda `Tracing` enum documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Tracing.html
- AWS CDK API Gateway REST API props documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApiBaseProps.html
- AWS SAM `AWS::Serverless::Function` `Tracing` documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS X-Ray sampling rules documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html
- AWS X-Ray filter expression documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html
- Amazon SQS and AWS X-Ray documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-services-sqs.html
- Amazon SNS and AWS X-Ray documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-services-sns.html
- API Gateway REST API X-Ray documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enabling-xray.html
- Amazon CloudWatch pricing for X-Ray tracing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The post implied that AWS SDK subsegments are captured by Lambda active tracing alone. I clarified that SDK calls are captured when the SDK clients are instrumented.
- The architecture diagram explanation said each arrow becomes a segment. I corrected this to distinguish API Gateway and Lambda segments from downstream AWS service subsegments and service map nodes.
- The custom subsegment JavaScript sample mixed AWS SDK v2 instrumentation with an AWS SDK v3 DynamoDB client, so the DynamoDB call would not be traced as described. I removed the unused v2 `aws-sdk` wrapper and wrapped the v3 client with `AWSXRay.captureAWSv3Client`.
- The AWS SDK v3 section used an incomplete OpenTelemetry setup and described `captureAWSv3Client` as an X-Ray SDK v3 beta approach. I replaced it with the officially documented `captureAWSv3Client` pattern and noted that ADOT requires an exporter or Lambda layer.
- The X-Ray filter examples used `annotation.userId` and `annotation.orderStatus`, but current X-Ray filter expression syntax uses `annotation[key]`. I updated the examples.
- The "Find cold starts" filter example used `!OK AND service("order-processor")`, which does not identify cold starts. I changed the example to a function-involvement filter.
- The SQS/SNS trace propagation section said SQS and SNS require explicit trace header passing. I corrected it to state that instrumented SQS SDK clients propagate automatically, `AWSTraceHeader` is for explicit/manual propagation, and SNS requires active tracing on the topic to include SNS in the trace path.
- The SQS code manually constructed a trace header with `Sampled=1`, which could misrepresent the actual sampling decision. I changed it to use Lambda's `_X_AMZN_TRACE_ID` environment-provided trace header when explicitly setting `AWSTraceHeader`.
- The X-Ray pricing section omitted the current free tier for retrieved or scanned traces. I updated it to include the first 1,000,000 traces retrieved or scanned per month and clarified that the $0.50 per million charge applies after that.
- The sampling rule explanation described the reservoir as a guaranteed minimum. I changed it to a reservoir target before fixed-rate sampling.

## Review Notes
AWS has announced that X-Ray SDKs and the X-Ray daemon enter maintenance mode on February 25, 2026, with OpenTelemetry recommended for new instrumentation. The post remains technically valid after the corrections because it now names ADOT as the preferred OpenTelemetry path while keeping the X-Ray SDK examples accurate for Lambda and AWS SDK v3.
