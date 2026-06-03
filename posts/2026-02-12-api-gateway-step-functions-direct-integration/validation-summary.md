# Validation Summary: How to Use API Gateway with Step Functions Direct Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon API Gateway REST APIs
- AWS Step Functions Standard workflows
- AWS Step Functions Express workflows
- AWS IAM roles and policies
- AWS CLI
- AWS CloudFormation
- API Gateway VTL mapping templates

## Sources Consulted
- AWS Step Functions API Reference: StartExecution - https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html
- AWS Step Functions API Reference: StartSyncExecution - https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartSyncExecution.html
- AWS Step Functions API Reference: DescribeExecution - https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html
- Amazon API Gateway Developer Guide: Mapping template reference - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
- Amazon API Gateway Developer Guide: Override request/response parameters and status codes - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-override-request-response-parameters.html
- AWS CLI Command Reference: apigateway put-integration - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- AWS CLI Command Reference: apigateway put-integration-response - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration-response.html
- AWS CloudFormation Reference: AWS::ApiGateway::Method Integration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigateway-method-integration.html
- AWS CloudFormation Reference: AWS::ApiGateway::Method IntegrationResponse - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apigateway-method-integrationresponse.html
- AWS CloudFormation Reference: AWS::StepFunctions::StateMachine - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-stepfunctions-statemachine.html

## Issues Found
- The synchronous Express workflow error handling used `SelectionPattern` values such as `.*FAILED.*` and `.*TIMED_OUT.*`. API Gateway matches `SelectionPattern` against HTTP status codes for non-Lambda AWS backends, and `StartSyncExecution` returns HTTP 200 even when the workflow fails. Updated the examples to inspect the Step Functions response body and use `$context.responseOverride.status`.
- Several request templates used `$util.escapeJavaScript()` without converting escaped single quotes back to regular single quotes. AWS documents that escaped single quotes are invalid in JSON properties. Updated the templates with `.replaceAll("\\'","'")`.
- Some response templates wrapped `$input.json()` output in JSON quotes, which can produce invalid JSON for string fields. Updated those examples to use `$input.path()` where the result is inserted into a JSON string.
- The synchronous output example returned `$.output` with `$input.json()`, but `StartSyncExecution` returns `output` as a string containing JSON. Updated examples to use `$input.path('$.output')` or parse the output before accessing fields.
- The polling example used `DescribeExecution` but the IAM policy examples did not include `states:DescribeExecution`. Added the permission, and in the CloudFormation policy used the execution ARN pattern required for described executions.
- The CloudFormation section was labeled as a complete template even though it references placeholder Lambda functions and a Step Functions role. Changed it to a core template to avoid implying that the excerpt is directly deployable as-is.
- The path/query parameter snippet was shown as a JSON request-template map with an incorrect shape. Updated it to show the actual VTL request body template and added parameter escaping.
- The monitoring link pointed to a JSON parsing article. Updated it to the local Step Functions monitoring article.

## Review Notes
The article now accurately describes REST API AWS service integrations for Step Functions. The CloudFormation examples are still intentionally excerpt-style and assume the referenced Lambda functions and Step Functions execution role exist elsewhere.
