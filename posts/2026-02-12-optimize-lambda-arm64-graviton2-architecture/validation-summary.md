# Validation Summary: How to Optimize Lambda with ARM64 (Graviton2) Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- AWS Graviton2 / ARM64
- AWS CLI
- AWS CloudFormation
- Terraform AWS provider
- AWS Serverless Application Model (SAM)
- Docker
- Python packaging
- Node.js native addons
- Lambda layers
- Lambda aliases and weighted routing

## Sources Consulted
- AWS Lambda Developer Guide: Selecting and configuring an instruction set architecture for your Lambda function - https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html
- AWS Compute Blog: Migrating AWS Lambda functions to Arm-based AWS Graviton2 processors - https://aws.amazon.com/blogs/compute/migrating-aws-lambda-functions-to-arm-based-aws-graviton2-processors/
- AWS Lambda pricing - https://aws.amazon.com/lambda/pricing/
- AWS CLI Command Reference: create-function - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS CLI Command Reference: update-alias - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-alias.html
- AWS CLI Command Reference: publish-layer-version - https://docs.aws.amazon.com/cli/latest/reference/lambda/publish-layer-version.html
- AWS Lambda Developer Guide: Implement Lambda canary deployments using a weighted alias - https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- AWS CloudFormation: AWS::Lambda::Function - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html
- AWS SAM Developer Guide: AWS::Serverless::Function - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM Developer Guide: Introduction to building with AWS SAM - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-build.html
- Terraform Registry: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- OneUptime blog URL referenced in the post - https://oneuptime.com/blog/post/2026-01-24-cost-optimization/view

## Issues Found
- The post described ARM64 Lambda as providing up to 20% better performance for most workloads. AWS's Graviton2 Lambda migration guidance describes up to 19% better performance for compute-intensive workloads, so the claim was narrowed to that scope.
- The post said ARM64 Lambda provides the same Lambda features, limits, and integrations. This was too broad, so it was changed to the same invocation model and integrations, matching AWS's guidance that invocation and integrations are unaffected.
- The native dependency build section suggested building Python native dependencies on an Apple M-series Mac. Native Lambda dependencies must be built for Linux ARM64, so the example now specifies an ARM64 Linux EC2 instance and keeps Docker/SAM container builds as the portable options.
- The Docker Python dependency build command did not explicitly set the working directory. Added `-w /var/task` so `requirements.txt` is resolved consistently from the mounted project directory.
- The SAM build note said it handles cross-compilation. AWS SAM builds within architecture-specific containers, so the wording was corrected to avoid implying generic cross-compilation.
- The workload guidance included unsupported percentage claims for typical web API handlers and compute-heavy workloads. These were softened to workload-dependent statements.
- The gradual migration command published a new version immediately after updating function configuration. Added `aws lambda wait function-updated` before `publish-version` to avoid publishing before the architecture update has completed.

## Review Notes
The AWS CLI, CloudFormation, SAM, Terraform, Lambda layer, pricing, and weighted alias syntax were otherwise consistent with current official documentation. The cost example correctly calculates compute duration charges only and does not include request charges, free tier credits, Savings Plans, or tiered duration pricing.
