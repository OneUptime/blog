# Validation Summary: How to Use Open Policy Agent (OPA) with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego (policy language)
- Conftest
- OpenTofu
- AWS provider resources (S3, security groups, tagging)
- GitHub Actions

## Sources Consulted
- Conftest GitHub releases (verified asset naming): https://github.com/open-policy-agent/conftest/releases
- OPA Rego language reference (object iteration semantics): https://www.openpolicyagent.org/docs/latest/policy-language/
- Conftest documentation: https://www.conftest.dev/
- OpenTofu CLI reference for `tofu plan` and `tofu show -json`: https://opentofu.org/docs/cli/commands/
- Terraform/OpenTofu plan JSON format (resource_changes structure): https://opentofu.org/docs/internals/json-format/

## Issues Found

1. **Incorrect conftest download URL.** The post used `https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_linux_amd64.tar.gz`. Conftest release assets are named with the version embedded (e.g., `conftest_0.68.2_Linux_x86_64.tar.gz`), so the `latest/download/` redirect cannot resolve a generic name like `conftest_linux_amd64.tar.gz`. Replaced the snippet with a small shell block that fetches the latest tag from the GitHub API and downloads the correctly-named asset (`conftest_${VERSION}_Linux_x86_64.tar.gz`).

2. **Bug in the `require_tags.rego` policy.** The set comprehension `{k | k := resource.change.after.tags[_]}` iterates the VALUES of the `tags` object (because `tags[_]` enumerates values), so the resulting set was the set of tag values, not tag keys. Subtracting that from `required_tags` would almost always report all required tags as "missing". Changed to `{k | resource.change.after.tags[k]}` so `k` is bound to each KEY of the tags object — the correct way to enumerate object keys in Rego.

## Review Notes
- The `aws_security_group` ingress check only inspects `from_port`. A rule with `from_port=20, to_port=22` would still expose port 22 but pass this policy. Acceptable as a teaching example, but worth tightening in production by checking the `from_port`–`to_port` range and considering the modern `aws_vpc_security_group_ingress_rule` resource.
- The `deny_public_s3.rego` policy only fires when `block_public_acls` is explicitly `false`. If the field is unset (the AWS provider default behavior varies by version), the policy will not match. Production policies usually want to also flag missing/null values.
- `import future.keywords.in` is harmless under both Rego v0 and v1 (it's a no-op in v1 where `in` is built-in), so the policies remain forward-compatible.
- The post uses the older `deny[msg] { ... }` partial-rule syntax. Conftest still accepts this, but newer Rego v1 style prefers `deny contains msg if { ... }`. Not a correctness issue today.
