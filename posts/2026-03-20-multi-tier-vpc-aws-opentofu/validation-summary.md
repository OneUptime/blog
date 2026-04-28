# Validation Summary: How to Build a Multi-Tier VPC on AWS with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide — Infrastructure as Code walkthrough demonstrating a production-grade multi-tier AWS VPC layout (public, private, database tiers) using OpenTofu/Terraform HCL.

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS VPC, Subnets, Internet Gateway, NAT Gateway, Elastic IP
- AWS Route Tables and Route Table Associations
- AWS Network ACLs (NACLs)
- AWS RDS DB Subnet Group
- AWS Availability Zones data source
- EKS subnet tagging conventions (AWS Load Balancer Controller)

## Sources Consulted
- Terraform AWS provider documentation: `aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_nat_gateway`, `aws_eip`, `aws_route_table`, `aws_route_table_association`, `aws_network_acl`, `aws_db_subnet_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- OpenTofu documentation (https://opentofu.org/docs/) — OpenTofu uses the same HCL syntax and AWS provider as Terraform
- HCL `cidrsubnet()` function reference (https://developer.hashicorp.com/terraform/language/functions/cidrsubnet)
- AWS VPC documentation: subnets, route tables, NACLs (https://docs.aws.amazon.com/vpc/latest/userguide/)
- AWS Load Balancer Controller subnet discovery docs — `kubernetes.io/role/elb` and `kubernetes.io/role/internal-elb` tags (https://kubernetes-sigs.github.io/aws-load-balancer-controller/)
- AWS NAT Gateway pricing (https://aws.amazon.com/vpc/pricing/) — $0.045/hour per NAT gateway

## Issues Found
No technical issues found.

Detailed verification:
- `aws_eip` uses the modern `domain = "vpc"` argument (replaces deprecated `vpc = true` in AWS provider v5+).
- `cidrsubnet(var.vpc_cidr, 4, i + offset)` with offsets 0/4/8 correctly carves a /16 into /20 subnets and supports up to 4 AZs per tier without overlap, which is sufficient for the recommended `az_count = 3`.
- NACL rules are stateless-correct: ingress allows TCP 5432 from VPC CIDR, egress allows responses to ephemeral ports 1024–65535 (the broad ephemeral range AWS recommends since clients across OSes use varying ranges).
- NACL protocol `"-1"` paired with `from_port = 0` / `to_port = 0` matches the AWS provider's required format for "all protocols".
- The `single_nat_gateway` ternary in route table associations correctly maps every private subnet to `aws_route_table.private[0]` when consolidated, and to `aws_route_table.private[count.index]` when one-per-AZ.
- NAT Gateway cost claim (~$32/month) matches AWS pricing: $0.045/hour × 730 hours ≈ $32.85/month per gateway (excluding data processing).
- EKS subnet tag values `"1"` are valid and recognized by the AWS Load Balancer Controller for auto-discovery.
- `aws_db_subnet_group` correctly receives subnets in multiple AZs, satisfying RDS multi-AZ requirements.
- `depends_on = [aws_internet_gateway.main]` on the EIP and NAT gateway resources follows the documented best practice to ensure proper destroy ordering.

## Review Notes
- The post intentionally references variables (`var.vpc_cidr`, `var.prefix`, `var.environment`, `var.az_count`, `var.single_nat_gateway`) without showing a `variables.tf`. This is a reasonable omission for a focused tutorial, but readers will need to declare these variables themselves.
- The explicit ingress deny rule at `rule_no = 32766` is functionally redundant since NACLs have an implicit default-deny rule (`*`). It is not incorrect — just defensive-style — and may serve a documentation purpose for readers.
- The `cidrsubnet` scheme (offsets 0/4/8 with newbits=4) breaks if `az_count > 4` because tiers would collide. Given the post recommends `az_count = 3`, this is fine, but a future revision could note the constraint or use a wider newbits value (e.g., 8) for more headroom.
- The database NACL only opens TCP/5432 (PostgreSQL). Users running MySQL/Aurora-MySQL (3306), Redis (6379), or other engines will need to adjust the rule. This is implicit context but worth flagging.
- The post does not mention enabling VPC Flow Logs, which is a common production hardening recommendation. Out of scope for this tutorial but a natural follow-up topic.
