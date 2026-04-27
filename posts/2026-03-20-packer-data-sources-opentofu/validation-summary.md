# Validation Summary: How to Use Packer Data Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- Packer (referenced as the image-builder producing the AMIs/images being looked up)
- AWS provider — `aws_ami` data source, `aws_launch_template` resource
- Azure provider (azurerm) — `azurerm_image` data source
- Google Cloud provider — `google_compute_image` data source
- HCL language features: `locals`, `for_each`, `output`, `check` blocks, `timeadd`, `timestamp`, `formatdate`

## Sources Consulted
- Terraform AWS provider docs — `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS EC2 `DescribeImages` API filter reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- Terraform AzureRM provider docs — `azurerm_image` data source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/image
- Terraform Google provider docs — `google_compute_image` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_image
- OpenTofu language docs — `formatdate` function: https://opentofu.org/docs/language/functions/formatdate/
- OpenTofu language docs — `timeadd` function and `check` blocks
- gcloud filter expression reference: https://cloud.google.com/sdk/gcloud/reference/topic/filters

## Issues Found
1. **Incorrect comment on `google_compute_image` `most_recent`.** The original code in the GCP section commented `# most_recent = true (default for family/filter queries)`. This is wrong on two counts: (a) `most_recent` defaults to `false`, not `true`; and (b) it is only valid in conjunction with `filter` — it has no effect with `family` (where GCP automatically returns the latest non-deprecated image in the family). Fixed by uncommenting the argument and replacing the comment with the accurate note "Required when the filter matches multiple images."
2. **Broken arithmetic in the `ami_age_days` local.** The original `locals` block computed `parseint(formatdate("D", timestamp()), 10) - parseint(formatdate("D", creation_date), 10)`. The `D` format specifier in `formatdate` returns day-of-month (1–31), not day-of-year or days-since-epoch, so subtracting them does not yield an age in days — it produces nonsense across month boundaries (e.g. Mar 1 minus Feb 28 = -27). The local was also unused elsewhere in the configuration. Removed the `locals` block entirely; the `check "ami_freshness"` block below already validates freshness correctly using `timeadd(timestamp(), "-720h")` and string comparison of RFC 3339 timestamps. Added a brief comment noting why the string comparison is valid.

## Review Notes
- The `aws_ami` filter usage (`tag:Name`, `name`, `state`) and the `*` wildcard syntax for the `name` filter are correct — the AWS EC2 API performs server-side glob matching where `*` matches any chars and `.` is a literal dot.
- `azurerm_image` `name_regex` and `sort_descending` are still valid, non-deprecated arguments in current AzureRM provider versions.
- The `for_each` pattern with `data "aws_ami" "service_images"` and the corresponding `aws_launch_template` resource is idiomatic and correct.
- `check` blocks require OpenTofu 1.6+ / Terraform 1.5+. Worth flagging in a future revision if older-version users may read this post.
- The freshness `check` produces a *warning* (non-fatal) at plan/apply time — this matches the author's "Warning:" wording, but readers should know that `check` blocks do not fail the apply, unlike `precondition`/`postcondition` validation blocks.
