# Validation Summary: How to Fix EC2 Instance Stuck in Pending State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon EC2
- Amazon EBS
- AWS KMS
- Amazon VPC
- Elastic Network Interfaces
- AWS IAM instance profiles
- AWS CloudTrail
- AWS CLI

## Sources Consulted
- Amazon EC2 instance state changes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- Troubleshoot Amazon EC2 instance launch issues: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshooting-launch.html
- AWS CLI `ec2 run-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI `cloudtrail lookup-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Amazon VPC quotas: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- Amazon EBS quotas: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-resource-quotas.html
- Use encryption with EBS-backed AMIs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIEncryption.html

## Issues Found
- The post described quota code `L-D18FCD1D` as an EBS volume count limit and compared it to `length(Volumes)`. That quota is for gp2 EBS storage capacity in TiB, so the example now describes it as a gp2 storage quota and sums gp2 volume sizes instead of counting volumes.
- The post said EBS creation or encrypted-volume failures would silently hang in pending. AWS documentation describes these as launch failures or instances moving from `pending` to `terminated`, so the wording was updated to reflect those outcomes.
- The post described ENI quota exhaustion as an AZ limit that leaves instances stuck. AWS documents the network interfaces quota as a Regional quota enforced per Availability Zone, so the wording was corrected and made less absolute.
- The post said missing instance profiles or missing `iam:PassRole` permission can make a launch stall. AWS documents missing launch permissions as launch failures, so the wording now says the launch can fail before the instance reaches running.
- The CloudTrail example used `date -v-1H`, which is a BSD/macOS flag and fails in typical Linux bash environments such as AWS CloudShell. It now uses GNU `date -d '1 hour ago'`.
- The system-log section implied console output is useful even for any stuck pending instance. It now clarifies that console output is useful only if the instance got far enough to start booting.
- The conclusion said pending-state problems are almost always resource-limit issues. That was too broad, so it now says they are often resource-limit or capacity issues.

## Review Notes
The AWS CLI commands and options used in the post are current according to the AWS CLI command reference. The workspace does not have the AWS CLI installed, so command validation was performed against official AWS documentation rather than local `aws --help` output.
