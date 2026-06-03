# Validation Summary: How to Use CodeDeploy with Auto Scaling Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeDeploy
- Amazon EC2 Auto Scaling
- Amazon EC2 launch templates
- AWS CLI
- Elastic Load Balancing target groups
- CloudWatch alarms
- Linux user data and CodeDeploy agent installation

## Sources Consulted
- AWS CodeDeploy User Guide: Integrating CodeDeploy with Amazon EC2 Auto Scaling - https://docs.aws.amazon.com/codedeploy/latest/userguide/integrations-aws-auto-scaling.html
- AWS CodeDeploy User Guide: Troubleshoot Amazon EC2 Auto Scaling issues - https://docs.aws.amazon.com/codedeploy/latest/userguide/troubleshooting-auto-scaling.html
- AWS CodeDeploy User Guide: Install the CodeDeploy agent for Amazon Linux or RHEL - https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent-operations-install-linux.html
- AWS CodeDeploy User Guide: Working with the CodeDeploy agent - https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent.html
- AWS CLI Command Reference: deploy create-deployment-group - https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment-group.html
- AWS CLI Command Reference: deploy get-deployment - https://docs.aws.amazon.com/cli/latest/reference/deploy/get-deployment.html
- Amazon EC2 Auto Scaling User Guide: How lifecycle hooks work in Auto Scaling groups - https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks-overview.html
- Amazon Linux 2023 User Guide: IMDSv2 - https://docs.aws.amazon.com/linux/al2023/ug/imdsv2.html

## Issues Found
- The sequence diagram said CodeDeploy installs the CodeDeploy agent on a new EC2 instance. CodeDeploy requires the agent to already be installed and running on EC2 instances, so the diagram now shows the agent polling CodeDeploy for deployment work.
- The user data example used an IMDSv1 metadata request and `service codedeploy-agent status`. Updated it to retrieve the region with an IMDSv2 token and to use `systemctl status codedeploy-agent`, matching current AWS guidance for supported Amazon Linux/RHEL systems.
- The scale-out section said instances launched during an active deployment get only the previous successful revision. AWS documents that CodeDeploy updates them with the previous revision first, then by default starts a follow-on deployment after the original deployment succeeds to update outdated instances. The post now includes that behavior.
- The blue/green section said the old ASG gets scaled down. AWS documentation describes termination of instances in the original environment after the configured wait time, so the wording was changed to avoid implying that CodeDeploy necessarily deletes or scales the original ASG itself.
- The CloudWatch alarm example was described as setting a maximum number of failed instances. CodeDeploy alarm configuration stops deployments when configured CloudWatch alarms enter ALARM state; the wording and command comment now reflect that.
- The suspend/resume section described `aws autoscaling suspend-processes --scaling-processes Launch` as suspending the CodeDeploy lifecycle hook. That command suspends the ASG Launch process for the whole Auto Scaling Group, so the text and comments now describe the broader effect accurately.

## Review Notes
- The AWS CLI examples use valid current option names and structures for CodeDeploy deployment groups, deployment styles, load balancer target group info, blue/green configuration, alarm configuration, and deployment creator lookup.
- The `--load-balancer-info targetGroupInfoList=[{name=MyApp-TG}]` examples are syntactically consistent with AWS CLI shorthand for target group names, but real deployments must use the target group name expected by CodeDeploy and must already have the appropriate load balancer/target group setup.
- The post correctly focuses on EC2/On-Premises CodeDeploy deployments with Auto Scaling Groups. It does not apply to ECS or Lambda CodeDeploy deployment groups.
