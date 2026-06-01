# Validation Summary: How to Use Launch Templates for EC2 Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- EC2 launch templates
- Amazon EC2 Auto Scaling
- AWS CLI
- EC2 Spot Instances
- EC2 user data
- IAM instance profiles
- EBS volumes
- IMDSv2
- AWS Systems Manager Parameter Store

## Sources Consulted
- Amazon EC2 User Guide: Store instance launch parameters in Amazon EC2 launch templates - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html
- Amazon EC2 User Guide: Create an Amazon EC2 launch template - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-launch-template.html
- Amazon EC2 User Guide: Modify a launch template - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-launch-template-versions.html
- Amazon EC2 User Guide: Delete a launch template or a launch template version - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/delete-launch-template.html
- AWS CLI Command Reference: ec2 create-launch-template - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: ec2 modify-launch-template - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-launch-template.html
- Amazon EC2 Auto Scaling User Guide: Auto Scaling launch templates - https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html
- Amazon EC2 Auto Scaling User Guide: Auto Scaling launch configurations - https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html
- Amazon EC2 Auto Scaling User Guide: Use multiple launch templates - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-launch-template-overrides.html
- Amazon EC2 Auto Scaling User Guide: Troubleshoot AMI issues - https://docs.aws.amazon.com/autoscaling/ec2/userguide/ts-as-ami.html
- AWS CLI Command Reference: autoscaling start-instance-refresh - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/start-instance-refresh.html

## Issues Found
- The mixed instance Auto Scaling example listed `m5.large` alongside `m7g.large`, `m6g.large`, and `c7g.large`. `m5.large` is x86_64 while the other examples are Graviton/Arm, and AWS documents that mixed instance policies must use instance types compatible with the AMI unless separate launch templates/AMIs are supplied. Changed `m5.large` to `c6g.large` so the example stays within the same architecture family.
- The deletion section said a launch template version cannot be deleted if an ASG is using it. AWS documents the hard restriction for the default version, not for any ASG reference. Reworded the note to say that default versions cannot be deleted and that ASGs referencing a specific version should be updated before that version is deleted to avoid future launch failures.

## Review Notes
- AWS CLI examples use valid command names and option structures for EC2 launch templates, launch template versions, Auto Scaling groups, mixed instances policies, and instance refresh.
- The user data example correctly base64-encodes user data for the launch template API.
- Launch configurations are correctly described as legacy; AWS no longer supports new EC2 instance types in launch configurations and newer accounts cannot create launch configurations.
- The recommendation to use Systems Manager parameters for AMI IDs is current for launch templates, with the usual caveat that the parameter must be in a supported AMI ID parameter format.
