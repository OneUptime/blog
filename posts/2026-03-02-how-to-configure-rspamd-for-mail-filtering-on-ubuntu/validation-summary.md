# Validation Summary: How to Configure Rspamd for Mail Filtering on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Rspamd
- Postfix milters
- DKIM signing
- Greylisting
- Redis
- nginx reverse proxy
- Lua custom rules

## Sources Consulted
- Rspamd Installation Guide: https://docs.rspamd.com/getting-started/installation/
- Rspamd DKIM signing module: https://docs.rspamd.com/modules/dkim_signing/
- Rspamd rspamadm command reference: https://docs.rspamd.com/other/rspamadm/
- Rspamd Greylisting module: https://docs.rspamd.com/modules/greylisting/
- Rspamd Redis configuration: https://docs.rspamd.com/configuration/redis/
- Rspamd Controller worker documentation: https://docs.rspamd.com/workers/controller/
- Rspamd Proxy worker documentation: https://docs.rspamd.com/workers/rspamd_proxy/
- Rspamd Actions and scores: https://docs.rspamd.com/configuration/metrics/
- Rspamd Rule Writing Workshop: https://docs.rspamd.com/developers/writing_rules/
- Rspamd Configuration Management: https://docs.rspamd.com/administration/rspamadm/configuration/

## Issues Found
- The DKIM public-key display command generated a new keypair instead of showing the DNS record for the saved private key, and the `tail -n +2` pipeline could expose private-key material. Changed the key generation command to save the DNS output to `/tmp/example.com.mail2026.dns` and display that file.
- The `allow_envfrom_empty` comment incorrectly described the option as signing all outbound mail. Updated it to describe empty-envelope-sender signing accurately.
- The `allow_hdrfrom_mismatch = false` comment incorrectly described subdomain signing. Updated it to describe envelope/header From domain mismatch behavior.
- The greylisting example included `max_expire`, which is not listed in the current Rspamd greylisting module options. Removed it.
- The status check used `rspamc modules`, which is not the documented command for module state. Replaced it with `rspamadm configdump -m`.

## Review Notes
- The tutorial assumes the official Rspamd package layout and service user used by Ubuntu packages.
- The sample mail headers are illustrative; exact headers depend on the `milter_headers` configuration and whether messages are inbound, authenticated, or from local networks.
