# Validation Summary: How to Set Up Boundary for Remote Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Boundary (open-source)
- Ubuntu 22.04
- PostgreSQL (12+)
- systemd
- UFW firewall
- HCL configuration language
- AEAD / KMS encryption (aes-gcm)
- SSH targets

## Sources Consulted
- HashiCorp Boundary docs: https://developer.hashicorp.com/boundary/docs
- Boundary configuration reference (controller, worker, kms, listener): https://developer.hashicorp.com/boundary/docs/configuration
- Boundary worker configuration (`initial_upstreams` field): https://developer.hashicorp.com/boundary/docs/configuration/worker
- Boundary CLI command reference: https://developer.hashicorp.com/boundary/docs/commands
- `boundary authenticate` subcommands (password, oidc, ldap): https://developer.hashicorp.com/boundary/docs/commands/authenticate
- HashiCorp apt repository setup: https://developer.hashicorp.com/well-architected-framework/operating-hashicorp-applications/install-binaries
- PostgreSQL 15+ schema permissions changes: https://www.postgresql.org/docs/current/ddl-schemas.html
- systemd service hardening directives: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found

1. **Deprecated `controllers` field in worker block** — In Boundary 0.13+, the `controllers` field inside the `worker` block was renamed to `initial_upstreams` to support multi-hop worker topologies. The old `controllers` field is deprecated. Changed `controllers = ["127.0.0.1:9201"]` to `initial_upstreams = ["127.0.0.1:9201"]`.

2. **Invalid `boundary authenticate status` command** — The `boundary authenticate` command only has subcommands `password`, `oidc`, and `ldap`. There is no `status` subcommand. Replaced with `boundary auth-tokens list -scope-id=global`, which is a valid way to verify that a token was stored after authentication.

## Review Notes

- The post uses `boundary targets create ssh` which requires Boundary 0.12+ (SSH target type with credential injection support). This is the modern approach and is appropriate.
- The PostgreSQL setup includes `GRANT ALL ON SCHEMA public TO boundary` which is necessary for PostgreSQL 15+, where the default `public` schema permissions were tightened. Good coverage of this gotcha.
- The PostgreSQL connection string contains `!` in the password which is technically allowed unencoded in URI form, but for passwords with `@`, `:`, `/`, `?`, `#`, `[`, `]`, percent-encoding would be required. Worth noting for readers who choose a different password.
- The systemd unit uses `ProtectSystem=full`, `ProtectHome=read-only`, and `PrivateTmp=yes`, which are reasonable hardening defaults; `/etc/boundary` remains writable as it lives under `/etc` which is excluded by `ProtectSystem=full`.
- The HashiCorp docs URL referenced in the systemd unit (`https://www.boundaryproject.io/docs`) currently redirects to `https://developer.hashicorp.com/boundary/docs`. The URL still resolves, so left as-is.
- The post uses a single-host controller + worker deployment with KMS-based worker auth (via the `worker-auth` kms purpose). For production, PKI-based worker auth is now recommended, but KMS auth is still supported and acceptable for the small-team scope of this guide.
- TLS for the API listener is shown only as a commented hint; production deployments should enable it.
- The `public_addr = "$(curl -s ifconfig.me)"` is evaluated by the shell at `tee` time (heredoc is unquoted), so the value is baked into the HCL at write time — which is the intended behavior here.
