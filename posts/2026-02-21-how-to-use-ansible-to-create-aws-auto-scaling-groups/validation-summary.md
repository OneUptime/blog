# Validation Summary: How to Use Ansible to Create AWS Auto Scaling Groups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- community.aws Ansible collection
- AWS EC2 Auto Scaling
- EC2 launch templates
- CloudWatch alarms
- AWS CLI
- Application Load Balancer target groups

## Sources Consulted
- Ansible community.aws.ec2_launch_template module documentation: https://docs.ansible.com/ansible/9/collections/community/aws/ec2_launch_template_module.html
- Ansible amazon.aws.autoscaling_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/autoscaling_group_module.html
- Ansible amazon.aws.cloudwatch_metric_alarm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudwatch_metric_alarm_module.html
- AWS CLI put-scaling-policy documentation: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scaling-policy.html
- AWS CLI put-scheduled-update-group-action documentation: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scheduled-update-group-action.html
- AWS CLI start-instance-refresh documentation: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/start-instance-refresh.html
- AWS EC2 Auto Scaling termination policy documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-termination-policies.html
- AWS EC2 Auto Scaling DeleteAutoScalingGroup API documentation: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_DeleteAutoScalingGroup.html

## Issues Found
- The launch template example used `tag_specifications`, which is not a documented parameter of `community.aws.ec2_launch_template`. Removed that block and kept the supported `tags` parameter.
- The target tracking policy placed `ScaleOutCooldown` and `ScaleInCooldown` inside the EC2 Auto Scaling `--target-tracking-configuration` JSON. Those fields are not part of the EC2 Auto Scaling target tracking configuration. Replaced them with the supported `--estimated-instance-warmup` option and corrected the explanation.
- The prerequisites omitted the AWS CLI even though several examples use `aws autoscaling` commands. Added AWS CLI to the prerequisite list.
- The mixed instances policy example used the nested AWS API/CloudFormation-style launch template and overrides structure instead of the `amazon.aws.autoscaling_group` input shape. Updated it to use top-level `launch_template` and `mixed_instances_policy.instance_types`.
- The deletion example used `force_delete: true` on `amazon.aws.autoscaling_group`, but that parameter is not documented for the module. Replaced it with the AWS CLI `delete-auto-scaling-group --force-delete` command and adjusted the explanation.

## Review Notes
The step scaling section assumes `scale_out_policy_arn` and `scale_in_policy_arn` already exist. A future improvement would be to add the policy creation tasks before the CloudWatch alarms, but the alarm parameters shown are valid for the referenced Ansible module.
