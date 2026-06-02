# Validation Summary: How to Troubleshoot EC2 Instance Launch Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon EC2
- AWS CLI
- AWS Service Quotas
- IAM policies
- Amazon EBS
- AWS KMS
- Amazon Linux AMI discovery

## Sources Consulted
- AWS EC2 User Guide: Troubleshoot Amazon EC2 instance launch issues: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html
- AWS CLI Command Reference: ec2 run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: ec2 describe-instance-type-offerings: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-type-offerings.html
- AWS EC2 User Guide: Example policies to control access to the Amazon EC2 API: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ExamplePolicies_EC2.html
- AWS CLI Command Reference: ec2 modify-subnet-attribute: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- AWS CLI Command Reference: ec2 import-key-pair: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-key-pair.html
- Amazon EBS User Guide: Quotas for Amazon EBS: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-resource-quotas.html
- AWS KMS Developer Guide: Default key policy and grants for AWS resources: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- Amazon Linux 2023 User Guide: AL2023 on Amazon EC2: https://docs.aws.amazon.com/linux/al2023/ug/get-started.html

## Issues Found
- The post described launch errors as being listed "in order of frequency" without a verifiable official basis. Changed this to "common errors you may encounter."
- The InsufficientInstanceCapacity examples used `--dry-run` as a capacity test. AWS CLI documentation states dry run checks permissions and returns `DryRunOperation` or `UnauthorizedOperation`; it does not test real-time EC2 capacity. Updated the text and examples to use `describe-instance-type-offerings` for offered AZs and real launch attempts for capacity testing.
- The AMI lookup example used an Amazon Linux 2 image-name filter. Amazon Linux 2 reaches end of support on June 30, 2026, so the example was updated to use the current Amazon Linux 2023 public SSM parameter.
- The IAM policy and missing-permissions list omitted `key-pair/*`, which AWS includes in RunInstances resource-level policy examples when key pairs are used. Added the key pair resource and mention.
- The EBS quota example was labeled as a generic volume limit, but quota code `L-D18FCD1D` is the gp2 EBS storage quota in TiB. Updated the heading and comment accordingly.
- The debugging script labeled its final dry run as a launch test. Updated it to clarify that the dry run is a permission test.

## Review Notes
The remaining AWS CLI commands and flags checked are current and consistent with AWS CLI v2 documentation. The internal OneUptime links are plausible blog links but were not treated as authoritative technical sources.
