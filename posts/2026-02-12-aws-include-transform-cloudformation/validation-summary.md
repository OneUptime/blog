# Validation Summary: How to Use AWS::Include Transform in CloudFormation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- AWS::Include transform
- Fn::Transform intrinsic function
- Amazon S3
- AWS CLI
- AWS SAM transform
- IAM policy documents

## Sources Consulted
- AWS CloudFormation Template Reference: AWS::Include transform: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-include.html
- AWS CloudFormation Template Reference: Fn::Transform: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-transform.html
- AWS CLI Command Reference: cloudformation create-change-set: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CLI Command Reference: cloudformation get-template: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/get-template.html

## Issues Found
- The first example declared `Transform: AWS::Include` at the top level without the required `Location` parameter. Removed the top-level transform because the example already uses `Fn::Transform` at the include location.
- The IAM policy snippet used the YAML shorthand `!Sub`. AWS documents that `AWS::Include` snippets don't support YAML shorthand notation, so it was changed to long-form `Fn::Sub`.
- The SAM example listed `AWS::Include` as a top-level transform without parameters. Removed it from the top-level transform list and kept the embedded `Fn::Transform` include.
- The change-set preview command used a new stack name but omitted `--change-set-type CREATE`. Added the flag because the AWS CLI defaults to `UPDATE`, which can't create a change set for a new stack.
- The best-practice note suggested using specific S3 object versions in S3 URLs. AWS::Include accepts an S3 URI to a file, not a version-pinned object URL, so the guidance was changed to recommend immutable object keys or versioned prefixes.

## Review Notes
The remaining examples are technically consistent with AWS::Include placement rules: it can be used in most template sections except the parameters section and template version. Snippets should remain valid key-value objects, and stack updates are still required before changed snippet contents affect an existing stack.
