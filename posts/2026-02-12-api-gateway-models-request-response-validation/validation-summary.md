# Validation Summary: How to Use API Gateway Models for Request/Response Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS API Gateway REST APIs
- API Gateway models
- API Gateway request validators
- API Gateway gateway responses
- JSON Schema draft-04
- AWS CLI
- AWS CloudFormation
- Lambda proxy integrations

## Sources Consulted
- AWS API Gateway Developer Guide: Request validation for REST APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html
- AWS API Gateway Developer Guide: Set up basic request validation in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-validation-set-up.html
- AWS API Gateway Developer Guide: Data models for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/models-mappings-models.html
- AWS API Gateway Developer Guide: Set up a method response in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-response.html
- AWS API Gateway REST API Reference: Patch Operations: https://docs.aws.amazon.com/apigateway/latest/api/patch-operations.html
- AWS API Gateway REST API Reference: GatewayResponse: https://docs.aws.amazon.com/apigateway/latest/api/API_GatewayResponse.html
- AWS CLI Command Reference: apigateway create-model: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-model.html
- AWS CLI Command Reference: apigateway create-request-validator: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-request-validator.html
- AWS CLI Command Reference: apigateway update-method: https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-method.html
- AWS CLI Command Reference: apigateway put-gateway-response: https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-gateway-response.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::Model: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-model.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::Method: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-method.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::RequestValidator: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-requestvalidator.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::GatewayResponse: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-gatewayresponse.html
- JSON Schema draft-04 specification: https://json-schema.org/draft-04/json-schema-validation

## Issues Found
- The post described API Gateway models as validating both request bodies and response payloads. AWS REST API request validators validate incoming request bodies and required request parameters; response models define/document method response payload shapes and are used by generated SDKs, but they do not perform runtime response-body validation. Updated the title, description, introduction, response-model comment, and conclusion to distinguish request validation from response modeling.
- The `update-method` example used `op=replace` when attaching the `application/json` request model. For adding a new request model mapping to a method, AWS's patch operations support `add` on `/requestModels`; changed the operation to `op=add`.
- The CloudFormation section called the snippet a complete template, but it referenced Lambda resources and deployment-related resources that were not included. Changed the wording to describe it as a CloudFormation excerpt and stated the assumed external resources.

## Review Notes
API Gateway request parameter validation only checks that required query string, path, and header parameters are present and not blank; it does not validate their type or format. The post's examples focus on REST APIs, not API Gateway HTTP APIs.
