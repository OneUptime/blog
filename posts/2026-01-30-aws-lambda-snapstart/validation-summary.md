# Validation Summary: How to Create AWS Lambda SnapStart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda SnapStart
- AWS CLI
- AWS SAM / CloudFormation
- Terraform AWS provider
- Java Lambda runtime and CRaC runtime hooks
- Python Lambda runtime and Snapshot Restore hooks
- Amazon CloudWatch Logs and Lambda monitoring

## Sources Consulted
- AWS Lambda Developer Guide: Improving startup performance with Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- AWS Lambda Developer Guide: Activating and managing Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-activate.html
- AWS Lambda Developer Guide: Lambda SnapStart runtime hooks for Java - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-runtime-hooks-java.html
- AWS Lambda Developer Guide: Lambda SnapStart runtime hooks for Python - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-runtime-hooks-python.html
- AWS Lambda Developer Guide: Monitoring for Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart-monitoring.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function SnapStart - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-function-snapstart.html
- AWS SAM Developer Guide: AWS::Serverless::Function SnapStart property - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM Developer Guide: sam local invoke - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html
- AWS What's New: Lambda SnapStart for Java functions using ARM64 architecture - https://aws.amazon.com/about-aws/whats-new/2024/07/aws-lambda-snapstart-java-functions-arm64-architecture/
- HashiCorp Terraform AWS provider documentation: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function

## Issues Found
- The description and summary claimed SnapStart "eliminates" cold starts. Updated wording to say it reduces cold start latency, which matches AWS documentation.
- The post said SnapStart reduces startup latency by up to 90 percent. Updated to "up to 10x in optimal scenarios" to align with current AWS wording.
- The runtime support list named only Java 11, 17, and 21 plus .NET 8. Updated it to Java 11 and later, Python 3.12 and later, and .NET 8 and later.
- The post claimed lower total cost as a general benefit. Updated to mention cost tradeoffs because SnapStart has caching and restoration charges for non-Java runtimes.
- The lifecycle diagram said snapshots are cached in S3. Updated to say snapshots are encrypted and cached by Lambda, since AWS does not describe this as S3-backed user-visible storage.
- The prerequisites said ARM64 is unsupported. Updated to note ARM64 support for Java SnapStart functions.
- The prerequisites said "ephemeral storage only" and warned only about EFS. Updated to include AWS's current limitations: no EFS, no S3 Files, and no ephemeral storage greater than 512 MB.
- The Terraform example omitted `publish = true`, so the alias would not reliably point at a published version with SnapStart. Added `publish = true`.
- The Python examples imported `snapshot_restore`, but AWS documents the managed runtime module as `snapshot_restore_py`. Updated both imports.
- The post said random number generator state is not captured. Updated this to explain that unique initialization state can be reused across restored environments unless refreshed.
- The networking guidance said open sockets cannot be serialized. Updated to AWS's documented behavior: connection state is not guaranteed after restore and should be validated or re-established.
- The local testing section claimed SAM CLI provides SnapStart emulation. Updated it to say SAM tests local function logic and actual SnapStart behavior must be validated against a published AWS version.
- The monitoring section treated `InitDuration` and `RestoreDuration` as ordinary CloudWatch metrics. Updated it to describe them as CloudWatch log fields for SnapStart and replaced the metric-statistics example with a CloudWatch Logs Insights query.
- The full Java example registered an anonymous CRaC `Resource` without keeping a strong reference. Updated it to store the hook in a static field before registration, matching AWS guidance that the CRaC context holds weak references.

## Review Notes
- The post remains technically relevant and useful after correction.
- Java examples are illustrative snippets and omit some imports/dependencies that a complete Maven project would still need, such as AWS Lambda Java events and Apache HTTP client classes in shorter examples.
- SnapStart behavior and supported runtimes can change over time; re-check AWS documentation before future publication updates.
