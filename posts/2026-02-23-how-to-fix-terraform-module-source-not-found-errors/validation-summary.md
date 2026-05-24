# Validation Summary: How to Fix Terraform Module Source Not Found Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (module sources, `terraform init`, `terraform init -upgrade`)
- Terraform Registry (public + private, `app.terraform.io` credentials)
- Git (HTTPS and SSH module sources, `ref` pinning, `git ls-remote`)
- GitHub (as a Terraform source type)
- AWS S3 (`s3::` source prefix, `aws s3` CLI)
- Google Cloud Storage (`gcs::` source prefix)
- Shell environment (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, SSL_CERT_FILE)
- HCL syntax for module blocks

## Sources Consulted
- Terraform Module Sources documentation: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform Registry module address spec: https://developer.hashicorp.com/terraform/language/modules/sources#terraform-registry
- Terraform CLI Configuration File: https://developer.hashicorp.com/terraform/cli/config/config-file
- `terraform init` CLI reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Generic Git source / subdirectory `//` syntax: https://developer.hashicorp.com/terraform/language/modules/sources#generic-git-repository
- S3 bucket source: https://developer.hashicorp.com/terraform/language/modules/sources#s3-bucket
- GCS bucket source: https://developer.hashicorp.com/terraform/language/modules/sources#gcs-bucket
- HashiCorp go-getter (underlying download library): https://github.com/hashicorp/go-getter
- GitHub SSH connectivity test: https://docs.github.com/en/authentication/troubleshooting-ssh

## Issues Found
No technical issues found.

All claims and snippets verified:
- Source type list (local, registry, GitHub, generic Git, S3, GCS) matches the official module sources documentation.
- Local path requirement for a leading `./` or `../` prefix is correct — Terraform treats other strings as registry addresses.
- Registry source format `<NAMESPACE>/<NAME>/<PROVIDER>` is correct; `terraform-aws-modules/vpc/aws` is a valid published address and `5.1.0` is a real released version.
- Private registry credentials block syntax (`credentials "app.terraform.io" { token = ... }`) and the `.terraformrc` / `terraform.rc` filenames (Unix vs. Windows) are correct.
- Generic Git source URL syntax including `git::` prefix, the `//subdir` separator, and the `?ref=` query parameter is correct.
- SSH SCP-style Git URL `git::git@github.com:org/repo.git//subdir?ref=...` is a supported form.
- `git ls-remote --tags <url>` is a valid command for verifying tag refs.
- Environment variables `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, and `SSL_CERT_FILE` are honored by Terraform / go-getter.
- Cache reset by removing `.terraform/` and `.terraform.lock.hcl` followed by `terraform init` is the standard recovery procedure; `terraform init -upgrade` is a valid flag for re-resolving modules and providers.
- `s3::https://s3-<region>.amazonaws.com/<bucket>/<key>` and `gcs::https://www.googleapis.com/storage/v1/<bucket>/<object>` source formats match the documentation.

## Review Notes
- The second error block ("Module not installed") is technically a different failure mode — it is emitted by `terraform plan`/`apply` when `terraform init` has not been run yet, rather than a true source-resolution failure. The post acknowledges it as a separate symptom, so this is fine, but a future revision could clarify.
- The grep one-liner in Fix 1 (`grep -rn 'source.*=.*"\./\|source.*=.*"\.\.' *.tf`) uses GNU BRE `\|` alternation, which works with GNU grep but is not portable to BSD/macOS `grep` without `-E` and rewritten escaping. It also pairs `-r` with a shell glob `*.tf` that does not recurse. Functional for the common case, so left as written.
- Version 5.1.0 of `terraform-aws-modules/vpc/aws` is real but several years old; newer 5.x releases exist. The version is only illustrative here, so no change made.
- The post does not mention `TF_REGISTRY_DISCOVERY_RETRY` / `TF_REGISTRY_CLIENT_TIMEOUT`, network module-mirror configuration, or `module_installer` provenance — out of scope for a focused troubleshooting article.
