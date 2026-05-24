# Validation Summary: How to Fix Terraform http Data Source Timeout Errors

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform
- hashicorp/http provider (data source)
- HCL configuration syntax
- Terraform check blocks and lifecycle postconditions
- Terraform `external` and `null_resource` providers
- AWS provider (`aws_lb` example)
- Bash / curl / nslookup / nc / jq (debugging tools)
- HTTP proxy environment variables (HTTP_PROXY, HTTPS_PROXY, NO_PROXY)
- SSL/TLS (SSL_CERT_FILE, x509 verification)

## Sources Consulted
- HashiCorp http provider CHANGELOG: https://github.com/hashicorp/terraform-provider-http/blob/main/CHANGELOG.md
- HashiCorp http provider docs (data-sources/http): https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md
- Terraform Registry: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- Terraform check blocks documentation (Terraform 1.5+)
- Terraform lifecycle postcondition documentation (data sources, Terraform 1.2+)

## Issues Found
1. **Incorrect version for `request_timeout_ms`**: The post claimed `request_timeout_ms` was added in version 3.2.0 of the `hashicorp/http` provider. According to the official CHANGELOG, it was actually added in version 3.3.0 (April 25, 2023). Version 3.2.0 added `insecure` and `ca_cert_pem`. Updated both the prose and the `required_providers` block to reference `>= 3.3.0`.

2. **Inaccurate default timeout claim**: The post stated "By default, it has a 10-second timeout and follows redirects." The provider documentation does not specify a 10-second default for `request_timeout_ms`; the underlying Go `http.Client` has no default request timeout when none is set. Replaced this with a more accurate statement that no explicit request timeout is set by the provider, while preserving the (correct) note that redirects are followed.

## Review Notes
- The `retry` block schema (`attempts`, `min_delay_ms`, `max_delay_ms`) is correct and matches the documented schema (introduced alongside `request_timeout_ms` in provider version 3.3.0). The post's Option 1 caveat "if supported by your provider version" is technically fine — readers using a recent provider (>= 3.3.0) will have it.
- `insecure` and `ca_cert_pem` are correctly named arguments (added in 3.2.0).
- `status_code`, `response_body`, and `response_headers` are correctly documented attributes.
- The `check` block example correctly uses the Terraform 1.5+ syntax with a nested data block and `assert` clause.
- The `lifecycle.postcondition` on a data source is valid (supported on data sources since Terraform 1.2).
- The retry script's escaping (`%%{http_code}` inside the heredoc) is correct because Terraform interpolates `%{}` sequences inside template strings, so doubling the percent is needed to pass a literal `%{http_code}` to curl.
- The `aws_lb` resource example is syntactically valid HCL.
- Bash debugging commands (`curl -v`, `nslookup`, `nc -zv`, `curl -4`) are correct and standard.
- Proxy environment variable names (HTTP_PROXY, HTTPS_PROXY, NO_PROXY) and SSL_CERT_FILE are standard and respected by Go's HTTP client.
