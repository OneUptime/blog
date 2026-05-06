# Validation Summary: How to Cloudflare Page Rules with OpenTofu

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- OpenTofu
- Cloudflare provider for OpenTofu/Terraform
- Cloudflare Page Rules
- HCL

## Sources Consulted
- [OpenTofu Provider Requirements documentation](https://opentofu.org/docs/language/providers/requirements/)
- [OpenTofu Dependency Lock File documentation](https://opentofu.org/docs/language/files/dependency-lock/)
- [Cloudflare Terraform provider overview](https://developers.cloudflare.com/api/terraform/)
- [Cloudflare `cloudflare_page_rule` resource documentation](https://developers.cloudflare.com/api/terraform/resources/page_rules/)
- [Cloudflare provider `page_rule` docs in the official provider repository](https://github.com/cloudflare/terraform-provider-cloudflare/blob/main/docs/resources/page_rule.md)
- [Cloudflare Page Rules product documentation](https://developers.cloudflare.com/rules/page-rules/)
- [OpenTofu Registry provider versions for `cloudflare/cloudflare`](https://registry.opentofu.org/v1/providers/cloudflare/cloudflare/versions)

## Issues Found
1. **Provider identification was incorrect**: The post referred to a "Cloudflare Page Rules provider" and used placeholder `provider_name` / `provider_example_resource` snippets. Cloudflare Page Rules are managed through the `cloudflare/cloudflare` provider, not a separate Page Rules provider. I replaced the placeholder provider block with the real Cloudflare provider requirement and replaced the generic resource with a valid `cloudflare_page_rule` example.
2. **Authentication example was not valid for Cloudflare**: The original post used generic `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` environment variables and a placeholder provider block. Cloudflare's documented provider authentication uses `api_token` or the `CLOUDFLARE_API_TOKEN` environment variable. I updated the example to use `CLOUDFLARE_API_TOKEN` with `provider "cloudflare"`.
3. **Variables and outputs did not match the resource being discussed**: The original variables and output referenced a generic placeholder resource and unrelated `name` / `environment` inputs. I changed them to `zone_id`, `domain`, and `cloudflare_page_rule.main.id` so the snippets are internally consistent and usable.
4. **Current product status was missing**: Cloudflare's current Page Rules product documentation explicitly labels Page Rules as deprecated. I added a brief note in the introduction and conclusion so the post is accurate for readers in 2026.
5. **Security guidance used outdated terminology**: The best-practices section told readers to store API keys, but Cloudflare recommends API tokens over legacy global API keys. I corrected the guidance to refer to API tokens.

## Review Notes
- As of 2026-05-06, the `cloudflare/cloudflare` provider is available in the OpenTofu Registry, with 5.19.1 listed as the latest stable version. The post now uses `~> 5`, which is consistent with Cloudflare's official provider documentation and avoids pinning to a single patch release in the article body.
- Cloudflare Page Rules still exist in the provider and product docs, but the product page marks them as deprecated and Cloudflare publishes migration guidance for newer rules features.
- The example target omits the URL scheme intentionally. Cloudflare documents that omitting the scheme causes the rule to match both HTTP and HTTPS requests.
