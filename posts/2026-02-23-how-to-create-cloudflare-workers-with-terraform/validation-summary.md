# Validation Summary: How to Create Cloudflare Workers with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Cloudflare Terraform provider
- Cloudflare Workers
- Cloudflare Workers Routes
- Cloudflare Workers KV
- JavaScript Fetch API

## Sources Consulted
- Cloudflare Terraform provider overview: https://developers.cloudflare.com/terraform/
- Cloudflare Terraform Workers resources: https://developers.cloudflare.com/api/terraform/resources/workers/
- Cloudflare Terraform Workers Scripts resource: https://developers.cloudflare.com/api/terraform/resources/workers/subresources/scripts/
- Cloudflare Terraform KV resources: https://developers.cloudflare.com/api/terraform/resources/kv
- Cloudflare Workers Infrastructure as Code documentation: https://developers.cloudflare.com/workers/platform/infrastructure-as-code/
- Terraform Registry documentation for `cloudflare_workers_script`: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/workers_script
- Terraform Registry documentation for `cloudflare_workers_kv`: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/workers_kv

## Issues Found
- The provider constraint used `~> 4.0`, and the snippets used the older singular Worker resource names and arguments. Updated the provider constraint to `~> 5.0`, changed Worker scripts to `cloudflare_workers_script`, changed Worker routes to `cloudflare_workers_route`, and updated route references to use `script`.
- The Worker script examples used `name` for script names. Updated them to `script_name`, which is the current Cloudflare provider v5 argument.
- The KV pair example used `key`. Updated it to `key_name`, which is the current Cloudflare provider v5 argument.
- The KV binding example used the old `kv_namespace_binding` nested block. Updated it to the current `bindings` list with `type = "kv_namespace"` and `namespace_id`.
- The A/B testing Worker passed a URL string with the original `Request` object as the `fetch` init value. Updated it to create a new `Request` with the modified URL and original request options.
- The outputs referenced old resource names and `.name` attributes. Updated them to reference `cloudflare_workers_script` resources and `.script_name`.

## Review Notes
- The examples use inline Worker content for readability. For production Terraform, Cloudflare documents `content_file` plus `content_sha256` as a better option because it avoids storing Worker source directly in Terraform state.
- The `X-XSS-Protection` response header is obsolete in modern browsers, but including it does not make the Worker code invalid.
