# Validation Summary: How to Secure Lambda Function URLs with IAM Auth

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda Function URLs
- AWS IAM
- AWS Signature Version 4
- AWS CLI
- AWS CloudFormation
- JavaScript AWS SDK and Smithy signing packages
- Python boto3, botocore, and requests
- curl SigV4 support

## Sources Consulted
- AWS Lambda Developer Guide: Security and auth model for Lambda Function URLs - https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS Lambda Developer Guide: Creating and managing Lambda Function URLs - https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html
- AWS Lambda Developer Guide: Lambda Function URL invocation event payloads - https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
- AWS CLI Command Reference: lambda create-function-url-config - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function-url-config.html
- AWS CLI Command Reference: lambda add-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CloudFormation Template Reference: AWS::Lambda::Url - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-url.html
- AWS CloudFormation Template Reference: AWS::Lambda::Permission - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- AWS General Reference: Signature Version 4 signing process - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
- curl man page for --aws-sigv4 - https://curl.se/docs/manpage.html
- npm package metadata for @aws-sdk/signature-v4 and @aws-sdk/protocol-http deprecation notices

## Issues Found
- The post said callers only need `lambda:InvokeFunctionUrl`. AWS now documents that callers need both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`, with `lambda:InvokeFunction` scoped to Function URL invocation where appropriate. Updated the explanation, IAM policy examples, AWS CLI `add-permission` examples, CloudFormation permissions, and cross-account guidance.
- The resource-based policy examples only granted `lambda:InvokeFunctionUrl`. Added the companion `lambda:InvokeFunction` permission using `--invoked-via-function-url` in AWS CLI and `InvokedViaFunctionUrl: true` in CloudFormation.
- The IAM condition-key example only covered `lambda:FunctionUrlAuthType`. Added a separate `lambda:InvokeFunction` statement constrained by `lambda:InvokedViaFunctionUrl`.
- The JavaScript example imported deprecated AWS SDK v3 package names, `@aws-sdk/signature-v4` and `@aws-sdk/protocol-http`. Updated the imports to the current Smithy packages, `@smithy/signature-v4` and `@smithy/protocol-http`.
- The Python section said it used `aws-requests-auth`, but the code signs requests with botocore's `SigV4Auth`. Updated the prose to match the code.
- The SigV4 sequence diagram implied every caller explicitly obtains credentials from AWS STS. Updated it to describe resolving AWS credentials more generally, which covers Lambda execution role credentials and other AWS credential providers.
- The policy-combination section said both identity-based and resource-based policies must always allow the request. Updated it to specify that this is required for cross-account access.

## Review Notes
- The CloudFormation snippet remains illustrative and references role resources that are not shown in the excerpt.
- The local environment did not have the AWS CLI installed, so AWS CLI validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
