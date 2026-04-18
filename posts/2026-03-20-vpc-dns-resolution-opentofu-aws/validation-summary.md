# Validation Summary: How to Configure VPC DNS Resolution with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- OpenTofu (v1.6+)
- AWS VPC
- Amazon Route 53 (Private Hosted Zones)
- Amazon Route 53 Resolver (Inbound/Outbound endpoints, forwarding rules)
- AWS Security Groups
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS provider documentation for `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider documentation for `aws_route53_zone`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone
- AWS provider documentation for `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider documentation for `aws_route53_resolver_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint
- AWS provider documentation for `aws_route53_resolver_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule
- AWS provider documentation for `aws_route53_resolver_rule_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule_association
- AWS VPC user guide — Amazon DNS server: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html
- Route 53 Resolver documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/

## Issues Found
No technical issues found.

All verified items:
- The claim that the Amazon-provided DNS server resides at the VPC base CIDR + 2 is correct per AWS VPC documentation.
- `enable_dns_support` and `enable_dns_hostnames` on `aws_vpc` are valid boolean arguments and described accurately.
- `aws_route53_zone` with a `vpc { vpc_id }` block correctly provisions a private hosted zone associated with the given VPC.
- `aws_route53_record` fields (`zone_id`, `name`, `type`, `ttl`, `records`) are correct.
- `aws_route53_resolver_endpoint` uses valid `direction` values (`INBOUND`/`OUTBOUND`), and the two `ip_address` blocks satisfy the minimum of two IP addresses required by AWS for a resolver endpoint.
- `aws_route53_resolver_rule` correctly uses `rule_type = "FORWARD"`, a required `resolver_endpoint_id` for FORWARD rules, and `target_ip` blocks with `ip`/`port` (port 53 is valid).
- `aws_route53_resolver_rule_association` fields are correct.
- The `tofu init` / `tofu plan` / `tofu apply` commands are valid OpenTofu CLI commands.

## Review Notes
- The sample reuses a single security group for both the inbound and outbound resolver endpoints. This works but is slightly suboptimal: inbound endpoints need ingress for DNS queries *from* on-premises sources, while outbound endpoints generally need egress rules (and typically minimal ingress). A stricter split-security-group setup would be better practice but is not technically incorrect.
- The security group only defines `ingress` and no explicit `egress` rule. The AWS Terraform/OpenTofu provider defaults to allowing all egress when no egress rule is specified via the `aws_security_group` resource, so outbound resolution from the outbound endpoint will still work — but being explicit about egress is generally preferred.
- The post references `var.subnet_id_az1` and `var.subnet_id_az2` but does not show the `variable` declarations. Readers new to OpenTofu/Terraform should know these need to be defined separately.
- Private hosted zones created with an inline `vpc` block are supported; however, for multi-VPC setups it is generally recommended to associate additional VPCs through `aws_route53_zone_association` to avoid drift. The post does not misrepresent this — it simply focuses on a single-VPC scenario.
- No deprecated APIs or arguments are used. The configuration should apply cleanly with the current `hashicorp/aws` provider and OpenTofu 1.6+.
