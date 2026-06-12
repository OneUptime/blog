# Validation Summary: How to Use Tailscale Funnel for Service Publishing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tailscale Funnel
- Tailscale Serve
- Tailnet policy files / ACL node attributes
- MagicDNS and Tailscale HTTPS certificates
- Linux systemd
- Docker and GitHub CLI examples
- Nginx basic authentication example

## Sources Consulted
- Tailscale Funnel documentation: https://tailscale.com/docs/features/tailscale-funnel
- Tailscale Funnel CLI reference: https://tailscale.com/docs/reference/tailscale-cli/funnel
- Tailscale Serve CLI reference: https://tailscale.com/docs/reference/tailscale-cli/serve
- Tailscale tailnet policy file syntax: https://tailscale.com/docs/reference/syntax/policy-file
- Tailscale Services configuration file reference: https://tailscale.com/docs/reference/tailscale-services-configuration-file
- Local Tailscale CLI help output from Tailscale 1.98.2: `tailscale funnel --help`, `tailscale serve --help`, `tailscale dns status --help`, `tailscale debug --help`

## Issues Found
- The Funnel policy example used `autogroup:members`; Tailscale's documented autogroup is `autogroup:member`. Updated the policy snippet.
- The prerequisites omitted Tailscale HTTPS certificates, which Funnel requires along with MagicDNS and a `funnel` node attribute. Added the HTTPS certificate step.
- The basic setup example used an invalid sample domain (`tail-scale.ts.net`) and described `--bg` as exposing on a specific port. Updated the sample domain and replaced the port example with `tailscale funnel --https=8443 3000`.
- The post used `tailscale funnel --verbose 3000`, but the current CLI has no `--verbose` flag. Replaced it with the supported `--bg` example.
- Several `--set-path` examples used the older `--set-path /path` form. Updated them to the documented `--set-path=/path` form.
- The post used older Serve/Funnel command forms such as `tailscale serve --bg https / http://localhost:3000` and `tailscale funnel on`. Replaced those with current `tailscale funnel` commands that configure public Funnel routes directly.
- The post used `tailscale funnel off`, which is not a current subcommand. Updated examples to use `tailscale funnel 3000 off`, matching the documented `[off]` syntax.
- The security diagram implied Tailscale ACLs restrict public inbound Funnel users. Updated it to describe `nodeAttrs` as controlling who can publish Funnel services; public requests must still be protected by application-level controls.
- The monitoring example queried `.connections` from `tailscale funnel status --json`, but the status command exposes configuration/status, not access logs. Replaced it with an inspection command.
- The troubleshooting section referenced `tailscale debug funnel`, which is not present in the current CLI. Replaced it with guidance to check the tailnet policy for the `funnel` node attribute.

## Review Notes
Tailscale Funnel is still documented as beta and has limitations that are worth noting in a future editorial pass, including public listener ports limited to `443`, `8443`, and `10000`, use of tailnet `ts.net` DNS names only, and non-configurable bandwidth limits. The post's examples remain intentionally concise and assume the reader substitutes their actual tailnet and machine names.
