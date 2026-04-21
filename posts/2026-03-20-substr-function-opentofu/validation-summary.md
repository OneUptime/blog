# Validation Summary: How to Use the substr Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu string functions (`substr`, `split`, `trimprefix`)
- OpenTofu collection function (`index`)
- OpenTofu local values
- AWS EKS
- AWS S3
- Random provider

## Sources Consulted
- OpenTofu `substr` function documentation: https://opentofu.org/docs/language/functions/substr/
- OpenTofu `split` function documentation: https://opentofu.org/docs/language/functions/split/
- OpenTofu `index` function documentation: https://opentofu.org/docs/language/functions/index_function/
- OpenTofu local values documentation: https://opentofu.org/docs/language/values/locals/
- OpenTofu `length` function documentation: https://opentofu.org/docs/language/functions/length/
- OpenTofu `trimprefix` function documentation: https://opentofu.org/docs/language/functions/trimprefix/
- AWS EKS `CreateCluster` API documentation: https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateCluster.html
- Amazon S3 object key naming documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- AWS provider `aws_eks_cluster` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- AWS provider `aws_s3_bucket` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- Random provider `random_id` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-random/main/docs/resources/id.md

## Issues Found
- The workspace example referenced `env_prefix` directly inside a `locals` block. OpenTofu local values must be referenced as `local.<NAME>`, even from another local value. I changed it to `local.env_prefix`.
- The comparison table said `index(split("", s), char)` finds the position of a substring. OpenTofu `index` finds a value in a list, so this expression is only appropriate for finding a character after splitting the string into characters. I changed the wording to "Find position of a character."

## Review Notes
The `substr()` syntax, negative offsets, `-1` length behavior, and over-long length behavior match the official OpenTofu documentation. The EKS cluster name maximum of 100 characters, S3 bucket name length, S3 object key limit, and `random_id.hex` behavior were checked against AWS and provider documentation. The local environment does not have `tofu` or `terraform` installed, so validation was performed against official documentation and provider documentation sources rather than by running `tofu validate`.
