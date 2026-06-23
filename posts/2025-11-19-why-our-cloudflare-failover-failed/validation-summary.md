# Validation Summary: Why our Cloudflare failover failed?

## Status
validated

## Post Type
Opinion piece / incident retrospective (postmortem) with technical implementation details

## Technologies Covered
- Cloudflare (proxy, API tokens, Turnstile, DNS)
- Cloudflare API token permissions / scopes
- DNS (nameservers, glue records, TTL, registrar vs. DNS provider separation)
- Terraform / OpenTofu (IaC)
- MetalLB (bare-metal Kubernetes load balancer, IP assignment)
- Secrets management / hardware key vaults

## Sources Consulted
- Cloudflare API token permissions reference — https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- Cloudflare API token templates ("Edit zone DNS") — https://developers.cloudflare.com/fundamentals/api/reference/template/
- Cloudflare create API token guide — https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- Public reporting of the November 18, 2025 Cloudflare outage
- General DNS / registrar / glue-record knowledge and MetalLB documentation

## Issues Found
- **Incorrect Cloudflare API token scope.** Section "1. Ship an API-first failover switch" listed the token scope as "Zone:Read, Zone:Edit". To list and edit DNS records (including flipping the `proxied` flag), Cloudflare requires the **DNS:Edit** permission group (Zone.DNS, Edit) together with **Zone:Read**. `Zone:Edit` covers zone-level settings, not DNS record edits. This also conflicted with the "What actually failed" section, which correctly referenced the `Zone.DNS` scope. Changed "Zone:Edit" to "DNS:Edit" for correctness and internal consistency.

## Review Notes
- The post is primarily a narrative incident retrospective with no executable code blocks, commands, or config snippets — only described mechanisms. The single concrete, verifiable technical claim (the API token scope) was corrected.
- Technical claims that were verified as correct: the November 18, 2025 Cloudflare outage; `challenges.cloudflare.com` as the Turnstile/challenge endpoint; the advice to avoid using one provider as both registrar and DNS provider; pre-loaded glue records and a 300-second TTL for fast nameserver cutover; and MetalLB as a mechanism for fast origin IP reassignment on bare metal.
- Non-technical spelling/grammar typos remain and were intentionally left untouched per the review scope (technical fixes only): "quaterly" (→ quarterly, appears once), "bynchaning our MetalLB config" (→ "by changing"), and "Cloudflare's is down" (→ "Cloudflare is down"). These do not affect technical accuracy but a copy-edit pass would improve readability.
