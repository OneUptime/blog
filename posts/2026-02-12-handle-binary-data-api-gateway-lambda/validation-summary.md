# Validation Summary: How to Handle Binary Data with API Gateway and Lambda

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- AWS Lambda proxy integrations
- AWS CLI
- AWS CloudFormation
- AWS Serverless Application Model (SAM)
- Amazon S3 presigned URLs
- Python
- multipart/form-data

## Sources Consulted
- AWS API Gateway documentation: Binary media types for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html
- AWS API Gateway documentation: Lambda proxy integrations in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- AWS Compute Blog: Handling binary data using Amazon API Gateway HTTP APIs - https://aws.amazon.com/blogs/compute/handling-binary-data-using-amazon-api-gateway-http-apis/
- AWS CLI Command Reference: update-rest-api - https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-rest-api.html
- AWS CLI Command Reference: create-deployment - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-deployment.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::RestApi - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-restapi.html
- AWS SAM Developer Guide: AWS::Serverless::Api - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-api.html
- AWS General Reference: Amazon API Gateway endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/apigateway.html
- AWS API Gateway documentation: HTTP API quotas - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html
- AWS Lambda documentation: Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- Python documentation: cgi removed module notice - https://docs.python.org/3.14/library/cgi.html

## Issues Found
- The multipart upload example used Python's deprecated `cgi` module and omitted the required `json` import. Replaced it with `email.parser.BytesParser`, added `json`, and kept the example's behavior of iterating uploaded files and writing them to S3.
- The upload examples read `event["headers"]["content-type"]` case-sensitively. API Gateway header casing can vary by payload format and client, so the examples now normalize header names before looking up `content-type`.
- The HTTP API example passed a text request body as `str` to `process_file` when the rest of the example treats the value as file bytes. It now encodes non-base64 bodies before processing.
- The Lambda asynchronous invocation payload limit was stale at 256 KB. AWS raised it to 1 MB, so the size limits section now reflects the current documented quota.

## Review Notes
The REST API binary media type setup, `isBase64Encoded` response handling, CloudFormation property, SAM property, API Gateway 10 MB payload limit, and presigned URL recommendation were consistent with AWS documentation. The examples are still illustrative and omit production concerns such as filename sanitization, input validation, IAM policies, and detailed error handling.
