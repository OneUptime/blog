# Validation Summary: How to Configure Nebula Mesh VPN on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nebula mesh VPN
- Ubuntu Linux
- systemd
- UFW
- YAML configuration
- PKI and certificate-based authentication

## Sources Consulted
- Nebula GitHub repository and README: https://github.com/slackhq/nebula
- Nebula GitHub releases: https://github.com/slackhq/nebula/releases
- Nebula configuration reference: https://nebula.defined.net/docs/config/
- Nebula PKI configuration docs: https://nebula.defined.net/docs/config/pki/
- Nebula lighthouse configuration docs: https://nebula.defined.net/docs/config/lighthouse/
- Nebula listen configuration docs: https://nebula.defined.net/docs/config/listen/
- Nebula punchy configuration docs: https://nebula.defined.net/docs/config/punchy/
- Nebula TUN configuration docs: https://nebula.defined.net/docs/config/tun/
- Nebula firewall configuration docs: https://nebula.defined.net/docs/config/firewall/
- Local Nebula v1.10.3 CLI help output for `nebula`, `nebula-cert ca`, `nebula-cert sign`, and `nebula-cert print`

## Issues Found
- The introduction incorrectly said Nebula falls back through lighthouse nodes when direct paths fail. Lighthouses provide discovery, while relay behavior is handled by separate relay configuration. Updated the wording to distinguish discovery from relay fallback.
- The download command used v1.9.0 while describing the latest release. Updated the command to v1.10.3, the current latest release verified during review.
- The `nebula-cert sign` examples used the deprecated `-ip` flag. Updated the examples to use the current `-networks` flag.
- The `scp` examples copied directly into `/etc/nebula/` as a normal user, which commonly fails on Ubuntu because the directory is root-owned. Updated the examples to copy to the user's home directory and then move the files with `sudo`.
- The testing section claimed `ip route show | grep nebula1` checks connected peers. That command checks routes for the Nebula interface, not peer state. Updated the comment accordingly.

## Review Notes
- The lighthouse and regular-node YAML snippets were validated with `nebula -test` using Nebula v1.10.3 and generated certificates.
- The post keeps a simple single-lighthouse setup. Production deployments may want multiple lighthouses, certificate blocklists, stricter host file permissions, and explicit relay configuration for difficult NAT environments.
