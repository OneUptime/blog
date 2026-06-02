# Validation Summary: How to Use Lambda Layers to Share Code Across Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Lambda Layers
- AWS CLI
- Python
- Node.js
- DynamoDB with boto3
- AWS SAM
- AWS Lambda Powertools

## Sources Consulted
- AWS Lambda: Packaging your layer content: https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html
- AWS Lambda: Working with layers for Node.js Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-layers.html
- AWS Lambda: Working with .zip file archives for Python Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/python-package.html
- AWS Lambda: Adding layers to functions: https://docs.aws.amazon.com/lambda/latest/dg/adding-layers.html
- AWS Lambda: Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda: Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda: Granting Lambda layer access to other accounts: https://docs.aws.amazon.com/lambda/latest/dg/permissions-layer-cross-account.html
- AWS CLI: update-function-configuration: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/lambda/update-function-configuration.html
- AWS SAM: Building Lambda layers in AWS SAM: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/building-layers.html
- Powertools for AWS Lambda Python installation docs: https://docs.aws.amazon.com/powertools/python/latest/getting-started/install/

## Issues Found
- The post said Lambda automatically adds `/opt/nodejs` to the Node.js module search path. AWS documents the Node.js layer dependency paths as `nodejs/node_modules` and version-specific `nodejs/nodeX/node_modules` paths, so the explanation was updated to name `/opt/nodejs/node_modules` and `/opt/nodejs/node22/node_modules`.
- The Node.js layer publishing example used `nodejs18.x` and `nodejs20.x`. Both runtimes are deprecated as of June 2, 2026, so the example was updated to `nodejs22.x` and `nodejs24.x`.
- The AWS Lambda Powertools public layer example used an older V2 layer ARN. The example was updated to the current V3 Python 3.12 x86_64 layer ARN format and version from the official Powertools installation docs.

## Review Notes
The remaining CLI examples, Python layer layout, Python imports, DynamoDB helper snippets, layer sharing permission commands, layer limits, versioning explanation, and SAM template structure match the referenced official documentation. The examples use illustrative ARNs, account IDs, function names, and layer versions that users must replace with values from their own AWS account and region.
