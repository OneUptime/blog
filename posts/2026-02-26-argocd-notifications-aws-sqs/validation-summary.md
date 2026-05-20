# Validation Summary: How to Send ArgoCD Notifications to AWS SQS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Kubernetes
- Amazon SQS
- Amazon API Gateway HTTP APIs
- AWS CloudFormation
- Terraform AWS provider
- AWS CLI
- AWS Lambda
- Python
- DynamoDB
- YAML
- JSON

## Sources Consulted
- Argo CD notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/subscriptions/
- AWS API Gateway HTTP API AWS service integrations documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services.html
- AWS CloudFormation AWS::ApiGatewayV2::Integration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-integration.html
- AWS CloudFormation AWS::ApiGatewayV2::Stage reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-stage.html
- AWS CloudFormation AWS::SQS::Queue reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sqs-queue.html
- AWS CLI sqs create-queue command reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/create-queue.html
- AWS SQS SendMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- Terraform AWS provider aws_sqs_queue resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue

## Issues Found
- Clarified that SQS FIFO ordering is guaranteed within a message group, not globally across unrelated message groups.
- Added `PayloadFormatVersion: '1.0'` to the API Gateway HTTP API AWS service integration because CloudFormation requires a payload format version for HTTP APIs, and non-Lambda integrations support `1.0`.
- Added an `AWS::ApiGatewayV2::Stage` with `$default` and `AutoDeploy: true` so the CloudFormation example exposes an invokable endpoint without requiring a separate deployment step.
- Added a FIFO queue caveat explaining that `MessageGroupId` is required when sending messages to FIFO queues.
- Renamed the nested deployment payload key from `source` to `repository` because the JSON object already used `source` for the event source, and duplicate JSON keys can cause the earlier value to be overwritten by parsers.
- Updated the sync trigger to use Argo CD's optional chaining syntax for `app.status?.operationState.phase`, avoiding evaluation failures when `operationState` is absent.
- Added the missing Python `time` import used by the Lambda example's TTL calculation.
- Fixed the global webhook subscription recipient from a YAML map (`aws-sqs:`) to the webhook recipient string (`aws-sqs`), matching Argo CD subscription examples.

## Review Notes
- The API Gateway example intentionally uses a standard SQS queue. If the queue is changed to FIFO, the integration must provide a `MessageGroupId`; content-based deduplication only covers the deduplication ID, not the message group ID.
