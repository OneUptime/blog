# Validation Summary: How to Use CloudFormation with SAM Transform for Serverless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- AWS Serverless Application Model (AWS SAM)
- AWS Lambda
- Amazon API Gateway REST APIs and HTTP APIs
- Amazon DynamoDB
- AWS IAM policy templates
- AWS CLI and AWS SAM CLI

## Sources Consulted
- AWS CloudFormation Template Reference: AWS::Serverless transform: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-serverless.html
- AWS SAM Developer Guide: AWS SAM template anatomy: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-template-anatomy.html
- AWS SAM Developer Guide: AWS::Serverless::Function: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM Developer Guide: Generated CloudFormation resources for AWS::Serverless::Function: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-generated-resources-function.html
- AWS SAM Developer Guide: AWS::Serverless::HttpApi CorsConfiguration: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-httpapi-httpapicorsconfiguration.html
- AWS SAM Developer Guide: AWS::Serverless::SimpleTable: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-simpletable.html
- AWS SAM Developer Guide: AWS SAM policy templates: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html
- AWS SAM CLI command reference: sam deploy: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html
- AWS CLI command reference: aws cloudformation deploy: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html
- AWS CLI command reference: aws cloudformation create-change-set: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CloudFormation Template Reference: AWS::SNS::Topic return values: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sns-topic.html

## Issues Found
- The SAM resource-type table implied it was exhaustive, but current AWS SAM includes additional resource types. Changed the wording to "Common SAM resource types include" to keep the example accurate without expanding the section.
- The `SNSPublishMessagePolicy` example used `TopicArn`, but AWS SAM's policy template expects `TopicName`. Changed it to `TopicName: !GetAtt NotificationTopic.TopicName`.
- The SSM policy template example used `SSMParameterReadPolicy` with a slash-prefixed path (`/myapp/*`). AWS SAM documents `SSMParameterWithSlashPrefixReadPolicy` for slash-prefixed parameter names, so the example now uses that policy template.
- The CloudFormation deploy example included `CAPABILITY_AUTO_EXPAND`, but `aws cloudformation deploy` documents only `CAPABILITY_IAM` and `CAPABILITY_NAMED_IAM` for that option. Removed `CAPABILITY_AUTO_EXPAND` from the CloudFormation deploy command.
- The SAM deploy example included `CAPABILITY_AUTO_EXPAND` for a template that does not contain nested applications. AWS SAM documents `CAPABILITY_AUTO_EXPAND` as required when deploying nested applications, so the basic `sam deploy` example now uses only `CAPABILITY_IAM`.
- The change-set example included `CAPABILITY_AUTO_EXPAND`; AWS CLI documentation says this capability has no effect when creating change sets. Removed it from the example.
- The best-practice note incorrectly said the SAM transform's generated resources require `CAPABILITY_AUTO_EXPAND`. Updated it to state that `CAPABILITY_AUTO_EXPAND` is for nested applications using `AWS::Serverless::Application`.

## Review Notes
The examples remain illustrative and assume referenced resources such as queues, buckets, streams, and handler source files exist where shown. Local AWS CLI and SAM CLI binaries were not installed in the review environment, so command validation was performed against official AWS command references instead of local `--help` output.
