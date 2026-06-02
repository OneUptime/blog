# Validation Summary: How to Migrate EC2 Instances Between Availability Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon EBS
- Amazon Machine Images (AMIs)
- AWS CLI
- Elastic IP addresses
- Elastic Load Balancing target groups
- Availability Zones

## Sources Consulted
- AWS CLI Command Reference: `ec2 create-image` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-image.html
- AWS CLI Command Reference: `ec2 run-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: `ec2 describe-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: `ec2 create-volume` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-volume.html
- AWS CLI Command Reference: `ec2 create-tags` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-tags.html
- AWS CLI Command Reference: `ec2 wait instance-status-ok` - https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/instance-status-ok.html
- AWS CLI Command Reference: `elbv2 wait target-in-service` - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/elbv2/wait/target-in-service.html
- Amazon EC2 User Guide: Regions and Availability Zones - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html
- Amazon EC2 User Guide: Create a network interface - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-network-interface.html
- Amazon EC2 User Guide: Data persistence for instance store volumes - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-lifetime.html
- Amazon EC2 User Guide: Placement groups - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html
- Amazon EBS overview: volumes and Availability Zones - https://aws.amazon.com/ebs/getting-started/

## Issues Found
- The AMI migration example verified instance health immediately after `instance-running`. `describe-instance-status` can still be initializing or empty at that point, so I added `aws ec2 wait instance-status-ok` before the status query.
- The automation script queried `IamInstanceProfile.Name` from `describe-instances`, but that response contains `Arn` and `Id`, not `Name`. I changed the script to query `IamInstanceProfile.Arn` and pass it to `run-instances` as `--iam-instance-profile Arn=...`.
- The automation script built an AWS CLI command as a string and executed it with `eval`, which could break with shell quoting around tags and profile values. I changed it to use a bash argument array.
- The automation script tried to copy source tags through `run-instances --tag-specifications` using shell-interpolated nested JSON. I changed it to copy tags after launch with `aws ec2 create-tags --resources ... --tags "$TAGS"`, matching the AWS CLI tag parameter format.

## Review Notes
The post is technically sound after the fixes. The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI documentation and EC2/EBS user guide pages.
