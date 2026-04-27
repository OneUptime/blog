# Validation Summary: How to Use Packer Image IDs in OpenTofu Configurations

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- HashiCorp Packer (HCL2 templates)
- OpenTofu (Terraform-compatible)
- AWS AMIs (amazon-ebs builder)
- AWS SSM Parameter Store
- AWS Launch Templates
- GitHub Actions CI/CD

## Sources Consulted
- Packer amazon-ebs builder docs: https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs
- Packer shell-local post-processor docs: https://developer.hashicorp.com/packer/docs/post-processors/shell-local
- Packer machine-readable output format: https://developer.hashicorp.com/packer/docs/internals/machine-readable-format
- Terraform AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider `aws_ami_ids` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami_ids
- AWS CLI `ssm put-parameter` reference

## Issues Found

1. **SSM `put-parameter` stored the wrong value.** The `shell-local` post-processor wrote `${var.app_version}` (the application version) to SSM, but the surrounding text says "Have Packer write the AMI ID to SSM after building." Fixed by using the Packer template variable `{{ .ArtifactId }}` (which for amazon-ebs is formatted `region:ami-id`) and extracting the AMI ID with `cut -d: -f2` before calling `aws ssm put-parameter`. Added a one-line note explaining the format.

2. **`data "aws_ami"` cannot return multiple AMIs.** The "Managing AMI Lifecycle" section claimed an OpenTofu data source could "automatically deregister old AMIs" and used `data "aws_ami"` with `most_recent = false`. `aws_ami` only returns a single AMI (and errors if multiple match without `most_recent = true`). Replaced with `data "aws_ami_ids"`, which returns a list of matching AMI IDs. Also corrected the misleading "automatically deregister" language — data sources only read state; a separate process (script, scheduled job, or Lambda calling `aws ec2 deregister-image`) is required to actually deregister.

## Review Notes

- Ubuntu 22.04 AMI filter `ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*` and Canonical owner ID `099720109477` are correct.
- `{{timestamp}}` inside an HCL2 `ami_name` is supported via Packer's legacy template engine compatibility shim, so the example works as written.
- `{{ .ArtifactId }}` in a `shell-local` post-processor's `inline` block is supported in HCL2 — post-processors retain the legacy template engine because they operate on artifacts.
- The GitHub Actions parsing `grep "artifact,0,id" packer_output.txt | cut -d: -f2` works correctly: machine-readable timestamps don't contain colons, so the only `:` on the line separates `<region>` from `<ami-id>`.
- The `data "aws_ami" "app"` example in Method 2 references `var.app_version` without showing the variable definition — this is acceptable for a snippet but readers will need to define the variable themselves.
- The post-processor snippet is shown without its enclosing `build {}` block; readers should know post-processors must be nested inside the `build` block alongside the `sources` line.
