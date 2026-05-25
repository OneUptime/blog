# Validation Summary: How to Cache Terraform Providers in CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform provider plugin cache
- Terraform filesystem provider mirrors
- Terraform dependency lock files
- GitHub Actions
- GitLab CI
- AWS CLI / S3
- Docker

## Sources Consulted
- HashiCorp Terraform CLI configuration documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform `providers mirror` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- HashiCorp Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- Terraform Registry provider download API for `hashicorp/aws` v5.31.0: https://registry.terraform.io/v1/providers/hashicorp/aws/5.31.0/download/linux/amd64
- HashiCorp AWS provider release artifact listing: https://releases.hashicorp.com/terraform-provider-aws/5.31.0/
- GitHub Actions cache documentation: https://github.com/actions/cache
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- The post said the AWS provider alone is over 300 MB in the context of downloads. The referenced `hashicorp/aws` v5.31.0 linux/amd64 package is 86,177,079 bytes compressed, so I changed the claim to say the AWS provider can be a large download depending on version and platform.
- The post described the plugin cache as reusing any provider that matches the version constraint. Terraform selects providers using the dependency lock file and verifies checksums when present, so I updated the explanation to refer to the selected provider package and lock file checksums.
- The CI and Docker examples pinned Terraform `1.7.0`, while HashiCorp releases list newer stable Terraform versions as of the validation date. I updated the examples to `1.15.4`.

## Review Notes
The Terraform CLI configuration, `TF_PLUGIN_CACHE_DIR`, `plugin_cache_dir`, `provider_installation`, `filesystem_mirror`, `direct`, `terraform providers mirror`, GitHub Actions cache key, GitLab cache key/files, AWS `s3 sync`, and artifact examples are consistent with the consulted documentation. Terraform's plugin cache is not guaranteed to be concurrency-safe for simultaneous `terraform init` calls, so teams with parallel init jobs should avoid sharing a writable cache directory across concurrent jobs or use a mirror/pre-baked image approach.
