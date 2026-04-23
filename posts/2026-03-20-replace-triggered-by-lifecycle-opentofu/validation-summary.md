# Validation Summary: How to Use replace_triggered_by Lifecycle in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- Amazon EC2
- Amazon S3
- Amazon EC2 Auto Scaling

## Sources Consulted
- OpenTofu resource behavior and lifecycle docs: https://opentofu.org/docs/language/resources/behavior/
- OpenTofu `terraform_data` docs: https://opentofu.org/docs/language/resources/tf-data/
- AWS provider `aws_instance` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- AWS provider `aws_s3_object` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_object.html.markdown
- AWS provider `aws_autoscaling_group` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/autoscaling_group.html.markdown

## Issues Found
- The "Using with Locals for Complex Trigger Logic" example used `replace_triggered_by = [aws_instance.app.tags["ConfigHash"]]`. OpenTofu only allows managed resource references in `replace_triggered_by`, not plain values derived from locals, and self-referencing the same resource is invalid. I fixed this by adding a `terraform_data` resource that stores the computed hash and referencing that resource instead.
- The "Difference from ignore_changes" examples omitted required `aws_instance` arguments, used the same resource name twice in one code block, and the `ignore_changes` example did not include the `user_data` attribute it was discussing. I added minimal required arguments, made the `ignore_changes` example meaningful, gave the resources distinct names, and replaced the undefined trigger resource with a valid `terraform_data` example.
- The basic example referenced `aws_launch_template.web` without defining it in the snippet. I added the launch template resource so the example is internally consistent.
- The S3 example referenced an undefined bucket resource and used an unnecessary `etag` value. I switched the bucket to `var.config_bucket_name` and removed `etag`, since changes to `content` already cause the S3 object resource to plan an update.
- The Auto Scaling Group example tied the ASG name to the launch template version, which could make replacement happen because the `name` changes rather than because of `replace_triggered_by`. I changed it to use `name_prefix` so the lifecycle example accurately demonstrates replacement being driven by `replace_triggered_by` while still remaining compatible with `create_before_destroy`.

## Review Notes
- OpenTofu's current docs state that `replace_triggered_by` only accepts managed resource references. When plain values such as locals or variables should drive replacement, `terraform_data` is the documented bridge resource.
- The AWS provider docs for `aws_instance` note that `user_data` changes trigger stop/start by default, not replacement, unless `user_data_replace_on_change = true` is set. The post's corrected examples are now consistent with that behavior.
