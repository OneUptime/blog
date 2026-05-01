# Validation Summary: How to Set Up ECS Capacity Providers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS ECS
- Amazon EC2 Auto Scaling
- ECS capacity providers
- ECS services
- AWS CLI

## Sources Consulted
- AWS ECS capacity providers for EC2 workloads: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/asg-capacity-providers.html
- AWS ECS managed scaling behavior: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-scaling-behavior.html
- AWS ECS cluster auto scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-auto-scaling.html
- AWS ECS managed termination protection: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-termination-protection.html
- AWS ECS container metadata: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/enable-metadata.html
- AWS ECS task metadata on EC2: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ec2-metadata.html
- Amazon Linux 2023 IMDSv2 defaults: https://docs.aws.amazon.com/linux/al2023/ug/imdsv2.html
- AWS CLI `describe-capacity-providers`: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-capacity-providers.html
- HashiCorp AWS provider `aws_ecs_capacity_provider`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_capacity_provider.html.markdown
- HashiCorp AWS provider `aws_ecs_cluster_capacity_providers`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_cluster_capacity_providers.html.markdown
- HashiCorp AWS provider `aws_ecs_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- HashiCorp AWS provider `aws_autoscaling_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- HashiCorp AWS provider `aws_launch_template`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- HashiCorp AWS provider `aws_ami`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown

## Issues Found
- The service example incorrectly mixed an Auto Scaling group capacity provider with `FARGATE_SPOT` in one `capacity_provider_strategy`. I removed the `FARGATE_SPOT` block and corrected the conclusion because AWS documents that a single capacity provider strategy can contain Auto Scaling group providers or Fargate providers, but not both.
- The service example did not enforce the documented requirement that a capacity provider must be associated with the cluster before it is used in a service strategy. I added `depends_on = [aws_ecs_cluster_capacity_providers.main]` so OpenTofu applies the cluster association before creating the service.
- The comment on `http_put_response_hop_limit = 2` claimed it was required for ECS container metadata. I changed the comment to describe its actual purpose more accurately: allowing IMDSv2 access from containerized workloads.

## Review Notes
- The example uses `c6g.xlarge` and the Amazon ECS-optimized AL2023 `arm64` AMI, so the referenced task definition and container images must be compatible with ARM64.
- `managed_draining` is omitted from the capacity provider resource, which is acceptable with the current AWS provider because the default on create is `ENABLED`.
