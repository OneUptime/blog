# Validation Summary: How to Organize Large CloudFormation Projects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudFormation
- CloudFormation nested stacks
- CloudFormation cross-stack references
- AWS CLI
- cfn-lint
- JSON parameter files
- YAML CloudFormation templates

## Sources Consulted
- AWS CloudFormation quotas: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
- AWS::CloudFormation::Stack template reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudformation-stack.html
- AWS CloudFormation nested stacks guide: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-nested-stacks.html
- AWS CloudFormation cross-stack exports guide: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html
- Fn::ImportValue reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html
- AWS CLI cloudformation deploy command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html

## Issues Found
- The nested-stack parent template used an S3 URL parameter for child templates, but the packaging section said `aws cloudformation package` would upload and rewrite nested template URLs. Updated the parent example to use local `TemplateURL` paths and added a note that the package step rewrites those paths to S3 URLs before deployment.
- The child VPC template was described as exporting values, but its outputs did not use the `Export` field. Changed the wording to say the template returns values to the parent/nested stack group.
- The cross-stack reference example used short-form `!ImportValue` with an inner `Fn::Sub`. Updated it to full-form `Fn::ImportValue`, matching AWS documentation guidance for this intrinsic-function combination.
- The JSON parameter file snippets included `//` comments inside JSON code fences. Moved the file labels outside the code blocks so the examples are valid JSON.
- The environment deploy example used `master.yaml` directly even though the nested-stack example now relies on packaging local child template paths. Updated it to deploy `packaged.yaml`.
- The deployment script said it validated all templates but used a glob that missed root-level templates such as `cloudformation/master.yaml` in default Bash behavior. Updated it to include both root-level and subdirectory YAML templates.

## Review Notes
The code snippets are illustrative and still assume the referenced child templates define matching parameters and outputs. The post does not pin AWS CLI or cfn-lint versions; the checked commands and formats are current as of 2026-06-02.
