# Validation Summary: How to Configure Snap Proxy for Air-Gapped Ubuntu Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- snapd
- Snap Store Proxy / Enterprise Store
- PostgreSQL
- UFW
- Linux shell commands

## Sources Consulted
- Canonical Snap Store Proxy installation documentation: https://documentation.ubuntu.com/enterprise-store/snap-store-proxy/en/install/
- Canonical Snap Store Proxy registration documentation: https://documentation.ubuntu.com/enterprise-store/snap-store-proxy/en/register/
- Canonical Snap Store Proxy device configuration documentation: https://documentation.ubuntu.com/enterprise-store/snap-store-proxy/en/devices/
- Canonical Snap Store Proxy offline store documentation: https://documentation.ubuntu.com/enterprise-store/snap-store-proxy/en/airgap/
- Canonical Snap Store Proxy revision override documentation: https://documentation.ubuntu.com/enterprise-store/snap-store-proxy/en/overrides/
- Canonical Enterprise Store installation documentation: https://ubuntu.com/enterprise-store/docs/how-to/install/
- Local `snap` CLI help for `snap download`, `snap install`, `snap ack`, `snap set`, and `snap logs`.

## Issues Found
- The introduction described Snap Store Proxy as a local mirror of the Snap Store. Updated this to describe it as a proxy/cache with offline-mode support, matching Canonical's documentation.
- The prerequisites listed Ubuntu 18.04 or later, a fixed 50 GB cache size, and a vague `snapcraft.io` network requirement. Updated these to the documented requirement for a supported Ubuntu LTS on AMD64, appropriate cache/import disk space, and Snap Store infrastructure access unless offline mode is used.
- The PostgreSQL setup omitted the required `btree_gist` extension and did not create the role with the documented privileges. Updated the SQL to match Canonical's example.
- The proxy configuration used unsupported `snap set snap-store-proxy db.*`, `proxy.domain`, `proxy.port`, and `snap-proxy init` commands. Replaced them with the documented `snap-proxy config proxy.domain`, `snap-proxy config proxy.db.connection`, and `snap-proxy check-connections` workflow.
- The testing and firewall examples assumed port 8080. Updated examples to the documented default HTTP port 80 and removed unverified API checks.
- The client configuration incorrectly used HTTP/HTTPS proxy settings and an unsupported `store.url` setting. Replaced this with the documented store assertion import and `snap set core proxy.store=<store-id>` workflow.
- The override removal and listing commands were incorrect. Replaced `stable=--` and bare `list-overrides` with `delete-override <snap> <channel>` and `list-overrides <snap>`.
- The allowlist commands were not supported by the referenced Snap Store Proxy documentation. Replaced them with the documented offline export/import flow using `store-admin export snaps`, `enable-airgap-mode`, and `push-snap`.
- The monitoring example used an unverified system-info endpoint and invalid `snap logs --num=100` syntax. Replaced these with `snap-proxy status`, `snap logs -n=100`, and the proxy common data directory.

## Review Notes
Canonical now presents Snap Store Proxy as Enterprise Store in current documentation, while the legacy `snap-store-proxy` documentation and snap remain available. The post now notes the rename but keeps the original Snap Store Proxy-oriented command set to preserve the article's scope.
