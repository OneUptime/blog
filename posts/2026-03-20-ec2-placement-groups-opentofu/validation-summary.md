# Validation Summary: How to Set Up EC2 Placement Groups with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS
- Amazon EC2
- EC2 Placement Groups
- AWS provider for Terraform/OpenTofu

## Sources Consulted
- AWS EC2 User Guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html
- AWS EC2 User Guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html
- AWS EC2 API Reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_LaunchTemplatePlacementRequest.html
- AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_placement_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/placement_group
- AWS provider `aws_launch_template` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- OpenTofu `init` docs: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` docs: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The `aws_instance` examples used `placement_group = aws_placement_group.<name>.id`. In the AWS provider, `placement_group` expects the placement group name, while `placement_group_id` is the separate ID-based field. I changed the examples to use `.name` for clarity and correctness.
- The partition placement group section claimed the example was explicitly assigning brokers to partitions, but the snippet did not set `placement_partition_number`. I corrected the comments and removed the misleading `Partition` tag so the example now accurately reflects AWS behavior: EC2 attempts to distribute instances evenly across partitions, but does not guarantee perfect distribution unless you explicitly place instances.
- The spread placement group comments were slightly imprecise about limits. I updated them to match AWS documentation that the limit is seven running instances per Availability Zone per spread placement group.
- The conclusion overstated cluster placement group requirements by saying they require the same instance type and described the latency characteristics too strongly. I updated it to match AWS guidance: cluster groups must stay within a single Availability Zone, and using the same instance type is recommended to improve the chance of a successful launch.
- The launch template section did not mention the single-AZ constraint that applies when using a cluster placement group. I clarified the inline comment so the example is not misleading when paired with an Auto Scaling Group.

## Review Notes
- OpenTofu CLI commands in the post (`tofu init`, `tofu plan`, `tofu apply`) remain current as of 2026-05-01.
- The snippets assume surrounding provider configuration plus definitions for `data.aws_ami.amazon_linux` and `var.subnet_id`; that is acceptable for a focused infrastructure example.
