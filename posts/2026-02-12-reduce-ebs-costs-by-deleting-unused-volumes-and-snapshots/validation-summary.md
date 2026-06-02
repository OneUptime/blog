# Validation Summary: How to Reduce EBS Costs by Deleting Unused Volumes and Snapshots

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Elastic Block Store (EBS)
- Amazon EBS snapshots
- Amazon EC2
- AWS CLI
- AWS Lambda
- Amazon SNS
- Amazon EventBridge
- Amazon Data Lifecycle Manager (DLM)
- Python and boto3

## Sources Consulted
- AWS CLI Command Reference: describe-volumes - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI Command Reference: describe-snapshots - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-snapshots.html
- AWS CLI Command Reference: create-snapshot - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- AWS CLI Command Reference: create-lifecycle-policy - https://docs.aws.amazon.com/cli/latest/reference/dlm/create-lifecycle-policy.html
- Amazon EBS User Guide: How Amazon EBS snapshots work - https://docs.aws.amazon.com/ebs/latest/userguide/how_snapshots_work.html
- Amazon EBS pricing - https://aws.amazon.com/ebs/pricing/
- Amazon EC2 User Guide: Keep an Amazon EBS root volume after an Amazon EC2 instance terminates - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-root-volume-delete-on-termination.html
- Amazon EC2 User Guide: How instance termination works - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-termination-works.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Boto3 documentation: EC2 describe_volumes - https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_volumes.html
- OneUptime linked blog post - https://oneuptime.com/blog/post/2026-02-12-identify-idle-and-unused-aws-resources/view

## Issues Found
- The pricing paragraph overstated a single EBS volume price range and did not clearly account for regional variation or lower-cost HDD classes. Updated it to refer to common US-region gp2/gp3 and snapshot pricing while noting that other classes vary.
- Snapshot age examples used a fixed `2025-11-12T00:00:00` cutoff. Replaced those with a dynamic `cutoff_date=$(date -u -d '90 days ago' +%Y-%m-%d)` value so the commands remain accurate after publication.
- The snapshot "cost summary" commands did not calculate cost. Renamed the section text and comment to describe them as an inventory summary and upper-bound source volume size estimate.
- The bulk volume deletion example claimed to delete volumes older than 14 days but only filtered by tag and availability. Added a dynamic 14-day cutoff and a JMESPath check against the `ReviewDate` tag.
- The EventBridge scheduling commands did not grant EventBridge permission to invoke the Lambda function. Added the required `aws lambda add-permission` command.
- The DLM example said it retained snapshots for 30 days but used `RetainRule: {"Count": 30}`, which keeps the latest 30 snapshots. Changed it to `RetainRule: {"Interval": 30, "IntervalUnit": "DAYS"}`.
- The manual snapshot cleanup comment said "match a specific pattern" but no pattern was used. Updated the comment to accurately say it deletes snapshots older than 90 days.
- The prevention section used "EC2 termination protection" for the EBS `DeleteOnTermination` setting. Renamed it to "delete-on-termination" to avoid confusing it with EC2 instance termination protection.

## Review Notes
The AWS CLI was not installed in the local workspace, so commands were reviewed against official AWS documentation rather than executed locally. The shell date examples use GNU `date -d`, which is appropriate for common Linux environments such as AWS CloudShell but would need adjustment on macOS.
