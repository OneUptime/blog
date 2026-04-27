# Validation Summary: How to Use the templatestring Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL `templatestring` function, template directives)
- Terraform-compatible HCL syntax
- AWS provider resources used in examples: `aws_ssm_parameter` (data + resource), `aws_s3_object` (data), `aws_ses_template`, `aws_instance`, `aws_db_instance`, `aws_sns_topic_subscription`

## Sources Consulted
- [OpenTofu `templatestring` Function docs](https://opentofu.org/docs/language/functions/templatestring/)
- [OpenTofu source for templatestring docs (GitHub)](https://github.com/opentofu/opentofu/blob/main/website/docs/language/functions/templatestring.mdx)
- [OpenTofu Strings and Templates docs](https://opentofu.org/docs/language/expressions/strings/)
- [Terraform `templatestring` function reference](https://developer.hashicorp.com/terraform/language/functions/templatestring)
- [OpenTofu issue #301 — request to add `templatestring`](https://github.com/opentofu/opentofu/issues/301)
- [HashiCorp issue #18069 — variable defaults cannot contain interpolation-like strings](https://github.com/hashicorp/terraform/issues/18069)

## Issues Found
- **Unescaped `${...}` interpolations inside literal template strings.** The original post defined templates as variable defaults and locals using raw `${name}`, `${env}`, `${db_host}`, `${service}`, etc. HCL parses string templates eagerly, so these placeholders would be interpreted as references to undefined identifiers at parse time and produce errors before `templatestring` is ever called. Fixed by escaping each interpolation with `$${...}` in the basic example, the dynamic configuration heredoc, and the inline alert message template, so the stored string contains literal `${...}`.
- **Unescaped `%{ ... }` directives in the template directives example.** The local `hosts_template = "...%{ for h in hosts ~}...${h}...%{ endfor ~}"` would similarly be evaluated as a template at parse time, where `hosts` is undefined. Replaced `%{ ... }` with `%%{ ... }` and `${h}` with `$${h}` so the literal directives are stored in the local for `templatestring` to render later.
- Added one short clarifying sentence after the basic example explaining why the `$${...}` escapes are needed, since the change to the syntax would otherwise look unmotivated to a reader.

## Review Notes
- The data-source-based examples (`aws_ssm_parameter.value`, `aws_s3_object.body`) are correct as written: those values arrive at runtime as plain strings, so HCL never tries to template them — `templatestring` is exactly the right way to render them.
- `templatestring` was introduced in OpenTofu 1.7 (and Terraform 1.9, June 2024). The post does not call out a minimum version; readers on older OpenTofu/Terraform releases will hit "unknown function" errors. Not changed because the post focuses on usage rather than version support, but worth noting for future revisions.
- The "Inline Alert Message Templates" example computes `local.alert_message` but the `aws_sns_topic_subscription` resource never references it. The local is unused. Left as-is since it is illustrative rather than a functional bug, but a future cleanup could thread `local.alert_message` into a notification payload to make the example end-to-end.
- The Terraform docs explicitly say the first argument to `templatestring` "is always a reference to an object defined in the module." OpenTofu's docs are looser and accept escaped literal strings via `$${...}`, which is what the post now uses. Both forms work in OpenTofu; the references-only phrasing is a Terraform-side restriction.
