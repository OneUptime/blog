# Validation Summary: How to Handle Deprecated Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS Provider for Terraform/OpenTofu
- Amazon CloudFront
- Amazon S3
- AWS WAF Classic
- AWS WAF v2
- AWS CLI

## Sources Consulted
- OpenTofu `validate` command docs: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu dependency lock file docs (`tofu init -upgrade`): https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu `plan` command docs (`-target` guidance): https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `state rm` command docs: https://opentofu.org/docs/cli/commands/state/rm/
- AWS CloudFront OAC and OAI migration guidance: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS WAF Classic migration guidance: https://docs.aws.amazon.com/waf/latest/developerguide/waf-migrating-from-classic.html
- AWS WAF migration workflow details: https://docs.aws.amazon.com/waf/latest/developerguide/waf-migrating-how-it-works.html
- AWS CLI `wafv2 delete-web-acl` reference: https://docs.aws.amazon.com/cli/latest/reference/wafv2/delete-web-acl.html
- AWS CLI `waf delete-web-acl` reference: https://docs.aws.amazon.com/cli/latest/reference/waf/delete-web-acl.html
- AWS provider `aws_cloudfront_origin_access_control` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_access_control.html.markdown
- AWS provider `aws_cloudfront_origin_access_identity` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_origin_access_identity.html.markdown
- AWS provider `aws_cloudfront_distribution` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS provider `aws_wafv2_web_acl` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl.html.markdown

## Issues Found
- The post used `tofu providers lock -upgrade` as if it were the provider-upgrade workflow. I changed this to `tofu init -upgrade` followed by `tofu plan`, because `providers lock` does not take `-upgrade` and is for dependency lock maintenance rather than surfacing migration work.
- The CloudFront section described OAI in a way that implied provider deprecation. I changed the wording to match AWS documentation, which treats OAI as legacy and recommends OAC for S3 origins.
- The CloudFront migration order was unsafe. I changed the example so the S3 bucket policy allows both the old OAI and the new OAC-backed distribution before switching the distribution, which matches AWS’s recommended migration sequence and avoids an access interruption.
- The WAFv2 example omitted the `us-east-1` requirement for `CLOUDFRONT` scope. I added an inline note so the snippet matches the provider documentation.
- The migration steps recommended `tofu apply -target=...` for routine work. I changed this to a normal `tofu apply` because OpenTofu documents `-target` as an exceptional-use feature.
- The manual cleanup command used the WAFv2 CLI to delete a WAF Classic resource. I changed it to the WAF Classic CLI form, `aws waf delete-web-acl --web-acl-id ... --change-token ...`, and noted the required cleanup prerequisites.
- The summary sentence implied `tofu state rm` is a standard removal step. I tightened it so it accurately reflects OpenTofu’s guidance that `state rm` is for intentionally forgetting an existing object without destroying it.

## Review Notes
- AWS WAF Classic support ended on September 30, 2025. As of the review date, this example is relevant only for migrating or cleaning up legacy configurations that still exist in code or state.
- CloudFront OAI is still supported by the provider documentation, but AWS labels it as legacy and not recommended. The post should treat it as a migration-from-legacy example, not as a confirmed provider-deprecation example.
