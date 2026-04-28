# Validation Summary: How to Create OpenSearch VPC Endpoints with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS OpenSearch Service (managed domain, engine version OpenSearch_2.11)
- AWS VPC, Subnets, Security Groups
- AWS Route 53 (private hosted zones, CNAME records)
- AWS ACM (custom endpoint certificates)
- AWS IAM (master user role for FGAC)
- OpenSearch Fine-Grained Access Control (FGAC)

## Sources Consulted
- Terraform AWS provider — `aws_opensearch_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform AWS provider — `aws_opensearch_domain_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain_policy
- Terraform AWS provider — `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider — `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS provider — `aws_route53_record` / `aws_route53_zone`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS OpenSearch Service — VPC support: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
- AWS OpenSearch Service — Custom endpoints: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/customendpoint.html
- AWS OpenSearch Service — Fine-grained access control: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html
- AWS OpenSearch Service — Supported instance types (r6g.large.search): https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html
- AWS OpenSearch Service — TLS security policies (`Policy-Min-TLS-1-2-2019-07`): https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ports-protocols.html

## Issues Found
- **Subnet reference mismatch**: The `vpc_options` block referenced `aws_subnet.private_a/b/c.id`, but the subnet resources defined later in the post were named `aws_subnet.opensearch_a/b/c`. This would cause `tofu plan` to fail with an "undeclared resource" error. Updated the `vpc_options.subnet_ids` to reference the correct `aws_subnet.opensearch_a/b/c.id` resources so the snippets are internally consistent.

## Review Notes
- The post title mentions "VPC Endpoints" but the content is about deploying an OpenSearch domain *inside* a VPC (via `vpc_options`), not about the separate `aws_opensearch_vpc_endpoint` resource (which is used for cross-VPC access patterns). The terminology is a little loose but the content itself is technically accurate for the VPC-deployed-domain pattern that is being described.
- `r6g.large.search` is a valid OpenSearch instance type and meets the FGAC requirement of being a supported (non-T2/T3) instance class.
- `Policy-Min-TLS-1-2-2019-07` is a valid `tls_security_policy` value; AWS has since added a stricter `Policy-Min-TLS-1-2-PFS-2023-10` that the author may want to adopt in the future for forward-secrecy.
- The `encrypt_at_rest { enabled = true }` and `node_to_node_encryption { enabled = true }` single-line block syntax is valid HCL.
- The open access policy used together with FGAC is a documented and supported pattern for VPC-deployed domains, as the post explains.
- The CNAME record points at `aws_opensearch_domain.private.endpoint`, which for VPC domains resolves to a private VPC endpoint hostname — the correct attribute to use for a custom-endpoint CNAME.
- No post-`opensearch_a` subnet is associated with a route table or NACL in the snippets; in a real deployment users will also need route tables and (typically) NAT/IGW or VPC endpoints depending on how nodes pull updates, but that's outside the scope of this post.
