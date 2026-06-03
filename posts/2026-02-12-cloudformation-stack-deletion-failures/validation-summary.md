# Validation Summary: How to Handle CloudFormation Stack Deletion Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- Amazon S3
- Amazon EC2 security groups, VPCs, ENIs, and NAT gateways
- AWS Lambda VPC networking
- AWS IAM roles and policies
- CloudFormation custom resources

## Sources Consulted
- AWS CloudFormation API Reference: DeleteStack - https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_DeleteStack.html
- AWS CLI Command Reference: cloudformation delete-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/delete-stack.html
- AWS CloudFormation User Guide: Troubleshooting CloudFormation - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html
- AWS CloudFormation Template Reference: DeletionPolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CLI Command Reference: s3api delete-objects - https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-objects.html
- AWS CLI Command Reference: ec2 describe-network-interfaces - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html
- AWS CLI Command Reference: ec2 detach-network-interface - https://docs.aws.amazon.com/cli/latest/reference/ec2/detach-network-interface.html
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CloudFormation User Guide: cfn-response module - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-lambda-function-code-cfnresponsemodule.html

## Issues Found
- The post listed `DeletionPolicy: Retain` as a deletion failure blocker. AWS documents `Retain` as a policy that lets stack deletion complete while leaving the physical resource behind, so I changed that blocker to stack termination protection.
- The blocker list called out resources manually deleted but still in CloudFormation state. That is more commonly documented as a stack consistency risk for out-of-band modifications, so I broadened the wording to resources modified outside of CloudFormation.
- The `--retain-resources` section did not state that the flag is for stacks in `DELETE_FAILED`. I added that condition to match the CloudFormation API and AWS CLI documentation.
- The S3 versioned-bucket cleanup commands described deleting "version markers" and built a `delete-objects` payload that could exceed S3's 1,000-object limit for multi-object delete. I changed the wording to "object versions," used `file://` JSON payloads shaped for `DeleteObjects`, added `--max-items 1000`, and noted that the version and delete-marker steps must be repeated until empty.
- The recovery script emptied only current S3 objects, which would leave object versions and delete markers in versioned buckets. I added a loop that deletes versions and delete markers in 1,000-item batches.
- The ENI section recommended detaching and deleting orphaned ENIs without distinguishing customer-managed ENIs from Lambda/service-managed ENIs. I added fields that help identify managed ENIs and changed the guidance to wait for Lambda cleanup after removing the Lambda VPC configuration or deleting the function.

## Review Notes
- AWS CLI is not installed in this workspace, so CLI option validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
- The shell recovery script block was checked with `bash -n`.
