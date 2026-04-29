# Validation Summary: How to Manage SendGrid Resources with OpenTofu - Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Twilio SendGrid
- SendGrid Terraform/OpenTofu provider
- HCL
- AWS Secrets Manager

## Sources Consulted
- OpenTofu docs: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu docs: https://opentofu.org/docs/language/values/outputs/
- SendGrid API key permissions: https://www.twilio.com/docs/sendgrid/api-reference/api-key-permissions
- SendGrid domain authentication API: https://www.twilio.com/docs/sendgrid/api-reference/domain-authentication/authenticate-a-domain
- SendGrid inbound parse webhook docs: https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
- SendGrid transactional template version API: https://www.twilio.com/docs/sendgrid/api-reference/transactional-templates-versions/create-a-new-transactional-template-version
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/index.md
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/api_key.md
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/sender_authentication.md
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/ip_pool.md
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/template.md
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/template_version.md
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/unsubscribe_group.md
- SendGrid provider docs: https://raw.githubusercontent.com/kenzo0107/terraform-provider-sendgrid/main/docs/resources/inbound_parse_webhook.md
- Terraform Registry provider metadata: https://registry.terraform.io/v1/providers/kenzo0107/sendgrid

## Issues Found
- The post used an outdated provider source and version (`Trois-Six/sendgrid ~> 0.2`). I updated it to the current maintained provider (`registry.terraform.io/kenzo0107/sendgrid ~> 2.8`) so the OpenTofu example matches the current provider lineage and registry location.
- The provider configuration showed `api_key = var.sendgrid_api_key` but the shell example exported `SENDGRID_API_KEY`. I removed the explicit `api_key` argument so the example now matches the provider's documented environment-variable authentication behavior.
- The API key scope examples included invalid or outdated SendGrid scopes such as `suppressions.read`, `suppressions.write`, `marketing.write`, `contacts.read`, and `contacts.write`. I replaced them with currently documented scopes.
- The sender authentication example used an outdated resource name (`sendgrid_domain_authentication`) and outdated field names (`is_default`, `automatic_security`). I updated it to `sendgrid_sender_authentication` with the current `default` argument and corrected the example domain/subdomain shape to match SendGrid's domain-authentication model.
- The IP pool example omitted the required `ips` argument. I added placeholder dedicated IP values so the configuration matches the provider schema.
- The inbound parse webhook example used an outdated resource name (`sendgrid_parse_webhook`) and a technically incorrect section heading referencing API Gateway. I updated the resource to `sendgrid_inbound_parse_webhook` and corrected the heading.
- The security guidance implied that marking outputs sensitive and writing them to Secrets Manager was sufficient. I added the missing OpenTofu state caveat because sensitive values are still stored in state and must be protected or encrypted there as well.

## Review Notes
- `tofu` was not installed in this workspace on April 29, 2026, so I could not run a live `tofu init` or provider install check locally. Validation was completed from current provider documentation, provider source/docs, and official SendGrid/OpenTofu documentation.
- The IP addresses shown in the IP pool examples are documentation placeholders. Real use requires dedicated IPs already assigned in the target SendGrid account.
- The corrected article still manages secret material through OpenTofu resources. That is valid, but it requires strong state protection practices because API keys and secret versions remain represented in state.
