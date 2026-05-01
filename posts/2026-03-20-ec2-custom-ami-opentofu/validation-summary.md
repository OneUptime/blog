# Validation Summary: How to Create EC2 Instances with Custom AMIs in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- AWS IAM instance profiles
- Amazon Machine Images (AMIs)
- Amazon Linux 2023

## Sources Consulted
- OpenTofu data sources documentation: https://raw.githubusercontent.com/opentofu/opentofu/main/website/docs/language/data-sources/index.mdx
- OpenTofu `count` meta-argument documentation: https://raw.githubusercontent.com/opentofu/opentofu/main/website/docs/language/meta-arguments/count.mdx
- Terraform AWS provider `aws_ami` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- Terraform AWS provider `aws_instance` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- Terraform AWS provider `aws_iam_instance_profile` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_instance_profile.html.markdown
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Amazon Linux 2023 on EC2 documentation: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- Amazon Linux 2023 package management documentation: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html

## Issues Found
- The `aws_instance` example base64-encoded the heredoc while assigning it to `user_data`. The AWS provider documentation expects plain text for `user_data` and reserves pre-encoded payloads for `user_data_base64`, so I changed the snippet to pass the heredoc directly.
- The post claimed the instance would use the golden AMI "if available" and otherwise fall back to Amazon Linux, but the `data "aws_ami" "golden"` lookup was unconditional. OpenTofu reads data resources during planning, so a missing golden AMI would still fail the run. I added `count = var.use_golden_image ? 1 : 0` to the data source and updated references to `data.aws_ami.golden[0]` so the lookup is only performed when the golden-image path is enabled.
- The conclusion said `most_recent = true` ensures use of the "latest approved image." The provider only guarantees selection of the most recent matching AMI. I updated the wording to reflect the actual behavior.

## Review Notes
- The AL2023 AMI name filter is technically valid for Amazon-published x86_64 images when combined with `owners = ["amazon"]`.
- The `yum update -y` command remains valid on Amazon Linux 2023 because AWS documents `yum` as a pointer to `dnf`, but the example implicitly assumes the custom golden AMI is Amazon Linux-based.
