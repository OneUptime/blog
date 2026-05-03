# Validation Summary: How to Deploy to Both AWS and GCP with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu init`, `tofu apply`)
- HashiCorp Configuration Language (HCL)
- AWS provider for OpenTofu/Terraform (`hashicorp/aws` ~> 5.0)
- Google Cloud provider for OpenTofu/Terraform (`hashicorp/google` ~> 5.0)
- AWS resources: VPC, EC2, S3, IAM (policy document, policy)
- GCP resources: BigQuery (dataset, table), Cloud Storage, Service Accounts, IAM
- GitHub Actions (aws-actions/configure-aws-credentials@v4, google-github-actions/auth@v2)
- OIDC / Workload Identity Federation for keyless CI/CD authentication

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/
- AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Google provider documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- BigQuery dataset_id naming rules: https://cloud.google.com/bigquery/docs/datasets#dataset-naming
- GCS IAM roles: https://cloud.google.com/storage/docs/access-control/iam-roles
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- google-github-actions/auth: https://github.com/google-github-actions/auth

## Issues Found
No technical issues found.

## Review Notes
- The post uses the `terraform {}` configuration block, which OpenTofu continues to support for backward compatibility. OpenTofu 1.8+ also supports a `tofu {}` block as an alternative; either works.
- Provider sources `hashicorp/aws` and `hashicorp/google` resolve correctly through the OpenTofu registry, which mirrors these providers.
- AWS provider 6.x and Google provider 6.x are now available (released after the post's apparent baseline). The `~> 5.0` constraint pins to 5.x, which is still fully supported and a reasonable conservative choice.
- The `aws_instance` snippet references `data.aws_ami.amazon_linux` and `aws_subnet.private` which aren't defined in the post — acceptable given the post's focus on illustrating the multi-cloud pattern rather than a complete AWS networking setup.
- The `replace()` call in the BigQuery `labels.project` value is technically not required — BigQuery labels do allow hyphens — but it's not incorrect, and it keeps the project key consistent with the dataset_id transformation.
- The `sensitive = false` on the service account email output is the default and could be omitted, but is not technically wrong.
