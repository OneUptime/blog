# Validation Summary: How to Use EC2 Global View to Manage Instances Across Regions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 Global View
- Amazon EC2
- Amazon EBS
- Elastic IP addresses
- AWS CLI
- AWS Config aggregators and advanced queries
- Bash
- Python with Boto3
- AWS Lambda

## Sources Consulted
- AWS EC2 User Guide: View resources across Regions using AWS Global View: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/global-view.html
- AWS CLI v2 Command Reference: ec2 describe-regions: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-regions.html
- AWS CLI v2 Command Reference: ec2 describe-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI v2 Command Reference: ec2 describe-volumes: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI v2 Command Reference: ec2 describe-addresses: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-addresses.html
- AWS CLI v2 Command Reference: configservice put-configuration-aggregator: https://docs.aws.amazon.com/cli/latest/reference/configservice/put-configuration-aggregator.html
- AWS CLI v2 Command Reference: configservice select-aggregate-resource-config: https://docs.aws.amazon.com/cli/latest/reference/configservice/select-aggregate-resource-config.html
- AWS Config Developer Guide: Querying the Current Configuration State of AWS Resources: https://docs.aws.amazon.com/config/latest/developerguide/querying-AWS-resources.html
- Boto3 EC2 Client documentation: describe_volumes and describe_addresses: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2.html

## Issues Found
- The post described EC2 Global View as a way to manage resources. AWS documentation says Global View is read-only and does not modify resources, so the description and access section now say it is for viewing/searching and that automation uses regional EC2 APIs.
- The Global View resource list included Elastic IPs, but the AWS EC2 Global View documentation lists VPCs, subnets, instances, security groups, volumes, and Auto Scaling groups in the resource summary. Replaced Elastic IPs with Auto Scaling groups and adjusted the introduction to refer to unused volumes.
- The first API example used `describe-instance-type-offerings`, which lists instance type availability rather than EC2 instances. Removed that unrelated command and kept the cross-region `describe-instances` loop.
- The instance-count JMESPath expression used `length(Reservations[*].Instances[*])`, which counts the nested reservation projection rather than a flattened instance list. Changed it to `length(Reservations[].Instances[])`.
- The dashboard script tried to count unused Elastic IPs with an empty `association-id` filter. The documented `association-id` filter matches association IDs, so the script now uses the response query `Addresses[?AssociationId==null]`.
- The orphaned-resource script labeled stopped instances as "30+ days" based on `LaunchTime`. EC2 `describe-instances` exposes launch time, not the time when an instance entered the stopped state. Updated the label and comment to say "launched 30+ days ago."
- The AWS Config aggregator example used a 9-digit placeholder account ID. AWS Config requires 12-digit account IDs, so the example now uses `123456789012`.

## Review Notes
- The examples are syntactically valid Bash/Python after edits.
- AWS Config advanced queries require AWS Config recording to be enabled for the source accounts and regions being queried.
