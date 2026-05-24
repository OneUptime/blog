# Validation Summary: How to Create ECS with EC2 Launch Type in Terraform

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (HCL, AWS provider)
- Amazon ECS (Elastic Container Service) with EC2 launch type
- Amazon EC2 (Launch Templates, Auto Scaling Groups)
- AWS IAM (roles, instance profiles, managed policies)
- AWS Application Load Balancer (ALB) and Target Groups
- AWS Systems Manager Parameter Store (SSM)
- AWS CloudWatch Logs
- Amazon Linux 2023 ECS-optimized AMI
- Container bridge networking with dynamic port mapping

## Sources Consulted
- AWS Terraform Provider docs for `aws_ecs_cluster`, `aws_ecs_service`, `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS Terraform Provider docs for `aws_launch_template`, `aws_autoscaling_group`, `aws_autoscaling_policy`
- AWS Terraform Provider docs for `aws_lb`, `aws_lb_target_group`, `aws_lb_listener`
- AWS ECS Developer Guide — ECS-optimized AMI SSM parameter paths: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
- AWS ECS Developer Guide — ECS agent configuration variables (`ECS_CLUSTER`, `ECS_ENABLE_CONTAINER_METADATA`, `ECS_ENABLE_SPOT_INSTANCE_DRAINING`): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html
- AWS Managed Policy reference for `AmazonEC2ContainerServiceforEC2Role`, `AmazonSSMManagedInstanceCore`, `AmazonECSTaskExecutionRolePolicy`
- AWS ECS task placement strategy docs (`spread` with `attribute:ecs.availability-zone`, `binpack` with `memory`)

## Issues Found
No technical issues found.

## Review Notes
- The legacy AWS managed policy `AmazonEC2ContainerServiceforEC2Role` is still functional and commonly used; AWS hasn't removed it, but operators should be aware that for new clusters AWS recommends scoping permissions more tightly with custom policies based on the same actions.
- `containerInsights = "enabled"` is correct; AWS has since introduced an `"enhanced"` value for Container Insights with enhanced observability. Either is valid depending on cost/feature needs.
- The ECS instance security group ingress allows TCP 0–65535 from the ALB SG to accommodate dynamic port mapping. Operators may prefer narrowing this to the ephemeral port range (32768–60999), which is the actual range used by the ECS agent for dynamic host ports.
- The `nginx:1.25-alpine` image does not ship a `/health` endpoint by default — the ALB target group health check pointed at `/health` will fail unless nginx is configured to serve that path. The post's health-check example with `wget` works against busybox in alpine, but the application-level concern of having a `/health` route is left to the reader.
- `data.aws_ssm_parameter.ecs_ami.value` returns the AMI ID as plaintext; in newer Terraform AWS provider versions, the recommended approach for AMI ID parameters is sometimes `nonsensitive(data.aws_ssm_parameter.ecs_ami.value)` if the provider treats it as sensitive, but the current usage works.
- The `protect_from_scale_in = true` setting requires that scale-in protection also be configured on the ECS capacity provider or managed termination protection at the ASG level — readers using a capacity provider should be aware of the interaction.
