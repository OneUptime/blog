# Validation Summary: How to Implement Lambda Layers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- Lambda Layers
- AWS CLI
- Boto3 / AWS SDK for Python
- Python
- Node.js
- AWS SAM
- AWS CDK
- API Gateway proxy responses

## Sources Consulted
- AWS Lambda: Packaging your layer content - https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html
- AWS Lambda: Working with layers for Python Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html
- AWS Lambda: Working with layers for Node.js Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/nodejs-layers.html
- AWS Lambda: Working with layers for Ruby Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/ruby-layers.html
- AWS Lambda: Working with layers for Java Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/java-layers.html
- AWS Lambda: Creating and deleting layers - https://docs.aws.amazon.com/lambda/latest/dg/creating-deleting-layers.html
- AWS Lambda: Adding layers to functions - https://docs.aws.amazon.com/lambda/latest/dg/adding-layers.html
- AWS Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CLI: publish-layer-version - https://docs.aws.amazon.com/cli/latest/reference/lambda/publish-layer-version.html
- AWS CLI: add-layer-version-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-layer-version-permission.html
- AWS CLI: update-function-configuration - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS SAM: AWS::Serverless::LayerVersion - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-layerversion.html
- AWS SAM: Building Lambda layers - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/building-layers.html
- AWS CDK Lambda construct library - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html

## Issues Found
- The shell walkthrough changed into `my-layer/python` and then later used paths as if commands were still being run from the original parent directory. Updated the `pip install` examples to target `my-layer/python` directly so the commands can be run in sequence.
- The Ruby layer path used `ruby/gems/2.7.0`, but Ruby 2.7 is deprecated and current AWS layer packaging docs show Ruby 3.4 paths and `ruby/lib`. Updated the table accordingly.
- The versioning section said functions using deleted layer versions will fail. AWS documents that existing functions can continue using deleted layer versions, though deleted versions cannot be newly attached. Corrected the claim.
- The SAM directory example placed Python modules at the layer root. Updated the example to put custom modules under the `python/` directory so the built layer matches Lambda's runtime lookup paths.
- The CDK Node.js example used deprecated Node.js 16 and 18 runtimes, and Node.js 20 is currently listed as deprecated by AWS Lambda. Updated the example to Node.js 22 and 24, and changed `npm install --production` to `npm install --omit=dev`.
- The best-practices table claimed ARM64 layers generally do not work on x86_64. Narrowed this to native dependencies compiled only for ARM64, since pure interpreted code can be architecture-independent.
- The post claimed a 75-version maximum per layer. AWS documents a default 75 GB regional storage quota for uploaded function and layer versions, not a 75-version-per-layer limit. Updated the quota references.

## Review Notes
The remaining examples are illustrative and depend on the reader providing matching project files, IAM permissions, AWS credentials, and compatible Linux-built dependencies. For layers with native dependencies, future revisions could emphasize `sam build --use-container` or Docker-based builds more strongly.
