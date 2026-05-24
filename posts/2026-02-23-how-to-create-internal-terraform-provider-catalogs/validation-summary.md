# Validation Summary: How to Create Internal Terraform Provider Catalogs

## Status
validated

## Post Type
Guide / Tutorial — covers governance patterns for Terraform provider usage, including catalog YAML design, OPA Rego policy enforcement, custom provider scaffolding in Go, private registry hosting, version upgrade process, and usage tracking.

## Technologies Covered
- Terraform (provider ecosystem and configuration)
- HashiCorp `terraform-plugin-framework` (Go) for custom provider development
- Open Policy Agent (OPA) / Rego for policy-as-code enforcement
- AWS provider for Terraform (S3, CloudFront for private registry hosting)
- YAML for catalog and process descriptors
- Python (standard library `os`, `json`) for usage scanning
- Terraform plan JSON / `.terraform.lock.hcl` artifacts

## Sources Consulted
- HashiCorp terraform-plugin-framework docs: https://developer.hashicorp.com/terraform/plugin/framework
- `providerserver.Serve` API reference: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/providerserver
- HashiCorp framework provider tutorials (factory pattern `New(version) func() provider.Provider`)
- OPA Rego `future.keywords.in` and membership semantics: https://www.openpolicyagent.org/docs/policy-language
- Terraform AWS provider docs for `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_cloudfront_distribution`, `aws_cloudfront_origin_access_identity`
- Terraform plan JSON format (`configuration.provider_config[*].full_name`): https://developer.hashicorp.com/terraform/internals/json-format

## Issues Found
- **`main.go` invocation of `provider.New` was a type error.** The `providerserver.Serve` function requires its second argument to be `func() provider.Provider`. The post wrote `provider.New` (type `func(string) func() provider.Provider`), which does not match. Per HashiCorp's canonical pattern, `New` must be invoked with a version string to return the factory. Fixed by introducing `var version string = "dev"` and calling `provider.New(version)`.

## Review Notes
- The `InternalProvider` struct in `provider.go` only implements `Resources` and `DataSources`. To actually satisfy the `provider.Provider` interface from terraform-plugin-framework, it must also implement `Metadata`, `Schema`, and `Configure`. The post presents this snippet as a partial illustration ("provider configuration") rather than a complete file, so I did not add the missing methods — but readers building from this code will need those before it compiles.
- The CloudFront `forwarded_values` block is the legacy form. In AWS provider 5.x it still works but is being phased out in favor of `cache_policy_id` / `origin_request_policy_id`. Not incorrect, just dated.
- `viewer_certificate` omits `minimum_protocol_version`. This defaults to `TLSv1`, which AWS flags as insecure. Functional but suboptimal — readers should set `minimum_protocol_version = "TLSv1.2_2021"` or similar in real deployments.
- The Python `scan_provider_usage` references `parse_lock_file()` which is not defined — clearly intended as a reader-supplied helper. The surrounding scanning logic is correct.
- The Rego policy reads from `input.configuration.provider_config[name].full_name`, which matches the structure of `terraform show -json` output. The use of `import future.keywords.in` with `not full_source in approved_providers` correctly checks key membership against the object.
- The YAML catalog and security-review templates are organizational artifacts (no schema to validate against), and their structure is reasonable.
