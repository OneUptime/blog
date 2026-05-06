# Validation Summary: How to Use the concat Function in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider
- AWS EC2
- AWS Elastic Load Balancing
- AWS IAM

## Sources Consulted
- OpenTofu `concat` function docs: https://opentofu.org/docs/language/functions/concat/
- OpenTofu `tolist` function docs: https://opentofu.org/docs/language/functions/tolist/
- OpenTofu `merge` function docs: https://opentofu.org/docs/language/functions/merge/
- Terraform AWS Provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_lb` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS Provider source docs for `aws_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- Terraform AWS Provider source docs for `aws_lb`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- AWS Application Load Balancer guide: https://docs.aws.amazon.com/en_us/elasticloadbalancing/latest/application/create-application-load-balancer.html
- AWS Prescriptive Guidance on load balancer subnets and routing: https://docs.aws.amazon.com/prescriptive-guidance/latest/load-balancer-stickiness/subnets-routing.html

## Issues Found
- The `aws_lb` example combined `public` and `private` subnet lists while configuring an internet-facing load balancer with `internal = false`. AWS documents internet-facing Application Load Balancers in public subnets, so I changed the example to concatenate two public subnet lists instead.
- The `merge()` comparison said it was for maps only. OpenTofu documents `merge()` as operating on maps or objects, so I corrected that wording in both the code comment and summary.
- The `tolist(toset(...))` example did not mention that converting a set to a list yields an undefined order. OpenTofu documents that set-to-list order is undefined, so I added that clarification to the code comment.

## Review Notes
- The post’s core explanation of `concat()` is accurate: OpenTofu documents it as taking two or more lists and combining them into a single list.
- Several snippets are illustrative excerpts rather than fully standalone configurations because they omit surrounding provider, data source, or resource definitions. The references they use are still consistent with the documented argument names.
- A local CLI validation run was not possible in this environment because `tofu` is not installed.
