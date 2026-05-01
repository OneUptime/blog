# Validation Summary: How to Use Dynamic Blocks for Tag Propagation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon EC2 Auto Scaling
- Amazon ECS
- AWS tagging

## Sources Consulted
- OpenTofu `dynamic` blocks documentation: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- OpenTofu `merge` function documentation: https://opentofu.org/docs/language/functions/merge/
- HashiCorp AWS provider `aws_autoscaling_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- HashiCorp AWS provider `aws_ecs_service` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- HashiCorp AWS provider `aws_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider `aws_launch_template` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- Amazon ECS service definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- Amazon EC2 Auto Scaling tag propagation guide: https://docs.aws.amazon.com/autoscaling/ec2/userguide/add-tags.html

## Issues Found
- The introduction said Auto Scaling Groups "require dynamic tag blocks." I corrected this to say they require individual `tag` blocks instead, because `dynamic` blocks are an OpenTofu technique for generating repeated nested blocks, not an AWS provider requirement by themselves.
- The section heading `ECS Task Definition Tag Propagation` did not match the example, which uses `propagate_tags = "SERVICE"` and service-level tags. I corrected the heading to `ECS Service Tag Propagation`.

## Review Notes
- No code syntax issues were found in the OpenTofu examples after those corrections.
- One caveat for future revisions: `propagate_at_launch` covers Auto Scaling Group tags copied to launched EC2 instances, but launch-time tagging for related resources like EBS volumes or ENIs is handled separately through launch template `tag_specifications`.
