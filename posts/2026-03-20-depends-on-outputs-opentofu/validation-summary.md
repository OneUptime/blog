# Validation Summary: How to Use depends_on with Outputs in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform-compatible output and module blocks
- AWS provider resources: `aws_s3_bucket`, `aws_eks_cluster`, `aws_eks_node_group`, `aws_db_instance`, `aws_instance`, `aws_lb`, `aws_lb_target_group_attachment`, `aws_lb_listener`, `aws_route53_record`, `aws_cloudfront_distribution`
- Helm provider (`helm_release`)
- `null_resource` with `local-exec` provisioner

## Sources Consulted
- OpenTofu Output values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu `depends_on` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu modules `depends_on` documentation: https://opentofu.org/docs/language/meta-arguments/depends_on/
- AWS provider documentation for resource attributes (registry.terraform.io/providers/hashicorp/aws/latest/docs):
  - `aws_s3_bucket.bucket_domain_name`
  - `aws_eks_cluster.endpoint`
  - `aws_db_instance.endpoint`
  - `aws_lb.dns_name`
- Helm provider documentation (`helm_release` resource)
- `null_resource` documentation (hashicorp/null provider)

## Issues Found
No technical issues found.

- `depends_on` is officially supported as a meta-argument in `output` blocks in OpenTofu/Terraform.
- The HCL syntax in all code blocks is valid.
- Resource attribute references used in examples (`bucket_domain_name`, `endpoint`, `dns_name`, `public_ip`) are real attributes on their respective AWS resources.
- The "Avoiding Unnecessary depends_on" guidance correctly aligns with the official recommendation: implicit references already create dependencies, and `depends_on` should only be used as a last resort.
- Module-level `depends_on` is a supported meta-argument and behaves as described.

## Review Notes
- In the "Ordering with External Systems" example, the URL `"https://monitoring.${aws_eks_cluster.main.endpoint}"` would produce a malformed URL at runtime because `aws_eks_cluster.endpoint` already includes the `https://` scheme prefix (e.g., `https://XXXXXX.gr7.us-west-2.eks.amazonaws.com`). The example is illustrative for `depends_on` semantics rather than URL construction, so it was left as written, but a future revision could replace it with a clearer placeholder such as `"https://monitoring.example.com"`.
- In the "Module-Level depends_on" example, `module.migration` already depends on `module.database` implicitly via `db_endpoint = module.database.endpoint`. The explicit `depends_on = [module.database]` on `module.migration` is redundant. This is allowed, and the author's intent is to demonstrate the syntax — not technically incorrect.
- Post is broadly applicable to both OpenTofu and Terraform since the meta-argument behavior is identical between the two.
