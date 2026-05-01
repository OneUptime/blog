# Validation Summary: How to Create EC2 Dedicated Hosts with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS Provider for OpenTofu
- Amazon EC2 Dedicated Hosts
- Amazon EC2 Dedicated Instances
- AWS License Manager

## Sources Consulted
- OpenTofu CLI `init` documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- AWS provider `aws_ec2_host` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_host.html.markdown
- AWS provider `aws_instance` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_licensemanager_license_configuration` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/licensemanager_license_configuration.html.markdown
- AWS provider `aws_ec2_host` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ec2_host.html.markdown
- AWS EC2 Dedicated Hosts overview and behavior: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-understanding.html
- AWS EC2 Dedicated Host recovery behavior: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-recovery-basics.html
- AWS Microsoft workload licensing guidance: https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-microsoft-workloads-aws/licensing-microsoft-workloads.html

## Issues Found
- The post used a Windows Server 2022 BYOL example. AWS's current Microsoft licensing guidance says Windows Server BYOL on EC2 Dedicated Hosts is available for version 2019 or earlier with eligible licenses. I updated the Windows BYOL example and License Manager description to remove the 2022 claim and align them with the current guidance.
- The section titled "Configure Host Resource Groups" did not configure a host resource group; it created an AWS License Manager license configuration. I renamed the section and updated the example to use `Core` counting with `#allowedTenancy=EC2-DedicatedHost`, which matches Dedicated Host BYOL usage.
- The HCL snippets referenced `data.aws_ami.windows.id` and `data.aws_ami.amazon_linux.id` without defining those data sources. I replaced them with explicit input variables so the examples are syntactically complete.
- The `available_vcpus` output referenced `aws_ec2_host` resource attributes that are not exported by the resource. I replaced it with a documented `data "aws_ec2_host"` lookup and a `total_vcpus` output.
- The explanations of `auto_placement` and `host_recovery` were too broad or imprecise. I corrected the wording to match the AWS documentation and clarified that the subnet must be in the same Availability Zone as the Dedicated Host.

## Review Notes
- The `tofu` CLI was not available in the review environment, so I verified command usage and HCL field names against the official OpenTofu, AWS, and AWS provider documentation rather than running `tofu validate`.
- Host resource groups remain a distinct AWS License Manager feature. This post now accurately shows a License Manager license configuration, but it does not demonstrate creating a host resource group with OpenTofu.
