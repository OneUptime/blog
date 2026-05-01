# Validation Summary: How to Configure EC2 Elastic Network Interfaces with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS EC2
- Elastic Network Interfaces (ENIs)
- Elastic IP addresses
- AWS VPC networking
- HashiCorp AWS provider

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/
- OpenTofu `init` docs: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS EC2 ENI overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html
- AWS EC2 ENI attachments: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network-interface-attachments.html
- AWS EC2 multi-ENI scenarios: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/scenarios-enis.html
- AWS provider `aws_network_interface`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface
- AWS provider `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_network_interface_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface_attachment
- AWS provider `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- AWS provider `aws_eip_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip_association
- AWS provider changelog noting `aws_instance.network_interface` deprecation: https://github.com/hashicorp/terraform-provider-aws/blob/main/CHANGELOG.md

## Issues Found
- The introduction stated that ENIs can be moved between instances without noting the AWS same-Availability-Zone restriction. I corrected the wording to match the EC2 documentation.
- The standalone ENI example said it was disabling source/destination checks while the code set `source_dest_check = true`. I corrected the comment so it matches the actual setting and AWS default behavior.
- The instance example used `network_interface` blocks inside `aws_instance`. That block is deprecated in the current AWS provider. I replaced it with `primary_network_interface` for the primary ENI and `aws_network_interface_attachment` for the secondary ENI.
- The conclusion described reattaching the ENI to a replacement instance without noting the same-Availability-Zone requirement. I corrected that limitation there as well.

## Review Notes
The `tofu` CLI was not installed in the local environment, so the deployment commands were validated against the official OpenTofu documentation rather than local `--help` output.
