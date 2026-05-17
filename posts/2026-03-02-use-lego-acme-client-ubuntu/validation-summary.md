# Validation Summary: How to Use Lego ACME Client on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Lego ACME client (Go-based)
- Let's Encrypt (ACME v2 directory, including staging endpoint)
- ZeroSSL (ACME with External Account Binding)
- DNS-01 providers: Cloudflare, AWS Route53, DigitalOcean
- HTTP-01 challenge (standalone and webroot modes)
- systemd services and timers
- OpenSSL (certificate inspection)
- Ubuntu shell tooling (bash, dpkg, wget, tar)

## Sources Consulted
- Lego repository and v4.18.0 / v4.35.2 / master tag sources: https://github.com/go-acme/lego
- `cmd/flags.go` (v4.18.0 and v4.35.2) to verify global CLI flag names and arrival versions
- `cmd/cmd_renew.go` to verify renew subcommand flags (`--days` default 30, `--renew-hook`, `--reuse-key`)
- `cmd/hook.go` to verify renew-hook environment variables (`LEGO_CERT_PATH`, `LEGO_CERT_KEY_PATH`, `LEGO_CERT_DOMAIN`, `LEGO_ACCOUNT_EMAIL`, `LEGO_ISSUER_CERT_PATH`, `LEGO_CERT_PEM_PATH`, `LEGO_CERT_PFX_PATH`)
- `log/logger.go` to verify lego's logging interface (no debug level concept; only Fatal/Print/Warnf/Infof)
- `cmd/cmd_dnshelp.go` for `dnshelp` subcommand flag (`-c`/`--code`)
- `providers/dns/cloudflare/cloudflare.go` to verify `CF_DNS_API_TOKEN` is a valid alternate env (alongside `CLOUDFLARE_DNS_API_TOKEN`)
- `providers/dns/digitalocean/digitalocean.go` to verify `DO_AUTH_TOKEN`
- ZeroSSL ACME docs: https://zerossl.com/documentation/acme/ for the `https://acme.zerossl.com/v2/DV90` directory URL
- GitHub releases page: https://github.com/go-acme/lego/releases (latest v4 = v4.35.2; v5.0.x is current major as of May 2026)

## Issues Found

1. **Non-existent `--log.level DEBUG` flag** in the "Debugging provider issues" troubleshooting block. Lego has no log-level concept — `log/logger.go` only exposes Fatal, Print, Warnf, and Infof, and `cmd/flags.go` defines no such flag. Replaced the broken example with an accurate explanation and a `lego dnshelp -c <provider>` example, which is the supported way to inspect provider configuration.

2. **`LEGO_VERSION="4.18.0"` is incompatible with the `--dns.propagation-wait` flag** shown later in the post. That flag was introduced in lego v4.19.0 (confirmed by diffing `cmd/flags.go` between v4.18.0 and v4.19.0). Bumped the pinned `LEGO_VERSION` to `4.35.2`, the latest v4 release, so all flag examples in the post are valid against the installed binary.

## Review Notes
- Lego v5.0.x was released May 11–14, 2026 (just days before this review). The post and its `go install github.com/go-acme/lego/v4/cmd/lego@latest` command still target the v4 module path, which is appropriate and accurate for v4. When the author wants to move to v5, the module path will need to change to `/v5/cmd/lego` and the `--days` flag will be superseded by the new dynamic-renewal default (see v5 changelog).
- The `CF_DNS_API_TOKEN` env var used in the Cloudflare examples is the alternate/legacy form; the canonical name in current lego is `CLOUDFLARE_DNS_API_TOKEN`. Both still work (alt namespace is supported via `env.GetOneWithFallback`), so this is not an error — just something to know if users grep newer docs.
- The "Force renewal regardless of expiry" comment paired with `--days 90` is slightly loose phrasing: `--days N` means "renew if fewer than N days remain". On a 90-day Let's Encrypt cert it will almost always trigger renewal, so the example does work, but lego has no true unconditional force flag — `--reuse-key` and `--days` are the only knobs. Left as-is since the command itself is valid.
- The post pins a specific lego version (`4.35.2`) but also tells readers to "Check latest release at https://github.com/go-acme/lego/releases", which is the right pattern.
