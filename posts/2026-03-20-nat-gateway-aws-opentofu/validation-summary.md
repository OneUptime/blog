# Validation Summary: How to Create a NAT Gateway with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS NAT Gateway
- AWS Elastic IP (EIP)
- AWS VPC, Subnets, Route Tables
- AWS Internet Gateway (referenced as a dependency)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS Provider Documentation: `aws_nat_gateway` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway)
- AWS Provider Documentation: `aws_eip` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip)
- AWS Provider Documentation: `aws_route_table`, `aws_route`, `aws_route_table_association`
- AWS NAT Gateway documentation (https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- AWS VPC pricing page for NAT Gateway hourly rates
- Terraform/OpenTofu HCL splat expression syntax docs

## Issues Found
No technical issues found.

Verified items:
- `aws_eip` uses the modern `domain = "vpc"` argument (the older `vpc = true` is deprecated).
- `aws_nat_gateway` resource correctly references `allocation_id` from the EIP and places the gateway in a public subnet.
- The `depends_on = [aws_internet_gateway.main]` is the recommended pattern per the AWS provider docs to ensure the IGW exists before NAT GW creation.
- Per-AZ private route table with a `0.0.0.0/0` route via the NAT Gateway in the same AZ is the standard HA pattern.
- The single NAT Gateway pattern using `count = var.environment == "prod" ? 0 : 1` and selecting `aws_eip.nat[0]` / `aws_subnet.public[0]` is syntactically correct HCL and a common cost-saving approach for non-prod.
- Splat expressions `aws_nat_gateway.main[*].id` and `aws_eip.nat[*].public_ip` are valid HCL.
- Cost claims are accurate: NAT Gateway is ~$0.045/hour in most US regions ≈ $32.85/month per gateway; 3 per-AZ ≈ $96–$99/month; t3.nano on-demand ≈ $0.0052/hour ≈ $3.80/month.
- Technical claim that NAT Gateways allow outbound traffic but block unsolicited inbound is correct (they are stateful, outbound-only by design).

## Review Notes
- The single-NAT pattern reuses `aws_eip.nat[0]`, which only exists if `var.az_count >= 1`. This is a reasonable assumption but readers should be aware that in a strict single-NAT setup, only one EIP needs to exist; provisioning `var.az_count` EIPs alongside a single NAT means the unused EIPs will still be allocated. A future improvement could conditionally provision only the EIPs actually used.
- The post does not show the supporting resources (`aws_vpc.main`, `aws_subnet.public`, `aws_subnet.private`, `aws_internet_gateway.main`, `var.az_count`, `var.name`, `var.environment`); this is normal for a focused snippet but the reader needs those to apply the example.
- Minor stylistic note (not a technical error, left untouched per instructions): in the Conclusion, "stable-whitelist them" is missing a separator (em dash, period, or semicolon) but the meaning is clear.
- AWS provider major versions: arguments shown are valid for AWS provider v4+ (and current v5+). If a reader is on a very old AWS provider (v3), `domain = "vpc"` may not be available and they would need `vpc = true`. The post implicitly targets a modern provider, which is reasonable given OpenTofu's release timeline.
