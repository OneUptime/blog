# Validation Summary: How to Configure NAT on AWS VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- AWS NAT Gateway
- AWS NAT Instance (EC2-based)
- AWS Internet Gateway
- AWS Elastic IP
- AWS CLI (`aws ec2` commands)
- Terraform / HashiCorp HCL (AWS provider, `aws_eip`, `aws_nat_gateway`, `aws_route`)
- Linux networking (`iptables` MASQUERADE, `sysctl`/`net.ipv4.ip_forward`)

## Sources Consulted
- AWS documentation — NAT gateways: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS documentation — NAT instances: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_NAT_Instance.html
- AWS NAT Gateway bandwidth (scales from 5 Gbps to 100 Gbps): https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html#nat-gateway-basics
- AWS CLI `ec2 create-nat-gateway`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS CLI `ec2 allocate-address`: https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI `ec2 create-route`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI `ec2 modify-instance-attribute`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- Terraform AWS provider — `aws_eip`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS provider — `aws_nat_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS provider — `aws_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- Linux kernel networking (`net.ipv4.ip_forward`) and `iptables` man pages

## Issues Found
- The "Per-AZ NAT setup" code block was tagged as ` ```bash ` but contained Terraform/HCL code (`resource "aws_nat_gateway" "per_az" { ... }`). Changed the language fence from `bash` to `hcl` so the snippet renders with correct syntax highlighting and matches its actual content. (Comment lines starting with `#` are valid in both bash and HCL, so the body is unchanged.)

## Review Notes
- AWS CLI `allocate-address --domain vpc` is still accepted, but the `--domain` parameter has been effectively redundant since the retirement of EC2-Classic (August 2022). New code does not need it; the post's usage is not wrong but could be simplified to `aws ec2 allocate-address` in a future revision.
- The `--source-dest-check '{"Value": false}'` JSON form on `modify-instance-attribute` is valid; `aws ec2 modify-instance-attribute --instance-id <id> --no-source-dest-check` is the more common shorthand and is equivalent.
- For the Terraform `aws_eip` resource, `domain = "vpc"` is the current (provider v5+) form, replacing the deprecated `vpc = true` argument. The post uses the correct modern form.
- The "Per-AZ NAT" Terraform snippet implies an `aws_eip.nat` resource declared with `count`; this is implicit in the snippet (a count-aware EIP would be needed for `aws_eip.nat[count.index].id` to resolve). This is acceptable as an illustrative excerpt.
- NAT Gateway bandwidth claim "Up to 100 Gbps" is correct: AWS NAT Gateway automatically scales up to 100 Gbps.
- NAT Instances based on the Amazon Linux 2 NAT AMI have been deprecated by AWS; the post correctly shows the manual `iptables`/`sysctl` configuration that customers now need on a self-managed instance, but it might be worth noting the deprecation in a future revision.
