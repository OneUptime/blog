# Validation Summary: How to Delete CloudFormation Stacks Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- CloudFormation templates
- Amazon S3
- Amazon RDS
- AWS infrastructure deletion safeguards

## Sources Consulted
- AWS CloudFormation DeletionPolicy attribute documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html
- AWS CloudFormation stack termination protection documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-protect-stacks.html
- AWS CLI `cloudformation delete-stack` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/delete-stack.html
- AWS CLI `cloudformation update-termination-protection` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-termination-protection.html
- AWS CLI `cloudformation list-imports` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-imports.html
- AWS CLI `s3api list-object-versions` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `s3api delete-objects` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-objects.html
- Amazon S3 bucket deletion documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-bucket.html

## Issues Found
- The introduction said stack deletion removes every managed resource. CloudFormation attempts to delete stack resources, but deletion can be skipped by policies or fail for resources such as non-empty S3 buckets, so the wording was changed to "attempts to remove."
- The data-bearing resources list used "Elasticsearch domains." AWS now presents this service as OpenSearch Service, so the wording was updated.
- The DeletionPolicy section described three options and called `Delete` the default without caveats. Current CloudFormation documentation also includes `RetainExceptOnCreate`, and `Delete` is the default for most resources but not all, so the table was updated.
- The versioned S3 bucket cleanup example only deleted object versions and did not delete delete markers. It was replaced with a guarded `list-object-versions` plus `delete-objects` example that includes both versions and delete markers.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI behavior was verified against current AWS CLI command reference documentation instead of local `aws help` output. The reviewed CloudFormation commands and template attributes are current and technically valid after the fixes.
