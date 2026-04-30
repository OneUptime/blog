# Validation Summary: How to Create IPv6-Only Infrastructure with Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform
- AWS VPC
- Amazon EC2
- Amazon Route 53
- IPv6 networking
- SSH
- curl

## Sources Consulted
- Amazon VPC User Guide, "Subnets for your VPC": https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- Amazon VPC User Guide, "Create a subnet": https://docs.aws.amazon.com/vpc/latest/userguide/create-subnets.html
- Amazon EC2 User Guide, "Reference for Amazon EC2 instance configuration parameters": https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-launch-parameters.html
- Amazon VPC User Guide, "Enable outbound IPv6 traffic using an egress-only internet gateway": https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- HashiCorp AWS Provider docs, `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- HashiCorp AWS Provider docs, `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- HashiCorp AWS Provider docs, `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS Provider docs, `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp AWS Provider docs, `aws_route53_zone` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone
- HashiCorp AWS Provider docs, `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform CLI docs, `terraform apply`: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI docs, `terraform output`: https://developer.hashicorp.com/terraform/cli/commands/output
- Canonical Ubuntu on AWS documentation, "Find Ubuntu images on AWS": https://documentation.ubuntu.com/aws/en/latest/aws-how-to/instances/find-ubuntu-images/
- Google Cloud documentation, "Create an instance that uses IPv6 addresses": https://cloud.google.com/compute/docs/instances/create-ipv6-instance
- Hetzner Docs, "Overview" for Primary IPs: https://docs.hetzner.com/cloud/servers/primary-ips/overview/
- Local command help: `ssh` usage output and `curl --help all`

## Issues Found
- The post described the AWS example as having no IPv4 dependencies. I corrected the description, introduction, and VPC section to reflect that AWS still requires an IPv4 CIDR on the VPC even when the subnet and instance are IPv6-only.
- The architecture diagram showed an ALB and an egress-only internet gateway that were not implemented in the code and conflicted with the public IPv6 routing example. I simplified the diagram so it matches the Terraform actually shown in the post.
- The subnet example used an IPv4 `cidr_block` for what was labeled an IPv6-only subnet. I replaced that with `ipv6_native = true` and added `private_dns_hostname_type_on_launch = "resource-name"` so the subnet configuration aligns with AWS and Terraform IPv6-only subnet behavior.
- The EC2 example referenced an undefined `data.aws_ami.ubuntu` and the verification steps assumed SSH access without any key pair being specified. I added a valid Ubuntu AMI lookup and an explicit `key_name` placeholder.
- The security group used an invalid IPv6 prefix, `2001:db8:admin::/48`. I replaced it with the valid documentation prefix `2001:db8:1234::/48`.
- The Route 53 example referenced an undefined `data.aws_route53_zone.main`. I added the hosted zone data source so the DNS snippet is complete.
- The command sequence skipped `terraform init`, which is required before a first `terraform apply`. I added it to the verification section.

## Review Notes
- AWS documents that EC2 instances launched in IPv6-only subnets must be Nitro-based. The post's `t3.micro` example is valid for that requirement.
- AWS also notes that DHCPv6 might not immediately provide the IPv6 DNS server to a newly launched IPv6-only instance. The final `curl -6` verification can fail briefly right after boot and succeed on retry.
- An egress-only internet gateway is appropriate only for outbound-only IPv6 access. This post's corrected example intentionally uses an internet gateway because it exposes the instance directly over IPv6 for inbound SSH and HTTP(S).
