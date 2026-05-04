# Validation Summary: How to Create DigitalOcean DNS Records with OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- DigitalOcean Terraform provider (`digitalocean_domain`, `digitalocean_record`, `digitalocean_loadbalancer`)
- DNS record types: A, AAAA, CNAME, MX, TXT, CAA, SRV, NS

## Sources Consulted
- DigitalOcean Terraform provider — `digitalocean_domain` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/domain.md
- DigitalOcean Terraform provider — `digitalocean_record` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/record.md
- DigitalOcean Terraform provider — `digitalocean_loadbalancer` resource: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/loadbalancer.md
- Terraform Registry: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs

## Issues Found
No technical issues found.

All verified items:
- `digitalocean_domain` schema (`name`, `ip_address`) and apex A-record behavior — correct.
- `digitalocean_record` schema (`domain`, `type`, `name`, `value`, `ttl`, `priority`, `flags`, `tag`) — correct.
- Referencing `digitalocean_domain.main.id` is valid; the resource ID is the domain name itself.
- CNAME values with trailing dot — correct best practice (matches official examples).
- MX records with `priority` — correct.
- CAA record fields (`flags = 0`, `tag = "issue"`, value `"letsencrypt.org."`) — correct and matches docs.
- TXT record syntax for SPF and ACME challenges — correct.
- `for_each` with a `map(string)` variable — valid Terraform/OpenTofu syntax.
- `digitalocean_loadbalancer.web.ip` — correct exported attribute.
- Conclusion's list of supported record types (A, AAAA, CNAME, MX, TXT, SRV, CAA, NS) — exactly matches the provider's supported types.

## Review Notes
- Stylistic note (not a technical issue): The DigitalOcean provider docs more commonly reference `digitalocean_domain.main.name` than `.id`. Both resolve to the same string since the resource ID *is* the domain name, so the post's usage of `.id` is technically correct.
- The `acme_challenge_token` variable is referenced but not declared in the snippet — readers will need to define it, but this is a reasonable abbreviation in a focused tutorial.
