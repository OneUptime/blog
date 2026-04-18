# Validation Summary: How to Configure VPC Gateway Endpoints for S3 and DynamoDB with OpenTofu

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS VPC Gateway Endpoints
- Amazon S3
- Amazon DynamoDB
- AWS NAT Gateway (cost comparison context)
- AWS IAM policies (`aws:SourceVpce` condition key)
- AWS CLI (`aws ec2 describe-route-tables`, `aws s3 ls`)
- Mermaid (diagram)

## Sources Consulted
- AWS VPC documentation: Gateway endpoints for S3 and DynamoDB — https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS VPC pricing (NAT Gateway data processing $0.045/GB) — https://aws.amazon.com/vpc/pricing/
- Terraform AWS provider — `aws_vpc_endpoint` resource (`vpc_endpoint_type`, `route_table_ids`, `policy` arguments) — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- AWS IAM global condition keys (`aws:SourceVpce`, `aws:SourceVpc`) — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS Systems Manager Patch Manager S3 bucket reference (for endpoint policy allowlist patterns)
- AWS CLI v2 reference: `ec2 describe-route-tables`

## Issues Found
No technical issues found. All claims verified against official AWS documentation:
- Gateway endpoints for S3/DynamoDB are free, attach to route tables (not subnets), and use the `com.amazonaws.<region>.s3` / `.dynamodb` service names — all correct.
- `aws_vpc_endpoint` Terraform resource usage with `vpc_endpoint_type = "Gateway"`, `route_table_ids`, and `policy` is syntactically and semantically correct.
- The `aws:SourceVpce` IAM condition key is the correct mechanism for restricting bucket access to a specific VPC endpoint.
- NAT Gateway data processing fee of $0.045/GB matches AWS public pricing (US regions).
- The S3 endpoint policy resource ARNs for Amazon Linux / SSM patching buckets match patterns documented in AWS reference material.
- AWS CLI commands and JMESPath query syntax are valid.
- Cost calculation arithmetic checks out (1000 GB × $0.045 = $45.00).

## Review Notes
- The S3 endpoint policy uses `Principal = "*"` for allow statements; this is the standard pattern for endpoint policies (which scope by VPC, not principal) but readers from an IAM-bucket-policy background sometimes find it surprising — a brief footnote could help, though it's not technically wrong.
- Consider pairing the `aws:SourceVpce` bucket-policy condition with `aws:SourceVpc` or `aws:VpcSourceIp` for defense-in-depth in environments where multiple VPCs share an account; the post's example is correct but minimal.
- The cost example treats 1 TB as 1000 GB, which matches AWS billing convention but differs slightly from binary 1 TiB (1024 GiB = $46.08). Acceptable rounding for a cost-illustration example.
- The mermaid diagram uses `<br/>` line breaks and `$` literals inside node labels — these render correctly in standard mermaid but may surprise readers using older mermaid renderers.
- Region-suffixed S3 buckets such as `amazonlinux.<region>.amazonaws.com` are unusual in form (dotted bucket names) but are valid AWS-managed buckets. No change needed.
