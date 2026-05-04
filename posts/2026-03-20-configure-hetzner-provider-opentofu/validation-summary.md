# Validation Summary: How to Configure Hetzner Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Hetzner Cloud provider (`hetznercloud/hcloud`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Hetzner Cloud Terraform provider GitHub repo: https://github.com/hetznercloud/terraform-provider-hcloud
- Terraform Registry page for `hetznercloud/hcloud`: https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs
- `hcloud_server` resource documentation (source: terraform-provider-hcloud `docs/resources/server.md`)

## Issues Found
The post claimed to be a Hetzner-provider tutorial but the original draft was a generic template — every code block used placeholder strings (`provider_name`, `provider-namespace/provider-name`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`, `provider_example_resource`) with no Hetzner-specific content. Fixed:

1. **Provider source** — replaced the placeholder `provider-namespace/provider-name` with the official `hetznercloud/hcloud` source and the `hcloud` local name. Set version constraint to `~> 1.48` (the v1.x line is the current major).
2. **Authentication** — replaced the `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` placeholders with the single env var the provider actually reads, `HCLOUD_TOKEN`. Added a short note on where to generate the token (Hetzner Cloud Console, *Security > API Tokens*). The Hetzner Cloud API uses a single bearer token, not key+secret.
3. **Provider block** — changed `provider "provider_name"` to `provider "hcloud"` and updated the inline-token comment to reference `token` (the actual argument name) and `HCLOUD_TOKEN`.
4. **Example resource** — replaced the fake `provider_example_resource` with a real `hcloud_server` block using valid arguments: `server_type = "cx22"`, `image = "ubuntu-24.04"`, `location = "nbg1"`. Renamed the `tags` map to `labels`, since `hcloud_server` exposes `labels` (not `tags`) per the provider schema.
5. **Outputs** — updated the `resource_id` output to reference `hcloud_server.main.id` and added a second output (`ipv4_address`) showing a real exported attribute from the resource.
6. **Conclusion** — fixed a template-leak phrase ("brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure") that was nonsensical for Hetzner Cloud, which *is* cloud infrastructure (IaaS), not SaaS.

## Review Notes
- The author header still uses `https://www.github.com/nawazdhandala`. The canonical GitHub host is `github.com`; `www.github.com` redirects but is non-canonical. Left as-is since it works and is a stylistic choice rather than a technical error.
- The post does not cover the related Hetzner Robot (dedicated servers) or Hetzner DNS providers, which are separate providers (`hetznerrobot` and `hetznerdns/hetznerdns`). The title scope as written ("Hetzner Provider") implicitly means Hetzner Cloud, which is the most common case; that's fine but a future revision could mention the distinction.
- The version pin `~> 1.48` will need refreshing periodically as the provider releases new minor versions; this is normal for tutorials.
- The hyphen in "secrets manager-never in .tf files" reads awkwardly (the author likely meant an em-dash). Stylistic, not technical, so left untouched.
