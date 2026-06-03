# Validation Summary: How to Use CloudFormation WaitConditions and CreationPolicies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- AWS::CloudFormation::WaitCondition
- AWS::CloudFormation::WaitConditionHandle
- CloudFormation CreationPolicy
- Amazon EC2
- Amazon EC2 Auto Scaling
- cfn-signal
- cfn-init
- curl

## Sources Consulted
- AWS CloudFormation Template Reference: CreationPolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html
- AWS CloudFormation User Guide: Create wait conditions in a CloudFormation template - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-waitcondition.html
- AWS CloudFormation Template Reference: cfn-signal - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-signal.html
- AWS CloudFormation Template Reference: AWS::CloudFormation::WaitCondition - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitcondition.html

## Issues Found
- The Auto Scaling Group example ran `cfn-init` against `MyLaunchTemplate`, but the snippet did not define `AWS::CloudFormation::Init` metadata on that resource. Replaced that placeholder command with simple package installation commands so the example is internally consistent while still demonstrating signaling the ASG.
- The WaitCondition example used resource-signaling syntax for `cfn-signal` (`--stack`, `--resource`, `--region`) while describing signaling through a WaitConditionHandle URL. Updated the command to pass the WaitConditionHandle URL directly, which matches the documented `cfn-signal` syntax for wait condition handles.
- The WaitCondition data section said a value could be extracted with `Fn::Select` and `Fn::GetAtt`. AWS documents that `Fn::GetAtt WaitCondition.Data` returns the signal data as a JSON name/value object; `Fn::Select` does not parse JSON objects. Updated the text to describe the returned JSON object accurately.
- The examples used `/opt/aws/bin/cfn-signal` without ensuring the CloudFormation helper scripts were installed. Added `yum install -y aws-cfn-bootstrap` to the instance bootstrap snippets, matching AWS's documented helper-script examples.

## Review Notes
- AWS documentation recommends using CreationPolicy for Amazon EC2 and Auto Scaling resources instead of classic wait conditions.
- WaitCondition responses sent to a WaitConditionHandle use a presigned Amazon S3 URL. In VPCs using PrivateLink, responding resources need access to the required CloudFormation-specific S3 buckets.
